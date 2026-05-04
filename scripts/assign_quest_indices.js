const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function assign() {
  console.log("📍 한자 퀘스트 노드 배치 시작 (정상 컬럼 사용)...");
  
  // 1. 모든 한자 데이터 가져오기 (정상 컬럼명: hanja, level)
  const { data: hanjas, error } = await supabase
    .from('hanja_master')
    .select('hanja, level')
    .order('level', { ascending: false }); // 8급부터 배치

  if (error) {
    console.error('❌ 데이터 조회 실패:', error.message);
    return;
  }

  if (!hanjas || hanjas.length === 0) {
    console.log('⚠️ hanja_master에 데이터가 없습니다.');
    return;
  }

  console.log(`✅ ${hanjas.length}자의 한자를 발견했습니다. 배치를 시작합니다...`);

  for (let i = 0; i < hanjas.length; i++) {
    const { error: updateError } = await supabase
      .from('hanja_master')
      .update({ quest_index: i + 1 })
      .eq('hanja', hanjas[i].hanja);
    
    if (updateError) {
      console.error(`❌ [${hanjas[i].hanja}] 업데이트 실패:`, updateError.message);
    }

    if ((i + 1) % 100 === 0) console.log(`✅ ${i + 1}자 배치 완료...`);
  }
  console.log("✨ 1,800자 퀘스트 맵 배치 완료!");
}

assign();
