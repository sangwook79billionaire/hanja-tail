const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { count: masterCount } = await supabase.from('hanja_master').select('*', { count: 'exact', head: true });
  const { count: quizCount } = await supabase.from('quiz_bank').select('*', { count: 'exact', head: true });
  const { count: cacheCount } = await supabase.from('word_analysis_cache').select('*', { count: 'exact', head: true });

  console.log('\n📊 [현재 DB 상태 보고서]');
  console.log('---------------------------');
  console.log('🏛️ Hanja Master (기초 1,800자):', masterCount, '개');
  console.log('📚 Quiz Bank (생성된 단어/퀴즈):', quizCount, '개');
  console.log('⚡ Word Analysis Cache (분석 완료):', cacheCount, '개');
  console.log('---------------------------');
}

check();
