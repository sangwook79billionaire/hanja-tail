const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seed() {
  const rawData = JSON.parse(fs.readFileSync('scripts/hanja_1800_raw.json', 'utf8'));
  console.log(`🚀 원본 데이터 ${rawData.length}개 분석 중...`);

  // 한자 중복 제거 (Map 사용)
  const uniqueHanjaMap = new Map();
  rawData.forEach(item => {
    if (item.hanja && !uniqueHanjaMap.has(item.hanja)) {
      uniqueHanjaMap.set(item.hanja, item);
    }
  });

  const uniqueData = Array.from(uniqueHanjaMap.values());
  console.log(`✨ 중복 제거 완료: 총 ${uniqueData.length}개의 고유 한자 주입 시작...`);

  const batchSize = 100;
  for (let i = 0; i < uniqueData.length; i += batchSize) {
    const batch = uniqueData.slice(i, i + batchSize);
    
    const upsertData = batch.map(item => {
      const huneumParts = item.huneum.split(' ');
      let meaning = "";
      let sound = item.sound;

      if (huneumParts.length >= 3) {
        meaning = huneumParts[1];
      } else if (huneumParts.length === 2) {
        meaning = huneumParts[1];
      }

      return {
        word: item.hanja,
        difficulty_level: item.edu_level === "중학교" ? 1 : 2,
        analysis_json: {
          hanjaList: [
            {
              char: item.hanja,
              meaning: meaning,
              sound: sound,
              level: item.grade || item.edu_level
            }
          ],
          isLoanword: false,
          correctedWord: null
        }
      };
    });

    const { error } = await supabase
      .from("word_analysis_cache")
      .upsert(upsertData, { onConflict: 'word' });

    if (error) {
      console.error(`\n❌ 배치 ${Math.floor(i / batchSize) + 1} 저장 오류:`, error.message);
    } else {
      process.stdout.write(`.`); 
    }
  }

  console.log("\n✅ 모든 기초 한자 데이터 주입 완료!");
}

seed();
