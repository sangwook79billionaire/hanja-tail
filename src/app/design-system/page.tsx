"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ListItem, AnswerTile } from "@/components/ui/Choice";
import { SearchInput, Chip, WordCard } from "@/components/ui/Search";
import { StatCounter, TopNavStats, StatCard, DailyProgress } from "@/components/ui/Stats";
import { ProgressNav, QuestionChip, BottomActionBar, TabBar, type TabKey } from "@/components/ui/Navigation";
import { AnswerFeedback, Toast } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { Hero, type CharacterName } from "@/components/ui/Hero";
import { LessonNode, BundleNode, UnitBanner } from "@/components/ui/LearningPath";
import { NoriIcon } from "@/components/ui/NoriIcon";
import {
  MOCK_STATS,
  MOCK_RECENT_SEARCHES,
  MOCK_RECOMMENDED_WORDS,
  MOCK_LEARN_QUESTION,
  MOCK_REVIEW_CHOICES,
  MOCK_DAILY_WORDS,
  MOCK_SIGNUP_SOURCES,
} from "@/mock/noriMockData";

/* ── 미리보기 레이아웃 도우미 ── */
function Section({ title, node, children }: { title: string; node?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-2 border-b-2 border-nori-border pb-2">
        <h2 className="text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-strong">{title}</h2>
        {node && <span className="text-xs font-semibold text-nori-tertiary">Figma {node}</span>}
      </div>
      {children}
    </section>
  );
}

/** Figma 화면과 같은 402px 폰 프레임 */
function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="w-full max-w-[402px] space-y-2">
      <figcaption className="text-sm font-semibold text-nori-tertiary">{label}</figcaption>
      <div className="relative flex h-[818px] w-full max-w-[402px] flex-col overflow-hidden rounded-[28px] border-2 border-nori-border bg-nori-surface">
        {children}
      </div>
    </figure>
  );
}

const COLOR_SWATCHES = [
  ["brand", "#f49000"],
  ["brand-shadow", "#ff5c02"],
  ["text-strong", "#3c3c3c"],
  ["text-secondary", "#666666"],
  ["border", "#ebebeb"],
  ["bg-subtle", "#f4f4f4"],
  ["selected", "#1cb0f6"],
  ["selected-bg", "#d2effd"],
  ["success", "#58cc02"],
  ["success-subtle", "#d7ffb8"],
  ["danger", "#ff4b4b"],
  ["danger-subtle", "#ffdfe0"],
] as const;

const TYPE_SCALE = [
  { name: "H1 · 26/34 Bold", cls: "text-[26px] leading-[34px] font-bold tracking-[-0.26px]", sample: "단어 검색" },
  { name: "H2 · 22/30 Bold", cls: "text-[22px] leading-[30px] font-bold tracking-[-0.22px]", sample: "빈칸에 들어갈 단어를 골라 보세요" },
  { name: "H3 · 18/26 Bold", cls: "text-lg leading-[26px] font-bold tracking-[-0.18px]", sample: "오늘의 추천 단어" },
  { name: "Body · 16/24 Medium", cls: "text-base leading-6 font-medium tracking-[-0.16px]", sample: "오늘의 단어 1개를 익혔어요" },
  { name: "Small · 14/20 Medium", cls: "text-sm leading-5 font-medium tracking-[-0.14px]", sample: "비를 막는 도구" },
  { name: "Caption · 12/16 SemiBold", cls: "text-xs leading-4 font-semibold tracking-[-0.12px]", sample: "연속 학습 +1" },
  { name: "Label · Nunito 18 Black", cls: "font-nunito text-lg leading-7 font-black", sample: "Nori 350 · 네이버" },
  { name: "Button · 16/20 Bold +2.5", cls: "text-base leading-5 font-bold tracking-[2.5px]", sample: "계속하기" },
];

const CHARACTERS: { name: CharacterName; label: string }[] = [
  { name: "dori-default", label: "도리 · 기본" },
  { name: "dori-positive", label: "도리 · 긍정(안경)" },
  { name: "dori-thumbsup", label: "도리 · 엄지척" },
  { name: "dori-scholar", label: "도리 · 학사모" },
  { name: "dori-celebrate", label: "도리 · 축하" },
  { name: "mung-sad", label: "뭉 · 슬픔" },
];

