import React from "react";
import { cn } from "@/lib/utils";
import { NoriIcon } from "./NoriIcon";

/** 노드 위 말풍선 ("시작", "내 보따리") */
function NodeTooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-nori-md border-2 border-nori-border bg-nori-surface px-4 py-2 font-nunito text-xl font-extrabold leading-6 text-[var(--color-text-brand)] whitespace-nowrap">
      {children}
    </div>
  );
}

/**
 * Figma: Lesson Node (15:40) — 학습 경로의 레슨 동그라미.
 * locked=회색 자물쇠, current=오렌지 별 + "시작" 말풍선, completed=오렌지 체크
 */
export interface LessonNodeProps {
  state: "locked" | "current" | "completed";
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function LessonNode({ state, label = "시작", onClick, className }: LessonNodeProps) {
  const locked = state === "locked";
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {state === "current" && <NodeTooltip>{label}</NodeTooltip>}
      <button
        type="button"
        onClick={onClick}
        disabled={locked}
        aria-label={locked ? "잠긴 레슨" : state === "current" ? "레슨 시작" : "완료한 레슨"}
        className={cn(
          "flex h-16 w-[72px] items-center justify-center rounded-full transition-transform active:translate-y-1.5 active:shadow-none",
          locked ? "bg-[var(--color-bg-locked)] shadow-nori-node-locked" : "bg-nori-brand shadow-nori-node-brand"
        )}
      >
        <NoriIcon name={locked ? "lock" : state === "current" ? "star" : "check"} size={32} />
      </button>
    </div>
  );
}

/** Figma: Bundle Node (22:162) — 내가 검색해서 담은 단어 묶음(파랑) */
export function BundleNode({
  label = "내 보따리",
  onClick,
  className,
}: {
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <NodeTooltip>{label}</NodeTooltip>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-16 w-[72px] items-center justify-center rounded-full bg-nori-info shadow-nori-info transition-transform active:translate-y-1 active:shadow-none"
      >
        <NoriIcon name="bundle" size={32} />
      </button>
    </div>
  );
}

/** Figma: Unit Banner (15:41) — 학습 경로 맨 위 단원 배너. 과목별로 tone을 바꿔 씁니다 */
export interface UnitBannerProps {
  eyebrow: string;
  title: string;
  tone?: "brand" | "info";
  onGuideClick?: () => void;
  className?: string;
}

export function UnitBanner({ eyebrow, title, tone = "brand", onGuideClick, className }: UnitBannerProps) {
  return (
    <div
      className={cn(
        "flex h-20 w-full items-center gap-3 rounded-nori-lg py-4 pl-5 pr-4",
        tone === "brand" ? "bg-nori-brand shadow-nori-brand" : "bg-nori-info shadow-nori-info",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 whitespace-nowrap font-nunito">
        <p className="text-sm font-semibold leading-[19px] text-nori-on-brand">{eyebrow}</p>
        <p className="truncate text-[22px] font-extrabold leading-[30px] text-white">{title}</p>
      </div>
      {onGuideClick && (
        <button
          type="button"
          onClick={onGuideClick}
          className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-solid border-white px-3 py-2"
        >
          <NoriIcon name="book" size={20} />
          <span className="font-nunito text-[13px] font-extrabold leading-[22px] text-white">안내서</span>
        </button>
      )}
    </div>
  );
}
