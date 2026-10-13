import React from "react";
import { cn } from "@/lib/utils";
import { NoriIcon } from "./NoriIcon";

/** Figma: Search Input / Style=Field (3:14) */
export const SearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <label
      className={cn(
        "flex h-14 w-full items-center gap-[14px] rounded-nori-md border-2 border-nori-border bg-nori-surface px-5 shadow-nori-card",
        "focus-within:border-nori-selected-border",
        className
      )}
    >
      <NoriIcon name="search" />
      <input
        ref={ref}
        type="search"
          autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-nunito text-lg font-black leading-7 text-nori-strong placeholder:text-nori-placeholder outline-none [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
    </label>
  )
);
SearchInput.displayName = "SearchInput";

/** Figma: Chip (3:27) — 최근 검색어. onRemove가 있으면 오른쪽에 삭제(x) 버튼 */
export interface ChipProps {
  label: string;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function Chip({ label, onClick, onRemove, className }: ChipProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-nori-lg border-2 border-nori-border bg-nori-surface py-[14px] pl-[18px]",
        onRemove ? "pr-3" : "pr-[18px]",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="font-nunito text-lg font-extrabold leading-[22px] text-nori-strong whitespace-nowrap"
      >
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label} 삭제`}
          className="flex size-[22px] items-center justify-center rounded-full bg-nori-icon-muted"
        >
          <NoriIcon name="close-small" />
        </button>
      )}
    </div>
  );
}

/** Figma: Word Card (22:144) — 검색 결과 단어. [+ 맵에 추가] 누르면 added 상태 */
export interface WordCardProps {
  hanja: string;
  word: string;
  meaning: string;
  added?: boolean;
  onAdd?: () => void;
  /** 버튼 문구 (기본: Figma의 "+ 맵에 추가" / "✓ 담음") */
  actionLabel?: string;
  doneLabel?: string;
  className?: string;
}

export function WordCard({
  hanja,
  word,
  meaning,
  added,
  onAdd,
  actionLabel = "+ 맵에 추가",
  doneLabel = "✓ 담음",
  className,
}: WordCardProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-nori-lg border-2 bg-nori-surface p-3",
        added ? "border-nori-success" : "border-nori-border",
        className
      )}
    >
      <div
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-nori-md text-[26px] font-bold leading-[34px] tracking-[-0.26px] text-nori-strong",
          added ? "bg-nori-success-subtle" : "bg-nori-subtle"
        )}
      >
        {hanja}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-nowrap">
        <p className="truncate text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-strong">{word}</p>
        <p className="truncate text-sm font-medium leading-5 tracking-[-0.14px] text-nori-secondary">{meaning}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        className={cn(
          "shrink-0 rounded-full border border-solid px-4 py-2 text-base font-bold leading-5 tracking-[2.5px] whitespace-nowrap",
          "transition-[transform,box-shadow] duration-100 active:translate-y-1 active:shadow-none",
          added
            ? "border-nori-success bg-nori-success text-white shadow-nori-success"
            : "border-nori-brand-border bg-nori-brand text-nori-on-brand shadow-nori-brand"
        )}
      >
        {added ? doneLabel : actionLabel}
      </button>
    </div>
  );
}
