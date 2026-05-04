const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 📊 RPM & TPM 기반 모델 설정
const MODEL_CONFIGS = {
  "gemini-3-flash": { rpm: 5, tpm: 250000, lastCalled: 0 },
  "gemini-2.5-flash": { rpm: 5, tpm: 250000, lastCalled: 0 },
  "gemini-flash-latest": { rpm: 5, tpm: 250000, lastCalled: 0 }
};
const MODELS = Object.keys(MODEL_CONFIGS);
let modelIndex = 0;

async function getExistingHanja() {
  const { data } = await supabase.from("quiz_bank").select("hanja_combination");
  const hanjaSet = new Set();
  data?.forEach(item => {
    const matches = item.hanja_combination?.match(/[\u4e00-\u9faf]/g);
    matches?.forEach(char => hanjaSet.add(char));
  });
  return Array.from(hanjaSet);
}

async function generateNewWords(hanjaPool, count = 50) {
  const currentModelName = MODELS[modelIndex % MODELS.length];
  const config = MODEL_CONFIGS[currentModelName];
  modelIndex++;

  // ⏱️ RPM 제한 (5 RPM = 12초 간격) 준수 체크
  const now = Date.now();
  const elapsed = now - config.lastCalled;
  const minInterval = (60000 / config.rpm) + 1000; // 12초 + 1초 버퍼

  if (elapsed < minInterval) {
    const wait = minInterval - elapsed;
    await new Promise(r => setTimeout(r, wait));
  }

  const model = genAI.getGenerativeModel({ model: currentModelName });
  config.lastCalled = Date.now();

  const sampledHanja = hanjaPool.sort(() => 0.5 - Math.random()).slice(0, 40).join(", ");
  console.log(`🤖 [${currentModelName}] 호출 (목표: ${count}개 | TPM 활용 중...)`);

  const prompt = `
    한자 리스트 [${sampledHanja}] 중 최소 하나를 포함하는 
    아이들용 한자 단어(2자~3자 혼합) ${count}개와 퀴즈를 생성해줘.
    특히 '도서관', '운동장', '학부모' 같은 3자 단어도 30% 이상 포함할 것.
    결과는 반드시 아래 JSON 배열 형식이어야 함:
    [{"word":"단어","hanja_combination":"한자","description":"퀴즈","analysis":[{"char":"한","meaning":"뜻","sound":"음","level":"급수"}]}]
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (error) {
    throw error;
  }
}

async function saveResults(data) {
  process.stdout.write(`💾 ${data.length}개 저장: `);
  for (const item of data) {
    await supabase.from("quiz_bank").upsert({
      word: item.word,
      hanja_combination: item.hanja_combination,
      description: item.description,
      is_verified: true
    }, { onConflict: 'word' });
    process.stdout.write(".");
  }
  console.log(" 완료!");
}

async function run() {
  const TARGET = 2000;
  let totalAdded = 0;

  console.log(`🚀 RPM(5) & TPM(250K) 하이퍼 최적화 가동! (목표: ${TARGET}개)`);

  while (totalAdded < TARGET) {
    try {
      const hanjaPool = await getExistingHanja();
      const newWords = await generateNewWords(hanjaPool, 50);
      
      if (newWords.length > 0) {
        await saveResults(newWords);
        totalAdded += newWords.length;
        console.log(`📊 현재 진행 상황: ${totalAdded}/${TARGET} (${((totalAdded/TARGET)*100).toFixed(1)}%)`);
      }
    } catch (error) {
      if (error.message.includes("429") || error.message.includes("Quota")) {
        console.log("\n🛑 할당량 제한 감지! 90초간 전원 휴식...");
        await new Promise(r => setTimeout(r, 90000));
      } else {
        console.error("\n❌ 에러:", error.message);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }
  console.log("\n✨ 모든 자동화 임무 완수!");
}

run();
