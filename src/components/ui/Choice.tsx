import React from "react";
import { cn } from "@/lib/utils";

/**
 * 선택형 항목 공통 스타일: 기본은 흰 카드, 선택되면 하늘색 강조.
 * - ListItem (Figma 3:13): 가입 경로·학년·문장 고르기처럼 세로 목록
 * - AnswerTile (Figma 13:51): 문제 보기 타일(가운데 정렬)
 */
const base =
  "relative w-full border-2 border-solid rounded-nori-md font-nunito font-black text-left transition-transform active:translate-y-0.5";
const stateStyles = {
  default: "bg-nori-surface border-nori-border text-nori-primary shadow-nori-card",
  selected: "bg-nori-selected-bg border-nori-selected-border text-nori-selected shadow-nori-selected",
  used: "bg-nori-subtle border-nori-border text-transparent shadow-none pointer-events-none",
};

export interface ListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
  /** 문장 고르기처럼 큰 글씨(21px, 최소 높이 84) */
  large?: boolean;
}

export function ListItem({ selected, icon, large, className, children, ...props }: ListItemProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        base,
        "flex items-center gap-[14px] px-5 py-4",
        large ? "min-h-[84px] text-[21px] leading-7" : "min-h-[68px] text-lg leading-7",
        selected ? stateStyles.selected : stateStyles.default,
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span className="flex-1 min-w-0">{children}</span>
    </button>
  );
}

export interface AnswerTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: "default" | "selected" | "used";
  /** large: 한 줄에 하나(높이 88, 22px) / 기본: 2열 그리드(높이 64, 18px) */
  large?: boolean;
}

export function AnswerTile({ state = "default", large, className, children, ...props }: AnswerTileProps) {
  return (
    <button
      type="button"
      aria-pressed={state === "selected"}
      disabled={state === "used" || props.disabled}
      className={cn(
        base,
        "flex items-center justify-center px-4 py-3 text-center",
        large ? "h-[88px] text-[22px] leading-7" : "h-16 text-lg leading-7",
        stateStyles[state],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
