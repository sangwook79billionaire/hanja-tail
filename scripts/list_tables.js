const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
// 서비스 롤 키가 있으면 더 좋겠지만, 우선 아논 키로 시도
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function list() {
  const { data, error } = await supabase.rpc('get_table_names'); // 만약 rpc가 정의되어 있다면
  if (error) {
    // RPC가 없으면 Information Schema 조회 시도 (권한 필요할 수도 있음)
    const { data: tables, error: err } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
    console.log('Tables from pg_tables:', tables, err);
  } else {
    console.log('Tables from RPC:', data);
  }
}
list();
