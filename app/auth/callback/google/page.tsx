"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Google sign-in failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Invalid callback - missing code or state");
        return;
      }

      try {
        // The backend handles the callback and sets cookies, then redirects to dashboard
        // This page is mainly for handling edge cases or displaying status
        // In our flow, the backend redirects directly to /dashboard
        // But we keep this page as a fallback
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback?code=${code}&state=${state}`, {
          credentials: "include",
        });

        if (res.ok) {
          setStatus("success");
          setMessage("Sign-in successful! Redirecting...");
          // Give user a moment to see success, then redirect
          setTimeout(() => router.push("/dashboard"), 1000);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(data.detail || "Sign-in failed. Please try again.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-bg-app flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-green/30 selection:text-brand-green-dark">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-text-primary font-extrabold text-2xl tracking-tight">Green Quant AI</span>
        </div>
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
              <p className="text-text-primary font-semibold">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex items-center justify-center gap-3 mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-red-600 font-medium mb-4">{message}</p>
              <button
                onClick={() => router.push("/login")}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all"
              >
                Back to Sign In
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}