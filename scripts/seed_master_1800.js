const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedMaster() {
  console.log("📖 기초 한자 1,800자 원천 데이터 읽는 중...");
  const rawData = JSON.parse(fs.readFileSync("./scripts/hanja_1800_raw.json", "utf8"));
  
  // 중복 제거 및 유니크 한자 추출
  const hanjaMap = new Map();
  rawData.forEach(item => {
    if (!hanjaMap.has(item.hanja)) {
      hanjaMap.set(item.hanja, {
        hanja: item.hanja,
        meaning: item.huneum.split(" ").slice(1, -1).join(" "), // '더할' 추출
        sound: item.sound,
        level: item.grade
      });
    }
  });

  const uniqueHanja = Array.from(hanjaMap.values());
  console.log(`📊 총 ${uniqueHanja.length}개의 유니크 한자 확보!`);

  const BATCH_SIZE = 30;
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  for (let i = 0; i < uniqueHanja.length; i += BATCH_SIZE) {
    const batch = uniqueHanja.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 배치 처리 중... (${i + 1} ~ ${Math.min(i + BATCH_SIZE, uniqueHanja.length)})`);

    const prompt = `
      다음 한자들에 대해 각각 실생활에서 자주 쓰이는 예시 단어 3개(한글/한자 조합)를 생성해줘.
      대상 한자: [${batch.map(h => h.hanja).join(", ")}]
      
      결과는 반드시 다음 JSON 배열 형식이어야 함:
      [
        {
          "hanja": "加",
          "examples": [
            {"word": "추가", "hanja": "追加"},
            {"word": "가속", "hanja": "加速"},
            {"word": "참가", "hanja": "參加"}
          ]
        }
      ]
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const exampleData = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      // DB 주입
      for (const h of batch) {
        const examples = exampleData.find(e => e.hanja === h.hanja)?.examples || [];
        
        await supabase.from("hanja_master").upsert({
          hanja: h.hanja,
          meaning: h.meaning,
          sound: h.sound,
          level: h.level,
          example_words: examples // JSONB 컬럼
        }, { onConflict: 'hanja' });
        
        process.stdout.write(".");
      }

      // RPM 제한 고려 (15초 대기)
      await new Promise(r => setTimeout(r, 15000));
    } catch (e) {
      console.error(`\n❌ 배치 처리 중 에러:`, e.message);
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  console.log("\n✨ 1,800자 마스터 시딩 완료!");
}

seedMaster();
