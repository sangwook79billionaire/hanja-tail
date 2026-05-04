const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function preAnalyze() {
  console.log("🚀 [무한 증식 워커] 가동 시작...");

  // 1. 아직 분석되지 않은 퀴즈 단어 가져오기
  const { data: quizzes } = await supabase
    .from('quiz_bank')
    .select('word')
    .order('created_at', { ascending: false })
    .limit(200);

  for (const quiz of quizzes) {
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
        if (analysis.expansions) {
          for (const exp of analysis.expansions) {
            await supabase.from('quiz_bank').upsert({
              word: exp.word,
              hanja_combination: exp.hanja,
              description: exp.description,
              is_verified: false
            }, { onConflict: 'word' }).then();
          }
        }
        console.log(`✅ [${quiz.word}] 완료 (증식 단어: ${analysis.expansions?.length || 0}개)`);
      }
      
      // RPM 제한 준수 (5 RPM 기준 12초 대기)
      await new Promise(r => setTimeout(r, 12500));
    } catch (e) {
      console.error(`❌ [${quiz.word}] 실패:`, e.message);
      await new Promise(r => setTimeout(r, 60000));
    }
  }
}

preAnalyze();
