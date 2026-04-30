const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 목표 설정
const TARGET_TOTAL = 2000;
const BATCH_SIZE = 50; // 한 번의 요청으로 50개 생성 (쿼터 효율 극대화)
const DELAY_BETWEEN_BATCHES = 65000; // 65초 (안전하게)

async function generateWordsBatch(characters, count) {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const charList = characters.join(', ');
  const prompt = `
    You are a Hanja education expert for Korean kids.
    Input Characters: [${charList}]
    
    Task: Choose ${count} Hanja from the input list and generate 1 common Korean word for EACH chosen character that kids should know.
    
    For each word, provide:
    1. Hangul word (e.g., "학교")
    2. Hanja analysis (char, meaning, sound, level)
    3. A fun quiz (description/hint for the word, do NOT include the word itself)
    4. Difficulty level (1: Very Basic, 2: Elementary, 3: Advanced)
    
    Return ONLY a JSON array of objects:
    [
      {
        "word": "학교",
        "difficulty": 1,
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
    console.error(`❌ 생성 중 오류:`, error.message);
    return [];
  }
}

async function saveToDB(data) {
  let savedCount = 0;
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
      savedCount++;
      process.stdout.write(`.`);
    } catch (e) {
      // console.error(`\n❌ ${item.word} 저장 오류:`, e.message);
    }
  }
  return savedCount;
}

async function run() {
  console.log("🚀 [Hanja World] 2,000개 핵심 어휘 자동 구축 마스터 스크립트 실행...");
  
  // 1. 원본 한자 데이터 읽기
  const hanjaSource = JSON.parse(fs.readFileSync('scripts/hanja_1800_raw.json', 'utf8'));
  const allHanja = hanjaSource.map(h => h.hanja);
  
  // 2. 현재 DB 상태 확인
  const { count: currentCount } = await supabase.from("quiz_bank").select("*", { count: "exact", head: true });
  let totalSaved = currentCount || 0;
  console.log(`📊 현재 DB에 ${totalSaved}개의 단어가 있습니다. 목표는 ${TARGET_TOTAL}개입니다.`);

  let charIndex = totalSaved; // 대략적인 시작 지점

  while (totalSaved < TARGET_TOTAL) {
    // 한자 리스트에서 다음 배치용 한자들 추출
    const targetChars = allHanja.slice(charIndex % allHanja.length, (charIndex % allHanja.length) + BATCH_SIZE);
    
    console.log(`\n📦 새로운 배치 생성 중... (대상 한자: ${targetChars[0]} 등 ${targetChars.length}자)`);
    
    const data = await generateWordsBatch(targetChars, BATCH_SIZE);
    
    if (data && data.length > 0) {
      const saved = await saveToDB(data);
      totalSaved += saved;
      charIndex += BATCH_SIZE;
      console.log(`\n✅ 배치 완료! 현재 총 ${totalSaved}/${TARGET_TOTAL}개 구축됨.`);
    } else {
      console.log(`\n⚠️ 생성 실패. 1분 후 재시도합니다...`);
      await new Promise(resolve => setTimeout(resolve, 60000));
      continue;
    }

    if (totalSaved < TARGET_TOTAL) {
      console.log(`⏳ 다음 배치를 위해 ${DELAY_BETWEEN_BATCHES/1000}초 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log("\n✨ 축하합니다! 2,000개 핵심 어휘 구축이 모두 완료되었습니다!");
}

run();
