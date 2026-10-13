import React from "react";
import { cn } from "@/lib/utils";

/**
 * Figma: Blob BG (110:93) + Character/도리 (24:2274), Character/뭉 (24:2279)
 * 캐릭터 뒤에 물결 모양 배경을 깔고, 배경만 천천히 회전·출렁이게 합니다.
 */
const BLOBS = {
  peach: { src: "/nori/blobs/blob-peach.svg", w: 140, h: 120 },
  rose: { src: "/nori/blobs/blob-rose.svg", w: 140, h: 120 },
  mint: { src: "/nori/blobs/blob-mint.svg", w: 140, h: 120 },
  "mint-lg": { src: "/nori/blobs/blob-mint-lg.svg", w: 190, h: 180 },
  yellow: { src: "/nori/blobs/blob-yellow.svg", w: 260, h: 220 },
  "yellow-wide": { src: "/nori/blobs/blob-yellow-wide.svg", w: 267, h: 150 },
  "yellow-xl": { src: "/nori/blobs/blob-yellow-xl.svg", w: 320, h: 260 },
  "mint-xl": { src: "/nori/blobs/blob-mint-xl.svg", w: 250, h: 200 },
  "peach-xl": { src: "/nori/blobs/blob-peach-xl.svg", w: 300, h: 230 },
  blue: { src: "/nori/blobs/blob-blue.svg", w: 140, h: 120 },
  lavender: { src: "/nori/blobs/blob-lavender.svg", w: 104, h: 94 },
} as const;

const CHARACTERS = {
  "dori-default": { src: "/nori/characters/dori-default.svg", w: 87.3555, h: 92 },
  "dori-positive": { src: "/nori/characters/dori-positive.svg", w: 84.9046, h: 86.3482 },
  "dori-thumbsup": { src: "/nori/characters/dori-thumbsup.svg", w: 97.638, h: 92 },
  "dori-celebrate": { src: "/nori/characters/dori-celebrate.svg", w: 174.548, h: 159.88 },
  "dori-scholar": { src: "/nori/characters/dori-scholar.svg", w: 130.39, h: 139.906 },
  "dori-explorer": { src: "/nori/characters/dori-explorer.svg", w: 200.236, h: 169.942 },
  "dori-writer": { src: "/nori/characters/dori-writer.svg", w: 120.221, h: 91.9633 },
  "mung-sad": { src: "/nori/characters/mung-sad.png", w: 197.083, h: 110 },
} as const;

export type BlobName = keyof typeof BLOBS;
export type CharacterName = keyof typeof CHARACTERS;

export interface HeroProps {
  blob: BlobName;
  character: CharacterName;
  /** 캐릭터 높이(px). 너비는 원본 비율로 계산합니다. */
  characterHeight?: number;
  /** Hero 전체 크기. 기본값은 배경 크기 */
  width?: number;
  height?: number;
  animated?: boolean;
  className?: string;
}

export function Hero({
  blob,
  character,
  characterHeight,
  width,
  height,
  animated = true,
  className,
}: HeroProps) {
  const b = BLOBS[blob];
  const c = CHARACTERS[character];
  const boxW = width ?? b.w;
  const boxH = height ?? b.h;
  const ch = characterHeight ?? c.h;
  const cw = (c.w / c.h) * ch;
  // 배경은 Hero 너비에 맞추고 원본 비율을 유지합니다 (Figma 배치와 동일)
  const bw = boxW;
  const bh = (b.h / b.w) * boxW;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: boxW, height: boxH }}>
      <div
        className={cn("absolute left-1/2 top-1/2", animated && "animate-blob-spin motion-reduce:animate-none")}
        style={{ width: bw, height: bh, marginLeft: -bw / 2, marginTop: -bh / 2 }}
      >
        <div className={cn("size-full", animated && "animate-blob-wobble motion-reduce:animate-none")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.src} width={bw} height={bh} alt="" aria-hidden className="block size-full" />
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.src}
        width={cw}
        height={ch}
        alt=""
        aria-hidden
        className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
        style={{ width: cw, height: ch }}
      />
    </div>
  );
}