export default function DesignSystemPage() {
  const [tab, setTab] = useState<TabKey>("search");
  const [recent, setRecent] = useState(MOCK_RECENT_SEARCHES);
  const [added, setAdded] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [source, setSource] = useState<number | null>(4);
  const [sentence, setSentence] = useState<number | null>(null);
  const [tile, setTile] = useState<number | null>(1);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [modal, setModal] = useState<"hearts" | "quit" | null>(null);

  const addWord = (word: string) => {
    setAdded((a) => [...a, word]);
    setToast(`‘${word.split(" ")[0]}’을 보따리에 담았어요!`);
  };

  const q = MOCK_LEARN_QUESTION;

  return (
    <div className="min-h-screen w-full bg-nori-subtle">
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-8">
        <header className="flex items-center gap-4 rounded-nori-xl bg-nori-brand p-6 shadow-nori-brand">
          <Hero blob="yellow-wide" character="dori-celebrate" characterHeight={80} width={120} height={96} />
          <div>
            <p className="font-nunito text-sm font-semibold text-nori-on-brand">Designer Workspace</p>
            <h1 className="text-[26px] font-bold leading-[34px] tracking-[-0.26px] text-white">노리 디자인 시스템</h1>
            <p className="mt-1 text-sm font-medium text-nori-on-brand">
              Figma ‘노리 디자인 시스템’과 같은 토큰·컴포넌트를 실제 코드로 확인하는 곳입니다.
            </p>
          </div>
        </header>

        <Section title="색상 토큰">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COLOR_SWATCHES.map(([name, hex]) => (
              <div key={name} className="overflow-hidden rounded-nori-md border-2 border-nori-border bg-nori-surface">
                <div className="h-14" style={{ background: hex }} />
                <div className="p-2">
                  <p className="text-xs font-bold text-nori-strong">{name}</p>
                  <p className="text-xs font-medium text-nori-tertiary">{hex}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="글자 스타일">
          <div className="space-y-3 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-5">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-48 shrink-0 text-xs font-semibold text-nori-tertiary">{t.name}</span>
                <span className={`${t.cls} text-nori-strong`}>{t.sample}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="버튼" node="2:21">
          <div className="grid gap-4 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-5 sm:grid-cols-2">
            <Button>계속하기</Button>
            <Button disabled>계속하기</Button>
            <Button variant="secondary">계속하기</Button>
            <Button variant="success">계속하기</Button>
            <Button variant="danger">계속하기</Button>
            <Button variant="info">계속하기</Button>
          </div>
          <div className="flex flex-wrap gap-3 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-5">
            <Button size="sm">계속하기</Button>
            <Button size="sm" disabled>계속하기</Button>
            <Button size="sm" variant="secondary">계속하기</Button>
            <Button size="sm" variant="success">계속하기</Button>
            <Button size="sm" variant="danger">계속하기</Button>
            <Button size="sm" variant="info">계속하기</Button>
          </div>
        </Section>

        <Section title="선택 항목 · 보기 타일" node="3:13 · 13:51">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-[15px]">
              {MOCK_SIGNUP_SOURCES.map((s, i) => (
                <ListItem key={s} selected={source === i} onClick={() => setSource(i)}>
                  {s}
                </ListItem>
              ))}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {["이치 (理致)", "결과 (結果)", "기분 (氣分)", "날씨"].map((t, i) => (
                  <AnswerTile key={t} state={tile === i ? "selected" : "default"} onClick={() => setTile(i)}>
                    {t}
                  </AnswerTile>
                ))}
                <AnswerTile state="used">빈 자리</AnswerTile>
              </div>
              {MOCK_REVIEW_CHOICES.map((c) => (
                <AnswerTile key={c} large>
                  {c}
                </AnswerTile>
              ))}
            </div>
          </div>
        </Section>

        <Section title="상단 상태 · 결과 카드" node="15:63 · 22:104 · 46:145">
          <div className="space-y-4 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-5">
            <div className="flex flex-wrap gap-4">
              <StatCounter type="streak" value={12} />
              <StatCounter type="coin" value={350} />
              <StatCounter type="heart" value={5} />
            </div>
            <div className="flex gap-2.5">
              <StatCard icon={<span className="flex size-[23px] items-center justify-center rounded-full bg-nori-brand"><NoriIcon name="star" size={15} /></span>} value="+10" label="경험치 XP" />
              <StatCard icon={<NoriIcon name="coin" size={23} />} value="+5" label="도토리" />
              <StatCard icon={<NoriIcon name="flame" />} value="13일" label="연속 학습 +1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DailyProgress words={MOCK_DAILY_WORDS.slice(0, 1)} />
              <DailyProgress words={MOCK_DAILY_WORDS} />
            </div>
          </div>
        </Section>

        <Section title="학습 경로" node="15:40 · 22:162 · 15:41">
          <div className="space-y-6 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <UnitBanner eyebrow="1단원 · 3과" title="교과서 속 기초 한자" onGuideClick={() => {}} />
              <UnitBanner eyebrow="8급 · 1단원 · 시험 D-24" title="숫자를 나타내는 한자" tone="info" onGuideClick={() => {}} />
            </div>
            <div className="flex flex-wrap items-end gap-8">
              <LessonNode state="completed" />
              <LessonNode state="current" />
              <BundleNode />
              <LessonNode state="locked" />
            </div>
          </div>
        </Section>

        <Section title="캐릭터 · 물결 배경" node="24:2274 · 110:93">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CHARACTERS.map((c, i) => (
              <div key={c.name} className="flex flex-col items-center gap-2 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-4">
                <Hero
                  blob={(["peach", "rose", "mint", "mint-lg", "yellow", "yellow-wide"] as const)[i]}
                  character={c.name}
                  characterHeight={92}
                  width={160}
                  height={130}
                />
                <p className="text-sm font-semibold text-nori-secondary">{c.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="피드백 · 팝업" node="13:42 · 22:118 · 22:100">
          <div className="flex flex-wrap gap-3 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-5">
            <Button size="sm" variant="success" onClick={() => setFeedback("correct")}>정답 시트</Button>
            <Button size="sm" variant="danger" onClick={() => setFeedback("wrong")}>오답 시트</Button>
            <Button size="sm" onClick={() => setModal("hearts")}>하트 소진 팝업</Button>
            <Button size="sm" variant="secondary" onClick={() => setModal("quit")}>학습 중단 팝업</Button>
            <Button size="sm" variant="info" onClick={() => setToast("‘우산’을 보따리에 담았어요!")}>토스트</Button>
          </div>
        </Section>

        <Section title="화면 조립 예시" node="H03 · L1 · R01">
          <div className="grid justify-items-center gap-8 lg:grid-cols-2">
            {/* H03 검색 */}
            <Phone label="H03 검색 · 추가됨">
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[22px] pt-3">
                <h1 className="text-[26px] font-bold leading-[34px] tracking-[-0.26px] text-nori-strong">단어 검색</h1>
                <SearchInput placeholder="궁금한 단어를 검색해 보세요" />
                <p className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-primary">최근 검색</p>
                <div className="flex gap-2 overflow-x-auto">
                  {recent.map((r) => (
                    <Chip key={r} label={r} onRemove={() => setRecent((x) => x.filter((y) => y !== r))} />
                  ))}
                </div>
                <p className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-primary">오늘의 추천 단어</p>
                {MOCK_RECOMMENDED_WORDS.map((w) => (
                  <WordCard key={w.word} {...w} added={added.includes(w.word)} onAdd={() => addWord(w.word)} />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-[88px] flex justify-center">
                <Toast open={!!toast} message={toast ?? ""} onClose={() => setToast(null)} />
              </div>
              <TabBar active={tab} onChange={setTab} />
            </Phone>

            {/* L1 익히기 문제 */}
            <Phone label="L1 익히기 문제 · 문맥 빈칸">
              <ProgressNav progress={0.25} />
              <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-4 pt-2">
                <div className="flex items-center justify-between">
                  <QuestionChip>{q.phase}</QuestionChip>
                  <StatCounter type="heart" value={5} />
                </div>
                <div className="flex items-center gap-1">
                  <Hero blob="peach" character="dori-default" characterHeight={92} width={140} height={108} />
                  <p className="flex-1 text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-primary">
                    {q.prompt[0]}
                    <br />
                    {q.prompt[1]}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] pb-4">
                  {q.sentences.map((s, i) => (
                    <ListItem key={s} large selected={sentence === i} onClick={() => setSentence(i)}>
                      {s}
                    </ListItem>
                  ))}
                </div>
              </div>
              <BottomActionBar>
                <Button
                  disabled={sentence === null}
                  onClick={() => setFeedback(sentence === q.answerIndex ? "correct" : "wrong")}
                >
                  확인
                </Button>
              </BottomActionBar>
            </Phone>

            {/* R01 단어 결과 */}
            <Phone label="R01 단어 결과 · 오늘 1/3">
              <div className="flex min-h-0 flex-1 flex-col items-center gap-[14px] overflow-y-auto px-[22px] pt-6">
                <Hero blob="yellow" character="dori-celebrate" characterHeight={160} />
                <p className="text-[32px] font-bold leading-10 tracking-[-0.32px] text-[var(--color-text-brand)]">원리 익히기 완료!</p>
                <p className="text-base font-medium leading-6 tracking-[-0.16px] text-nori-secondary">오늘의 단어 1개를 익혔어요</p>
                <DailyProgress words={MOCK_DAILY_WORDS.slice(0, 1)} />
                <div className="flex w-full gap-2.5">
                  <StatCard icon={<span className="flex size-[23px] items-center justify-center rounded-full bg-nori-brand"><NoriIcon name="star" size={15} /></span>} value="+10" label="경험치 XP" />
                  <StatCard icon={<NoriIcon name="coin" size={23} />} value="+5" label="도토리" />
                  <StatCard icon={<NoriIcon name="flame" />} value="13일" label="연속 학습 +1" />
                </div>
              </div>
              <BottomActionBar>
                <Button>다음 단어 찾기</Button>
              </BottomActionBar>
            </Phone>

            {/* H01 홈 상단 */}
            <Phone label="H01 홈 학습 맵 (상단·노드)">
              <TopNavStats {...MOCK_STATS} />
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-[22px] pt-2">
                <UnitBanner eyebrow="1단원 · 3과" title="교과서 속 기초 한자" onGuideClick={() => {}} />
                {/* Figma Learning Path 좌표(402px 기준) 그대로 */}
                <div className="relative -mx-[22px] h-[560px] shrink-0 overflow-hidden">
                  <LessonNode state="completed" className="absolute left-[165px] top-[6px]" />
                  <LessonNode state="completed" className="absolute left-[115px] top-[84px]" />
                  <LessonNode state="current" className="absolute left-[84.5px] top-[162px]" />
                  <BundleNode className="absolute left-[107px] top-[292px]" />
                  <LessonNode state="locked" className="absolute left-[195px] top-[422px]" />
                  <LessonNode state="locked" className="absolute left-[229px] top-[500px]" />
                  <Hero blob="mint-lg" character="dori-scholar" characterHeight={140} className="absolute left-[221px] top-[180px]" />
                </div>
              </div>
              <TabBar active="learn" />
            </Phone>
          </div>
        </Section>
      </div>

      <AnswerFeedback
        open={feedback !== null}
        result={feedback ?? "correct"}
        title={feedback === "correct" ? "정답이에요!" : "아쉬워요! 하트 -1"}
        message={
          feedback === "correct" ? (
            <>비행기가 나는 <em>원리(原理)</em>를 배웠어요.</>
          ) : (
            <>정답은 <em>협동(協同)</em> · 오답 노트에 저장했어요</>
          )
        }
        onContinue={() => setFeedback(null)}
      />

      <Modal
        isOpen={modal === "hearts"}
        onClose={() => setModal(null)}
        title="하트를 모두 썼어요"
        description={<>퀴즈가 잠시 멈췄어요.<br />도토리로 충전하거나 복습하고 무료로 받아요.</>}
        hero={<Hero blob="yellow-wide" character="mung-sad" characterHeight={110} />}
      >
        <Button onClick={() => setModal(null)}>🌰 도토리 50개로 충전</Button>
        <Button variant="secondary" onClick={() => setModal(null)}>복습하고 무료로 받기</Button>
      </Modal>

      <Modal
        isOpen={modal === "quit"}
        onClose={() => setModal(null)}
        title="정말 그만둘까요?"
        description="지금 나가면 이번 레슨 진행도가 사라져요."
      >
        <Button onClick={() => setModal(null)}>계속 학습하기</Button>
        <Button variant="secondary" onClick={() => setModal(null)}>나가기</Button>
      </Modal>
    </div>
  );
}
