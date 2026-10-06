/**
 * 단어와 한자 괄호 표기를 견고하게 정규화하는 헬퍼 함수
 * 예시:
 * - "연기" -> { baseWord: "연기", targetHanja: "", formatted: "연기", hasHanja: false }
 * - "연기(煙氣)" -> { baseWord: "연기", targetHanja: "煙氣", formatted: "연기(煙氣)", hasHanja: true }
 * - "연기(煙氣)(煙氣)" -> { baseWord: "연기", targetHanja: "煙氣", formatted: "연기(煙氣)", hasHanja: true }
 * - "연기 ( 煙氣 )" -> { baseWord: "연기", targetHanja: "煙氣", formatted: "연기(煙氣)", hasHanja: true }
 */
export function normalizeWordWithHanja(input: string): {
  baseWord: string;
  targetHanja: string;
  formatted: string;
  hasHanja: boolean;
} {
  if (!input) return { baseWord: "", targetHanja: "", formatted: "", hasHanja: false };
  const str = input.trim();

  // 모든 괄호 안의 내용 추출
  const bracketMatches = Array.from(str.matchAll(/\(([^)]+)\)/g));
  let targetHanja = "";
  if (bracketMatches.length > 0) {
    for (const match of bracketMatches) {
      const inside = match[1].trim();
      if (/[\u4e00-\u9fa5]/.test(inside)) {
        targetHanja = inside.replace(/\s+/g, "");
        break;
      }
    }
  }

  // 괄호 및 괄호 안 내용을 전부 제거하여 순수 단어 추출
  const baseWord = str.replace(/\([^)]*\)/g, "").trim();
  const hasHanja = Boolean(targetHanja);
  const formatted = hasHanja ? `${baseWord}(${targetHanja})` : baseWord;

  return { baseWord, targetHanja, formatted, hasHanja };
}
