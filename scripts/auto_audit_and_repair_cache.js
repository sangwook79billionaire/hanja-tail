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

async function generateContentWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.warn(`⚠️ Gemini API 재시도 (${i + 1}/${maxRetries}):`, err.message);
      await new Promise(r => setTimeout(r, (i + 1) * 3000));
    }
  }
}

async function repairWord(word) {
  console.log(`\n🔄 [자가 치유] '${word}' 복구 분석 시작...`);
  
  const prompt = `
    You are a helpful assistant for teaching Hanja to children.
    Analyze the following word (Hangul or Hanja): "${word}"
    
    1. Check if this Hangul word has multiple common Hanja meanings (homonyms).
       This is EXTREMELY CRITICAL for educational accuracy. Many Korean words share the same Hangul but have different Hanja meanings.
       If there is ANY other common Hanja combination for this Hangul word, you MUST set "isAmbiguous" to true.
       DO NOT guess the user's intent. Even if one meaning is much more common than others, you MUST provide options in "candidates".
       Example: "사과" can be "謝過"(apology) or "沙果"(apple). "배" can be "梨"(pear), "舟"(boat), or "腹"(belly).
    2. If "isAmbiguous" is true, list ALL common Hanja combinations in "candidates" with child-friendly descriptions.
    3. If the user provided a specific Hanja (e.g., "지도(地圖)") or there is only one clear meaning, "isAmbiguous" should be false.
    4. CRITICAL: Check if "${word}" is a REAL, standard Korean dictionary word (사전에 등재된 명사).
       If it is a fake word created by simply combining Hanja (like "신술어" when it doesn't exist in standard dictionaries), 
       or if it's not a common Hanja-based word, set "isValid" to false.
       Also, the word MUST be a PURE Hanja-based word (모든 글자가 한자로 표기 가능해야 함).
       If the word is a hybrid of Hanja and native Hangul (like "우산꽂이" which is "雨傘" + native Korean "꽂이", or "책꽂이" which is "冊" + native "꽂이"), set "isValid" to false. We only study pure Hanja words.
    5. Identify the word type (wordType):
       - "pure_korean" if it is native Korean (순우리말/순한글).
       - "loanword" if it is a foreign loanword (외래어/외국어).
       - "hybrid" if it is a mix of Hanja and native Korean (혼종어).
       - "slang" if it is slang, jargon, or non-standard word (비속어/유행어).
       - "not_in_dictionary" if it's a fake word or not in standard dictionaries.
       - "standard_hanja" if it's a valid standard Hanja word.

    Return ONLY a JSON object in this format:
    {
      "isSafe": boolean,
      "isValid": boolean,
      "wordType": "pure_korean" | "loanword" | "hybrid" | "slang" | "not_in_dictionary" | "standard_hanja",
      "invalidReason": "string (why it is invalid)",
      "isAmbiguous": boolean,
      "candidates": [
        { "word": "한글단어", "hanja": "한자조합", "description": "아이들이 이해하기 쉬운 짧은 뜻풀이" }
      ],
      "correctedWord": "string",
      "difficultyLevel": number (1: Basic/1-2 Grade, 2: Intermediate/3-4 Grade, 3: Advanced/5-6 Grade or Middle),
      "hanjaList": [
        { 
          "char": "한자", 
          "meaning": "뜻", 
          "originalSound": "본음 (예: 녀)", 
          "appliedSound": "두음법칙 적용음 (예: 여)", 
          "level": "급수" 
        }
      ],
      "expansions": [
        { 
          "word": "유의어/반의어", 
          "hanja": "한자조합", 
          "type": "synonym|antonym|related", 
          "description": "설명",
          "difficultyLevel": number
        }
      ]
    }
  `;

  const result = await generateContentWithRetry(prompt);
  const response = await result.response;
  const text = response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON not found in Gemini response");
  
  const data = JSON.parse(jsonMatch[0]);
  if (!data.isSafe || !data.isValid) {
    console.log(`⚠️ '${word}'은 안전하지 않거나 비정상적인 단어로 분석되었습니다. 캐시에서 해당 단어를 삭제합니다.`);
    await supabase.from("word_analysis_cache").delete().eq("word", word);
    return;
  }

  // hanja_master 연동 정보 보강 (actions.ts와 동일하게 구현)
  const finalHanjaList = await Promise.all(
    data.hanjaList.map(async (item) => {
      const { data: dbHanja } = await supabase
        .from("hanja_master")
        .select("meaning, sound, level, example_words")
        .eq("hanja", item.char)
        .maybeSingle();
      
      return {
        ...item,
        meaning: dbHanja?.meaning || item.meaning,
        sound: item.appliedSound || dbHanja?.sound || item.sound,
        originalSound: item.originalSound || dbHanja?.sound || item.sound,
        level: dbHanja?.level || item.level,
        examples: dbHanja?.example_words || []
      };
    })
  );

  // 연관 단어 저장 (자가 증식)
  if (data.expansions && data.expansions.length > 0) {
    for (const exp of data.expansions) {
      if (/[\uac00-\ud7a3]/.test(exp.hanja)) continue;
      await supabase.from("quiz_bank").upsert({
        word: exp.word,
        hanja_combination: exp.hanja,
        description: exp.description,
        difficulty_level: exp.difficultyLevel || data.difficultyLevel || 1,
        is_verified: false
      }, { onConflict: 'word, hanja_combination' }).then();
    }
  }

  const filteredExpansions = (data.expansions || []).filter(exp => !/[\uac00-\ud7a3]/.test(exp.hanja));
  const filteredCandidates = (data.candidates || []).filter(can => !/[\uac00-\ud7a3]/.test(can.hanja));

  const resultData = {
    hanjaList: finalHanjaList,
    correctedWord: data.correctedWord || null,
    isLoanword: data.isLoanword || false,
    expansions: filteredExpansions,
    isAmbiguous: data.isAmbiguous || false,
    candidates: filteredCandidates,
    difficultyLevel: data.difficultyLevel || 1
  };

  // 캐시 데이터베이스 업데이트
  const { error: upsertError } = await supabase.from("word_analysis_cache").upsert({
    word: word,
    analysis_json: resultData
  });

  if (upsertError) {
    console.error(`❌ '${word}' 캐시 갱신 실패:`, upsertError.message);
  } else {
    console.log(`✅ '${word}' 복구 및 캐시 갱신 완료!`);
  }
}

