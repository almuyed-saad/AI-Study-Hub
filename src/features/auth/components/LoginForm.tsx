import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card.tsx";
import { Mail, Lock, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { firebaseConfig } from "../../../lib/firebase-config.ts";

interface LoginFormProps {
  key?: React.Key;
  onNavigate: (view: "register" | "forgot-password" | "dashboard") => void;
}

export function LoginForm({ onNavigate }: LoginFormProps) {
  const { loginWithEmailPassword, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await loginWithEmailPassword(data.email, data.password);
      toast.success("Successfully logged in! Welcome back.");
      onNavigate("dashboard");
    } catch (err: any) {
      console.error(err);
      let errMsg = "Invalid email or password. Please try again.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        errMsg = "Wrong email or password combination.";
      } else if (err.code === "auth/too-many-requests") {
        errMsg = "This account is temporarily locked due to too many failed attempts.";
      }
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setUnauthorizedDomainError(false);
    try {
      await loginWithGoogle();
      toast.success("Successfully signed in with Google!");
      onNavigate("dashboard");
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        console.warn("Google Sign-In popup closed or cancelled by user.");
      } else if (err?.code === "auth/unauthorized-domain" || (err?.message && err.message.includes("auth/unauthorized-domain"))) {
        console.error("Domain unauthorized error caught:", err);
        setUnauthorizedDomainError(true);
        toast.error("Google login failed: Domain not authorized in Firebase Console.");
      } else {
        console.error(err);
        toast.error("Google login failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription>
            Enter your email to sign in to your AI Study Hub account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {unauthorizedDomainError && (
            <div className="p-4 mb-5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm flex flex-col gap-2 border border-amber-200 dark:border-amber-900/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">Domain Authorization Required</span>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Firebase has blocked Google Sign-In because this domain is not on your project's allowlist.
                  </p>
                </div>
              </div>
              <div className="pl-7 flex flex-col gap-2">
                <p className="text-xs">
                  To fix this, go to your Firebase Console and add <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono font-bold text-violet-600 dark:text-violet-400">saad-ai-study-hub.ai.studio</code> to:
                </p>
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded border border-amber-100 dark:border-amber-900/30 font-medium text-xs">
                  Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains
                </div>
                <a 
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-fit text-xs text-violet-600 hover:text-violet-500 font-semibold underline mt-1"
                >
                  Go to Firebase Settings →
                </a>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                  Or, register / login with <span className="font-semibold">Email & Password</span> below (no setup required).
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                name="email"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate("forgot-password")}
                  className="text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                name="password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm mt-2"
              loading={submitting}
              disabled={googleLoading}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 dark:bg-slate-900">Or continue with</span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm flex items-center justify-center gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={handleGoogleLogin}
            loading={googleLoading}
            disabled={submitting}
          >
            <svg className="h-4 w-4 mr-1 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign In with Google
          </Button>
        </CardContent>

        <CardFooter className="justify-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <button
            onClick={() => onNavigate("register")}
            className="ml-1 font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 transition-colors cursor-pointer"
          >
            Create an account
          </button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
