"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Figma: Modal (22:118) — 가운데 팝업(하트 소진, 학습 중단 경고 등).
 * 화면 위 50% 검정 딤과 함께 씁니다. hero를 주면 카드 위로 캐릭터가 걸쳐 나옵니다.
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** 카드 위에 걸치는 캐릭터 (보통 <Hero />) */
  hero?: React.ReactNode;
  /** 버튼들 (Primary 위, Secondary 아래 순서) */
  children?: React.ReactNode;
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  hero,
  children,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-[31px]">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div className="relative flex w-full max-w-[340px] flex-col items-center animate-fade-in-up">
        {/* 캐릭터는 카드 위로 38px 걸치고, 겹치는 부분은 카드 뒤로 숨깁니다 */}
        {hero && <div className="relative -mb-[38px] flex justify-center">{hero}</div>}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nori-modal-title"
          className={cn(
            "relative flex w-full flex-col items-center gap-3 rounded-nori-xl bg-nori-surface px-6 pb-6 pt-7 shadow-nori-dialog",
            className
          )}
        >
          <p
            id="nori-modal-title"
            className="text-center text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-strong"
          >
            {title}
          </p>
          {description && (
            <div className="w-full text-center text-base font-medium leading-6 tracking-[-0.16px] text-nori-secondary">
              {description}
            </div>
          )}
          {children && <div className="mt-1 flex w-full flex-col gap-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