async function runAuditAndRepair() {
  console.log("🔍 [스케줄 워커] 캐시 오디팅 및 자가 복구 시작...");
  
  let cacheEntries = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('word_analysis_cache')
      .select('word, analysis_json')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("캐시 데이터를 가져오는 데 실패했습니다:", error);
      return;
    }

    cacheEntries = cacheEntries.concat(data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log(`전체 ${cacheEntries.length}건 캐시 검사 중...`);
  const corruptedWords = [];

  for (const entry of cacheEntries) {
    const word = entry.word;
    const json = entry.analysis_json;
    
    if (!json || !json.hanjaList) {
      continue;
    }

    const hangulLength = word.length;
    const hanjaLength = json.hanjaList.length;

    if (!json.isAmbiguous && hangulLength !== hanjaLength) {
      const cleanWord = word.replace(/\(.*\)/, "").trim();
      if (cleanWord.length !== hanjaLength) {
        corruptedWords.push(word);
      }
    }
  }

  console.log(`\n발견된 오염 캐시 데이터 총 ${corruptedWords.length}건:`, corruptedWords);

  if (corruptedWords.length > 0) {
    console.log("순차적 자가 복구 프로세스를 시작합니다...");
    for (const word of corruptedWords) {
      try {
        await repairWord(word);
      } catch (err) {
        console.error(`❌ '${word}' 복구 시 에러 발생:`, err.message);
      }
      
      // API RPM 한도 준수를 위한 딜레이 (12.5초)
      console.log("API 딜레이 대기 중 (12.5초)...");
      await new Promise(resolve => setTimeout(resolve, 12500));
    }
    console.log("\n✨ 모든 오염 캐시의 자가 복구 프로세스가 끝났습니다!");
  } else {
    console.log("\n✅ 캐시 정합성이 완벽합니다. 복구할 대상이 없습니다.");
  }
}

runAuditAndRepair();
