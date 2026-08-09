"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setLoading(true);
    // Simulate signup
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-green hover:text-brand-green-dark transition-colors">
            Sign in
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
            {step === 1 ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-text-primary mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-text-muted" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

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
                      className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-text-muted" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div>
                  <label htmlFor="storeName" className="block text-sm font-semibold text-text-primary mb-1.5">
                    Store Name
                  </label>
                  <div className="relative">
                    <input
                      id="storeName"
                      name="storeName"
                      type="text"
                      required
                      className="block w-full px-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                      placeholder="My Awesome Mart"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="storeType" className="block text-sm font-semibold text-text-primary mb-1.5">
                    Store Type
                  </label>
                  <select
                    id="storeType"
                    name="storeType"
                    className="block w-full px-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                  >
                    <option>Supermarket</option>
                    <option>Pharmacy</option>
                    <option>Convenience Store</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-brand-green" />
                  14-day free trial, no credit card required
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-border-default rounded-lg text-sm font-bold text-text-primary bg-bg-surface hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all disabled:opacity-70"
                  >
                    {loading ? "Setting up..." : "Create Account"}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
          
          {step === 1 && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-default" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-text-muted">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" className="w-full inline-flex justify-center py-2.5 px-4 border border-border-default rounded-lg shadow-sm bg-white text-sm font-medium text-text-secondary hover:bg-slate-50 transition-colors">
                  <span className="sr-only">Sign in with Google</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                </button>
                <button type="button" className="w-full inline-flex justify-center py-2.5 px-4 border border-border-default rounded-lg shadow-sm bg-white text-sm font-medium text-text-secondary hover:bg-slate-50 transition-colors">
                  <span className="sr-only">Sign in with Apple</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
