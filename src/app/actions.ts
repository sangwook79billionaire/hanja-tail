"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export async function analyzeWord(word: string) {
  if (!word) return { error: "단어를 입력해주세요." };

  const supabase = createClient();
  const searchWord = word.trim();

  try {
    // 1. DB 캐시 먼저 확인
    const { data: cachedData } = await supabase
      .from("word_analysis_cache")
      .select("analysis_json")
      .eq("word", searchWord)
      .single();

    if (cachedData) {
      console.log("Using cached analysis for:", searchWord);
      return cachedData.analysis_json;
    }

    // 2. 퀴즈 뱅크 확인 (퀴즈 데이터가 있다면 분석 정보로 활용 가능성 확인)
    const { data: quizData } = await supabase
      .from("quiz_bank")
      .select("word, hanja_combination")
      .eq("word", searchWord)
      .maybeSingle();

    if (quizData) {
      console.log(`퀴즈 뱅크에서 '${searchWord}' 발견. 상세 분석을 위해 Gemini 호출을 진행합니다.`);
    }

    // 3. 캐시가 없으면 Gemini 호출
    console.log("No cache found. Calling Gemini for:", searchWord);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are a helpful assistant for teaching Hanja to children.
      Analyze the following word (Hangul or Hanja): "${searchWord}"
      
      1. Hanja Analysis: Decompose it into characters (mean/sound/level).
      2. Expansion (Crucial): Provide 2 synonyms, 2 antonyms, and 2 related 3-character words using these Hanja.
      3. For each expanded word, provide a simple quiz description.

      Return ONLY a JSON object in this format:
      {
        "isSafe": boolean,
        "correctedWord": "string",
        "hanjaList": [{ "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }],
        "expansions": [
          { "word": "유의어/반의어", "hanja": "한자조합", "type": "synonym|antonym|related3", "description": "아이들용 설명" }
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

    // 한자 마스터에서 3개 예시 단어 및 상세 정보 보강
    const finalHanjaList = await Promise.all(
      data.hanjaList.map(async (item: any) => {
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
      expansions: data.expansions || []
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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

export async function logLearning(word: string, isCorrect: boolean) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  try {
    const { error } = await supabase.from("learning_logs").insert({
      user_id: userId,
      word: word,
      is_correct: isCorrect
    });
    
    if (error) throw error;
    return { success: true };
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
  
  // 1. 관리자 권한 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다.", stats: null, rankings: [], recentLogs: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "관리자 권한이 없습니다.", stats: null, rankings: [], recentLogs: [] };

  // 2. 전체 통계 가져오기
  const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { data: rankings } = await supabase
    .from("profiles")
    .select("nickname, total_score, current_stage")
    .order("total_score", { ascending: false })
    .limit(10);

  const { data: recentLogs } = await supabase
    .from("learning_logs")
    .select(`
      word, 
      is_correct, 
      learned_at, 
      profiles:user_id (nickname)
    `)
    .order("learned_at", { ascending: false })
    .limit(20);

  return {
    stats: {
      totalUsers: totalUsers || 0,
      totalLogs: recentLogs?.length || 0,
    },
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
    })),
    error: null
  };
}

export async function updateNickname(newNickname: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  // update 대신 upsert를 사용하여 프로필이 없으면 생성하고, 있으면 수정합니다.
  const { error } = await supabase
    .from("profiles")
    .upsert({ 
      id: user.id, 
      nickname: newNickname
    });

  if (error) {
    console.error("Nickname update error details:", error);
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

  return { profile };
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
