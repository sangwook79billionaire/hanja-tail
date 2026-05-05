"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export async function analyzeWord(word: string) {
  if (!word) return { error: "단어를 입력해주세요." };

  const supabase = createClient();
  const searchWord = word.trim();
  try {
    const hasHanjaBracket = searchWord.includes("(") && searchWord.includes(")");
    
    // 1. 동음이의어 DB 체크 (최우선: 한자 조합이 명시되지 않은 경우만)
    if (!hasHanjaBracket) {
      // (1) 퀴즈 뱅크에서 후보 찾기
      const { data: quizCandidates } = await supabase
        .from("quiz_bank")
        .select("word, hanja_combination, description")
        .eq("word", searchWord);

      // (2) 한자 마스터의 예시 단어들에서 후보 찾기
      const { data: masterHanjas } = await supabase
        .from("hanja_master")
        .select("example_words")
        .filter("example_words", "cs", `[{"word": "${searchWord}"}]`);

      const dbCandidates: { word: string; hanja: string; description: string }[] = [];
      const seenHanja = new Set();

      quizCandidates?.forEach(c => {
        if (!seenHanja.has(c.hanja_combination)) {
          dbCandidates.push({ word: c.word, hanja: c.hanja_combination, description: c.description });
          seenHanja.add(c.hanja_combination);
        }
      });

      masterHanjas?.forEach(h => {
        const examples = h.example_words || [];
        examples.forEach((ex: { word: string; hanja: string }) => {
          if (ex.word === searchWord && !seenHanja.has(ex.hanja)) {
            dbCandidates.push({ word: ex.word, hanja: ex.hanja, description: `${ex.hanja}를 사용하는 단어` });
            seenHanja.add(ex.hanja);
          }
        });
      });

      if (dbCandidates.length > 1) {
        return { isAmbiguous: true, candidates: dbCandidates };
      }
    }

    // 2. DB 캐시 확인
    const { data: cachedData } = await supabase
      .from("word_analysis_cache")
      .select("analysis_json")
      .eq("word", searchWord)
      .maybeSingle();

    if (cachedData) {
      console.log("Using cached analysis for:", searchWord);
      return cachedData.analysis_json;
    }


    // 3. 캐시가 없으면 Gemini 호출
    console.log("No cache found. Calling Gemini for:", searchWord);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "Gemini API 키가 설정되지 않았습니다. 배포 설정을 확인해주세요." };
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are a helpful assistant for teaching Hanja to children.
      Analyze the following word (Hangul or Hanja): "${searchWord}"
      
      1. Check if this Hangul word has multiple common Hanja meanings (homonyms).
         This is EXTREMELY CRITICAL for educational accuracy. Many Korean words share the same Hangul but have different Hanja meanings.
         If there is ANY other common Hanja combination for this Hangul word, you MUST set "isAmbiguous" to true.
         DO NOT guess the user's intent. Even if one meaning is much more common than others, you MUST provide options in "candidates".
         Example: "사과" can be "謝過"(apology) or "沙果"(apple). "배" can be "梨"(pear), "舟"(boat), or "腹"(belly).
      2. If "isAmbiguous" is true, list ALL common Hanja combinations in "candidates" with child-friendly descriptions.
      3. If the user provided a specific Hanja (e.g., "지도(地圖)") or there is only one clear meaning, "isAmbiguous" should be false.
      4. CRITICAL: Check if "${searchWord}" is a REAL, standard Korean dictionary word (사전에 등재된 명사).
         If it is a fake word created by simply combining Hanja (like "신술어" when it doesn't exist in standard dictionaries), 
         or if it's not a common Hanja-based word, set "isValid" to false.

      Return ONLY a JSON object in this format:
      {
        "isSafe": boolean,
        "isValid": boolean,
        "invalidReason": "string (why it is invalid)",
        "isAmbiguous": boolean,
        "candidates": [
          { "word": "한글단어", "hanja": "한자조합", "description": "아이들이 이해하기 쉬운 짧은 뜻풀이" }
        ],
        "correctedWord": "string",
        "hanjaList": [{ "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }],
        "expansions": [
          { "word": "유의어/반의어", "hanja": "한자조합", "type": "synonym|antonym|related", "description": "아이들에게 친절하고 따뜻한 설명 (절대 '1단계 이웃', '관계성' 같은 딱딱한 전문 용어를 쓰지 마세요!)" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const data = JSON.parse(jsonMatch[0]);

    if (!data.isSafe) return { error: "부적절한 표현이 포함되어 있습니다." };
    if (data.isValid === false) {
      console.warn(`Invalid word detected: ${searchWord}. Reason: ${data.invalidReason}`);
      // 비정상 단어 로그 기록 (백단 모니터링용)
      supabase.from("monitoring_log").insert({
        event_type: "invalid_word",
        word: searchWord,
        reason: data.invalidReason,
        details: data
      }).then();
      
      return { error: `아쉽게도 '${searchWord}'(은)는 사전에 없는 단어인 것 같아요. 한자 카드를 다시 확인하거나 다른 단어를 찾아볼래?` };
    }

    if (data.isAmbiguous) {
      // AI가 새롭게 찾아낸 동음이의어 후보들을 DB에 저장 (자가 증식)
      if (data.candidates && data.candidates.length > 0) {
        for (const can of data.candidates) {
          supabase.from("quiz_bank").upsert({
            word: can.word,
            hanja_combination: can.hanja,
            description: can.description,
            is_verified: false
          }, { onConflict: 'word, hanja_combination' }).then();
        }
      }
      
      return {
        isAmbiguous: true,
        candidates: data.candidates || []
      };
    }

    interface HanjaItem {
      char: string;
      meaning: string;
      sound: string;
      level: string;
    }

    // 한자 마스터에서 3개 예시 단어 및 상세 정보 보강
    const finalHanjaList = await Promise.all(
      data.hanjaList.map(async (item: HanjaItem) => {
        const { data: dbHanja } = await supabase
          .from("hanja_master")
          .select("meaning, sound, level, example_words")
          .eq("hanja", item.char)
          .maybeSingle();
        
        return {
          ...item,
          meaning: dbHanja?.meaning || item.meaning,
          sound: dbHanja?.sound || item.sound,
          level: dbHanja?.level || item.level,
          examples: dbHanja?.example_words || [] // 1,800자 시딩에서 넣은 예시 단어 3개
        };
      })
    );

    // [중요] 연관 단어들을 DB(quiz_bank)에 선제적으로 저장 (자가 증식)
    if (data.expansions && data.expansions.length > 0) {
      for (const exp of data.expansions) {
        supabase.from("quiz_bank").upsert({
          word: exp.word,
          hanja_combination: exp.hanja,
          description: exp.description,
          is_verified: false // AI 생성형이므로 나중에 검증 필요
        }, { onConflict: 'word' }).then();
      }
    }
    
    const resultData = { 
      hanjaList: finalHanjaList,
      correctedWord: data.correctedWord || null,
      isLoanword: data.isLoanword || false,
      expansions: data.expansions || [],
      isAmbiguous: data.isAmbiguous || false,
      candidates: data.candidates || []
    };

    await supabase.from("word_analysis_cache").upsert({
      word: searchWord,
      analysis_json: resultData
    });
    
    return resultData;
  } catch (error: unknown) {
    console.error("Gemini Analysis Error:", error);
    const err = error as { status?: number; message?: string };
    if (err?.status === 429 || err?.message?.includes("429")) {
      return { error: "한자 박사님이 지금 골똘히 생각 중이에요! 잠시만(30초~1분) 기다렸다가 다시 물어봐 줄래? 그동안 다른 단어를 먼저 찾아봐도 좋아!" };
    }
    return { error: "단어 분석 중 오류가 발생했습니다. API 키를 확인해주세요." };
  }
}

export async function generateQuiz(hanja: string, excludedWord?: string) {
  if (!hanja) return { error: "한자를 선택해주세요." };

  const supabase = createClient();

  try {
    // 1. DB에서 먼저 확인: 해당 한자가 포함된 기존 단어들을 찾습니다.
    const { data: existingQuizzes } = await supabase
      .from("quiz_bank")
      .select("*")
      .ilike("hanja_combination", `%${hanja}%`)
      .not("word", "eq", excludedWord || "") // 현재 단어는 제외
      .limit(10); // 최대 10개까지 후보를 가져옵니다.

    if (existingQuizzes && existingQuizzes.length > 0) {
      // 후보들 중에서 랜덤하게 하나를 선택하여 루프를 방지합니다.
      const randomIndex = Math.floor(Math.random() * existingQuizzes.length);
      const quiz = existingQuizzes[randomIndex];
      console.log(`DB에서 랜덤 퀴즈 선택 (${existingQuizzes.length}개 중 하나): ${quiz.word}`);
      return { quiz };
    }

    // 2. Gemini로 생성 (최대 3번 자동 재시도)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "Gemini API 키가 설정되지 않았습니다." };
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are a Hanja quiz generator for kids.
      Target Hanja (Unicode character): "${hanja}"
      
      Task:
      1. Find a very common Korean word (2~3 letters) that MUST contain the SPECIFIC Hanja character "${hanja}" in its Hanja representation.
      2. Write a fun, kid-friendly description/hint that explains the meaning of the word.
      3. Provide full Hanja analysis for the chosen word.
      
      Return ONLY a JSON object in this format:
      {
        "word": "정답 단어 (한글)",
        "hanja_combination": "정답 단어 (한자 - 반드시 '${hanja}' 포함)",
        "description": "재미있는 힌트",
        "hanja_list": [
          { "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }
        ]
      }
    `;

    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");
        const quizData = JSON.parse(jsonMatch[0]);

        // 검증: 정답 단어의 한자 표기에 우리가 찾는 한자가 실제로 포함되어 있는지 확인
        if (!quizData.hanja_combination.includes(hanja)) {
          throw new Error("Generated word does not contain the target Hanja character.");
        }

        // 검증: 제외할 단어와 겹치면 한 번 더 요청
        if (excludedWord && quizData.word === excludedWord) {
          throw new Error("Generated word is the excluded word.");
        }

        // 선제적 캐싱: 정답을 맞혔을 때 바로 보여주기 위해 word_analysis_cache에 미리 저장
        await supabase.from("word_analysis_cache").upsert({
          word: quizData.word,
          analysis_json: {
            hanjaList: quizData.hanja_list,
            correctedWord: null,
            isLoanword: false
          }
        });

        // quiz_bank에도 저장
        const { data: newQuiz } = await supabase
          .from("quiz_bank")
          .insert({
            word: quizData.word,
            hanja_combination: quizData.hanja_combination,
            description: quizData.description,
            is_verified: false
          })
          .select()
          .single();

        return { quiz: newQuiz || quizData };
      } catch (error: unknown) {
        retryCount++;
        const err = error as { status?: number; message?: string };
        const isRateLimit = err?.status === 429 || err?.message?.includes("429");
        
        if (isRateLimit && retryCount < 3) {
          console.log(`Quiz generation rate limit hit, retrying in 1s... (${retryCount}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (retryCount >= 3) {
          console.error("Quiz Generation Final Error:", error);
          if (isRateLimit) return { error: "퀴즈 박사가 지금 잠시 쉬고 있어요! 조금 이따가 다시 도전해 볼까? 다른 한자를 먼저 공부하고 오면 더 잘할 수 있을 거야!" };
          return { error: "퀴즈를 생성하는 중 오류가 발생했습니다." };
        }
      }
    }
    return { error: "퀴즈를 생성할 수 없습니다." };
  } catch (error: unknown) {
    console.error("Outer Quiz Error:", error);
    return { error: "시스템 오류가 발생했습니다." };
  }
}

export async function logLearning(word: string, isCorrect: boolean, parentWord?: string, isReview: boolean = false) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) return { error: "로그인이 필요합니다." };

  try {
    // 1. 오늘 획득한 포인트 확인 (한도 체크용)
    const kstFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const today = kstFormatter.format(new Date());

    const { data: todayLogs } = await supabase
      .from("learning_logs")
      .select("is_review, word")
      .eq("user_id", userId)
      .gte("learned_at", `${today}T00:00:00Z`);

    const newWordCount = (todayLogs || []).filter(l => !l.is_review).length;
    const reviewCount = (todayLogs || []).filter(l => l.is_review).length;

    let pointsToAdd = 0;
    if (isReview) {
      if (reviewCount < 20) pointsToAdd = 0.5;
    } else {
      if (newWordCount < 5) pointsToAdd = 1;
    }

    // 2. 학습 로그 저장
    const { error: logError } = await supabase.from("learning_logs").insert({
      user_id: userId,
      word: word,
      is_correct: isCorrect,
      parent_word: parentWord || null,
      is_review: isReview,
      practiced_writing: isReview // 복습 시 쓰기 연습을 완료한 것으로 간주
    });
    
    if (logError) throw logError;

    // 3. 보너스 점수 업데이트
    if (pointsToAdd > 0) {
      const { data: profile } = await supabase.from("profiles").select("bonus_points").eq("id", userId).single();
      const currentPoints = profile?.bonus_points || 0;
      await supabase.from("profiles").update({ bonus_points: currentPoints + pointsToAdd }).eq("id", userId);
    }

    return { success: true, pointsAwarded: pointsToAdd };
  } catch (error) {
    console.error("Log Learning Error:", error);
    return { error: "학습 기록 저장 중 오류가 발생했습니다." };
  }
}

export async function updateLearningProgress(word: string, type: 'stroke' | 'writing') {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  try {
    // 가장 최근의 해당 단어 학습 로그를 찾아서 업데이트
    const { data: recentLog } = await supabase
      .from("learning_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("word", word)
      .order("learned_at", { ascending: false })
      .limit(1)
      .single();

    if (recentLog) {
      const updateData = type === 'stroke' 
        ? { viewed_stroke: true } 
        : { practiced_writing: true };

      const { error } = await supabase
        .from("learning_logs")
        .update(updateData)
        .eq("id", recentLog.id);

      if (error) throw error;
      return { success: true };
    }
    return { error: "로그를 찾을 수 없습니다." };
  } catch (error) {
    console.error("Update Progress Error:", error);
    return { error: "진척도 업데이트 중 오류가 발생했습니다." };
  }
}

interface LearningLog {
  id: string;
  user_id: string;
  word: string;
  is_correct: boolean;
  learned_at: string;
  viewed_stroke: boolean;
  practiced_writing: boolean;
}

export async function getLearningRecap() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  try {
    const { data: allLogs, error } = await supabase
      .from("learning_logs")
      .select("*")
      .eq("user_id", userId)
      .order("learned_at", { ascending: false });

    if (error) throw error;

    // KST (GMT+9) 기준 오늘 날짜 문자열 추출 (YYYY-MM-DD)
    const kstFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayKstStr = kstFormatter.format(new Date());

    const processLogs = (logs: LearningLog[], startDate?: Date, onlyFullPractice = false) => {
      const filtered = logs.filter(log => {
        const logDate = new Date(log.learned_at);
        const dateMatch = startDate ? logDate >= startDate : kstFormatter.format(logDate) === todayKstStr;
        
        if (!dateMatch) return false;
        
        // 트로피용(오늘 미션)일 경우 따라쓰기까지 완료된 것만 카운트
        if (onlyFullPractice) {
          return log.practiced_writing === true;
        }
        return true;
      });

      const uniqueDays = new Set(filtered.map(log => {
        return kstFormatter.format(new Date(log.learned_at));
      })).size;

      return {
        count: filtered.length,
        correct: filtered.filter(l => l.is_correct).length,
        days: uniqueDays
      };
    };

    // 주간/월간 시작일 계산 (KST 기준)
    const now = new Date();
    const kstNowStr = now.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
    const kstNow = new Date(kstNowStr);

    const startOfWeek = new Date(kstNow);
    startOfWeek.setDate(kstNow.getDate() - kstNow.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(kstNow);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return {
      logs: allLogs,
      stats: {
        today: processLogs(allLogs, undefined, true), // 오늘 미션은 풀 연습(쓰기 완료)만 카운트!
        weekly: processLogs(allLogs, startOfWeek),
        monthly: processLogs(allLogs, startOfMonth),
        total: {
          count: allLogs.length,
          correct: allLogs.filter(l => l.is_correct).length,
          days: new Set(allLogs.map(log => kstFormatter.format(new Date(log.learned_at)))).size
        }
      }
    };
  } catch (error) {
    console.error("Get Recap Error:", error);
    return { error: "기록을 불러오는 중 오류가 발생했습니다." };
  }
}

export async function getAdminStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const [
    { count: userCount },
    { count: logCount },
    { count: bankCount },
    { count: cacheCount },
    { data: rankings },
    { data: recentLogs }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('learning_logs').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_bank').select('*', { count: 'exact', head: true }),
    supabase.from('word_analysis_cache').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('nickname, total_score, current_stage').order('total_score', { ascending: false }).limit(10),
    supabase.from('learning_logs').select('word, is_correct, learned_at, profiles:user_id (nickname)').order('learned_at', { ascending: false }).limit(20)
  ]);

  return { 
    userCount: userCount || 0, 
    logCount: logCount || 0, 
    bankCount: bankCount || 0, 
    cacheCount: cacheCount || 0,
    rankings: (rankings || []).map(r => ({
      nickname: r.nickname as string | null,
      total_score: r.total_score as number,
      current_stage: r.current_stage as number
    })),
    recentLogs: (recentLogs || []).map(l => ({
      word: l.word as string,
      is_correct: l.is_correct as boolean,
      learned_at: l.learned_at as string,
      profiles: l.profiles ? { nickname: (l.profiles as unknown as { nickname: string | null }).nickname } : null
    }))
  };
}

export async function updateProfile(data: { 
  nickname?: string; 
  school?: string; 
  grade?: number; 
  city?: string;
  marketing_agree?: boolean;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .upsert({ 
      id: user.id, 
      ...data
    });

  if (error) {
    console.error("Profile update error details:", error);
    return { error: `DB 저장 실패: ${error.message}` };
  }
  return { success: true };
}

export async function getMyProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile fetch error:", error);
    return { profile: null };
  }

  // 오늘 획득 가능한 남은 점수 계산
  const kstFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const today = kstFormatter.format(new Date());
  
  const { data: todayLogs } = await supabase
    .from("learning_logs")
    .select("is_review")
    .eq("user_id", user.id)
    .gte("learned_at", `${today}T00:00:00Z`);

  const newWordCount = (todayLogs || []).filter(l => !l.is_review).length;
  const reviewCount = (todayLogs || []).filter(l => l.is_review).length;

  return { 
    profile,
    dailyStats: {
      newWords: newWordCount,
      reviews: reviewCount,
      totalToday: (newWordCount * 1) + (reviewCount * 0.5)
    }
  };
}

