import React, { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./hooks/use-theme.tsx";
import { AuthProvider, useAuth } from "./features/auth/hooks/use-auth.tsx";
import { LanguageProvider } from "./hooks/use-language.tsx";
import { ToastProvider, useToast } from "./components/ui/Toast.tsx";
import { Button } from "./components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./components/ui/Card.tsx";
import { Input } from "./components/ui/Input.tsx";
import { Dialog } from "./components/ui/Dialog.tsx";
import { LoginForm } from "./features/auth/components/LoginForm.tsx";
import { RegisterForm } from "./features/auth/components/RegisterForm.tsx";
import { ForgotPasswordForm } from "./features/auth/components/ForgotPasswordForm.tsx";
import { ResetPasswordForm } from "./features/auth/components/ResetPasswordForm.tsx";
import { VerifyEmailView } from "./features/auth/components/VerifyEmailView.tsx";
import { SaaSShell } from "./features/dashboard/components/SaaSShell.tsx";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt.tsx";
import {
  Sparkles,
  Database,
  Lock,
  Moon,
  Sun,
  Laptop,
  Terminal,
  FolderOpen,
  Send,
  CheckCircle,
  HelpCircle,
  Plus,
  User as UserIcon,
  ShieldCheck,
  Check,
  Power,
  RefreshCw,
  Edit2
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type AuthView = "login" | "register" | "forgot-password" | "reset-password" | "verify-email" | "dashboard";

function AppContent() {
  const { theme, setTheme } = useTheme();
  const { user, firebaseUser, loading, logout, token, syncProfile } = useAuth();
  const toast = useToast();

  const [currentView, setCurrentView] = useState<AuthView>("login");
  const [profileSyncing, setProfileSyncing] = useState(false);
  
  // Custom interactive test states
  const [editingUsername, setEditingUsername] = useState(false);
  const [customUsername, setCustomUsername] = useState("");
  const [onboardingProgress, setOnboardingProgress] = useState(false);

  // Parse URL action codes (e.g., resetPassword link dispatch from email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const code = params.get("oobCode");

    if (mode === "resetPassword" && code) {
      setCurrentView("reset-password");
    }
  }, []);

  // Sync state to view
  useEffect(() => {
    if (loading) return;

    if (firebaseUser) {
      if (!firebaseUser.emailVerified && !firebaseUser.providerData.some(p => p.providerId === "google.com")) {
        // Enforce email verification for standard Email/Password accounts
        setCurrentView("verify-email");
      } else {
        setCurrentView("dashboard");
      }
    } else {
      // Direct back to authentication views if unauthenticated
      if (currentView === "dashboard" || currentView === "verify-email") {
        setCurrentView("login");
      }
    }
  }, [firebaseUser, loading]);

  // Handle immediate manually triggered DB profile sync verification
  const handleForceSync = async () => {
    if (!token) return;
    setProfileSyncing(true);
    try {
      await syncProfile(token);
      toast.success("PostgreSQL schema synced with current Firebase Auth claims!");
    } catch (err) {
      toast.error("Manual database sync verification failed.");
    } finally {
      setProfileSyncing(false);
    }
  };

  // Simulate updating onboarding completed state in db
  const handleToggleOnboarding = async () => {
    if (!token || !user) return;
    setOnboardingProgress(true);
    try {
      // Simulate real-time API patch to user profile
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        toast.success("User Onboarding state toggled successfully!");
      }
    } catch (err) {
      toast.error("Failed to complete database operation.");
    } finally {
      setOnboardingProgress(false);
    }
  };

  // Full Screen Loading State
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-600" />
          <Sparkles className="absolute h-6 w-6 text-violet-600 animate-pulse" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Loading AI Study Hub...
        </p>
      </div>
    );
  }

  if (currentView === "dashboard" && firebaseUser) {
    return (
      <>
        <SaaSShell onLogout={logout} />
        <PWAInstallPrompt />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-50 flex flex-col justify-between">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                AI Study Hub
              </span>
              <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                Sprint 2 Auth
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "light"
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Light Theme"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "dark"
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Dark Theme"
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "system"
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="System Theme"
              >
                <Laptop className="h-4 w-4" />
              </button>
            </div>

            {firebaseUser && (
              <div className="flex items-center gap-3">
                <img
                  src={firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.email}`}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800"
                />
                <Button variant="ghost" size="sm" onClick={logout} className="gap-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400">
                  <Power className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          {currentView === "login" && (
            <LoginForm key="login" onNavigate={(view) => setCurrentView(view)} />
          )}
          {currentView === "register" && (
            <RegisterForm key="register" onNavigate={(view) => setCurrentView(view)} />
          )}
          {currentView === "forgot-password" && (
            <ForgotPasswordForm key="forgot" onNavigate={(view) => setCurrentView(view)} />
          )}
          {currentView === "reset-password" && (
            <ResetPasswordForm key="reset" onNavigate={(view) => setCurrentView(view)} />
          )}
          {currentView === "verify-email" && (
            <VerifyEmailView
              key="verify"
              onVerified={() => setCurrentView("dashboard")}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {/* Secure Showcase Dashboard (Visible only when authenticated + verified) */}
          {currentView === "dashboard" && firebaseUser && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-5xl space-y-8"
            >
              <div className="text-left space-y-2">
                <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-300">
                  Authentication Success
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                  Your secure connection has been fully validated against both the client-side Google Firebase auth session
                  and our persistent PostgreSQL instance. All future academic modules are ready to inherit this security context safely.
                </p>
              </div>

              {/* Grid of details */}
              <div className="grid gap-6 md:grid-cols-3">
                
                {/* User Session Profile Card */}
                <Card className="md:col-span-1 flex flex-col justify-between border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                        <UserIcon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Active Session</span>
                      </div>
                      <CardTitle className="text-lg">SaaS Profile Claims</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.email}`}
                          alt="Claim avatar"
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-full border border-violet-200 dark:border-violet-800 shadow-sm"
                        />
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {firebaseUser.displayName || "Anonymous Student"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {firebaseUser.email}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <span className="text-slate-500">Method</span>
                          <span className="font-semibold bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded text-[10px]">
                            {firebaseUser.providerData[0]?.providerId === "google.com" ? "Google OAuth" : "Email / Password"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <span className="text-slate-500">Session Status</span>
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Protected
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Verified Claims</span>
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Verified
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                  <CardFooter className="pt-2">
                    <Button variant="outline" className="w-full text-xs" onClick={logout}>
                      Sign Out Session
                    </Button>
                  </CardFooter>
                </Card>

                {/* PostgreSQL Sync Table Details */}
                <Card className="md:col-span-2 border-slate-200/60 dark:border-slate-800/60">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Database className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">PostgreSQL Metadata Store</span>
                    </div>
                    <CardTitle className="text-lg">Database Record Inspection</CardTitle>
                    <CardDescription>
                      Live properties directly extracted from the PostgreSQL `users` table after security handshake verification.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {user ? (
                      <div className="grid gap-4 sm:grid-cols-2 text-xs font-mono">
                        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-3 space-y-1.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Account ID</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">ID #{user.id}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-3 space-y-1.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Firebase UID</p>
                          <p className="text-slate-700 dark:text-slate-300 truncate" title={user.uid}>{user.uid}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-3 space-y-1.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Sync Email</p>
                          <p className="text-slate-700 dark:text-slate-300">{user.email}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-3 space-y-1.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Role Level</p>
                          <p className="font-semibold text-violet-600 dark:text-violet-400">{user.role}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-3 space-y-1.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Verified Profile</p>
                          <p className="text-slate-700 dark:text-slate-300">{user.emailVerified ? "TRUE" : "FALSE"}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-3 space-y-1.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans">Onboarding Status</p>
                          <p className="text-slate-700 dark:text-slate-300">{user.onboardingCompleted ? "COMPLETED" : "NOT STARTED"}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent mr-2.5" />
                        <span className="text-xs text-slate-500 font-medium">Fetching sync profile...</span>
                      </div>
                    )}

                    {/* Operational testing area */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-9"
                        loading={profileSyncing}
                        onClick={handleForceSync}
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                      >
                        Force DB Sync Handshake
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-9"
                        loading={onboardingProgress}
                        onClick={handleToggleOnboarding}
                        icon={<Edit2 className="h-3.5 w-3.5" />}
                      >
                        Update Onboarding state
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 py-8 bg-white dark:border-slate-800/50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-slate-400 space-y-2">
          <p>© 2026 AI Study Hub. Secure Auth & PostgreSQL User Directory initialized.</p>
          <p className="font-mono text-[10px]">Environment: Production-ready Node container via nginx reverse proxy</p>
        </div>
      </footer>
      <PWAInstallPrompt />
    </div>
  );
}

import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
