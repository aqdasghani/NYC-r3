"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Lock, User, ArrowRight, Store } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Bypass auth logic entirely
    const authObj = {
      access_token: "mock-token-" + Date.now(),
      user: {
        id: "mock-id",
        email: "store@greenshop.ai",
        name: name || "Demo User",
        role: "OWNER",
        store_id: "mock-store",
        store_name: storeName || "My Store",
        is_active: true
      }
    };
    
    // Slight delay for UX
    setTimeout(() => {
      localStorage.setItem("Green Quant_auth", JSON.stringify(authObj));
      router.push("/dashboard");
    }, 500);
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="storeName" className="block text-sm font-semibold text-text-primary mb-1.5">
                Store Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="storeName"
                  name="storeName"
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border-default rounded-lg bg-bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                  placeholder="My Awesome Mart"
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
                {loading ? "Creating..." : "Create Account"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
