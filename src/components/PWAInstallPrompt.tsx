import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if already in standalone mode (installed)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed it recently (localStorage check)
    const isDismissed = localStorage.getItem("pwa-prompt-dismissed") === "true";
    if (isDismissed) {
      return;
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome|opera|edge/.test(ua);
    
    if (isIphoneOrIpad && isSafari) {
      setIsIOS(true);
      // Stagger showing the prompt slightly so it doesn't feel like spam
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Handle standard beforeinstallprompt event for Android/Chrome/Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Stagger showing the prompt slightly
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show native prompt
    deferredPrompt.prompt();
    
    // Wait for choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User choice: ${outcome}`);
    
    // Reset state
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss persists for now (dismissed in this session/device context)
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[100] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-4 relative">
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/10">
              <Smartphone className="w-5.5 h-5.5" />
            </div>

            <div className="space-y-1 pr-6">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Install AI Study Hub
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Add to your home screen for quick access, offline reading, and immersive full-screen learning!
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
            {isIOS ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal flex flex-wrap items-center gap-1">
                <span>To install, tap</span>
                <span className="inline-flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800 rounded border dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <Share className="w-3 h-3" />
                </span>
                <span>then select</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">"Add to Home Screen"</span>
                <span className="inline-flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800 rounded border dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <Plus className="w-3 h-3" />
                </span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleDismiss}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm shadow-violet-500/10 hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