export async function getRandomQuizzes(limit: number = 10) {
  const supabase = createClient();
  
  try {
    // 1. 퀴즈 뱅크에서 넉넉하게 50개를 가져와서 섞습니다.
    const { data: allQuizzes, error: quizError } = await supabase
      .from("quiz_bank")
      .select("*")
      .limit(100);

    if (quizError || !allQuizzes) throw quizError;

    // 2. 섞기 (Shuffle)
    const shuffled = [...allQuizzes].sort(() => Math.random() - 0.5);
    const selectedQuizzes = shuffled.slice(0, limit);

    // 3. 각 퀴즈마다 오답 보기(Distractors) 3개씩 추가
    const quizzesWithOptions = selectedQuizzes.map((quiz) => {
      // 본인 제외하고 랜덤하게 3개 뽑기
      const distractors = allQuizzes
        .filter(q => q.word !== quiz.word)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(q => q.word);

      const options = [quiz.word, ...distractors].sort(() => Math.random() - 0.5);

      return {
        ...quiz,
        options
      };
    });

    return { quizzes: quizzesWithOptions };
  } catch (error) {
    console.error("Get Random Quizzes Error:", error);
    return { error: "퀴즈를 불러오는 중 오류가 발생했습니다." };
  }
}

// --- Admin Actions ---

