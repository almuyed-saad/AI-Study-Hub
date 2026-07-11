import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card.tsx";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface ForgotPasswordFormProps {
  key?: React.Key;
  onNavigate: (view: "login") => void;
}

export function ForgotPasswordForm({ onNavigate }: ForgotPasswordFormProps) {
  const { sendPasswordReset } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await sendPasswordReset(data.email);
      setEmailSent(true);
      toast.success("Password reset email sent successfully!");
    } catch (err: any) {
      console.error(err);
      let errMsg = "Failed to dispatch password reset. Please verify your email.";
      if (err.code === "auth/user-not-found") {
        errMsg = "There is no user registered with this email address.";
      }
      toast.error(errMsg);
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
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password?</CardTitle>
          <CardDescription>
            No worries! Enter your email and we'll dispatch a link to reset your password safely.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {emailSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/40 p-5 text-center space-y-3"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">Recovery Link Sent</h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                Check your inbox and click the security link to reset your account credentials.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Registered Email
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
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm mt-2"
                loading={submitting}
                icon={<Send className="h-4 w-4" />}
              >
                Send Reset Link
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
