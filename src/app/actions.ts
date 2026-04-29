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
      Analyze the following word (could be in Hangul or Hanja): "${searchWord}"
      
      1. Input Handling: If the input is in Hanja (e.g., "學校"), identify its Hangul equivalent (e.g., "학교") and set it as "correctedWord".
      2. Typo Correction: If the input is a misspelled Hangul word, suggest the correct intended word.
      3. Loanword Detection: Determine if it's a loanword or pure Korean with no Hanja origin.
      4. Safety Check: Ensure the word is appropriate for kids.
      5. Hanja Analysis: Decompose the word into its Hanja characters with meaning, sound, and level.

      Return ONLY a JSON object in this format:
      {
        "isSafe": boolean,
        "reason": "string if unsafe",
        "isLoanword": boolean,
        "correctedWord": "string (Hangul equivalent or corrected version)",
        "hanjaList": [
          { "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from text if not perfect
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found in response");
    const data = JSON.parse(jsonMatch[0]);

    if (!data.isSafe) {
      return { error: data.reason || "아이들에게 부적절한 표현이 포함되어 있습니다." };
    }

    let finalHanjaList = data.hanjaList;

    try {
      // AI 환각 방지: DB에 한자가 있는지 확인하고 있다면 DB 데이터를 우선 사용
      const supabase = createClient();
      const validatedHanjaList = await Promise.all(
        data.hanjaList.map(async (item: { char: string; meaning: string; sound: string; level: string }) => {
          const { data: dbData } = await supabase
            .from("hanja_master")
            .select("meaning, sound, level")
            .eq("hanja", item.char)
            .maybeSingle();
          
          if (dbData) {
            return {
              ...item,
              meaning: dbData.meaning,
              sound: dbData.sound,
              level: dbData.level || item.level
            };
          }
          return item;
        })
      );
      
      finalHanjaList = validatedHanjaList;

      // DB에 사용자 입력 내역 저장
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // Fire and forget to not block the UI
        supabase.from("user_items").insert({
          user_id: userData.user.id,
          word: word,
          hanja_combination: finalHanjaList.map((h: { char: string; meaning: string; sound: string; level: string }) => h.char).join("")
        }).then();
      }
    } catch (dbError) {
      console.warn("DB validation skipped due to error:", dbError);
    }
    
    const resultData = { 
      hanjaList: finalHanjaList,
      correctedWord: data.correctedWord || null,
      isLoanword: data.isLoanword || false
    };

    // 4. 결과를 DB에 캐싱 (다음 검색을 위해)
    await supabase.from("word_analysis_cache").upsert({
      word: searchWord,
      analysis_json: resultData
    });
    
    return resultData;
  } catch (error: unknown) {
    console.error("Gemini Analysis Error:", error);
    const err = error as { status?: number; message?: string };
    if (err?.status === 429 || err?.message?.includes("429")) {
      return { error: "한자 박사님이 지금 공부 중이에요! 1분만 기다렸다가 다시 물어봐 줄래?" };
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
      Target Hanja: "${hanja}"
      ${excludedWord ? `CRITICAL RULE: The TARGET ANSWER must NOT be the word "${excludedWord}". I repeat, do NOT use "${excludedWord}". Pick a completely different common word.` : ""}
      
      Task:
      1. Find a very common, easy Korean word (2~3 letters) that includes the Hanja "${hanja}". 
      2. Write a fun, kid-friendly description/hint that explains the meaning of the word.
      3. Do NOT include the TARGET ANSWER directly in the description.
      
      Return ONLY a JSON object in this format:
      {
        "word": "정답 단어",
        "hanja_combination": "한자",
        "description": "재미있는 힌트"
      }
    `;

    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");
        let quizData = JSON.parse(jsonMatch[0]);

        // 검증: 제외할 단어와 겹치면 한 번 더 요청
        if (excludedWord && quizData.word === excludedWord) {
          const retryResult = await model.generateContent(prompt + "\n\nPLEASE PROVIDE A DIFFERENT WORD.");
          const retryJsonMatch = (await retryResult.response).text().match(/\{[\s\S]*\}/);
          if (retryJsonMatch) quizData = JSON.parse(retryJsonMatch[0]);
        }

        // DB에 캐싱
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
          if (isRateLimit) return { error: "퀴즈 박사가 지금 너무 바빠요! 1분만 쉬었다가 다시 물어봐 줄래?" };
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

export async function getLearningRecap() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const { data, error } = await supabase
      .from("learning_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("learned_at", sevenDaysAgo.toISOString())
      .order("learned_at", { ascending: false });

    if (error) throw error;

    const uniqueDays = new Set(data.map(log => new Date(log.learned_at).toDateString())).size;
    const correctCount = data.filter(log => log.is_correct).length;

    return { 
      logs: data,
      stats: {
        attendance: uniqueDays,
        correctCount: correctCount,
        totalLearned: data.length
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
      nickname: newNickname,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Nickname update error:", error);
    return { error: "닉네임 수정 중 오류가 발생했습니다." };
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
