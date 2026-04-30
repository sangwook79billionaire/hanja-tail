require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  console.log("🔍 learning_logs 테이블 컬럼 확인 중...");
  
  // rpc나 직접 쿼리 대신 한 건을 조회해 컬럼 구성을 확인합니다.
  const { data, error } = await supabase
    .from('learning_logs')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log("ℹ️ 데이터가 없어 구조 확인을 위해 샘플 입력을 시도합니다...");
      // 데이터가 없으면 하나 넣어보고 확인
      const { data: newData, error: insertError } = await supabase
        .from('learning_logs')
        .insert({ word: '구조체크', user_id: '00000000-0000-0000-0000-000000000000', is_correct: true })
        .select()
        .single();
      
      if (insertError) {
        console.error("❌ 컬럼 확인 실패:", insertError.message);
      } else {
        console.log("✅ 현재 컬럼 목록:", Object.keys(newData));
      }
    } else {
      console.error("❌ 에러 발생:", error.message);
    }
  } else {
    console.log("✅ 현재 컬럼 목록:", Object.keys(data));
  }
}

checkColumns();
