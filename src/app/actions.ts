"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export async function analyzeWord(word: string) {
  if (!word) return { error: "단어를 입력해주세요." };

  const supabase = createClient();
  const searchWord = word.trim();
  try {
    const hasHanjaBracket = searchWord.includes("(") && searchWord.includes(")");
    
    // 1. 동음이의어 DB 체크 (최우선: 한자 조합이 명시되지 않은 경우만)
    if (!hasHanjaBracket) {
      // (1) 퀴즈 뱅크에서 후보 찾기
      const { data: quizCandidates } = await supabase
        .from("quiz_bank")
        .select("word, hanja_combination, description")
        .eq("word", searchWord);

      // (2) 한자 마스터의 예시 단어들에서 후보 찾기
      const { data: masterHanjas } = await supabase
        .from("hanja_master")
        .select("example_words")
        .filter("example_words", "cs", `[{"word": "${searchWord}"}]`);

      const dbCandidates: { word: string; hanja: string; description: string }[] = [];
      const seenHanja = new Set();

      quizCandidates?.forEach(c => {
        if (!seenHanja.has(c.hanja_combination)) {
          dbCandidates.push({ word: c.word, hanja: c.hanja_combination, description: c.description });
          seenHanja.add(c.hanja_combination);
        }
      });

      masterHanjas?.forEach(h => {
        const examples = h.example_words || [];
        examples.forEach((ex: { word: string; hanja: string }) => {
          if (ex.word === searchWord && !seenHanja.has(ex.hanja)) {
            dbCandidates.push({ word: ex.word, hanja: ex.hanja, description: `${ex.hanja}를 사용하는 단어` });
            seenHanja.add(ex.hanja);
          }
        });
      });

      if (dbCandidates.length > 1) {
        return { isAmbiguous: true, candidates: dbCandidates };
      }
    }

    // 1. 단어 정규화 (괄호와 한자 제거: '의료(醫療)' -> '의료')
    const normalizedWord = searchWord.replace(/\(.*\)/, "").trim();
    const cacheKey = hasHanjaBracket ? searchWord : normalizedWord;

    // 2. DB 캐시 확인
    const { data: cachedData } = await supabase
      .from("word_analysis_cache")
      .select("analysis_json")
      .eq("word", cacheKey)
      .maybeSingle();

    if (cachedData) {
      console.log("Using cached analysis for:", cacheKey);
      return cachedData.analysis_json;
    }


    // 3. 캐시가 없으면 Gemini 호출
    console.log("No cache found. Calling Gemini for:", searchWord);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "Gemini API 키가 설정되지 않았습니다. 배포 설정을 확인해주세요." };
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are a helpful assistant for teaching Hanja to children.
      Analyze the following word (Hangul or Hanja): "${searchWord}"
      
      1. Check if this Hangul word has multiple common Hanja meanings (homonyms).
         This is EXTREMELY CRITICAL for educational accuracy. Many Korean words share the same Hangul but have different Hanja meanings.
         If there is ANY other common Hanja combination for this Hangul word, you MUST set "isAmbiguous" to true.
         DO NOT guess the user's intent. Even if one meaning is much more common than others, you MUST provide options in "candidates".
         Example: "사과" can be "謝過"(apology) or "沙果"(apple). "배" can be "梨"(pear), "舟"(boat), or "腹"(belly).
      2. If "isAmbiguous" is true, list ALL common Hanja combinations in "candidates" with child-friendly descriptions.
      3. If the user provided a specific Hanja (e.g., "지도(地圖)") or there is only one clear meaning, "isAmbiguous" should be false.
      4. CRITICAL: Check if "${searchWord}" is a REAL, standard Korean dictionary word (사전에 등재된 명사).
         If it is a fake word created by simply combining Hanja (like "신술어" when it doesn't exist in standard dictionaries), 
         or if it's not a common Hanja-based word, set "isValid" to false.
         Also, the word MUST be a PURE Hanja-based word (모든 글자가 한자로 표기 가능해야 함).
         If the word is a hybrid of Hanja and native Hangul (like "우산꽂이" which is "雨傘" + native Korean "꽂이", or "책꽂이" which is "冊" + native "꽂이"), set "isValid" to false. We only study pure Hanja words.

      Return ONLY a JSON object in this format:
      {
        "isSafe": boolean,
        "isValid": boolean,
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const data = JSON.parse(jsonMatch[0]);

    if (!data.isSafe) return { error: "부적절한 표현이 포함되어 있습니다." };
    if (data.isValid === false) {
      console.warn(`Invalid word detected: ${searchWord}. Reason: ${data.invalidReason}`);
      // 비정상 단어 로그 기록 (백단 모니터링용)
      supabase.from("monitoring_log").insert({
        event_type: "invalid_word",
        word: searchWord,
        reason: data.invalidReason,
        details: data
      }).then();
      
      return { error: `아쉽게도 '${searchWord}'(은)는 사전에 없는 단어인 것 같아요. 한자 카드를 다시 확인하거나 다른 단어를 찾아볼래?` };
    }

    if (data.isAmbiguous) {
      // AI가 새롭게 찾아낸 동음이의어 후보들을 DB에 저장 (자가 증식)
      if (data.candidates && data.candidates.length > 0) {
        for (const can of data.candidates) {
          // 한자에 한글이 섞여 있는 혼종 단어는 저장 제외
          if (/[\uac00-\ud7a3]/.test(can.hanja)) {
            continue;
          }
          supabase.from("quiz_bank").upsert({
            word: can.word,
            hanja_combination: can.hanja,
            description: can.description,
            is_verified: false
          }, { onConflict: 'word, hanja_combination' }).then();
        }
      }
      
      interface CandidateItem {
        word: string;
        hanja: string;
        description: string;
      }

      const filteredCandidates = (data.candidates as CandidateItem[] || []).filter((can) => {
        return !/[\uac00-\ud7a3]/.test(can.hanja);
      });

      return {
        isAmbiguous: true,
        candidates: filteredCandidates
      };
    }

    interface HanjaItem {
      char: string;
      meaning: string;
      sound: string;
      originalSound?: string;
      appliedSound?: string;
      level: string;
    }

    // 한자 마스터에서 3개 예시 단어 및 상세 정보 보강
    const finalHanjaList = await Promise.all(
      data.hanjaList.map(async (item: HanjaItem) => {
        const { data: dbHanja } = await supabase
          .from("hanja_master")
          .select("meaning, sound, level, example_words")
          .eq("hanja", item.char)
          .maybeSingle();
        
        return {
          ...item,
          meaning: dbHanja?.meaning || item.meaning,
          sound: item.appliedSound || dbHanja?.sound || item.sound, // 두음법칙 적용음 우선
          originalSound: item.originalSound || dbHanja?.sound || item.sound,
          level: dbHanja?.level || item.level,
          examples: dbHanja?.example_words || []
        };
      })
    );

    // [중요] 연관 단어들을 DB(quiz_bank)에 선제적으로 저장 (자가 증식)
    if (data.expansions && data.expansions.length > 0) {
      for (const exp of data.expansions) {
        // 한자에 한글이 섞여 있는 혼종 단어는 저장 제외
        if (/[\uac00-\ud7a3]/.test(exp.hanja)) {
          continue;
        }
        supabase.from("quiz_bank").upsert({
          word: exp.word,
          hanja_combination: exp.hanja,
          description: exp.description,
          difficulty_level: exp.difficultyLevel || data.difficultyLevel || 1,
          is_verified: false // AI 생성형이므로 나중에 검증 필요
        }, { onConflict: 'word, hanja_combination' }).then();
      }
    }
    
    interface ExpansionItem {
      word: string;
      hanja: string;
      type: string;
      description: string;
      difficultyLevel?: number;
    }

    interface CandidateItem {
      word: string;
      hanja: string;
      description: string;
    }

    const filteredExpansions = (data.expansions as ExpansionItem[] || []).filter((exp) => {
      return !/[\uac00-\ud7a3]/.test(exp.hanja);
    });

    const filteredCandidates = (data.candidates as CandidateItem[] || []).filter((can) => {
      return !/[\uac00-\ud7a3]/.test(can.hanja);
    });

    const resultData = { 
      hanjaList: finalHanjaList,
      correctedWord: data.correctedWord || null,
      isLoanword: data.isLoanword || false,
      expansions: filteredExpansions,
      isAmbiguous: data.isAmbiguous || false,
      candidates: filteredCandidates,
      difficultyLevel: data.difficultyLevel || 1
    };

    await supabase.from("word_analysis_cache").upsert({
      word: cacheKey,
      analysis_json: resultData
    });
    
    return resultData;
  } catch (error: unknown) {
    console.error("Gemini Analysis Error:", error);
    const err = error as { status?: number; message?: string };
    if (err?.status === 429 || err?.message?.includes("429")) {
      return { error: "한자 박사님이 지금 골똘히 생각 중이에요! 잠시만(30초~1분) 기다렸다가 다시 물어봐 줄래? 그동안 다른 단어를 먼저 찾아봐도 좋아!" };
    }
    return { error: "단어 분석 중 오류가 발생했습니다. API 키를 확인해주세요." };
  }
}

