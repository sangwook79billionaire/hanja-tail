require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function autoAudit() {
  console.log("🤖 AI 자동 검수 시작 (전체 428개)...");
  
  const { data: quizzes } = await supabase.from('quiz_bank').select('*');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  // 50개씩 청크로 나누어 검수
  const chunkSize = 50;
  let allSuspicious = [];

  for (let i = 0; i < quizzes.length; i += chunkSize) {
    const chunk = quizzes.slice(i, i + chunkSize);
    const chunkText = chunk.map(q => `[${q.word}](${q.hanja_combination}): ${q.description}`).join("\n");

    const prompt = `
      다음을 검수해주세요. 
      어색하거나, 틀렸거나, 단순 나열형(예: 금산 - 금이 많은 산), 오타(한글/한자), 설명 내 정답 포함 사례를 찾아 JSON 배열로만 반환하세요.
      [{ "word": "단어", "reason": "이유", "suggestion": "개선안" }]
      
      목록:
      ${chunkText}
    `;

    let success = false;
    while (!success) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suspicious = JSON.parse(jsonMatch[0]);
          
          // 실시간 저장
          let currentList = [];
          try {
            if (require('fs').existsSync('suspicious_words.json')) {
              currentList = JSON.parse(require('fs').readFileSync('suspicious_words.json', 'utf8'));
            }
          } catch(e) {}
          
          currentList = [...currentList, ...suspicious];
          require('fs').writeFileSync('suspicious_words.json', JSON.stringify(currentList, null, 2));
          
          allSuspicious = currentList;
          console.log(`⏳ ${i + chunk.length}/${quizzes.length} 완료... (+${suspicious.length}건 발굴!)`);
        }
        success = true;
        // 할당량 보존을 위한 휴식
        await new Promise(r => setTimeout(r, 20000));
      } catch (e) {
        if (e.status === 429 || e.message.includes("429")) {
          console.log("⚠️ 할당량 초과! 30초 후 다시 시도합니다...");
          await new Promise(r => setTimeout(r, 30000));
        } else {
          console.error("Error:", e);
          success = true; // 기타 에러는 스킵
        }
      }
    }
  }

  console.log(`\n🚨 총 ${allSuspicious.length}개의 의심되는 데이터를 찾았습니다.`);
  require('fs').writeFileSync('suspicious_words.json', JSON.stringify(allSuspicious, null, 2));
  console.log("✨ suspicious_words.json에 저장되었습니다.");
}

autoAudit();
