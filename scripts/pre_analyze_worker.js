const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !apiKey) {
  console.error("❌ 필수 환경 변수가 누락되었습니다 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function preAnalyze() {
  console.log("🚀 [무한 증식 워커] 가동 시작...");

  // 1. 아직 분석되지 않은 퀴즈 단어 가져오기
  const { data: quizzes, error: quizError } = await supabase
    .from('quiz_bank')
    .select('word')
    .order('created_at', { ascending: false })
    .limit(50);

  if (quizError) {
    console.error("❌ 퀴즈 뱅크 조회 실패:", quizError.message);
    return;
  }

  if (!quizzes || quizzes.length === 0) {
    console.log("분석할 퀴즈 단어가 없습니다.");
    return;
  }

  let processedCount = 0;

  for (const quiz of quizzes) {
    if (!quiz.word) continue;

    // 이미 캐시에 있는지 확인
    const { data: existing } = await supabase
      .from('word_analysis_cache')
      .select('word')
      .eq('word', quiz.word)
      .maybeSingle();

    if (existing) {
      console.log(`⏩ [${quiz.word}] 이미 캐싱됨`);
      continue;
    }

    console.log(`🔍 [${quiz.word}] 분석 및 증식 중...`);

    const prompt = `
      한자 단어 '${quiz.word}'를 정밀 분석해줘.
      1. 각 글자의 뜻, 음, 급수 정보를 한자 마스터 기준으로 작성.
      2. 이 단어와 비슷한 단어(synonym), 반대 단어(antonym), 연관 3자 단어(expansion)를 각각 최소 1개씩 추천해줘.
      결과는 반드시 JSON 형식으로만 응답:
      {"hanjaList":[{"char":"한","meaning":"뜻","sound":"음","level":"급수"}], "expansions":[{"word":"추천단어","hanja":"한자","description":"풀이","type":"synonym|antonym|expansion"}]}
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // 캐시 저장
        await supabase.from('word_analysis_cache').upsert({
          word: quiz.word,
          analysis_json: analysis
        });

        // 새로운 연관 단어들 퀴즈 뱅크에 추가 (자가 증식)
        if (analysis.expansions && Array.isArray(analysis.expansions)) {
          for (const exp of analysis.expansions) {
            if (!exp.word || !exp.hanja) continue;
            if (/[\uac00-\ud7a3]/.test(exp.hanja)) continue;
            await supabase.from('quiz_bank').upsert({
              word: exp.word,
              hanja_combination: exp.hanja,
              description: exp.description || `${exp.word}의 뜻풀이`,
              is_verified: false
            }, { onConflict: 'word, hanja_combination' });
          }
        }
        processedCount++;
        console.log(`✅ [${quiz.word}] 완료 (증식 단어: ${analysis.expansions?.length || 0}개)`);
      }
      
      // API RPM 준수 (2.5초 대기)
      await new Promise(r => setTimeout(r, 2500));
    } catch (e) {
      console.error(`❌ [${quiz.word}] 실패:`, e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`🎉 [무한 증식 워커] 완료! 신규 분석 단어 수: ${processedCount}개`);
}

preAnalyze().catch(err => {
  console.error("Worker fatal error:", err);
  process.exit(1);
});
