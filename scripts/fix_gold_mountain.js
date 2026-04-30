require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateGoldMountain() {
  const { error } = await supabase
    .from('quiz_bank')
    .update({ description: "금처럼 아주 아름답고 소중한 산이라는 뜻이에요. 산의 경치가 보물처럼 반짝반짝 빛날 때 사용하는 멋진 표현이답니다! ✨🏔️" })
    .eq('word', '금산');

  if (error) console.error("❌ 수정 실패:", error);
  else console.log("✅ '금산' 설명 수정 완료!");
}

updateGoldMountain();
