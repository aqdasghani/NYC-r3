"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, ArrowRight, Globe, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { login, initiateGoogleOAuth } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("sbhrnsnk@gmail.com");
  const [password, setPassword] = useState("demo1234");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {}
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-green/30 selection:text-brand-green-dark">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-text-primary font-extrabold text-2xl tracking-tight">Green Quant AI</span>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-text-primary tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-brand-green hover:text-brand-green-dark transition-colors">
            Start your free trial
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 sm:p-10"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in to Dashboard"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

