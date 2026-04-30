require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listTables() {
  console.log("🔍 DB 테이블 목록 확인 중...");
  
  // rpc를 사용해 테이블 목록을 가져오거나, 
  // 간단하게 널리 쓰이는 테이블들에 select를 날려보며 존재 여부를 확인합니다.
  const tables = ['profiles', 'user_items', 'quiz_bank', 'learning_logs', 'word_analysis_cache'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST204') {
      console.log(`❌ ${table}: 테이블 없음`);
    } else if (error) {
      console.log(`⚠️ ${table}: 에러 발생 (${error.message})`);
    } else {
      console.log(`✅ ${table}: 존재함`);
    }
  }
}

listTables();
