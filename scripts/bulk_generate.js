const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 학습 카테고리 (더 다양하고 구체적으로 확장)
const categories = [
  "자연과 날씨 (하늘, 땅, 비, 바람)", "가족과 친척 (부모, 형제, 조상)", 
  "학교와 공부 (공부, 교실, 친구)", "숫자와 시간 (일월, 년시, 대소)", 
  "신체와 건강 (손발, 눈코입, 보행)", "반대말과 대조 (상하, 좌우, 유무)", 
  "감정과 마음 (기쁨, 슬픔, 사랑)", "장소와 건물 (집, 시장, 나라)", 
  "동물과 식물 (나무, 풀, 꽃, 새)", "도구와 물건 (차, 배, 종이, 붓)",
  "음식과 생활 (의식주, 차, 밥)", "방향과 위치 (동서남북, 내외)", 
  "색깔과 모양 (청홍, 원방)", "행동과 움직임 (출입, 진퇴)", 
  "사회와 나라 (국가, 국민, 평화)", "과학과 우주 (태양, 지구, 별)", 
  "예술과 음악 (노래, 그림)", "운동과 놀이 (수영, 등산)", 
  "직업과 일 (농부, 의사)", "법과 질서 (정의, 효도)"
];

const BATCH_SIZE = 50; 
const DELAY_BETWEEN_BATCHES = 60000; // 60초 (대용량 처리를 위해 대기 시간도 늘림)
const TARGET_TOTAL = 1800; // 최종 목표 1,800자 대비

async function generateBatch(category, count) {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const prompt = `
    You are a Hanja education expert for Korean kids.
    Category: "${category}"
    Task: Generate ${count} different common Korean Hanja words for kids related to the category.
    
    For each word, provide:
    1. Hangul word (e.g., "학교")
    2. Hanja analysis (char, meaning, sound, level)
    3. A fun quiz (description/hint for the word, do NOT include the word itself)
    4. Difficulty level (1: Very Basic, 2: Elementary, 3: Advanced/Junior High)
    
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
      
      process.stdout.write(`.`); // 진행 표시
    } catch (e) {
      console.error(`\n❌ ${item.word} 저장 오류:`, e.message);
    }
  }
}

async function run() {
  console.log("🚀 1,800자 목표 대량 생성 및 주입 시작...");
  console.log(`📡 목표: ${TARGET_TOTAL}개 | 배치 크기: ${BATCH_SIZE} | 지연: ${DELAY_BETWEEN_BATCHES/1000}초`);
  
  let totalCount = 0;
  let categoryIdx = 0;

  // DB에 이미 몇 개가 있는지 확인하여 시작점 계산 (간단하게)
  const { count } = await supabase.from("quiz_bank").select("*", { count: "exact", head: true });
  totalCount = count || 0;
  console.log(`📊 현재 DB에 ${totalCount}개의 단어가 있습니다.`);

  while (totalCount < TARGET_TOTAL) {
    const category = categories[categoryIdx % categories.length];
    
    console.log(`\n📦 [${category}] 분석 중...`);
    const data = await generateBatch(category, BATCH_SIZE);
    
    if (data && data.length > 0) {
      await saveToDB(data);
      totalCount += data.length;
      console.log(`\n✅ 완료 (${totalCount}/${TARGET_TOTAL})`);
    } else {
      console.log(`\n⚠️ 데이터 생성 실패, 다음 배치를 시도합니다.`);
    }

    categoryIdx++;
    
    if (totalCount < TARGET_TOTAL) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log("\n✨ 모든 작업이 완료되었습니다!");
}

run();

