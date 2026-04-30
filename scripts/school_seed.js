require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const schoolWords = [
  {
    word: "학교",
    analysis: {
      hanjaList: [
        { char: "學", meaning: "배우다", sound: "학", level: "8급" },
        { char: "校", meaning: "학교", sound: "교", level: "8급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  },
  {
    word: "교장",
    analysis: {
      hanjaList: [
        { char: "校", meaning: "학교", sound: "교", level: "8급" },
        { char: "長", meaning: "어른/길다", sound: "장", level: "8급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  },
  {
    word: "학생",
    analysis: {
      hanjaList: [
        { char: "學", meaning: "배우다", sound: "학", level: "8급" },
        { char: "生", meaning: "날/태어나다", sound: "생", level: "8급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  },
  {
    word: "교실",
    analysis: {
      hanjaList: [
        { char: "敎", meaning: "가르치다", sound: "교", level: "7급" },
        { char: "室", meaning: "집/방", sound: "실", level: "7급" }
      ],
      correctedWord: null,
      isLoanword: false
    }
  }
];

async function seed() {
  console.log("🚀 학교 관련 단어 캐싱 시작...");
  for (const item of schoolWords) {
    await supabase.from('word_analysis_cache').upsert({
      word: item.word,
      analysis_json: item.analysis
    });
    console.log(`✅ ${item.word} 저장 완료!`);
  }
  console.log("✨ 작업 완료!");
}

seed();