async function verifyWordWithGemini(word: string, hanjaCombination: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return false;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  });

  const prompt = `
    You are a strict Korean lexicographer.
    Evaluate the following Korean word and its Hanja combination:
    - Word (Hangul): "${word}"
    - Hanja combination: "${hanjaCombination}"

    Is this word a standard, real noun in the Korean language?
    Confirm if it exists in the Standard Korean Dictionary (표준국어대사전) or is a commonly understood Hanja-based Korean noun.
    
    CRITICAL: 
    - If this word is an artificial, unnatural, or awkward Hanja combination that is not commonly used or recognized in Korea (a hallucinated word), set "isValid" to false.
    - If it is a real standard noun commonly understood in Korea, set "isValid" to true.
    - The word MUST be a PURE Hanja-based word (모든 글자가 한자로 대응). If the word is a hybrid of Hanja and native Hangul (like "우산꽂이" which is "雨傘" + native Korean "꽂이", or "책꽂이" which is "冊" + native "꽂이"), you MUST set "isValid" to false.

    Response format:
    {
      "isValid": boolean,
      "reason": "brief explanation"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return false;
    const data = JSON.parse(jsonMatch[0]);
    console.log(`[Validation result for ${word} (${hanjaCombination})]:`, data);
    return !!data.isValid;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}

async function generateQuizForPreVerifiedWord(word: string, hanjaCombination: string, targetHanja: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    You are a Hanja quiz generator for kids.
    Target Hanja (Unicode character): "${targetHanja}"
    Selected Word (Hangul): "${word}"
    Hanja Combination: "${hanjaCombination}"
    
    Task:
    1. Write a fun, kid-friendly description/hint that explains the meaning of the word "${word}" WITHOUT using the word itself or any of its syllables.
    2. The hint should be simple enough for children (ages 6-10) to understand and guess the word.
    
    Return ONLY a JSON object in this format:
    {
      "word": "${word}",
      "hanja_combination": "${hanjaCombination}",
      "description": "아이들이 좋아할 만한 친절하고 재미있는 힌트. (절대 단어 이름을 직접 언급하거나 'OO의 의미' 같은 표현을 쓰지 마세요!)",
      "difficulty_level": number (1: Basic/1-2 Grade, 2: Intermediate/3-4 Grade, 3: Advanced/5-6 Grade+),
      "hanja_list": [
        { "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON not found in response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuiz(hanja: string, excludedWords?: string[]) {
  if (!hanja) return { error: "한자를 선택해주세요." };

  const supabase = createClient();

  try {
    // 1. DB에서 먼저 확인: 이미 검증된(is_verified = true) 해당 한자가 포함된 기존 단어들을 찾습니다.
    let query = supabase
      .from("quiz_bank")
      .select("*")
      .ilike("hanja_combination", `%${hanja}%`)
      .eq("is_verified", true)
      .limit(20);

    if (excludedWords && excludedWords.length > 0) {
      query = query.not("word", "in", `(${excludedWords.join(',')})`);
    }

    const { data: existingQuizzes } = await query;

    if (existingQuizzes && existingQuizzes.length > 0) {
      const randomIndex = Math.floor(Math.random() * existingQuizzes.length);
      const quiz = existingQuizzes[randomIndex];
      console.log(`[Quiz DB Select] 검증된 기존 퀴즈 선택: ${quiz.word}`);
      return { quiz };
    }

    // 2. hanja_master 테이블의 example_words에서 단어 가져와서 생성 시도
    const { data: masterData } = await supabase
      .from("hanja_master")
      .select("example_words")
      .eq("hanja", hanja)
      .maybeSingle();

    interface ExampleWord {
      word: string;
      hanja: string;
    }

    const verifiedExamples = (masterData?.example_words as ExampleWord[] || []).filter((ex) => {
      const w = ex?.word;
      const h = ex?.hanja;
      return typeof w === 'string' && typeof h === 'string' && h.includes(hanja);
    });

    const filteredExamples = excludedWords && excludedWords.length > 0
      ? verifiedExamples.filter((ex) => !excludedWords.includes(ex.word))
      : verifiedExamples;

    if (filteredExamples.length > 0) {
      const selected = filteredExamples[Math.floor(Math.random() * filteredExamples.length)];
      console.log(`[Quiz DB Select] 마스터 테이블 예시 단어 선택: ${selected.word} (${selected.hanja})`);
      
      let retryCount = 0;
      while (retryCount < 3) {
        try {
          const quizData = await generateQuizForPreVerifiedWord(selected.word, selected.hanja, hanja);
          
          // 퀄리티 체크
          const desc = quizData.description || "";
          if (desc.length < 10 || desc.includes(selected.word) || desc.includes("의미") || desc.includes("뜻하는")) {
            throw new Error("Poor description quality.");
          }

          // 선제적 캐싱
          await supabase.from("word_analysis_cache").upsert({
            word: quizData.word,
            analysis_json: {
              hanjaList: quizData.hanja_list,
              correctedWord: null,
              isLoanword: false,
              difficultyLevel: quizData.difficulty_level || 1
            }
          });

          // quiz_bank에도 저장 (마스터의 검증된 단어이므로 자동으로 검증완료 처리)
          const { data: newQuiz } = await supabase
            .from("quiz_bank")
            .upsert({
              word: quizData.word,
              hanja_combination: quizData.hanja_combination,
              description: quizData.description,
              difficulty_level: quizData.difficulty_level || 1,
              is_verified: true
            }, { onConflict: 'word, hanja_combination' })
            .select()
            .single();

          return { quiz: newQuiz || quizData };
        } catch {
          retryCount++;
        }
      }
    }

    // 3. 만약 검증된 단어가 없다면, 신규 AI 생성 후 엄격한 교차 검증(Double-Pass Verification) 수행
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "Gemini API 키가 설정되지 않았습니다." };
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const generatorPrompt = `
      You are a Hanja quiz generator for kids.
      Target Hanja (Unicode character): "${hanja}"
      
      Task:
      1. Find a VERY COMMON, EVERYDAY Korean noun (2~3 letters) that children (ages 6-10) definitely know.
      2. The word MUST contain the SPECIFIC Hanja character "${hanja}" in its Hanja representation.
      3. Write a fun, kid-friendly description/hint that explains the meaning of the word WITHOUT using the word itself.
      4. CRITICAL: "word" field MUST be in HANGUL only. "hanja_combination" MUST be in HANJA.
      
      Return ONLY a JSON object in this format:
      {
        "word": "정답 단어 (한글 - 반드시 한글만!)",
        "hanja_combination": "정답 단어 (한자 - 반드시 '${hanja}' 포함)",
        "description": "아이들이 좋아할 만한 친절하고 재미있는 힌트. (절대 단어 이름을 직접 언급하거나 'OO의 의미' 같은 표현을 쓰지 마세요!)",
        "difficulty_level": number (1: Basic/1-2 Grade, 2: Intermediate/3-4 Grade, 3: Advanced/5-6 Grade+),
        "hanja_list": [
          { "char": "한자", "meaning": "뜻", "sound": "음", "level": "급수" }
        ]
      }
    `;

    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const result = await model.generateContent(generatorPrompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");
        const quizData = JSON.parse(jsonMatch[0]);

        const isHangulOnly = /^[가-힣]+$/.test(quizData.word);
        if (!isHangulOnly) throw new Error("Word must be Hangul only.");
        if (!quizData.hanja_combination.includes(hanja)) throw new Error("Missing target Hanja.");

        // 한자 조합에 한글이 섞여 있는지 검증 (순수 한자어만 허용, '우산꽂이(雨傘꽂이)' 같은 혼종 차단)
        const hasHangulInHanja = /[\uac00-\ud7a3]/.test(quizData.hanja_combination);
        if (hasHangulInHanja) throw new Error("Hanja combination must not contain Hangul.");

        // [정합성 핵심 검증] Gemini 교차 검증기 작동
        const isValidWord = await verifyWordWithGemini(quizData.word, quizData.hanja_combination);
        if (!isValidWord) {
          console.warn(`[정합성 검증 실패] 생성된 단어 '${quizData.word}'는 실존하지 않거나 부적절하여 폐기합니다.`);
          throw new Error("Invalid dictionary word.");
        }

        // 퀄리티 체크
        const desc = quizData.description || "";
        if (desc.length < 10 || desc.includes(quizData.word) || desc.includes("의미") || desc.includes("뜻하는")) {
          throw new Error("Poor quality description.");
        }

        // 선제적 캐싱
        await supabase.from("word_analysis_cache").upsert({
          word: quizData.word,
          analysis_json: {
            hanjaList: quizData.hanja_list,
            correctedWord: null,
            isLoanword: false,
            difficultyLevel: quizData.difficulty_level || 1
          }
        });

        // quiz_bank에도 저장 (신규 생성이므로 is_verified = false로 저장하여 관리자 검수 대기)
        const { data: newQuiz } = await supabase
          .from("quiz_bank")
          .upsert({
            word: quizData.word,
            hanja_combination: quizData.hanja_combination,
            description: quizData.description,
            difficulty_level: quizData.difficulty_level || 1,
            is_verified: false
          }, { onConflict: 'word, hanja_combination' })
          .select()
          .single();

        return { quiz: newQuiz || quizData };
      } catch (error: unknown) {
        retryCount++;
        const err = error as { status?: number; message?: string };
        const isRateLimit = err?.status === 429 || err?.message?.includes("429");
        
        if (isRateLimit && retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (retryCount >= 3) {
          console.error("Quiz Generation Final Error:", error);
          if (isRateLimit) return { error: "퀴즈 박사가 지금 잠시 쉬고 있어요! 조금 이따가 다시 도전해 볼까?" };
          return { error: "퀴즈를 생성하는 중 오류가 발생했습니다." };
        }
      }
    }
    return { error: "퀴즈를 생성할 수 없습니다." };
  } catch (error: unknown) {
    console.error("Outer Quiz Error:", error);
    return { error: "시스템 오류가 발생했습니다." };
  }
}

export async function logLearning(word: string, isCorrect: boolean, parentWord?: string, isReview: boolean = false, practicedWriting: boolean = false) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) return { error: "로그인이 필요합니다." };

  // 단어 유효성 검사 (오타 방지: 자음/모음만 있는 경우 등)
  const isTypo = /[ㄱ-ㅎㅏ-ㅣ]/.test(word);
  if (isTypo) {
    console.warn(`Typo log rejected: ${word}`);
    return { error: "올바른 단어 형식이 아닙니다." };
  }

  try {
    // 1. 오늘 획득한 포인트 확인 (한도 체크용)
    const kstFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const today = kstFormatter.format(new Date());

    const { data: todayLogs } = await supabase
      .from("learning_logs")
      .select("is_review, word")
      .eq("user_id", userId)
      .gte("learned_at", `${today}T00:00:00Z`);

    const newWordCount = (todayLogs || []).filter(l => !l.is_review).length;
    const reviewCount = (todayLogs || []).filter(l => l.is_review).length;

    let pointsToAdd = 0;
    if (isReview) {
      if (reviewCount < 20) pointsToAdd = 0.5;
    } else {
      if (newWordCount < 5) pointsToAdd = 1;
    }

    // 2. 학습 로그 저장
    const { error: logError } = await supabase.from("learning_logs").insert({
      user_id: userId,
      word: word,
      is_correct: isCorrect,
      parent_word: parentWord || null,
      is_review: isReview,
      practiced_writing: practicedWriting || isReview 
    });
    
    if (logError) throw logError;

    // 3. 보너스 점수 업데이트
    if (pointsToAdd > 0) {
      const { data: profile } = await supabase.from("profiles").select("bonus_points").eq("id", userId).single();
      const currentPoints = profile?.bonus_points || 0;
      await supabase.from("profiles").update({ bonus_points: currentPoints + pointsToAdd }).eq("id", userId);
    }

    await checkAndUpdateStreak(userId);
    const missionResult = await checkDailyMission(userId);

    return { 
      success: true, 
      pointsAwarded: pointsToAdd,
      missionComplete: missionResult?.missionComplete || false
    };
  } catch (error) {
    console.error("Log Learning Error:", error);
    return { error: "학습 기록 저장 중 오류가 발생했습니다." };
  }
}

export async function updateLearningProgress(word: string, type: 'stroke' | 'writing') {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  try {
    // 가장 최근의 해당 단어 학습 로그를 찾아서 업데이트
    const { data: recentLog } = await supabase
      .from("learning_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("word", word)
      .order("learned_at", { ascending: false })
      .limit(1)
      .single();

    if (recentLog) {
      const updateData = type === 'stroke' 
        ? { viewed_stroke: true } 
        : { practiced_writing: true };

      const { error } = await supabase
        .from("learning_logs")
        .update(updateData)
        .eq("id", recentLog.id);

      if (error) throw error;
      return { success: true };
    }
    return { error: "로그를 찾을 수 없습니다." };
  } catch (error) {
    console.error("Update Progress Error:", error);
    return { error: "진척도 업데이트 중 오류가 발생했습니다." };
  }
}

interface LearningLog {
  id: string;
  user_id: string;
  word: string;
  is_correct: boolean;
  learned_at: string;
  viewed_stroke: boolean;
  practiced_writing: boolean;
}

export async function getLearningRecap() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  try {
    const { data: allLogs, error } = await supabase
      .from("learning_logs")
      .select("*")
      .eq("user_id", userId)
      .order("learned_at", { ascending: false });

    if (error) throw error;

    // KST (GMT+9) 기준 오늘 날짜 문자열 추출 (YYYY-MM-DD)
    const kstFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayKstStr = kstFormatter.format(new Date());

    const processLogs = (logs: LearningLog[], startDate?: Date, onlyFullPractice = false) => {
      const filtered = logs.filter(log => {
        const logDate = new Date(log.learned_at);
        const dateMatch = startDate ? logDate >= startDate : kstFormatter.format(logDate) === todayKstStr;
        
        if (!dateMatch) return false;
        
        // 트로피용(오늘 미션)일 경우 따라쓰기까지 완료된 것만 카운트
        if (onlyFullPractice) {
          return log.practiced_writing === true;
        }
        return true;
      });

      const uniqueDays = new Set(filtered.map(log => {
        return kstFormatter.format(new Date(log.learned_at));
      })).size;

      return {
        count: filtered.length,
        correct: filtered.filter(l => l.is_correct).length,
        days: uniqueDays
      };
    };

    // 주간/월간 시작일 계산 (KST 기준)
    const now = new Date();
    const kstNowStr = now.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
    const kstNow = new Date(kstNowStr);

    const startOfWeek = new Date(kstNow);
    startOfWeek.setDate(kstNow.getDate() - kstNow.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(kstNow);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    interface AnalysisResult {
      hanjaList?: { char: string; meaning: string; sound: string }[];
      difficultyLevel?: number;
    }

    const allLogsWithMeta = await Promise.all(allLogs.map(async (log) => {
      const { data: cache } = await supabase
        .from("word_analysis_cache")
        .select("analysis_json")
        .eq("word", log.word)
        .maybeSingle();
      
      const analysis = cache?.analysis_json as AnalysisResult | undefined;
      return {
        ...log,
        hanja: log.hanja || (analysis?.hanjaList ? analysis.hanjaList.map(h => h.char).join('') : undefined),
        meaning: analysis?.hanjaList ? analysis.hanjaList.map(h => h.meaning).join(', ') : undefined,
        difficulty: analysis?.difficultyLevel || 1,
        hanjaDetails: analysis?.hanjaList || []
      };
    }));

    return {
      logs: allLogsWithMeta,
      stats: {
        today: processLogs(allLogs, undefined, true),
        missionProgress: new Set(allLogs.filter(l => {
          const logDate = new Date(l.learned_at);
          return kstFormatter.format(logDate) === todayKstStr && l.practiced_writing;
        }).map(l => l.word)).size,
        weekly: processLogs(allLogs, startOfWeek),
        monthly: processLogs(allLogs, startOfMonth),
        total: {
          count: allLogs.length,
          correct: allLogs.filter(l => l.is_correct).length,
          days: new Set(allLogs.map(log => kstFormatter.format(new Date(log.learned_at)))).size
        }
      }
    };
  } catch (error) {
    console.error("Get Recap Error:", error);
    return { error: "기록을 불러오는 중 오류가 발생했습니다." };
  }
}

export async function getAdminStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const [
    { count: userCount },
    { count: logCount },
    { count: bankCount },
    { count: cacheCount },
    { data: rankings },
    { data: recentLogs }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('learning_logs').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_bank').select('*', { count: 'exact', head: true }),
    supabase.from('word_analysis_cache').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('nickname, total_score, current_stage').order('total_score', { ascending: false }).limit(10),
    supabase.from('learning_logs').select('word, is_correct, learned_at, profiles:user_id (nickname)').order('learned_at', { ascending: false }).limit(20)
  ]);

  return { 
    userCount: userCount || 0, 
    logCount: logCount || 0, 
    bankCount: bankCount || 0, 
    cacheCount: cacheCount || 0,
    rankings: (rankings || []).map(r => ({
      nickname: r.nickname as string | null,
      total_score: r.total_score as number,
      current_stage: r.current_stage as number
    })),
    recentLogs: (recentLogs || []).map(l => ({
      word: l.word as string,
      is_correct: l.is_correct as boolean,
      learned_at: l.learned_at as string,
      profiles: l.profiles ? { nickname: (l.profiles as unknown as { nickname: string | null }).nickname } : null
    }))
  };
}

export async function updateProfile(data: { 
  nickname?: string; 
  school?: string; 
  grade?: number; 
  city?: string;
  marketing_agree?: boolean;
  streak_count?: number;
  last_streak_at?: string;
  coupons?: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .upsert({ 
      id: user.id, 
      ...data
    });

  if (error) {
    console.error("Profile update error details:", error);
    return { error: `DB 저장 실패: ${error.message}` };
  }
  return { success: true };
}

/**
 * 연속 학습 스트릭을 확인하고 업데이트합니다.
 */
async function checkAndUpdateStreak(userId: string) {
  const supabase = createClient();
  const { data: profile } = await supabase.from('profiles').select('streak_count, last_streak_at').eq('id', userId).maybeSingle();
  
  if (!profile) return;

  const kstFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = kstFormatter.format(new Date());
  
  if (profile.last_streak_at === todayStr) return; // 이미 오늘 출석함

  let newStreak = 1;
  if (profile.last_streak_at) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = kstFormatter.format(yesterday);
    
    if (profile.last_streak_at === yesterdayStr) {
      newStreak = (profile.streak_count || 0) + 1;
    }
  }

  await supabase.from('profiles').update({ 
    streak_count: newStreak, 
    last_streak_at: todayStr 
  }).eq('id', userId);
}

/**
 * 하루 미션 완료 여부를 확인하고 보상(쿠폰)을 지급합니다.
 * 미션: 연관 꼬리 물기 단어 3개 학습 (퀴즈 + 써보기 완료 기준)
 */
async function checkDailyMission(userId: string) {
  const supabase = createClient();
  const kstFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = kstFormatter.format(new Date());

  // 오늘 학습 기록 중 'tail-biting' (parent_word가 있는) 기록 확인
  const { data: logs } = await supabase
    .from('learning_logs')
    .select('word, parent_word, practiced_writing')
    .eq('user_id', userId)
    .gte('learned_at', todayStr + 'T00:00:00Z');

  if (!logs) return;

  // 꼬리 물기 단어들 중 '써보기'까지 완료된 유니크한 단어 수 (부모 단어 제외하고 연결된 것들)
  const relatedWords = new Set(logs.filter(l => l.parent_word && l.practiced_writing).map(l => l.word));
  
  if (relatedWords.size >= 3) {
    // 오늘 이미 쿠폰을 받았는지 체크 (중복 지급 방지 로직은 실제론 profiles에 mission_last_completed_at 같은 필드 필요)
    // 여기서는 간단히 coupons를 +1 해주는 식으로 처리 (실제 운영시에는 로그 테이블 필요)
    const { data: profile } = await supabase.from('profiles').select('coupons, last_mission_at').eq('id', userId).single();
    if (profile && profile.last_mission_at !== todayStr) {
      await supabase.from('profiles').update({
        coupons: (profile.coupons || 0) + 1,
        last_mission_at: todayStr
      }).eq('id', userId);
      return { missionComplete: true };
    }
  }
  return { missionComplete: false };
}

export async function getMyProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile fetch error:", error);
    return { profile: null };
  }

  // 오늘 획득 가능한 남은 점수 계산
  const kstFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const today = kstFormatter.format(new Date());
  
  const { data: todayLogs } = await supabase
    .from("learning_logs")
    .select("*")
    .gte("learned_at", `${today}T00:00:00Z`);

  const newWordCount = (todayLogs || []).filter(l => !l.is_review).length;
  const reviewCount = (todayLogs || []).filter(l => l.is_review).length;

  return { 
    profile,
    dailyStats: {
      newWords: newWordCount,
      reviews: reviewCount
    }
  };
}

export async function getRankings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_score, school, grade")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "프로필을 찾을 수 없습니다." };

  // 또래 순위 (같은 학년)
  const { count: peerTotal } = await supabase
    .from("profiles")
    .select("*", { count: 'exact', head: true })
    .eq("grade", profile.grade);

  const { count: peerRank } = await supabase
    .from("profiles")
    .select("*", { count: 'exact', head: true })
    .eq("grade", profile.grade)
    .gt("total_score", profile.total_score);

  // 학교 순위 (같은 학교)
  const { count: schoolTotal } = await supabase
    .from("profiles")
    .select("*", { count: 'exact', head: true })
    .eq("school", profile.school);

  const { count: schoolRank } = await supabase
    .from("profiles")
    .select("*", { count: 'exact', head: true })
    .eq("school", profile.school)
    .gt("total_score", profile.total_score);

  return {
    peerRank: (peerRank || 0) + 1,
    peerTotal: peerTotal || 0,
    schoolRank: (schoolRank || 0) + 1,
    schoolTotal: schoolTotal || 0
  };
}

export async function getRandomQuizzes(limit: number = 10) {
  const supabase = createClient();
  
  try {
    // 1. 퀴즈 뱅크에서 넉넉하게 50개를 가져와서 섞습니다.
    const { data: allQuizzes, error: quizError } = await supabase
      .from("quiz_bank")
      .select("*")
      .limit(100);

    if (quizError || !allQuizzes) throw quizError;

    // 2. 섞기 (Shuffle)
    const shuffled = [...allQuizzes].sort(() => Math.random() - 0.5);
    const selectedQuizzes = shuffled.slice(0, limit);

    // 3. 각 퀴즈마다 오답 보기(Distractors) 3개씩 추가
    const quizzesWithOptions = selectedQuizzes.map((quiz) => {
      // 본인 제외하고 랜덤하게 3개 뽑기
      const distractors = allQuizzes
        .filter(q => q.word !== quiz.word)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(q => q.word);

      const options = [quiz.word, ...distractors].sort(() => Math.random() - 0.5);

      return {
        ...quiz,
        options
      };
    });

    return { quizzes: quizzesWithOptions };
  } catch (error) {
    console.error("Get Random Quizzes Error:", error);
    return { error: "퀴즈를 불러오는 중 오류가 발생했습니다." };
  }
}

// --- Admin Actions ---

export async function getUnverifiedWords() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data: cache } = await supabase.from('word_analysis_cache').select('*').order('created_at', { ascending: false }).limit(100);
  const { data: bank } = await supabase.from('quiz_bank').select('word');
  const bankWords = new Set((bank || []).map(b => b.word));

  const unverified = (cache || []).filter(c => !bankWords.has(c.word));
  return unverified;
}

export async function verifyWord(word: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data: cacheItem } = await supabase.from('word_analysis_cache').select('*').eq('word', word).single();
  if (!cacheItem) return { error: "Cache item not found" };

  const analysis = cacheItem.analysis_json as { hanjaList: { char: string }[]; description: string; difficultyLevel?: number };
  
  const { error } = await supabase.from('quiz_bank').upsert({
    word: cacheItem.word,
    hanja_combination: analysis.hanjaList.map(h => h.char).join(''),
    description: analysis.description || `${cacheItem.word}의 의미`,
    difficulty_level: analysis.difficultyLevel || 1,
    is_verified: true
  }, { onConflict: 'word, hanja_combination' });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteWord(word: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { error } = await supabase.from('word_analysis_cache').delete().eq('word', word);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getMonitoringLogs() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data, error } = await supabase
    .from('monitoring_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { error: error.message };
  return { data };
}

/**
 * AI를 사용하여 시스템 오류를 자동으로 분석하고 진단합니다.
 */
export async function getAIDiagnosis(errorMessage: string, stackTrace?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "API Key missing" };

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    You are a senior full-stack developer and system reliability engineer.
    Analyze the following error from the 'Hanja Tail' (한자 꼬리) application:
    
    Error Message: "${errorMessage}"
    Stack Trace: "${stackTrace || 'No stack trace provided'}"
    
    Context:
    - Technology: Next.js 14, Supabase, TailwindCSS, Gemini AI.
    - Application: A Hanja learning platform for children.
    
    Tasks:
    1. Identify the most likely root cause.
    2. Provide a specific, actionable code fix or configuration change.
    3. Suggest how to prevent this in the future.
    
    Return the response in a structured JSON format:
    {
      "rootCause": "string",
      "proposedFix": "string (markdown code block if possible)",
      "prevention": "string",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (e) {
    console.error("AI Diagnosis Error:", e);
    return { error: "진단 중 오류가 발생했습니다." };
  }
}

/**
 * 최근 발생한 오류들을 취합하여 AI에게 리포트를 요청합니다.
 */
export async function analyzeRecentErrors() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 관리자 권한 체크
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: "Forbidden" };

  const { data: logs } = await supabase
    .from('monitoring_log')
    .select('*')
    .eq('level', 'ERROR')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!logs || logs.length === 0) return { message: "최근 발생한 오류가 없습니다. 시스템이 건강합니다! ✨" };

  const errorSummary = logs.map(l => `- [${l.created_at}] ${l.message}`).join('\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey!);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    Analyze these recent system errors from 'Hanja Tail':
    ${errorSummary}
    
    Provide a high-level summary and prioritize which one needs immediate attention.
    Suggest any patterns you see (e.g., API timeouts, database constraint violations).
  `;

  try {
    const result = await model.generateContent(prompt);
    return { 
      summary: result.response.text(),
      logs: logs 
    };
  } catch {
    return { error: "분석 실패" };
  }
}

