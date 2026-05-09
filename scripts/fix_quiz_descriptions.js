const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MODEL_NAME = "gemini-flash-latest";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

async function fixLowQualityQuizzesInBatch() {
  console.log("🚀 저품질 퀴즈 데이터 일괄(Batch) 수정 프로세스 시작...");

  // 1. 수정이 필요한 후보군 50개 가져오기
  const { data: quizzes, error } = await supabase
    .from('quiz_bank')
    .select('*')
    .or('description.ilike.%의미%,description.ilike.%뜻하는%,description.ilike.%말합니다%,description.ilike.%한자%')
    .limit(50);

  if (error) {
    console.error("❌ 데이터 로드 실패:", error.message);
    return;
  }

  if (!quizzes || quizzes.length === 0) {
    console.log("✨ 수정할 데이터가 없습니다!");
    return;
  }

  console.log(`🔍 총 ${quizzes.length}개의 후보를 발견했습니다. 10개씩 묶어서 수정을 시작합니다.\n`);

  const BATCH_SIZE = 10;
  for (let i = 0; i < quizzes.length; i += BATCH_SIZE) {
    const batch = quizzes.slice(i, i + BATCH_SIZE);
    console.log(`📦 [Batch ${Math.floor(i/BATCH_SIZE) + 1}] ${batch.length}개 처리 중...`);

    const prompt = `
      You are a Hanja quiz editor for children.
      Regenerate fun, kid-friendly descriptions for the following ${batch.length} words.
      
      RULES:
      1. NEVER use the word itself in the description.
      2. NEVER use generic phrases like "의미", "뜻하는 말".
      3. Focus on actions, locations, or functions.
      
      WORDS TO FIX:
      ${batch.map((q, idx) => `${idx + 1}. [${q.word}] (Hanja: ${q.hanja_combination})`).join('\n')}
      
      Return ONLY a JSON array of strings in the same order:
      ["New description 1", "New description 2", ...]
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("JSON array not found");
      
      const newDescriptions = JSON.parse(jsonMatch[0]);

      for (let j = 0; j < batch.length; j++) {
        const quiz = batch[j];
        const newDesc = newDescriptions[j];

        if (newDesc && !newDesc.includes(quiz.word)) {
          await supabase
            .from('quiz_bank')
            .update({ description: newDesc, is_verified: true })
            .eq('id', quiz.id);
          process.stdout.write(".");
        }
      }
      console.log(`\n  ✅ Batch 완료!`);
      
      // RPM 보호를 위해 약간의 대기
      await new Promise(r => setTimeout(r, 20000));
    } catch (err) {
      console.error(`\n  ❌ Batch 실패: ${err.message}`);
      if (err.message.includes("429")) break; // 일일 한도 초과 시 중단
    }
  }

  console.log("\n✨ 일괄 수정 프로세스 종료.");
}

fixLowQualityQuizzesInBatch();
