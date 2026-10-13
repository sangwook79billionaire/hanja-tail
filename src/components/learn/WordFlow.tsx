"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  analyzeWord as analyzeWordAction,
  generateLearnQuestion as generateLearnQuestionAction,
  logLearning as logLearningAction,
  type LearnQuestion,
} from "@/app/actions";
import { normalizeWordWithHanja } from "@/lib/wordUtils";
import { Button } from "@/components/ui/Button";
import { ListItem } from "@/components/ui/Choice";
import { Chip } from "@/components/ui/Search";
import { SearchCard, HanjaTile } from "@/components/ui/Hanja";
import { StatCard, DailyProgress, type DailyWordSlot } from "@/components/ui/Stats";
import { ProgressNav, QuestionChip, BottomActionBar } from "@/components/ui/Navigation";
import { AnswerFeedback } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { Hero } from "@/components/ui/Hero";
import { NoriIcon } from "@/components/ui/NoriIcon";
import WriteSheet from "./WriteSheet";

/**
 * Figma 2·3번 흐름: W01 단어 검색 → W03 찾는 중 → W04 한자 카드 → W05 획 따라 쓰기
 * → W06 훌륭해요 → L1 익히기 문제 → R01/R02 단어 결과
 */

interface HanjaData {
  char: string;
  meaning: string;
  sound: string;
  originalSound?: string;
  level?: string;
}

interface Candidate {
  word: string;
  hanja: string;
  description: string;
}

type Step = "search" | "loading" | "ambiguous" | "card" | "great" | "learn" | "result";

/** 서버 함수. 미리보기(/design-system/flow)에서는 가짜 데이터로 바꿔 끼웁니다 */
export interface WordFlowApi {
  analyzeWord: typeof analyzeWordAction;
  generateLearnQuestion: typeof generateLearnQuestionAction;
  logLearning: typeof logLearningAction;
}

const realApi: WordFlowApi = {
  analyzeWord: analyzeWordAction,
  generateLearnQuestion: generateLearnQuestionAction,
  logLearning: logLearningAction,
};

export interface WordFlowProps {
  /** 넣으면 검색 화면을 건너뛰고 바로 찾기 시작 */
  initialWord?: string;
  recentWords: string[];
  onRemoveRecent?: (word: string) => void;
  /** 새 단어를 더 찾을 수 없으면 이유를 돌려줍니다 (예: 하루 학습량) */
  blockReason?: string | null;
  isLoggedIn: boolean;
  streak: number;
  /** 오늘 익힌 단어 (결과 화면의 진행도) */
  todayWords: DailyWordSlot[];
  dailyGoal?: number;
  /** 검색했거나 다 써서 기록이 바뀌었을 때 (부모가 기록을 다시 불러옴) */
  onSearched: (word: string, hanja: string) => void;
  onLearned: (word: string, hanja: string) => Promise<void> | void;
  onExit: () => void;
  api?: WordFlowApi;
}

const MIN_LOADING_MS = 1500;

/** 마지막 글자에 받침이 있으면 "이", 없으면 "가" */
const subjectParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "이" : "가";
};
const CONFETTI_COLORS = ["#59cc03", "#ff6b99", "#9e73ff", "#ff8c00", "#1cb0f6", "#ffc800"];

