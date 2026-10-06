/**
 * Supabase RLS (Row-Level Security) Verification Script
 * ----------------------------------------------------
 * Tests the security posture of tables by checking if unauthenticated public
 * requests can perform unauthorized reads, inserts, updates, or deletes.
 * 
 * Usage: node scripts/verify_security.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to generate unique words for insert tests to prevent duplicate key errors
function generateUniqueWord() {
  return '검증_' + Math.random().toString(36).substring(2, 9);
}

async function testProfiles() {
  console.log("\n🔒 [profiles] 테이블 검증:");
  
  // 1. SELECT should succeed (needed for leaderboard/logs)
  const { data: selectData, error: selectError } = await supabase
    .from('profiles')
    .select('id, nickname')
    .limit(1);
    
  if (selectError) {
    console.log("  ❌ SELECT 실패 (비정상):", selectError.message);
  } else {
    console.log(`  ✅ SELECT 성공 (조회 가능 - 대시보드 연동용)`);
  }

  // 2. INSERT without auth should fail
  const randomId = '11111111-1111-1111-1111-111111111111';
  const { data: insertData, error: insertError } = await supabase
    .from('profiles')
    .insert([{ id: randomId, nickname: 'Hacker' }])
    .select();

  if (insertError) {
    console.log("  ✅ INSERT 차단됨 (정상):", insertError.message);
  } else if (insertData && insertData.length > 0) {
    console.log("  ❌ INSERT 성공 (보안 취약점! RLS가 작동하지 않거나 정책이 허술함)");
    // Cleanup if inserted
    await supabase.from('profiles').delete().eq('id', randomId);
  } else {
    console.log("  ✅ INSERT 차단됨 (정상 - 0개 행 삽입)");
  }

  // 3. UPDATE without auth should fail
  if (selectData && selectData.length > 0) {
    const targetId = selectData[0].id;
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ nickname: 'Hacker' })
      .eq('id', targetId)
      .select();
      
    if (updateError) {
      console.log("  ✅ UPDATE 차단됨 (정상):", updateError.message);
    } else if (updateData && updateData.length > 0) {
      console.log("  ❌ UPDATE 성공 (보안 취약점! 다른 사용자의 정보를 수정할 수 있음)");
    } else {
      console.log("  ✅ UPDATE 차단됨 (정상 - 0개 행 수정)");
    }
  }
}

async function testHanjaMaster() {
  console.log("\n🔒 [hanja_master] 테이블 검증:");
  
  // 1. SELECT should succeed (read-only for everyone)
  const { error: selectError } = await supabase
    .from('hanja_master')
    .select('hanja')
    .limit(1);
    
  if (selectError) {
    console.log("  ❌ SELECT 실패 (비정상):", selectError.message);
  } else {
    console.log("  ✅ SELECT 성공 (조회 가능)");
  }

  // 2. INSERT should be blocked
  const { data: insertData, error: insertError } = await supabase
    .from('hanja_master')
    .insert([{ hanja: '𠮷', meaning: '길할', sound: '길' }])
    .select();
    
  if (insertError) {
    console.log("  ✅ INSERT 차단됨 (정상):", insertError.message);
  } else if (insertData && insertData.length > 0) {
    console.log("  ❌ INSERT 성공 (보안 취약점! 마스터 한자 데이터를 수정할 수 있음)");
    await supabase.from('hanja_master').delete().eq('hanja', '𠮷');
  } else {
    console.log("  ✅ INSERT 차단됨 (정상 - 0개 행 삽입)");
  }
}

async function testWordAnalysisCache() {
  console.log("\n🔒 [word_analysis_cache] 테이블 검증:");

  // 1. SELECT should succeed
  const { error: selectError } = await supabase
    .from('word_analysis_cache')
    .select('word')
    .limit(1);
    
  if (selectError) {
    console.log("  ❌ SELECT 실패 (비정상):", selectError.message);
  } else {
    console.log("  ✅ SELECT 성공 (조회 가능)");
  }

  // 2. INSERT should succeed (allowed for anyone for automatic caching)
  const testWord = generateUniqueWord();
  const { data: insertData, error: insertError } = await supabase
    .from('word_analysis_cache')
    .insert([{ word: testWord, analysis_json: {} }])
    .select();

  if (insertError) {
    console.log("  ❌ INSERT 실패 (비정상 - 캐시 저장이 불가능함):", insertError.message);
  } else if (insertData && insertData.length > 0) {
    console.log("  ✅ INSERT 성공 (자동 캐싱 정상 작동)");
    
    // 3. UPDATE without admin auth should fail
    const { data: updateData, error: updateError } = await supabase
      .from('word_analysis_cache')
      .update({ analysis_json: { modified: true } })
      .eq('word', testWord)
      .select();
      
    if (updateError) {
      console.log("  ✅ UPDATE 차단됨 (정상):", updateError.message);
    } else if (updateData && updateData.length > 0) {
      console.log("  ❌ UPDATE 성공 (보안 취약점! 캐시 정보를 임의로 위변조할 수 있음)");
    } else {
      console.log("  ✅ UPDATE 차단됨 (정상 - 0개 행 수정)");
    }

    // 4. DELETE without admin auth should fail
    const { data: deleteData, error: deleteError } = await supabase
      .from('word_analysis_cache')
      .delete()
      .eq('word', testWord)
      .select();
      
    if (deleteError) {
      console.log("  ✅ DELETE 차단됨 (정상):", deleteError.message);
    } else if (deleteData && deleteData.length > 0) {
      console.log("  ❌ DELETE 성공 (보안 취약점! 캐시를 임의로 지울 수 있음)");
    } else {
      console.log("  ✅ DELETE 차단됨 (정상 - 0개 행 삭제)");
    }
    
    // Cleanup of the inserted test cache word
    // (Note: Since we are unauthenticated and delete is blocked, this row will remain in the DB.
    // However, since we use unique names on every run, it won't trigger duplicate key errors).
  }
}

async function testQuizBank() {
  console.log("\n🔒 [quiz_bank] 테이블 검증:");

  // 1. SELECT should succeed
  const { error: selectError } = await supabase
    .from('quiz_bank')
    .select('id')
    .limit(1);
    
  if (selectError) {
    console.log("  ❌ SELECT 실패 (비정상):", selectError.message);
  } else {
    console.log("  ✅ SELECT 성공 (조회 가능)");
  }

  // 2. INSERT should succeed (needed for user quiz submissions/generations)
  const testWord = generateUniqueWord();
  const { data, error: insertError } = await supabase
    .from('quiz_bank')
    .insert([{ word: testWord, hanja_combination: '검증', description: '테스트용 설명', is_verified: false }])
    .select();

  if (insertError) {
    console.log("  ❌ INSERT 실패 (비정상):", insertError.message);
  } else if (data && data.length > 0) {
    console.log("  ✅ INSERT 성공 (퀴즈 자동 출제 정상 작동)");
    
    const targetId = data[0].id;
    
    // 3. UPDATE without admin auth should fail (prevent verifying or altering quizzes)
    const { data: updateData, error: updateError } = await supabase
      .from('quiz_bank')
      .update({ is_verified: true })
      .eq('id', targetId)
      .select();
      
    if (updateError) {
      console.log("  ✅ UPDATE 차단됨 (정상):", updateError.message);
    } else if (updateData && updateData.length > 0) {
      console.log("  ❌ UPDATE 성공 (보안 취약점! 일반 유저가 퀴즈를 강제 승인 또는 변조할 수 있음)");
    } else {
      console.log("  ✅ UPDATE 차단됨 (정상 - 0개 행 수정)");
    }

    // 4. DELETE without admin auth should fail
    const { data: deleteData, error: deleteError } = await supabase
      .from('quiz_bank')
      .delete()
      .eq('id', targetId)
      .select();
      
    if (deleteError) {
      console.log("  ✅ DELETE 차단됨 (정상):", deleteError.message);
    } else if (deleteData && deleteData.length > 0) {
      console.log("  ❌ DELETE 성공 (보안 취약점! 퀴즈 데이터를 임의로 지울 수 있음)");
    } else {
      console.log("  ✅ DELETE 차단됨 (정상 - 0개 행 삭제)");
    }
  }
}

async function testLearningLogs() {
  console.log("\n🔒 [learning_logs] 테이블 검증:");

  // 1. SELECT should succeed (needed for dashboard stats/recent log display)
  const { error: selectError } = await supabase
    .from('learning_logs')
    .select('id')
    .limit(1);
    
  if (selectError) {
    console.log("  ❌ SELECT 실패 (비정상):", selectError.message);
  } else {
    console.log("  ✅ SELECT 성공 (조회 가능)");
  }

  // 2. INSERT without auth should fail
  const randomId = '33333333-3333-3333-3333-333333333333';
  const { data: insertData, error: insertError } = await supabase
    .from('learning_logs')
    .insert([{ user_id: randomId, word: generateUniqueWord(), is_correct: true }])
    .select();

  if (insertError) {
    console.log("  ✅ INSERT 차단됨 (정상):", insertError.message);
  } else if (insertData && insertData.length > 0) {
    console.log("  ❌ INSERT 성공 (보안 취약점! 로그인 없이 학습 이력을 생성할 수 있음)");
    // Cleanup if inserted
    await supabase.from('learning_logs').delete().eq('id', insertData[0].id);
  } else {
    console.log("  ✅ INSERT 차단됨 (정상 - 0개 행 삽입)");
  }
}

async function testUserItems() {
  console.log("\n🔒 [user_items] 테이블 검증:");

  // 1. SELECT/INSERT/UPDATE/DELETE without auth should fail
  const randomId = '44444444-4444-4444-4444-444444444444';
  const { data: insertData, error: insertError } = await supabase
    .from('user_items')
    .insert([{ user_id: randomId, word: generateUniqueWord(), hanja_combination: '검증' }])
    .select();

  if (insertError) {
    console.log("  ✅ INSERT 차단됨 (정상):", insertError.message);
  } else if (insertData && insertData.length > 0) {
    console.log("  ❌ INSERT 성공 (보안 취약점! 타인의 단어 수집 항목을 조작할 수 있음)");
    // Cleanup if inserted
    await supabase.from('user_items').delete().eq('id', insertData[0].id);
  } else {
    console.log("  ✅ INSERT 차단됨 (정상 - 0개 행 삽입)");
  }
}

async function testMonitoringLog() {
  console.log("\n🔒 [monitoring_log] 테이블 검증:");

  // 1. SELECT should fail (only admins can read logs)
  const { data: selectData, error: selectError } = await supabase
    .from('monitoring_log')
    .select('*')
    .limit(1);
    
  if (selectError) {
    console.log("  ✅ SELECT 차단됨 (정상):", selectError.message);
  } else if (selectData && selectData.length > 0) {
    console.log("  ❌ SELECT 성공 (보안 취약점! 일반 유저가 시스템/오류 로그를 조회할 수 있음)");
  } else {
    // 0 rows returned indicates it was either blocked or empty.
    // However, since unauthenticated SELECT is not allowed by policy, it returns empty array because PostgREST
    // silently filters out all rows if RLS is working and select policy evaluates to false.
    console.log("  ✅ SELECT 차단됨 (정상 - 0개 행 반환)");
  }

  // 2. INSERT should succeed (anyone can log warnings/invalid words)
  // IMPORTANT: We do not chain .select() here because unauthenticated users do not have SELECT permission 
  // on this table. Chaining .select() would make the database try to return the row, triggering an RLS error.
  // We want to test pure INSERT success.
  const { error: insertError } = await supabase
    .from('monitoring_log')
    .insert([{ event_type: 'security_test_anon', message: 'Anonymous safety test log', level: 'INFO' }]);

  if (insertError) {
    console.log("  ❌ INSERT 실패 (비정상 - 모니터링 로그 저장이 차단됨):", insertError.message);
  } else {
    console.log("  ✅ INSERT 성공 (오류 로깅 정상 작동)");
  }
}

async function runAllTests() {
  console.log("==========================================");
  console.log("🔍 DB Row-Level Security (RLS) 정밀 진단 시작");
  console.log("==========================================");
  
  try {
    await testProfiles();
    await testHanjaMaster();
    await testWordAnalysisCache();
    await testQuizBank();
    await testLearningLogs();
    await testUserItems();
    await testMonitoringLog();
  } catch (err) {
    console.error("진단 중 예기치 못한 에러 발생:", err);
  }
  
  console.log("\n==========================================");
  console.log("🏁 정밀 진단 완료");
  console.log("==========================================");
}

runAllTests();
