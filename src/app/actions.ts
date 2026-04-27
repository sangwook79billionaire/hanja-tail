"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeWord(word: string) {
  if (!word) return { error: "단어를 입력해주세요." };

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are a helpful assistant for teaching Hanja to children.
      Analyze the following Korean word: "${word}"
      
      1. Safety Check: If the word is inappropriate, offensive, or slang, set "isSafe" to false.
      2. Decompose: Decompose the word into its Hanja characters. For each character, provide:
         - "char": The Hanja character.
         - "meaning": The meaning in Korean (e.g., "지나칠").
         - "sound": The sound in Korean (e.g., "과").
         - "level": The estimated difficulty level (e.g., "8급", "7급", etc.).

      Return the result in JSON format:
      {
        "isSafe": boolean,
        "reason": string (only if not safe),
        "hanjaList": [
          { "char": string, "meaning": string, "sound": string, "level": string }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const data = JSON.parse(text);

    if (!data.isSafe) {
      return { error: data.reason || "아이들에게 부적절한 표현이 포함되어 있습니다." };
    }

    // AI 환각 방지: DB에 한자가 있는지 확인하고 있다면 DB 데이터를 우선 사용
    const supabase = createClient();
    const validatedHanjaList = await Promise.all(
      data.hanjaList.map(async (item: any) => {
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
        return item; // DB에 없으면 Gemini의 분석 결과를 그대로 사용
      })
    );
    
    // DB에 사용자 입력 내역 저장 (데이터 격리 및 관리자 검토용)
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from("user_items").insert({
        user_id: userData.user.id,
        word: word,
        hanja_combination: validatedHanjaList.map(h => h.char).join("")
      });
    }
    
    return { hanjaList: validatedHanjaList };
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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are a Hanja quiz generator for kids.
      Create a "Tail Catching" (꼬리잡기) quiz for the Hanja: "${hanja}".
      Find a common Korean word that includes this Hanja.
      
      Return JSON:
      {
        "word": string,
        "hanja_combination": string,
        "description": string
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const quizData = JSON.parse(response.text());

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
