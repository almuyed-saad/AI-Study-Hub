import React from "react";
import { cn } from "../../utils/cn.ts";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = "primary", size = "md", loading, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={props.disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
          {
            // Primary Solid Black / White
            "bg-slate-900 text-slate-50 border-transparent hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100":
              variant === "primary",
            // Secondary Neutral Muted
            "bg-slate-100 text-slate-900 border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700":
              variant === "secondary",
            // Outline Clean Thin
            "bg-transparent text-slate-700 border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-900":
              variant === "outline",
            // Ghost Raw Hover
            "bg-transparent text-slate-700 border-transparent hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900":
              variant === "ghost",
            // Danger Call to action
            "bg-rose-600 text-white border-transparent hover:bg-rose-700": variant === "danger",
          },
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-2.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              path="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : icon ? (
          <span className="mr-1.5 inline-flex">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
