import React from "react";
import { cn } from "@/lib/utils";
import { NoriIcon } from "./NoriIcon";

/** Figma: Top Nav / Progress (4:56) — 닫기(X) + 진행 바 */
export interface ProgressNavProps {
  /** 0~1 */
  progress: number;
  onClose?: () => void;
  className?: string;
}

export function ProgressNav({ progress, onClose, className }: ProgressNavProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className={cn("flex h-16 w-full items-center gap-4 bg-nori-surface py-4 pl-[18px] pr-[22px]", className)}>
      <button type="button" onClick={onClose} aria-label="닫기" className="shrink-0">
        <NoriIcon name="close" />
      </button>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-nori-progress-track"
      >
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-[var(--color-progress-fill)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        >
          {pct > 0 && <div className="absolute left-[7px] top-[3px] h-1 w-6 rounded-full bg-nori-progress-highlight" />}
        </div>
      </div>
    </div>
  );
}

/** Figma: Question Chip — 문제 단계 표시 (예: "익히기 문제 · 들어갈 곳 찾기") */
export function QuestionChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-nori-brand px-3 py-1.5 text-xs font-semibold leading-4 tracking-[-0.12px] text-nori-on-brand whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Figma: Bottom Action Bar (2:22) — 화면 하단 고정 CTA 영역 */
export function BottomActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full border-t-2 border-nori-border bg-nori-surface px-4 pb-6 pt-4", className)}>
      {children}
    </div>
  );
}

/** Figma: Tab Bar (15:90) / Tab Item (15:89) — 하단 4탭 */
export type TabKey = "learn" | "search" | "review" | "profile";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "learn", label: "학습", icon: "/nori/icons/tab-home.svg" },
  { key: "search", label: "검색", icon: "/nori/icons/tab-search.svg" },
  { key: "review", label: "복습", icon: "/nori/icons/tab-review.svg" },
  { key: "profile", label: "마이", icon: "/nori/icons/tab-profile.svg" },
];

export interface TabBarProps {
  active: TabKey;
  onChange?: (tab: TabKey) => void;
  className?: string;
}

export function TabBar({ active, onChange, className }: TabBarProps) {
  return (
    <nav
      className={cn(
        "flex h-[72px] w-full items-center justify-between border-t-2 border-nori-border bg-nori-surface px-4 pb-4 pt-2",
        className
      )}
    >
      {TABS.map((t) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange?.(t.key)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-nori-md border-2 border-solid px-3 py-1.5",
              selected ? "border-nori-selected-border bg-nori-selected-bg" : "border-transparent"
            )}
          >
            {/* 아이콘 모양은 Figma SVG를 그대로 쓰고, 색만 선택 상태에 맞춰 칠합니다 */}
            <span
              aria-hidden
              className={cn("block size-7", selected ? "bg-nori-selected" : "bg-[var(--color-icon-default)]")}
              style={{
                WebkitMask: `url(${t.icon}) center / contain no-repeat`,
                mask: `url(${t.icon}) center / contain no-repeat`,
              }}
            />
            <span
              className={cn(
                "font-nunito text-[13px] font-extrabold leading-[22px]",
                selected ? "text-nori-selected" : "text-nori-tertiary"
              )}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