export async function getUnverifiedWords() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data: cache } = await supabase.from('word_analysis_cache').select('*').order('created_at', { ascending: false }).limit(100);
  const { data: bank } = await supabase.from('quiz_bank').select('word');
  const bankWords = new Set((bank || []).map(b => b.word));

  const unverified = (cache || []).filter(c => !bankWords.has(c.word));
  return unverified;
}

export async function verifyWord(word: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data: cacheItem } = await supabase.from('word_analysis_cache').select('*').eq('word', word).single();
  if (!cacheItem) return { error: "Cache item not found" };

  const { error } = await supabase.from('quiz_bank').upsert({
    word: cacheItem.word,
    hanja_list: cacheItem.hanja_list,
    expansions: cacheItem.expansions,
    is_verified: true
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteWord(word: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { error } = await supabase.from('word_analysis_cache').delete().eq('word', word);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getMonitoringLogs() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data, error } = await supabase
    .from('monitoring_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { error: error.message };
  return { logs: data || [] };
}

export async function bulkVerifyWords(words: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data: cacheItems } = await supabase.from('word_analysis_cache').select('*').in('word', words);
  if (!cacheItems || cacheItems.length === 0) return { error: "No items found" };

  const insertData = cacheItems.map(item => {
    const analysis = item.analysis_json as { hanjaList: { char: string }[]; description: string };
    return {
      word: item.word,
      hanja_combination: analysis.hanjaList.map(h => h.char).join(''),
      description: analysis.description || `${item.word}의 의미`,
      is_verified: true
    };
  });

  const { error } = await supabase.from('quiz_bank').upsert(insertData, { onConflict: 'word' });

  if (error) return { error: error.message };
  return { success: true };
}

export async function bulkDeleteWords(words: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { error } = await supabase.from('word_analysis_cache').delete().in('word', words);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateWord(originalWord: string, newData: { word: string; analysis_json: unknown }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { error } = await supabase
    .from('word_analysis_cache')
    .update({ word: newData.word, analysis_json: newData.analysis_json })
    .eq('word', originalWord);

  if (error) return { error: error.message };
  return { success: true };
}
