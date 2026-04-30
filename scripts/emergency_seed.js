require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const emergencyWords = [
  {
    word: "과자",
    analysis: {
      hanjaList: [
        { char: "菓", meaning: "과자/실과", sound: "과", level: "4급" },
        { char: "子", meaning: "아들/자식", sound: "자", level: "8급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  },
  {
    word: "사과",
    analysis: {
      hanjaList: [
        { char: "沙", meaning: "모래", sound: "사", level: "4급" },
        { char: "果", meaning: "열매/결과", sound: "과", level: "6급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  },
  {
    word: "우유",
    analysis: {
      hanjaList: [
        { char: "牛", meaning: "소", sound: "우", level: "8급" },
        { char: "乳", meaning: "젖", sound: "유", level: "4급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  },
  {
    word: "포도",
    analysis: {
      hanjaList: [
        { char: "葡", meaning: "포도", sound: "포", level: "1급" },
        { char: "萄", meaning: "포도", sound: "도", level: "1급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  }
];

async function seed() {
  console.log("🚀 긴급 단어 캐싱 시작...");
  for (const item of emergencyWords) {
    const { error } = await supabase
      .from('word_analysis_cache')
      .upsert({
        word: item.word,
        analysis_json: item.analysis
      });
    
    if (error) {
      console.error(`❌ ${item.word} 저장 실패:`, error);
    } else {
      console.log(`✅ ${item.word} 저장 완료!`);
    }
  }
  console.log("✨ 작업 완료!");
}

seed();
