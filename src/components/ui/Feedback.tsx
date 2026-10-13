import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { NoriIcon } from "./NoriIcon";

/**
 * Figma: Answer Feedback (13:42) — 정답/오답 시 아래에서 올라오는 시트.
 * 정답은 흰 배경, 오답은 연한 핑크. 버튼은 둘 다 Primary.
 */
export interface AnswerFeedbackProps {
  open: boolean;
  result: "correct" | "wrong";
  title: string;
  /** 설명 문장. 강조할 부분은 <em>으로 감싸면 오렌지색이 됩니다 */
  message?: React.ReactNode;
  buttonLabel?: string;
  onContinue: () => void;
}

export function AnswerFeedback({
  open,
  result,
  title,
  message,
  buttonLabel = "계속하기",
  onContinue,
}: AnswerFeedbackProps) {
  if (!open) return null;
  const correct = result === "correct";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-nori-scrim animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="answer-feedback-title"
        className={cn(
          "relative flex h-[400px] w-full max-w-md flex-col items-center gap-6 rounded-t-nori-sheet px-6 pb-8 pt-3 shadow-nori-sheet animate-sheet-up",
          correct ? "bg-nori-surface" : "bg-nori-danger-subtle"
        )}
      >
        <div className="h-[5px] w-11 shrink-0 rounded-full bg-nori-neutral" />
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-6">
          <div
            className={cn(
              "flex size-[72px] items-center justify-center rounded-full",
              correct ? "bg-nori-success" : "bg-nori-danger"
            )}
          >
            <NoriIcon name={correct ? "check-large" : "x-white"} />
          </div>
          <div className="flex w-full flex-col items-center gap-4 text-center font-bold">
            <p
              id="answer-feedback-title"
              className={cn(
                "text-[30px] leading-[38px] tracking-[-0.3px]",
                correct ? "text-nori-success-text" : "text-nori-danger-text"
              )}
            >
              {title}
            </p>
            {message && (
              <p className="text-lg leading-[26px] tracking-[-0.18px] text-nori-secondary [&_em]:not-italic [&_em]:text-[var(--color-text-brand)]">
                {message}
              </p>
            )}
          </div>
        </div>
        <Button onClick={onContinue} autoFocus>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

/** Figma: Toast (22:100) — 짧은 완료 알림. 하단 탭바 위에 2초 노출 */
export interface ToastProps {
  message: string;
  open: boolean;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export function Toast({ message, open, onClose, duration = 2000, className }: ToastProps) {
  React.useEffect(() => {
    if (!open || !onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, onClose, duration]);

  if (!open) return null;
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-nori-success px-5 py-3 shadow-nori-success animate-fade-in-up",
        className
      )}
    >
      <NoriIcon name="check-white" />
      <p className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-white whitespace-nowrap">{message}</p>
    </div>
  );
}
