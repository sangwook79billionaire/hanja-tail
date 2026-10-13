"use client";

import { useState } from "react";
import WordFlow, { type WordFlowApi } from "@/components/learn/WordFlow";
import { Button } from "@/components/ui/Button";
import type { DailyWordSlot } from "@/components/ui/Stats";
import { MOCK_FLOW_WORDS, MOCK_LEARN_QUESTION } from "@/mock/noriMockData";

/**
 * 단어 학습 흐름 미리보기 — DB·Gemini 없이 가짜 데이터로 W01~R01 전체를 눌러 볼 수 있습니다.
 * 검색창에 '원리', '관찰', '협동' 중 하나를 넣어 보세요. ('없는말'을 넣으면 오류 팝업)
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockApi: WordFlowApi = {
  analyzeWord: (async (word: string) => {
    await wait(400);
    const base = word.replace(/\(.*\)/, "").trim();
    const found = MOCK_FLOW_WORDS[base];
    if (!found) return { error: `'${base}'(은)는 미리보기 단어가 아니에요. 원리·관찰·협동 중에서 골라 주세요.` };
    return { hanjaList: found.hanjaList };
  }) as unknown as WordFlowApi["analyzeWord"],
  generateLearnQuestion: (async (word: string) => {
    await wait(800);
    const found = MOCK_FLOW_WORDS[word];
    return {
      question: {
        meaning: found?.meaning ?? "",
        sentences: found?.sentences ?? MOCK_LEARN_QUESTION.sentences,
        answerIndex: 0,
      },
    };
  }) as WordFlowApi["generateLearnQuestion"],
  logLearning: (async () => ({ success: true, pointsAwarded: 1, missionComplete: false })) as unknown as WordFlowApi["logLearning"],
};

export default function FlowPreviewPage() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [learned, setLearned] = useState<DailyWordSlot[]>([]);
  const [recent, setRecent] = useState(["원리", "관찰", "협동"]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[22px] font-bold text-nori-strong">단어 학습 흐름 미리보기</h1>
      <p className="text-sm font-medium text-nori-secondary">
        가짜 데이터로 W01 검색부터 R01 결과까지 확인합니다. 획 따라 쓰기는 실제로 따라 써야 넘어가요.
      </p>
      <Button
        className="max-w-xs"
        onClick={() => {
          setKey((k) => k + 1);
          setOpen(true);
        }}
      >
        흐름 시작하기
      </Button>
      <Button className="max-w-xs" variant="secondary" onClick={() => setLearned([])}>
        오늘의 단어 초기화 ({learned.length}/3)
      </Button>

      {open && (
        <WordFlow
          key={key}
          api={mockApi}
          recentWords={recent}
          onRemoveRecent={(w) => setRecent((r) => r.filter((x) => x !== w))}
          isLoggedIn
          streak={13}
          todayWords={learned}
          onSearched={() => {}}
          onLearned={(word, hanja) => setLearned((l) => (l.some((x) => x.word === word) ? l : [...l, { word, hanja }]))}
          onExit={() => setOpen(false)}
        />
      )}
    </div>
  );
}
