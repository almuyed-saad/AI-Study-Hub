import React from "react";
import { cn } from "../../utils/cn.ts";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error = false, helperText, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 flex items-center justify-center text-slate-400 dark:text-slate-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-violet-400 dark:focus:ring-violet-400",
              {
                "pl-10": icon,
                "border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500": error,
              },
              className
            )}
            {...props}
          />
        </div>
        {helperText && (
          <p
            className={cn("mt-1.5 text-xs text-slate-500 dark:text-slate-400", {
              "text-rose-500 dark:text-rose-400": error,
            })}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
