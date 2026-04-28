const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 학습 카테고리 (더 다양하게 확장)
const categories = [
  "자연과 날씨", "가족과 친척", "학교와 공부", "숫자와 시간", "신체와 건강", 
  "반대말과 대조", "감정과 마음", "장소와 건물", "동물과 식물", "도구와 물건",
  "음식과 생활", "방향과 위치", "색깔과 모양", "행동과 움직임", "사회와 나라",
  "과학과 우주", "예술과 음악", "운동과 놀이", "직업과 일", "옷과 장신구"
];

const BATCH_SIZE = 5; 
const DELAY_BETWEEN_BATCHES = 20000; // 20초 (안전하게)
const TARGET_TOTAL = 1000;

async function generateBatch(category, count) {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const prompt = `
    You are a Hanja education expert for kids.
    Category: "${category}"
    Task: Generate ${count} different common Korean Hanja words for kids related to the category.
    
    For each word, provide:
    1. Hangul word
    2. Hanja analysis (char, meaning, sound, level)
    3. A fun quiz (description/hint for the word, do NOT include the word itself in description)
    
    Return ONLY a JSON array of objects:
    [
      {
        "word": "학교",
        "analysis": {
          "hanjaList": [
            { "char": "學", "meaning": "배울", "sound": "학", "level": "8급" },
            { "char": "校", "meaning": "학교", "sound": "교", "level": "8급" }
          ],
          "correctedWord": null,
          "isLoanword": false
        },
        "quiz": {
          "hanja_combination": "學校",
          "description": "선생님과 친구들이 있고, 공부를 하는 곳이에요."
        }
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`❌ [${category}] 생성 중 오류:`, error.message);
    return [];
  }
}

async function saveToDB(data) {
  for (const item of data) {
    try {
      // 1. 단어 분석 캐시 저장
      await supabase.from("word_analysis_cache").upsert({
        word: item.word,
        analysis_json: item.analysis
      });

      // 2. 퀴즈 뱅크 저장
      await supabase.from("quiz_bank").upsert({
        word: item.word,
        hanja_combination: item.quiz.hanja_combination,
        description: item.quiz.description,
        is_verified: true
      });
      
      process.stdout.write(`.`); // 진행 표시
    } catch (e) {
      console.error(`\n❌ ${item.word} 저장 오류:`, e.message);
    }
  }
}

async function run() {
  console.log("🚀 1,000개 단어 대량 생성 및 주입 시작...");
  console.log(`📡 목표: ${TARGET_TOTAL}개 | 배치 크기: ${BATCH_SIZE} | 지연: ${DELAY_BETWEEN_BATCHES/1000}초`);
  
  let totalCount = 0;
  let categoryIdx = 0;

  while (totalCount < TARGET_TOTAL) {
    const category = categories[categoryIdx % categories.length];
    
    const data = await generateBatch(category, BATCH_SIZE);
    if (data && data.length > 0) {
      await saveToDB(data);
      totalCount += data.length;
      console.log(`\n✅ [${category}] 완료 (${totalCount}/${TARGET_TOTAL})`);
    } else {
      console.log(`\n⚠️ [${category}] 데이터 생성 실패, 다음으로 넘어갑니다.`);
    }

    categoryIdx++;
    
    if (totalCount < TARGET_TOTAL) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log("\n✨ 모든 작업이 완료되었습니다!");
}

run();
