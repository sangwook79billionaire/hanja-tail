const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fastSeed() {
  console.log("📖 기초 한자 원천 데이터 로딩 중...");
  const rawData = JSON.parse(fs.readFileSync("./scripts/hanja_1800_raw.json", "utf8"));
  
  const hanjaMap = new Map();
  rawData.forEach(item => {
    if (!hanjaMap.has(item.hanja)) {
      hanjaMap.set(item.hanja, {
        hanja: item.hanja,
        meaning: item.huneum.split(" ").slice(1, -1).join(" "),
        sound: item.sound,
        level: item.grade
      });
    }
  });

  const uniqueHanja = Array.from(hanjaMap.values());
  console.log(`📊 총 ${uniqueHanja.length}개의 한자를 주입합니다...`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < uniqueHanja.length; i += BATCH_SIZE) {
    const batch = uniqueHanja.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("hanja_master").upsert(batch, { onConflict: 'hanja' });
    
    if (error) {
      console.error(`❌ 배치 ${i} 에러:`, error.message);
    } else {
      console.log(`✅ ${Math.min(i + BATCH_SIZE, uniqueHanja.length)}자 완료`);
    }
  }

  console.log("\n✨ 1,800자 기초 데이터 복구 완료! 이제 지도가 작동합니다.");
}

fastSeed();
