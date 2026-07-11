import React from "react";
import { cn } from "../../utils/cn.ts";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-slate-200/60 bg-white/90 p-6 text-slate-950 shadow-sm transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-slate-50",
          {
            "hover:shadow-md hover:border-slate-300/80 dark:hover:border-slate-700/80 hover:-translate-y-0.5":
              hoverable,
          },
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("font-display text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center pt-4 border-t border-slate-100/60 dark:border-slate-800/40 mt-4", className)} {...props} />
);
