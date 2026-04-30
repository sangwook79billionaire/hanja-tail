const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function insertBatch(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📦 '${filePath}'에서 ${data.length}개의 데이터를 읽어왔습니다.`);

  for (const item of data) {
    try {
      // 1. 단어 분석 캐시 저장
      await supabase.from("word_analysis_cache").upsert({
        word: item.word,
        analysis_json: item.analysis,
        difficulty_level: item.difficulty || 1
      });

      // 2. 퀴즈 뱅크 저장
      await supabase.from("quiz_bank").upsert({
        word: item.word,
        hanja_combination: item.quiz.hanja_combination,
        description: item.quiz.description,
        difficulty_level: item.difficulty || 1,
        is_verified: true
      });
      process.stdout.write(`.`);
    } catch (e) {
      console.error(`\n❌ ${item.word} 저장 오류:`, e.message);
    }
  }
  console.log(`\n✅ '${filePath}' 주입 완료!`);
}

// 첫 번째 배치 실행
const targetFile = process.argv[2] || 'scripts/seed_batch_1.json';
insertBatch(targetFile);
