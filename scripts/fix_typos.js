require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixTypos() {
  const { error } = await supabase
    .from('quiz_bank')
    .update({ hanja_combination: "不安" })
    .eq('word', '불안');

  if (error) console.error("❌ 수정 실패:", error);
  else console.log("✅ '불안' 한자 오타 수정 완료!");
}

fixTypos();
