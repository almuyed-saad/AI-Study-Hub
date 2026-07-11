import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card.tsx";
import { User as UserIcon, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface RegisterFormProps {
  key?: React.Key;
  onNavigate: (view: "login" | "dashboard") => void;
}

export function RegisterForm({ onNavigate }: RegisterFormProps) {
  const { registerWithEmailPassword, sendEmailVerificationLink } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordVal = watch("password");

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await registerWithEmailPassword(data.email, data.password, data.name);
      
      // Attempt to send an initial verification email immediately after registration
      try {
        await sendEmailVerificationLink();
        toast.info("A verification link has been sent to your email.");
      } catch (verificationErr) {
        console.warn("Auto-sent email verification failed:", verificationErr);
      }

      toast.success("Account created successfully!");
      onNavigate("dashboard");
    } catch (err: any) {
      console.error(err);
      let errMsg = "Failed to create account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "An account with this email address already exists.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "The email address is invalid.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "The password is too weak.";
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
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an Account</CardTitle>
          <CardDescription>
            Join AI Study Hub to elevate your study productivity
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Name
              </label>
              <Input
                placeholder="John Doe"
                icon={<UserIcon className="h-4 w-4" />}
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name", {
                  required: "Full name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
            </div>

            {/* Email */}
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
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Password
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

            {/* Confirm Password */}
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
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Get Started
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <button
            onClick={() => onNavigate("login")}
            className="ml-1 font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 transition-colors cursor-pointer"
          >
            Sign in instead
          </button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