export default function WordFlow({
  initialWord,
  recentWords,
  onRemoveRecent,
  blockReason,
  isLoggedIn,
  streak,
  todayWords,
  dailyGoal = 3,
  onSearched,
  onLearned,
  onExit,
  api = realApi,
}: WordFlowProps) {
  const { analyzeWord, generateLearnQuestion, logLearning } = api;
  const [step, setStep] = useState<Step>(initialWord ? "loading" : "search");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [wordKey, setWordKey] = useState("");
  const [baseWord, setBaseWord] = useState("");
  const [hanjaList, setHanjaList] = useState<HanjaData[]>([]);
  const [written, setWritten] = useState<Set<string>>(new Set());
  const [writing, setWriting] = useState<HanjaData | null>(null);

  const [question, setQuestion] = useState<LearnQuestion | null>(null);
  const [questionFailed, setQuestionFailed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [points, setPoints] = useState(0);

  const startedRef = useRef(false);
  const hanjaStr = hanjaList.map((h) => h.char).join("");

  /* ── W03: 단어 분석 + 익히기 문제 준비 ── */
  const find = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (blockReason) {
        setError(blockReason);
        setStep("search");
        return;
      }
      if (/[ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) {
        setError("단어를 올바르게 입력했는지 확인해 주세요. 자음이나 모음만 있는 글자는 찾을 수 없어요.");
        setStep("search");
        return;
      }

      setStep("loading");
      setWritten(new Set());
      setQuestion(null);
      setQuestionFailed(false);
      setPicked(null);
      setPoints(0);

      const started = Date.now();
      const wait = () => new Promise((r) => setTimeout(r, Math.max(0, MIN_LOADING_MS - (Date.now() - started))));

      try {
        const { baseWord: base, formatted, hasHanja } = normalizeWordWithHanja(trimmed);
        const result = await analyzeWord(trimmed);
        await wait();

        if (result.error) {
          setError(result.error);
          setStep("search");
          return;
        }
        if (result.isAmbiguous && !hasHanja && (!result.hanjaList || result.hanjaList.length === 0)) {
          setCandidates(result.candidates || []);
          setStep("ambiguous");
          return;
        }

        const list: HanjaData[] = result.hanjaList || [];
        const chars = list.map((h) => h.char).join("");
        setBaseWord(base);
        setWordKey(formatted);
        setHanjaList(list);
        setStep("card");
        onSearched(formatted, chars);

        // 검색 기록 (기존 동작과 동일: 정답 아님, 쓰기 안 함)
        logLearning(trimmed, false, undefined, false, false).catch((e) => console.error("Search logging error:", e));

        // 한자 카드를 보는 동안 익히기 문제를 미리 만들어 둡니다
        generateLearnQuestion(base, chars)
          .then((res) => (res.question ? setQuestion(res.question) : setQuestionFailed(true)))
          .catch(() => setQuestionFailed(true));
      } catch (e) {
        console.error(e);
        await wait();
        setError("단어를 찾는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
        setStep("search");
      }
    },
    [blockReason, onSearched, analyzeWord, generateLearnQuestion, logLearning]
  );

  useEffect(() => {
    if (initialWord && !startedRef.current) {
      startedRef.current = true;
      find(initialWord);
    }
  }, [initialWord, find]);

  /* ── W05: 한 글자 다 쓰면 다음 글자, 모두 쓰면 W06 ── */
  const handleWritten = async () => {
    if (!writing) return;
    const next = new Set(written);
    next.add(writing.char);
    setWritten(next);

    const remaining = hanjaList.find((h) => !next.has(h.char));
    if (remaining) {
      setWriting(null);
      setTimeout(() => setWriting(remaining), 400);
      return;
    }

    setWriting(null);
    setStep("great");
    try {
      const res = await logLearning(wordKey, true, undefined, false, true);
      if (res && "pointsAwarded" in res && res.pointsAwarded) setPoints(res.pointsAwarded);
    } catch (e) {
      console.error("Learning log error:", e);
    }
    await onLearned(baseWord, hanjaStr);
  };

  // W06은 1.5초 뒤 자동으로 다음 단계로
  useEffect(() => {
    if (step !== "great") return;
    const t = setTimeout(() => setStep(questionFailed ? "result" : "learn"), 1500);
    return () => clearTimeout(t);
  }, [step, questionFailed]);

  // 문제를 못 만들었으면 익히기를 건너뜀
  useEffect(() => {
    if (step === "learn" && questionFailed) setStep("result");
  }, [step, questionFailed]);

  /* ── L1 정답 확인 ── */
  const check = () => {
    if (picked === null || !question) return;
    const correct = picked === question.answerIndex;
    setFeedback(correct ? "correct" : "wrong");
    if (correct) {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.45 }, colors: CONFETTI_COLORS, zIndex: 60 });
    }
  };

  const correctSentence = question
    ? question.sentences[question.answerIndex].replace("＿＿＿", `${baseWord}(${hanjaStr})`)
    : "";
  const [beforeWord, afterWord] = correctSentence.split(`${baseWord}(${hanjaStr})`);

  const goSearchAgain = () => {
    setInput("");
    setStep("search");
  };

  const dailyDone = todayWords.length >= dailyGoal;

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-nori-subtle text-left">
      <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-nori-surface">
        {/* W01·W02 단어 검색 */}
        {step === "search" && (
          <>
            <ProgressNav icon="back" progress={0.04} onClose={onExit} />
            <form
              id="word-search"
              className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-[26px] pt-[116px]"
              onSubmit={(e) => {
                e.preventDefault();
                find(input);
              }}
            >
              <p className="text-xl font-medium leading-[22px] tracking-[1px] text-nori-primary">어떤 단어가 궁금하세요?</p>
              <Hero blob="mint-xl" character="dori-explorer" characterHeight={125} className="mt-[43px]" />
              <SearchCard
                className="mt-6"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="여기에 단어를 입력하세요"
                autoFocus
              />
              {recentWords.length > 0 && (
                <div className="mt-[19px] flex w-full gap-2 overflow-x-auto pb-2">
                  {recentWords.map((w) => (
                    <Chip
                      key={w}
                      label={w}
                      onClick={() => {
                        setInput(w);
                        find(w);
                      }}
                      onRemove={onRemoveRecent ? () => onRemoveRecent(w) : undefined}
                    />
                  ))}
                </div>
              )}
            </form>
            <BottomActionBar>
              <Button type="submit" form="word-search" disabled={!input.trim()}>
                단어 찾기
              </Button>
            </BottomActionBar>
          </>
        )}

        {/* W03 단어 찾는 중 */}
        {step === "loading" && (
          <div role="status" className="flex flex-1 flex-col items-center gap-3 px-[22px] pt-[250px]">
            <Hero blob="peach-xl" character="dori-explorer" characterHeight={170} />
            <p className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-secondary">단어를 찾고 있어요!</p>
            <p className="text-center text-base font-medium leading-6 tracking-[-0.16px] text-nori-secondary">
              노리와 함께 어려운 것도
              <br />
              쉽고 즐겁게 배울 수 있어요!
            </p>
          </div>
        )}

        {/* 같은 소리, 다른 뜻 */}
        {step === "ambiguous" && (
          <>
            <ProgressNav icon="back" progress={0.12} onClose={goSearchAgain} />
            <div className="flex min-h-0 flex-1 flex-col gap-[15px] overflow-y-auto px-4 pb-6 pt-3">
              <div className="flex items-center gap-1">
                <Hero blob="peach" character="dori-default" characterHeight={92} width={140} height={108} />
                <p className="flex-1 text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-primary">
                  어떤 뜻의
                  <br />
                  단어를 찾았나요?
                </p>
              </div>
              {candidates.map((c) => (
                <ListItem key={`${c.word}${c.hanja}`} onClick={() => find(`${c.word}(${c.hanja})`)}>
                  <span className="block">
                    {c.word} ({c.hanja})
                  </span>
                  <span className="mt-1 block font-sans text-sm font-medium leading-5 tracking-[-0.14px] text-nori-secondary">
                    {c.description}
                  </span>
                </ListItem>
              ))}
            </div>
          </>
        )}

        {/* W04 한자 카드 */}
        {step === "card" && (
          <>
            <ProgressNav icon="back" progress={0.25} onClose={goSearchAgain} />
            <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 pt-3">
              <p className="text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-primary">아하! 이 한자의 뜻은요?</p>
              <div className="flex flex-wrap justify-center gap-5">
                {hanjaList.map((h) => (
                  <HanjaTile
                    key={h.char}
                    char={h.char}
                    meaning={h.meaning}
                    sound={h.sound}
                    selected={written.has(h.char)}
                    compact={hanjaList.length >= 3}
                    onWrite={() => setWriting(h)}
                  />
                ))}
              </div>
              <p className="min-h-[22px] text-xl font-medium leading-[22px] tracking-[1px] text-nori-strong">
                {question?.meaning ? `뜻: ${question.meaning}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 px-4 pb-6">
              <Hero blob="blue" character="dori-writer" characterHeight={92} width={140} height={108} />
              <p className="flex-1 text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-primary">
                한자 카드를 눌러
                <br />
                같이 써봐요!
              </p>
            </div>
          </>
        )}

        {/* W06 훌륭해요 */}
        {step === "great" && (
          <>
            <ProgressNav icon="back" progress={0.5} />
            <div className="flex flex-1 flex-col items-center gap-6 px-[22px] pt-[166px]">
              <p className="text-[34px] font-bold leading-[42px] tracking-[-0.34px] text-[var(--color-text-brand)]">훌륭해요!</p>
              <Hero blob="yellow-xl" character="dori-celebrate" characterHeight={200} />
            </div>
          </>
        )}

        {/* L1 익히기 문제 */}
        {step === "learn" && (
          <>
            <ProgressNav progress={0.75} onClose={() => setConfirmQuit(true)} />
            {question ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-4 pb-4 pt-2">
                  <div className="flex items-center justify-between">
                    <QuestionChip>익히기 문제 · 들어갈 곳 찾기</QuestionChip>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hero blob="peach" character="dori-default" characterHeight={92} width={140} height={108} />
                    <p className="flex-1 text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-primary">
                      ‘{baseWord}’{subjectParticle(baseWord)} 들어갈 알맞은
                      <br />
                      문장을 골라 보세요
                    </p>
                  </div>
                  <div className="flex flex-col gap-[15px]">
                    {question.sentences.map((s, i) => (
                      <ListItem key={i} large selected={picked === i} onClick={() => setPicked(i)}>
                        {s}
                      </ListItem>
                    ))}
                  </div>
                </div>
                <BottomActionBar>
                  <Button disabled={picked === null} onClick={check}>
                    확인
                  </Button>
                </BottomActionBar>
              </>
            ) : (
              <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3">
                <Hero blob="peach" character="dori-default" characterHeight={92} />
                <p className="text-lg font-bold text-nori-secondary">문제를 준비하고 있어요…</p>
              </div>
            )}
          </>
        )}

        {/* R01 단어 결과 · R02 오늘의 단어 3개 완성 */}
        {step === "result" && (
          <>
            <div className="flex min-h-0 flex-1 flex-col items-center gap-[14px] overflow-y-auto px-[22px] pb-6 pt-6">
              <Hero blob={dailyDone ? "rose" : "yellow"} character="dori-celebrate" characterHeight={160} width={260} height={220} />
              <p className="text-center text-[32px] font-bold leading-10 tracking-[-0.32px] text-[var(--color-text-brand)]">
                {dailyDone ? `오늘의 단어 ${dailyGoal}개 완성!` : `${baseWord} 익히기 완료!`}
              </p>
              <p className="text-center text-base font-medium leading-6 tracking-[-0.16px] text-nori-secondary">
                {dailyDone
                  ? "내일도 노리와 함께 새 단어를 찾아봐요"
                  : `오늘의 단어 ${Math.min(todayWords.length, dailyGoal)}개를 익혔어요`}
              </p>
              <DailyProgress words={todayWords} goal={dailyGoal} />
              {isLoggedIn ? (
                <div className="flex w-full gap-2.5">
                  {points > 0 && <StatCard
                      icon={
                        <span className="flex size-[23px] items-center justify-center rounded-full bg-nori-brand">
                          <NoriIcon name="star" size={15} />
                        </span>
                      }
                      value={`+${points}`}
                      label="포인트"
                    />}
                  <StatCard icon={<NoriIcon name="flame" />} value={`${streak}일`} label="연속 학습" />
                </div>
              ) : (
                <p className="text-center text-sm font-medium leading-5 text-nori-tertiary">
                  로그인하면 익힌 단어와 연속 학습 기록이 저장돼요
                </p>
              )}
            </div>
            <BottomActionBar>
              {dailyDone ? <Button onClick={onExit}>홈으로</Button> : <Button onClick={goSearchAgain}>다음 단어 찾기</Button>}
            </BottomActionBar>
          </>
        )}
      </div>

      <WriteSheet
        open={!!writing}
        char={writing?.char ?? ""}
        meaning={writing?.meaning ?? ""}
        sound={writing?.sound ?? ""}
        onClose={() => setWriting(null)}
        onComplete={handleWritten}
      />

      <AnswerFeedback
        open={feedback !== null}
        result={feedback ?? "correct"}
        title={feedback === "correct" ? "정답이에요!" : "아쉬워요!"}
        message={
          feedback === "correct" ? (
            <>
              {beforeWord}
              <em>{`${baseWord}(${hanjaStr})`}</em>
              {afterWord}
            </>
          ) : (
            <>
              정답 문장은
              <br />‘{beforeWord}
              <em>{baseWord}</em>
              {afterWord}’
            </>
          )
        }
        onContinue={() => {
          setFeedback(null);
          setStep("result");
        }}
      />

      <Modal
        isOpen={!!error}
        onClose={() => setError(null)}
        title="앗, 다시 찾아볼까요?"
        description={error}
        hero={<Hero blob="yellow-wide" character="mung-sad" characterHeight={110} />}
      >
        <Button onClick={() => setError(null)}>다른 단어 찾기</Button>
      </Modal>

      <Modal
        isOpen={confirmQuit}
        onClose={() => setConfirmQuit(false)}
        title="정말 그만둘까요?"
        description="지금 나가면 이번 익히기 문제를 건너뛰어요."
      >
        <Button onClick={() => setConfirmQuit(false)}>계속 학습하기</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirmQuit(false);
            onExit();
          }}
        >
          나가기
        </Button>
      </Modal>
    </div>
  );
}
