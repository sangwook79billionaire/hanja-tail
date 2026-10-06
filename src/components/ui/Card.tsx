import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const baseStyles = "bg-white rounded-3xl transition-all duration-200 border-2";

    const variantStyles = {
      default: "border-duo-swan/80 shadow-[0_4px_0_0_#e5e5e5]",
      elevated: "border-slate-100 shadow-xl shadow-slate-200/50",
      flat: "border-slate-200 shadow-none bg-slate-50/70",
      interactive:
        "border-duo-swan shadow-[0_4px_0_0_#e5e5e5] hover:border-duo-macaw hover:shadow-[0_6px_0_0_#1899d6] hover:-translate-y-0.5 cursor-pointer active:translate-y-1 active:shadow-none",
    };

    const paddingStyles = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      md: "p-5 sm:p-6",
      lg: "p-6 sm:p-8",
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
