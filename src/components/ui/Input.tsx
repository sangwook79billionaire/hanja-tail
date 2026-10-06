import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 pointer-events-none text-slate-400 flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full bg-slate-50 border-2 border-duo-swan text-slate-800 placeholder-slate-400 rounded-2xl px-4 py-3.5 font-bold transition-all duration-150 focus:bg-white focus:border-duo-macaw focus:shadow-[0_0_0_3px_rgba(28,176,246,0.2)] focus:outline-none disabled:opacity-50 disabled:bg-slate-100",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              error && "border-duo-cardinal focus:border-duo-cardinal focus:shadow-[0_0_0_3px_rgba(255,75,75,0.2)]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 text-slate-400 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-duo-cardinal flex items-center gap-1">
            <span>⚠️</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
