import React from "react";
import { cn } from "@/lib/utils";
import { NoriIcon } from "./NoriIcon";

/** Figma: Stat Counter (15:63) — 연속 학습 불꽃 · 도토리 · 하트 */
const COUNTERS = {
  streak: { icon: <NoriIcon name="flame" size={27.6} />, color: "text-[var(--color-text-brand)]", label: "연속 학습" },
  coin: { icon: <NoriIcon name="coin" />, color: "text-nori-coin", label: "도토리" },
  heart: { icon: <NoriIcon name="heart" />, color: "text-nori-danger-text", label: "하트" },
};

export interface StatCounterProps {
  type: keyof typeof COUNTERS;
  value: number | string;
  onClick?: () => void;
  className?: string;
}

export function StatCounter({ type, value, onClick, className }: StatCounterProps) {
  const c = COUNTERS[type];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={`${c.label} ${value}`}
      className={cn("flex shrink-0 items-center gap-1.5 px-2 py-1", className)}
    >
      {c.icon}
      <span className={cn("font-nunito text-xl font-extrabold leading-6", c.color)}>{value}</span>
    </Tag>
  );
}

/** Figma: Top Nav / Stats (15:64) — 홈 상단: 현재 과목 + 연속 학습·도토리·하트 */
export interface TopNavStatsProps {
  subject: string;
  streak: number;
  /** 아직 서버에 없는 값은 생략하면 표시하지 않습니다 */
  coins?: number;
  hearts?: number;
  onSubjectClick?: () => void;
  onHeartsClick?: () => void;
  subjectOpen?: boolean;
  className?: string;
}

export function TopNavStats({
  subject,
  streak,
  coins,
  hearts,
  onSubjectClick,
  onHeartsClick,
  subjectOpen,
  className,
}: TopNavStatsProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-full items-center justify-between border-b-2 border-nori-border bg-nori-surface px-5 py-3",
        className
      )}
    >
      <button
        type="button"
        onClick={onSubjectClick}
        aria-expanded={subjectOpen}
        aria-label="과목 바꾸기"
        className="rounded-nori-sm bg-nori-subtle px-2 py-1 font-nunito text-xl font-extrabold leading-6 text-[var(--color-text-brand)]"
      >
        {subject}
      </button>
      <StatCounter type="streak" value={streak} />
      {coins !== undefined && <StatCounter type="coin" value={coins} />}
      {hearts !== undefined && <StatCounter type="heart" value={hearts} onClick={onHeartsClick} />}
    </div>
  );
}

/** Figma: Stat Card (22:104) — 결과 보상·학습 통계 숫자 카드 */
export interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  className?: string;
}

export function StatCard({ icon, value, label, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-nori-lg border-2 border-nori-border bg-nori-surface px-1.5 py-[14px] shadow-nori-card",
        className
      )}
    >
      <span className="flex h-[23px] items-center">{icon}</span>
      <p className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-strong whitespace-nowrap">{value}</p>
      <p className="text-xs font-semibold leading-4 tracking-[-0.12px] text-nori-tertiary whitespace-nowrap">{label}</p>
    </div>
  );
}

/** Figma: Daily Progress (46:145) — 오늘의 단어 n/3 + 단어 칸 */
export interface DailyWordSlot {
  word: string;
  hanja: string;
  status?: string;
}

export interface DailyProgressProps {
  words: DailyWordSlot[];
  goal?: number;
  /** 헤더 오른쪽 문구 끝말 (찾음 / 마스터) */
  doneLabel?: string;
  className?: string;
}

export function DailyProgress({ words, goal = 3, doneLabel = "찾음", className }: DailyProgressProps) {
  const done = Math.min(words.length, goal);
  return (
    <div className={cn("flex w-full flex-col gap-3 rounded-nori-lg border-2 border-nori-border bg-nori-surface p-4", className)}>
      <div className="flex items-center justify-between font-bold whitespace-nowrap">
        <p className="text-lg leading-[26px] tracking-[-0.18px] text-nori-strong">오늘의 단어</p>
        <p className="text-base leading-6 tracking-[-0.16px] text-[var(--color-text-brand)]">
          {done} / {goal} {doneLabel}
        </p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-md bg-nori-progress-track">
        <div
          className="h-full rounded-md bg-[var(--color-progress-fill)] transition-[width] duration-500"
          style={{ width: `${(done / goal) * 100}%` }}
        />
      </div>
      <div className="flex gap-2 whitespace-nowrap">
        {Array.from({ length: goal }, (_, i) => {
          const w = words[i];
          return w ? (
            <div
              key={i}
              className="flex h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-nori-md border-2 border-nori-success bg-nori-success-subtle py-2.5 text-nori-success-text"
            >
              <p className="text-base font-bold leading-6 tracking-[-0.16px]">✓ {w.word}</p>
              <p className="text-xs font-bold leading-4 tracking-[-0.12px]">
                {w.hanja} · {w.status ?? "익힘"}
              </p>
            </div>
          ) : (
            <div
              key={i}
              className="flex h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-nori-md border-2 border-dashed border-nori-border bg-nori-subtle py-2.5 text-nori-placeholder"
            >
              <p className="text-base font-bold leading-6 tracking-[-0.16px]">단어 {i + 1}</p>
              <p className="text-xs font-semibold leading-4 tracking-[-0.12px]">다음 단어 찾기</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
