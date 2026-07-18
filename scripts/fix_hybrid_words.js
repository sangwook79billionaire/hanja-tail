const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanHybridWords() {
  console.log("Starting hybrid words cleanup...");
  
  try {
    // 1. quiz_bank에서 한자 표기에 한글이 포함된(예: 雨傘꽂이) 혼종 단어 색출
    const { data: quizzes, error: err1 } = await supabase
      .from("quiz_bank")
      .select("id, word, hanja_combination");
      
    if (err1) {
      console.error("Error fetching quizzes:", err1);
      return;
    }
    
    const hybridQuizzes = (quizzes || []).filter(q => /[\uac00-\ud7a3]/.test(q.hanja_combination));
    console.log(`Found ${hybridQuizzes.length} hybrid quiz entries to delete:`, hybridQuizzes);
    
    for (const q of hybridQuizzes) {
      const { error: delErr } = await supabase
        .from("quiz_bank")
        .delete()
        .eq("id", q.id);
      if (delErr) {
        console.error(`Failed to delete quiz ${q.word}:`, delErr.message);
      } else {
        console.log(`Deleted quiz ${q.word} (${q.hanja_combination})`);
      }
    }

    // 2. 삭제 대상 단어들에 대한 캐시 데이터도 함께 제거
    const deletedWords = hybridQuizzes.map(q => q.word);
    if (deletedWords.length > 0) {
      const { error: delErr } = await supabase
        .from("word_analysis_cache")
        .delete()
        .in("word", deletedWords);
      if (delErr) {
        console.error(`Failed to delete cache items:`, delErr.message);
      } else {
        console.log(`Deleted cache items for:`, deletedWords);
      }
    }
    
    console.log("Cleanup completed!");
  } catch (e) {
    console.error("Cleanup failed:", e.message);
  }
}

cleanHybridWords();