export async function bulkVerifyWords(words: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { data: cacheItems } = await supabase.from('word_analysis_cache').select('*').in('word', words);
  if (!cacheItems || cacheItems.length === 0) return { error: "No items found" };

  const insertData = cacheItems.map(item => {
    const analysis = item.analysis_json as { hanjaList: { char: string }[]; description: string; difficultyLevel?: number };
    return {
      word: item.word,
      hanja_combination: analysis.hanjaList.map(h => h.char).join(''),
      description: analysis.description || `${item.word}의 의미`,
      difficulty_level: analysis.difficultyLevel || 1,
      is_verified: true
    };
  });

  const { error } = await supabase.from('quiz_bank').upsert(insertData, { onConflict: 'word, hanja_combination' });

  if (error) return { error: error.message };
  return { success: true };
}

export async function bulkDeleteWords(words: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { error } = await supabase.from('word_analysis_cache').delete().in('word', words);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateWord(originalWord: string, newData: { word: string; analysis_json: unknown }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");

  const { error } = await supabase
    .from('word_analysis_cache')
    .update({ word: newData.word, analysis_json: newData.analysis_json })
    .eq('word', originalWord);

  if (error) return { error: error.message };
  return { success: true };
}

export async function runBatchGeneration(limit = 5) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { data: allHanja } = await supabase.from('hanja_master').select('hanja, meaning, sound').limit(100);
    const selectedHanja = (allHanja || []).sort(() => Math.random() - 0.5).slice(0, limit);
    
    let totalGenerated = 0;
    const results = [];

    for (const h of selectedHanja) {
      const res = await generateQuiz(h.hanja); 
      if (res.quiz) {
        totalGenerated++;
        results.push(`${h.hanja}(${h.meaning}) -> ${res.quiz.word}`);
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    return { 
      success: true, 
      message: `${totalGenerated}개의 새로운 단어가 지식 창고에 추가되었습니다!`,
      details: results
    };
  } catch (error) {
    console.error("Batch Generation Error:", error);
    return { error: "일괄 생성 중 오류가 발생했습니다." };
  }
}
interface NEISSchoolRow {
  SCHUL_NM: string;
  ORG_RDNMA?: string;
  ORG_LNMADR?: string;
  SD_SCHUL_CODE: string;
  ATPT_OFCDC_SC_NM: string;
}

export async function searchSchools(keyword: string) {
  if (!keyword || keyword.trim().length < 2) return [];

  const API_KEY = process.env.NEIS_API_KEY;
  const encodedKeyword = encodeURIComponent(keyword.trim());
  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY || ""}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodedKeyword}&SCHUL_KND_SC_NM=${encodeURIComponent("초등학교")}`;

  console.log(`[School Search] Searching for: "${keyword}" (Encoded: ${encodedKeyword})`);
  console.log(`[School Search] URL: ${url.replace(API_KEY || "", "HIDDEN_KEY")}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`[School Search] Response Data:`, JSON.stringify(data).substring(0, 500));

    if (data.RESULT && data.RESULT.CODE === "INFO-200") {
      console.log(`[School Search] No results found (INFO-200)`);
      return [];
    }

    if (data.schoolInfo) {
      const schools = data.schoolInfo[1].row.map((item: NEISSchoolRow) => ({
        name: item.SCHUL_NM,
        address: item.ORG_RDNMA || item.ORG_LNMADR || "주소 정보 없음",
        code: item.SD_SCHUL_CODE,
        region: item.ATPT_OFCDC_SC_NM
      }));
      console.log(`[School Search] Found ${schools.length} schools`);
      return schools;
    }
    
    return [];
  } catch (error) {
    console.error("[School Search] API Error:", error);
    return [];
  }
}
/**
 * 퀄리티가 낮은 퀴즈 데이터를 찾아냅니다. (관리자용)
 */
