const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function tagDifficulty() {
  console.log("🔍 DB 단어 난이도 일괄 분석 시작...");

  // 1. 아직 난이도가 설정되지 않았거나 기본값(1)인 퀴즈 데이터 가져오기
  const { data: quizzes, error } = await supabase
    .from("quiz_bank")
    .select("word, id")
    .order("created_at", { ascending: false });

  if (error || !quizzes) {
    console.error("데이터를 가져오지 못했습니다:", error);
    return;
  }

  console.log(`📊 총 ${quizzes.length}개의 단어를 분석합니다.`);

  // 2. 30개씩 크게 묶어서 AI에게 물어보기 (API 호출 횟수 최소화)
  const batchSize = 30;
  for (let i = 0; i < quizzes.length; i += batchSize) {
    const batch = quizzes.slice(i, i + batchSize);
    const wordList = batch.map(q => q.word).join(", ");

    try {
      console.log(`\n⏳ ${i + 1}~${Math.min(i + batchSize, quizzes.length)}번 단어 분석 중...`);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const prompt = `
        다음 한국어 한자어 리스트의 적정 학습 난이도를 판별해줘.
        단어 리스트: [${wordList}]

        난이도 기준:
        1: 유아~초등 1학년 (아주 기초)
        2: 초등 2~3학년 (생활 기초)
        3: 초등 4~5학년 (일상 심화)
        4: 초등 6학년~중등 (고급/학술)

        결과는 반드시 아래 JSON 형식으로만 응답해줘:
        [
          {"word": "단어1", "level": 1},
          {"word": "단어2", "level": 3}
        ]
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        
        // 3. 분석된 난이도를 DB에 업데이트
        for (const res of results) {
          await supabase
            .from("quiz_bank")
            .update({ difficulty_level: res.level })
            .eq("word", res.word);
        }
        console.log(`✅ ${Math.min(i + batchSize, quizzes.length)}개 완료!`);
      }

      // API 제한을 피하기 위해 5초간 휴식
      if (i + batchSize < quizzes.length) {
        console.log("🛌 API 휴식 중 (5초)...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (e) {
      console.error(`\n❌ 배치 처리 중 오류 발생:`, e.message);
    }
  }

  console.log("\n🎊 모든 단어의 난이도 태깅이 완료되었습니다!");
}

tagDifficulty();
