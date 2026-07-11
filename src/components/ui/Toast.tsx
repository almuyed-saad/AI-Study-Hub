import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../utils/cn.ts";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    setToasts((prev) => {
      // Check if a toast with the exact same message already exists to prevent duplication
      if (prev.some((t) => t.message.trim() === message.trim())) {
        return prev;
      }
      const id = Math.random().toString(36).substring(2, 9);

      // Auto-dismiss toast in 4 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 4000);

      // Enforce a maximum queue of 4 active toasts at any time
      const updated = [...prev, { id, message, type }];
      if (updated.length > 4) {
        return updated.slice(updated.length - 4);
      }
      return updated;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, "success"), [addToast]);
  const error = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const info = useCallback((message: string) => addToast(message, "info"), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 shadow-lg pointer-events-auto bg-white/95 backdrop-blur-md dark:bg-slate-900/95",
                {
                  "border-emerald-100 bg-emerald-50/50 text-emerald-900 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-50":
                    toast.type === "success",
                  "border-rose-100 bg-rose-50/50 text-rose-900 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-50":
                    toast.type === "error",
                  "border-slate-100 bg-slate-50/50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-50":
                    toast.type === "info",
                }
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-500" />}
                {toast.type === "info" && <Info className="h-5 w-5 text-slate-500" />}
              </div>

              {/* Message */}
              <div className="flex-1 text-sm font-medium leading-5">{toast.message}</div>

              {/* Close button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
