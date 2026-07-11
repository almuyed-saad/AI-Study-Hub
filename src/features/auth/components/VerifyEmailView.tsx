import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card.tsx";
import { Mail, CheckCircle2, RotateCw, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { auth } from "../../../lib/firebase.ts";

interface VerifyEmailViewProps {
  key?: React.Key;
  onVerified: () => void;
  onNavigate: (view: "login") => void;
}

export function VerifyEmailView({ onVerified, onNavigate }: VerifyEmailViewProps) {
  const { firebaseUser, sendEmailVerificationLink, logout } = useAuth();
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  // Auto-redirect if email gets verified
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      onVerified();
    }
  }, [firebaseUser, onVerified]);

  const handleResend = async () => {
    setSending(true);
    try {
      await sendEmailVerificationLink();
      toast.success("Verification email dispatched. Please check your spam folder too!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to resend verification link.");
    } finally {
      setSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Reload Firebase user object to check for verified email status change
        await currentUser.reload();
        if (currentUser.emailVerified) {
          toast.success("Your email is verified! Welcome aboard.");
          onVerified();
        } else {
          toast.info("Email not verified yet. Please click the link inside your email.");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate("login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a security verification link to <span className="font-semibold text-slate-900 dark:text-white">{firebaseUser?.email}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-center text-slate-500 dark:text-slate-400 leading-normal">
            To unlock access to your AI Study Hub features, please click the verification link in the email we sent.
          </p>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              variant="primary"
              className="w-full h-11"
              onClick={handleCheckStatus}
              loading={checking}
              icon={<RotateCw className="h-4 w-4" />}
            >
              Verify Code
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleResend}
              loading={sending}
              disabled={checking}
            >
              Resend Link
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center text-xs">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout / Register with a different account
          </button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
