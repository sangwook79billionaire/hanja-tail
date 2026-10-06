import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "green" | "sky" | "yellow" | "coral" | "neutral" | "grade";
  size?: "sm" | "md" | "lg";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "green", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-extrabold rounded-xl select-none uppercase tracking-wider";

    const variantStyles = {
      green: "bg-emerald-100 text-emerald-700 border border-emerald-300",
      sky: "bg-sky-100 text-sky-700 border border-sky-300",
      yellow: "bg-amber-100 text-amber-800 border border-amber-300",
      coral: "bg-rose-100 text-rose-700 border border-rose-300",
      neutral: "bg-slate-100 text-slate-700 border border-slate-300",
      grade: "bg-duo-bee/20 text-amber-900 border-2 border-duo-bee/60 font-black",
    };

    const sizeStyles = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-xs sm:text-sm",
      lg: "px-3.5 py-1.5 text-sm sm:text-base",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
