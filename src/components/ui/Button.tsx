import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "sky" | "yellow" | "coral" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-bold transition-all duration-150 rounded-2xl active:translate-y-1 focus:outline-none select-none disabled:opacity-50 disabled:pointer-events-none disabled:transform-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-duo-green text-white shadow-[0_4px_0_0_#46a302] hover:bg-duo-green-hover active:shadow-[0_0px_0_0_#46a302]",
      secondary:
        "bg-duo-snow text-duo-eel border-2 border-duo-swan shadow-[0_4px_0_0_#d4d4d4] hover:bg-white active:shadow-[0_0px_0_0_#d4d4d4]",
      sky:
        "bg-duo-macaw text-white shadow-[0_4px_0_0_#1899d6] hover:brightness-105 active:shadow-[0_0px_0_0_#1899d6]",
      yellow:
        "bg-duo-bee text-amber-950 shadow-[0_4px_0_0_#d9a700] hover:brightness-105 active:shadow-[0_0px_0_0_#d9a700]",
      coral:
        "bg-duo-cardinal text-white shadow-[0_4px_0_0_#d93838] hover:brightness-105 active:shadow-[0_0px_0_0_#d93838]",
      outline:
        "bg-transparent text-duo-wolf border-2 border-duo-swan hover:bg-duo-snow hover:text-duo-eel",
      ghost:
        "bg-transparent text-duo-wolf hover:bg-duo-snow hover:text-duo-eel",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-sm gap-1.5 rounded-xl",
      md: "px-5 py-2.5 text-base gap-2 rounded-2xl",
      lg: "px-7 py-3.5 text-lg gap-2.5 rounded-2xl",
      xl: "px-8 py-4 text-xl gap-3 rounded-3xl w-full",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>로딩 중...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
