"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Mail, ArrowRight, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { verifyEmail } from "@/lib/api-client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleVerify = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid or missing verification token");
        return;
      }

      try {
        await verifyEmail(token);
        setStatus("success");
        setMessage("Email verified successfully!");
        // Redirect to dashboard after a short delay
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Email verification failed. Please try again or request a new link.";
        setStatus("error");
        setMessage(msg);
      }
    };

    handleVerify();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-bg-app flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-green/30 selection:text-brand-green-dark">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-text-primary font-extrabold text-2xl tracking-tight">Green Quant AI</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 sm:p-10 text-center"
        >
          {status === "loading" && (
            <>
              <div className="flex items-center justify-center gap-3 mb-6">
                <Loader2 className="h-8 w-8 text-brand-green animate-spin" />
              </div>
              <p className="text-text-secondary">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex items-center justify-center gap-3 mb-6">
                <CheckCircle className="h-8 w-8 text-brand-green" />
              </div>
              <p className="text-text-primary font-semibold mb-2">Email Verified!</p>
              <p className="text-text-secondary mb-6">{message}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex items-center justify-center gap-3 mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-text-primary font-semibold mb-2">Verification Failed</p>
              <p className="text-red-600 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/auth/forgot-password")}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all"
                >
                  Request New Link <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/login"
                  className="block w-full text-center py-3 px-4 border border-border-default rounded-lg text-sm font-semibold text-text-primary bg-bg-surface hover:bg-bg-elevated transition-all"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}