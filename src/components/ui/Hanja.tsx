import React from "react";
import { cn } from "@/lib/utils";
import { NoriIcon } from "./NoriIcon";

/** Figma: Search Input / Style=Card (41:3416) — 단어 찾기 흐름의 큰 검색 카드(돋보기 + 밑줄 입력) */
export const SearchCard = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <label
      className={cn(
        "flex h-[133px] w-full items-center gap-3 rounded-nori-md border-2 border-nori-border bg-nori-surface py-[14px] pl-5 pr-6 shadow-nori-card",
        className
      )}
    >
      <NoriIcon name="search" />
      <span className="flex min-w-0 flex-1 border-b-[1.5px] border-nori-border pb-1">
        <input
          ref={ref}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-[22px] font-bold leading-7 text-nori-strong placeholder:font-semibold placeholder:text-lg placeholder:text-nori-placeholder outline-none [&::-webkit-search-cancel-button]:appearance-none"
          {...props}
        />
      </span>
    </label>
  )
);
SearchCard.displayName = "SearchCard";

/** Figma: Tool Button (3:38) — 써보기·획순보기·다시쓰기. active=하늘색 */
export interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function ToolButton({ active, className, children, ...props }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[50px] items-center justify-center gap-2 rounded-nori-lg border-2 border-solid px-4 py-[14px] transition-transform active:translate-y-0.5",
        "font-nunito text-lg font-extrabold leading-[22px] whitespace-nowrap disabled:opacity-50",
        active
          ? "border-nori-selected-border bg-nori-selected-border text-white"
          : "border-nori-border bg-nori-surface text-nori-strong",
        className
      )}
      {...props}
    >
      <NoriIcon name="flame" />
      {children}
    </button>
  );
}

/**
 * Figma: Hanja Card (4:25) — 큰 한자 + 뜻·음 + 써보기 버튼.
 * selected(하늘색)는 이미 써 본 한자에 씁니다.
 */
export interface HanjaTileProps {
  char: string;
  meaning: string;
  sound: string;
  selected?: boolean;
  onWrite?: () => void;
  /** 한자가 3개 이상일 때 작게 */
  compact?: boolean;
  className?: string;
}

export function HanjaTile({ char, meaning, sound, selected, onWrite, compact, className }: HanjaTileProps) {
  return (
    <button
      type="button"
      onClick={onWrite}
      aria-label={`${char} ${meaning} ${sound} 써보기`}
      className={cn(
        "flex shrink-0 flex-col items-center rounded-nori-lg border-2 border-solid px-4 transition-transform active:translate-y-0.5",
        compact ? "w-[108px] gap-2 pb-3 pt-4" : "h-[270px] w-[150px] gap-4 pb-4 pt-6",
        selected
          ? "border-nori-selected-border bg-nori-selected-bg shadow-nori-selected"
          : "border-nori-border bg-nori-surface shadow-nori-card",
        className
      )}
    >
      <span
        className={cn(
          "font-semibold tracking-[1px] text-nori-icon-muted",
          compact ? "text-[64px] leading-[76px]" : "text-[105px] leading-[120px]"
        )}
      >
        {char}
      </span>
      <span
        className={cn(
          "font-nunito font-black whitespace-nowrap",
          compact ? "text-base leading-6" : "text-lg leading-7",
          selected ? "text-nori-selected" : "text-nori-disabled-text"
        )}
      >
        {meaning} {sound}
      </span>
      <span
        className={cn(
          "flex items-center gap-2 rounded-nori-lg border-2 border-solid font-nunito font-extrabold whitespace-nowrap",
          compact ? "px-3 py-2 text-base leading-5" : "px-4 py-[14px] text-lg leading-[22px]",
          selected
            ? "border-nori-selected-border bg-nori-selected-border text-white"
            : "border-nori-border bg-nori-surface text-nori-strong"
        )}
      >
        <NoriIcon name="flame" size={compact ? 20 : undefined} />
        써보기
      </span>
    </button>
  );
}
