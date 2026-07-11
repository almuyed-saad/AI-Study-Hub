import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { auth } from "../../../lib/firebase.ts";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card.tsx";
import { Lock, ArrowLeft, KeyRound, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

interface ResetPasswordFormProps {
  key?: React.Key;
  onNavigate: (view: "login") => void;
}

export function ResetPasswordForm({ onNavigate }: ResetPasswordFormProps) {
  const toast = useToast();
  const [verifying, setVerifying] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordVal = watch("password");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    const mode = params.get("mode");

    if (code && mode === "resetPassword") {
      setOobCode(code);
      // Validate code with Firebase Auth
      verifyPasswordResetCode(auth, code)
        .then(() => {
          setVerifying(false);
        })
        .catch((err) => {
          console.error("Failed to verify action code:", err);
          setErrorText("The password reset link is invalid, expired, or has already been used.");
          setVerifying(false);
        });
    } else {
      setVerifying(false);
      setErrorText("No security reset code found. Please request a new password reset email.");
    }
  }, []);

  const onSubmit = async (data: any) => {
    if (!oobCode) return;
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      setSuccess(true);
      toast.success("Your password has been reset successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
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
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>
            Enter your new credentials below to securely reclaim your account access.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {verifying ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <p className="text-xs text-slate-500 font-medium">Verifying security token...</p>
            </div>
          ) : errorText ? (
            <div className="rounded-lg bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 p-5 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
              <h3 className="font-semibold text-rose-950 dark:text-rose-400 text-sm">Verification Failed</h3>
              <p className="text-xs text-rose-800/80 dark:text-rose-400/80 leading-relaxed">
                {errorText}
              </p>
            </div>
          ) : success ? (
            <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/40 p-5 text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">Password Updated</h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                Your password has been changed. You can now securely log in to your account.
              </p>
              <Button onClick={() => onNavigate("login")} className="w-full h-10 mt-2">
                Log In Now
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  New Password
                </label>
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
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="h-4 w-4" />}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  {...register("confirmPassword", {
                    required: "Confirm password is required",
                    validate: (value) => value === passwordVal || "Passwords do not match",
                  })}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm mt-2"
                loading={submitting}
              >
                Reset Password
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center text-xs">
          <button
            onClick={() => onNavigate("login")}
            className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
