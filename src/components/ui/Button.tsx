import React from "react";
import { cn } from "@/lib/utils";

/**
 * Figma: Button (2:21)
 * Style: Primary(오렌지)·Secondary(흰색)·Success(정답 초록)·Danger(오답 빨강)·Info(파랑)
 * State: Default · Pressed(그림자 사라짐, 누를 때 자동) · Disabled
 * Size: lg(가로 꽉 채움) · sm(내용에 맞춤). 모서리는 알약형.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "info";
  size?: "lg" | "sm";
  leftIcon?: React.ReactNode;
}

const variantStyles = {
  primary: "bg-nori-brand border border-nori-brand-border text-nori-on-brand shadow-nori-brand",
  secondary:
    "bg-nori-surface border-2 border-[var(--color-border-disabled)] text-[var(--color-text-brand)] shadow-nori-card active:translate-y-0.5",
  success: "bg-nori-success border border-nori-success text-white shadow-nori-success",
  danger: "bg-nori-danger border border-nori-danger text-white shadow-nori-danger",
  info: "bg-nori-info border border-nori-info text-white shadow-nori-info",
};

// Secondary는 테두리가 2px라 위아래 여백을 2px 더 줘서 높이를 맞춥니다 (Figma 동일)
const sizeStyles = {
  lg: { base: "w-full py-3", secondary: "w-full py-[14px]" },
  sm: { base: "py-2", secondary: "py-2" },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "lg", leftIcon, children, disabled, ...props }, ref) => {
    const pad = variant === "secondary" ? sizeStyles[size].secondary : sizeStyles[size].base;
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 px-4 rounded-full select-none border-solid",
          "font-bold text-base leading-5 tracking-[2.5px] whitespace-nowrap",
          "transition-[transform,box-shadow] duration-100 active:translate-y-1 active:shadow-none",
          pad,
          disabled
            ? "bg-nori-disabled border border-[var(--color-border-disabled)] text-nori-disabled-text shadow-nori-disabled pointer-events-none"
            : variantStyles[variant],
          className
        )}
        {...props}
      >
        {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
