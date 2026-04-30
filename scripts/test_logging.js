require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogging() {
  console.log("🧪 학습 기록 저장 테스트 시작...");
  const dummyUserId = "00000000-0000-0000-0000-000000000000";
  
  const { data, error } = await supabase.from('learning_logs').insert({
    user_id: dummyUserId,
    word: "테스트단어",
    is_correct: true
  }).select();

  if (error) {
    console.error("❌ 저장 실패! 원인:", error.message);
    console.error("상세 에러:", error);
  } else {
    console.log("✅ 저장 성공! 데이터:", data);
  }
}

testLogging();