export async function getLowQualityQuizzes() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 관리자 권한 체크
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: "Forbidden" };

  const { data: quizzes, error } = await supabase
    .from('quiz_bank')
    .select('*')
    .or('description.ilike.%의미%,description.ilike.%뜻하는%,description.ilike.%말합니다%')
    .limit(50);

  if (error) return { error: error.message };
  return { quizzes };
}

/**
 * 퀴즈 데이터를 일괄 삭제하거나 수정할 수 있는 기능을 제공합니다.
 */
export async function deleteQuiz(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from('quiz_bank').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * 신규 단어 후보군을 대상으로 AI 기반 스크리닝(일반 명사 vs 어색한 조어)을 수행합니다.
 */
export async function screenWords(words: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: "Forbidden" };

  if (!words || words.length === 0) return { results: [] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "API Key missing" };

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `
    다음은 초등학생용 한자 학습 서비스인 '한자 꼬리'에 등록하려는 후보 단어 목록입니다.
    이 단어들이 실제 한국어 사전(표준국어대사전 등)에 등재되어 널리 쓰이는 일반 명사인지, 아니면 AI 자가 증식 과정에서 어색하게 만들어진 조어(어색한 단어)인지를 정확하게 스크리닝하고 분류해줘.

    [후보 단어 목록]
    \${words.map((w, idx) => \`\${idx + 1}. \${w}\`).join("\\n")}

    반드시 아래의 JSON 배열 형식으로만 응답해줘. 다른 텍스트는 포함하지 말아줘.
    [
      {
        "word": "단어",
        "status": "VALID" | "SUSPICIOUS" | "INVALID",
        "type": "일반 명사" | "전문 용어/고유 명사" | "어색한 조어" | "사전 미등재",
        "reason": "한국어 사전 기준 판단 근거 및 설명"
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\\[[\\s\\S]*\\]/);
    if (jsonMatch) {
      const parsedResults = JSON.parse(jsonMatch[0]);
      return { success: true, results: parsedResults };
    }
    return { error: "JSON 응답 형식을 파싱하는 데 실패했습니다." };
  } catch (error) {
    console.error("Word Screening Error:", error);
    return { error: "스크리닝 중 오류가 발생했습니다." };
  }
}

export async function getRecommendedWord() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  try {
    // 1. 사용자의 전체 학습 기록 조회
    let studiedWords: string[] = [];
    if (userId) {
      const { data: logs } = await supabase
        .from("learning_logs")
        .select("word")
        .eq("user_id", userId);
      studiedWords = (logs || []).map(l => l.word);
    }

    // 2. 사용자가 배운 한자 문자셋 추출하기
    const studiedHanjaSet = new Set<string>();
    if (studiedWords.length > 0) {
      const { data: caches } = await supabase
        .from("word_analysis_cache")
        .select("word, analysis_json")
        .in("word", studiedWords);
      
      interface AnalysisJson {
        hanjaList?: { char: string }[];
      }

      (caches || []).forEach(c => {
        const list = (c.analysis_json as unknown as AnalysisJson)?.hanjaList || [];
        list.forEach((h) => {
          if (h.char) studiedHanjaSet.add(h.char);
        });
      });
    }

    // 3. 만약 학습 이력이 없거나 추출된 한자가 없다면 기본 추천 단어 제공
    if (studiedHanjaSet.size === 0) {
      return {
        word: "학교",
        hanja_combination: "學校",
        description: "공부하는 곳을 뜻해요!",
        reason: "한자 공부를 처음 시작하는 모험가를 위한 추천 단어예요! 🏫"
      };
    }

    // 배운 한자들
    const studiedHanjas = Array.from(studiedHanjaSet);

    // 4. 배운 한자 중 하나가 포함되어 있으나, 아직 배우지 않은 단어를 quiz_bank에서 검색
    // 랜덤으로 한자들의 순서를 섞어서 매번 다른 추천이 나오도록 유도
    studiedHanjas.sort(() => Math.random() - 0.5);

    for (const targetHanja of studiedHanjas) {
      // targetHanja가 포함된 검증된(is_verified: true) 단어 조회
      const { data: candidates } = await supabase
        .from("quiz_bank")
        .select("word, hanja_combination, description")
        .ilike("hanja_combination", `%${targetHanja}%`)
        .eq("is_verified", true);

      if (candidates && candidates.length > 0) {
        // 이미 배운 단어 제외
        const freshCandidates = candidates.filter(c => !studiedWords.includes(c.word));
        if (freshCandidates.length > 0) {
          const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
          
          // 해당 한자의 뜻/음 정보 조회
          const { data: hanjaInfo } = await supabase
            .from("hanja_master")
            .select("meaning, sound")
            .eq("hanja", targetHanja)
            .maybeSingle();

          const hanjaStr = hanjaInfo ? `${targetHanja}(${hanjaInfo.meaning} ${hanjaInfo.sound})` : targetHanja;

          return {
            word: selected.word,
            hanja_combination: selected.hanja_combination,
            description: selected.description,
            reason: `이전에 배웠던 ${hanjaStr} 한자가 들어있는 새로운 단어예요! 🐉`
          };
        }
      }
      
      // 만약 quiz_bank에 아직 검증된 연결 단어가 없다면, hanja_master의 example_words에서 단어 탐색
      const { data: masterData } = await supabase
        .from("hanja_master")
        .select("hanja, meaning, sound, example_words")
        .eq("hanja", targetHanja)
        .maybeSingle();

      interface ExampleWord {
        word: string;
        hanja: string;
      }

      if (masterData && masterData.example_words) {
        const exampleList = masterData.example_words as unknown as ExampleWord[];
        const freshExamples = exampleList.filter((ex) => {
          const w = ex?.word;
          const h = ex?.hanja;
          return typeof w === 'string' && typeof h === 'string' && !studiedWords.includes(w);
        });

        if (freshExamples.length > 0) {
          const selected = freshExamples[Math.floor(Math.random() * freshExamples.length)];
          const hanjaStr = `${masterData.hanja}(${masterData.meaning} ${masterData.sound})`;

          return {
            word: selected.word,
            hanja_combination: selected.hanja,
            description: "함께 탐색해보세요!",
            reason: `이전에 공부했던 ${hanjaStr} 한자가 들어있는 단어예요! 🐉`
          };
        }
      }
    }

    // 5. 만약 끝내 연결 단어를 찾지 못했다면(혹은 다 학습했다면), hanja_master에 등록된 한자 중 하나를 이용한 무작위 새 단어 추천
    const { data: fallbackQuizzes } = await supabase
      .from("quiz_bank")
      .select("word, hanja_combination, description")
      .eq("is_verified", true)
      .limit(30);

    if (fallbackQuizzes && fallbackQuizzes.length > 0) {
      const freshFallbacks = fallbackQuizzes.filter(q => !studiedWords.includes(q.word));
      if (freshFallbacks.length > 0) {
        const selected = freshFallbacks[Math.floor(Math.random() * freshFallbacks.length)];
        return {
          word: selected.word,
          hanja_combination: selected.hanja_combination,
          description: selected.description,
          reason: "새로운 한자에 도전해보세요! 🚀"
        };
      }
    }

    // 최종 폴백
    return {
      word: "학습",
      hanja_combination: "學習",
      description: "배우고 익히는 즐거움!",
      reason: "오늘도 한 걸음 나아가는 추천 단어예요! 🐉"
    };

  } catch (error) {
    console.error("Error getting recommended word:", error);
    return {
      word: "학교",
      hanja_combination: "學校",
      description: "공부하는 곳을 뜻해요!",
      reason: "기본 추천 단어예요! 🏫"
    };
  }
}

export async function getSchoolRank() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  try {
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("school, grade, total_score")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile) return null;

    const { school, grade, total_score = 0 } = profile;

    if (!school || !grade) {
      return {
        school: null,
        grade: null,
        rank: null,
        totalStudents: null,
        total_score
      };
    }

    const { count: higherRankCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school", school)
      .eq("grade", grade)
      .gt("total_score", total_score);

    const { count: totalStudents } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school", school)
      .eq("grade", grade);

    const rank = (higherRankCount ?? 0) + 1;

    return {
      school,
      grade,
      rank,
      totalStudents: totalStudents ?? 1,
      total_score
    };
  } catch (e) {
    console.error("Failed to get school rank", e);
    return null;
  }
}


