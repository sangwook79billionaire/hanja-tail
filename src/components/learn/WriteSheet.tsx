"use client";

import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { cn } from "@/lib/utils";
import { NoriIcon } from "@/components/ui/NoriIcon";
import { ToolButton } from "@/components/ui/Hanja";
import { Hero } from "@/components/ui/Hero";

/**
 * Figma W05 획 따라 쓰기 (31:2569) — 한자 카드 위에 뜨는 쓰기 시트.
 * 열리면 획순을 한 번 보여 주고, 이어서 직접 따라 쓰기(quiz)로 넘어갑니다.
 */
export interface WriteSheetProps {
  open: boolean;
  char: string;
  meaning: string;
  sound: string;
  onClose: () => void;
  onComplete: () => void;
}

const BOX = 303; // 307px 상자 안쪽(테두리 제외)

export default function WriteSheet({ open, char, meaning, sound, onClose, onComplete }: WriteSheetProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [mode, setMode] = useState<"loading" | "demo" | "quiz" | "done">("loading");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!open || !targetRef.current) return;
    let active = true;
    const target = targetRef.current;
    setMode("loading");

    const startQuiz = (writer: HanziWriter) => {
      setMode("quiz");
      writer.quiz({
        onComplete: () => {
          if (!active) return;
          setMode("done");
          setTimeout(() => active && onCompleteRef.current(), 1200);
        },
      });
    };

    const timer = setTimeout(() => {
      if (!active) return;
      try {
        const writer = HanziWriter.create(target, char, {
          width: BOX,
          height: BOX,
          padding: 28,
          showOutline: true,
          strokeColor: "#3c3c3c",
          outlineColor: "#e2e2e2",
          drawingColor: "#1cb0f6",
          highlightColor: "#77d0fa",
          drawingWidth: 18,
          showHintAfterMisses: 1,
          delayBetweenStrokes: 150,
        });
        writerRef.current = writer;
        setMode("demo");
        writer.animateCharacter({ onComplete: () => active && startQuiz(writer) });
      } catch (err) {
        console.error("HanziWriter init error:", err);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
      writerRef.current = null;
      target.innerHTML = "";
    };
  }, [open, char]);

  const showStrokeOrder = () => {
    const writer = writerRef.current;
    if (!writer) return;
    writer.cancelQuiz();
    setMode("demo");
    writer.animateCharacter({
      onComplete: () => {
        setMode("quiz");
        writer.quiz({
          onComplete: () => {
            setMode("done");
            setTimeout(() => onCompleteRef.current(), 1200);
          },
        });
      },
    });
  };

  const rewrite = () => {
    const writer = writerRef.current;
    if (!writer) return;
    writer.cancelQuiz();
    setMode("quiz");
    writer.quiz({
      onComplete: () => {
        setMode("done");
        setTimeout(() => onCompleteRef.current(), 1200);
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-[73px]">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${char} 따라 쓰기`}
        className="relative flex w-full max-w-[370px] flex-col items-center gap-4 rounded-nori-xl bg-nori-surface px-5 pb-6 pt-5 shadow-nori-dialog animate-fade-in-up"
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex flex-col font-bold whitespace-nowrap">
            <p className="text-[52px] leading-[52px] tracking-[-0.52px] text-nori-strong">{char}</p>
            <p className="text-lg leading-[26px] tracking-[-0.18px] text-nori-info">
              {meaning} <span className="text-[var(--color-text-brand)]">{sound}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="flex size-7 items-center justify-center">
            <NoriIcon name="close-gray" size={28} />
          </button>
        </div>

        {/* Trace Box: 연한 바탕 + 가운데 점선 십자 */}
        <div className="relative size-[307px] max-w-full shrink-0 overflow-hidden rounded-[20px] border-[1.861px] border-nori-border bg-nori-subtle">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-nori-neutral" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-nori-neutral" />
          <div ref={targetRef} className={cn("relative touch-none", mode === "loading" && "opacity-0")} />
          {mode === "done" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 animate-fade-in">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-nori-success">
                <NoriIcon name="check-large" />
              </div>
              <p className="text-[22px] font-bold leading-[30px] text-nori-success-text">참 잘했어요!</p>
            </div>
          )}
          <p className="absolute bottom-2 left-2.5 text-[11px] font-semibold leading-[15px] tracking-[-0.11px] text-nori-tertiary">
            {mode === "demo" ? "획순을 잘 봐 두세요" : "① 첫 번째 획부터 따라 써 보세요"}
          </p>
        </div>

        <div className="flex w-full justify-center gap-[14px]">
          <ToolButton className="w-[130px]" active={mode === "demo"} onClick={showStrokeOrder} disabled={mode === "loading" || mode === "done"}>
            획순보기
          </ToolButton>
          <ToolButton className="w-[130px]" active={mode === "quiz"} onClick={rewrite} disabled={mode === "loading" || mode === "done"}>
            다시쓰기
          </ToolButton>
        </div>

        <div className="flex w-full items-center gap-1">
          <Hero blob="lavender" character="dori-writer" characterHeight={70} width={104} height={88} />
          <p className="flex-1 text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-primary">
            한자를 직접 써보면
            <br />
            머릿속에 훨씬 오래 기억돼요
          </p>
        </div>
      </div>
    </div>
  );
}
