const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function assign() {
  console.log("📍 한자 퀘스트 노드 배치 시작 (페이징 방식)...");
  
  let allHanjas = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('hanja_master')
      .select('hanja, level')
      .order('level', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('❌ 데이터 조회 실패:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allHanjas = allHanjas.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`✅ 총 ${allHanjas.length}자의 한자를 발견했습니다. 배치를 시작합니다...`);

  for (let i = 0; i < allHanjas.length; i++) {
    const { error: updateError } = await supabase
      .from('hanja_master')
      .update({ quest_index: i + 1 })
      .eq('hanja', allHanjas[i].hanja);
    
    if (updateError) {
      console.error(`❌ [${allHanjas[i].hanja}] 업데이트 실패:`, updateError.message);
    }

    if ((i + 1) % 100 === 0) console.log(`✅ ${i + 1}자 배치 완료...`);
  }
  console.log("✨ 1,800자 퀘스트 맵 배치 완료!");
}

assign();
