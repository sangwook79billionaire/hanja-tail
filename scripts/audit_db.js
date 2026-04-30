require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function auditDB() {
  console.log("🔍 DB 전수 조사 시작...");
  
  // quiz_bank 전체 조회
  const { data: quizzes, error: qError } = await supabase
    .from('quiz_bank')
    .select('*')
    .order('created_at', { ascending: false });

  if (qError) {
    console.error("❌ 퀴즈 데이터 조회 실패:", qError);
    return;
  }

  console.log(`✅ 총 ${quizzes.length}개의 퀴즈 데이터를 발견했습니다.`);

  // 결과 리포트 작성
  let report = "# 📋 퀴즈 데이터 전수 조사 리포트\n\n";
  report += `**총 데이터 수:** ${quizzes.length}개\n\n`;
  report += "| 단어 | 한자 | 설명/힌트 | 검수 필요 |\n";
  report += "| :--- | :--- | :--- | :---: |\n";

  quizzes.forEach(q => {
    // 설명이 너무 짧거나 단순한 경우 체크
    const needsAudit = q.description.length < 5 || q.description.includes(q.word) ? "🚩" : "";
    report += `| ${q.word} | ${q.hanja_combination} | ${q.description} | ${needsAudit} |\n`;
  });

  fs.writeFileSync('audit_report.md', report);
  console.log("✨ audit_report.md 생성이 완료되었습니다!");
}

auditDB();
