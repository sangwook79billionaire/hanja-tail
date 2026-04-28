"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export async function analyzeWord(word: string) {
  if (!word) return { error: "단어를 입력해주세요." };

  try {
    console.log("Using API Key:", process.env.GEMINI_API_KEY?.substring(0, 8) + "...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a helpful assistant for teaching Hanja to children.
      Analyze the following Korean word: "${word}"
      
      Return ONLY a JSON object in this format:
      {
        "isSafe": boolean,
        "reason": "string if unsafe",
        "hanjaList": [
          { "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Gemini Raw Response:", text);
    
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
    
    return { hanjaList: finalHanjaList };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { error: "단어 분석 중 오류가 발생했습니다. API 키를 확인해주세요." };
  }
}

export async function generateQuiz(hanja: string) {
  if (!hanja) return { error: "한자를 선택해주세요." };

  const supabase = createClient();

  try {
    // 1. DB 캐시 확인
    const { data: existingQuizzes } = await supabase
      .from("quiz_bank")
      .select("*")
      .like("hanja_combination", `%${hanja}%`)
      .limit(3);

    if (existingQuizzes && existingQuizzes.length > 0) {
      const quiz = existingQuizzes[Math.floor(Math.random() * existingQuizzes.length)];
      return { quiz };
    }

    // 2. Gemini로 생성
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a Hanja quiz generator for kids.
      Target Hanja: "${hanja}"
      
      Task:
      1. Find a very common, easy Korean word (2~3 letters) that includes the Hanja "${hanja}". (e.g., if Hanja is '校', the word could be '학교'). This is the TARGET ANSWER.
      2. Write a fun, kid-friendly description/hint that explains the meaning of the TARGET ANSWER so the child can guess it.
      3. CRITICAL: The "description" must ONLY be a hint for the word. Do NOT ask the user to play word chain or find another word. Do NOT include the TARGET ANSWER directly in the description.
      
      Return ONLY a JSON object in this format:
      {
        "word": "정답 단어 (예: 학교)",
        "hanja_combination": "한자 (예: 學校)",
        "description": "아이들이 정답을 맞힐 수 있도록 도와주는 재미있는 뜻풀이 힌트 (단어 직접 언급 금지)"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found in response");
    const quizData = JSON.parse(jsonMatch[0]);

    // 3. DB에 캐싱
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
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    return { error: "퀴즈를 생성하는 중 오류가 발생했습니다." };
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
