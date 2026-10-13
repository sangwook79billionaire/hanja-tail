import React from "react";
import { cn } from "@/lib/utils";

/**
 * Figma에서 내보낸 아이콘(public/nori/icons). 각 SVG의 원래 크기를 기본값으로 씁니다.
 */
const ICONS = {
  heart: { w: 24, h: 24 },
  coin: { w: 24, h: 24 },
  flame: { w: 20, h: 23 },
  star: { w: 24, h: 24 },
  check: { w: 24, h: 24 },
  "check-white": { w: 24, h: 24 },
  "check-large": { w: 40, h: 40 },
  "x-white": { w: 32, h: 32 },
  close: { w: 32, h: 32 },
  back: { w: 32, h: 32 },
  "close-gray": { w: 16, h: 16 },
  "close-small": { w: 12, h: 12 },
  lock: { w: 24, h: 24 },
  bundle: { w: 24, h: 24 },
  book: { w: 24, h: 24 },
  search: { w: 24, h: 24 },
} as const;

export type NoriIconName = keyof typeof ICONS;

export interface NoriIconProps {
  name: NoriIconName;
  /** 정사각형 크기(px). flame처럼 세로로 긴 아이콘은 비율을 유지합니다. */
  size?: number;
  className?: string;
}

export function NoriIcon({ name, size, className }: NoriIconProps) {
  const { w, h } = ICONS[name];
  const width = size ? (w / Math.max(w, h)) * size : w;
  const height = size ? (h / Math.max(w, h)) * size : h;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/nori/icons/${name}.svg`}
      width={width}
      height={height}
      alt=""
      aria-hidden
      className={cn("block shrink-0", className)}
      style={{ width, height }}
    />
  );
}
