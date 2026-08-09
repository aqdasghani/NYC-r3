import React from 'react';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background selection:bg-brand-green/30 selection:text-brand-green-light flex flex-col">
      {/* Shared Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-slate-200/50 bg-background/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-green to-emerald-600 shadow-glow flex items-center justify-center">
              <Activity className="w-4 h-4 text-black" />
            </div>
            <span className="text-text-primary font-bold text-xl tracking-tight">GreenShop AI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <Link href="#features" className="hover:text-text-primary transition-colors">Features</Link>
            <Link href="#solutions" className="hover:text-text-primary transition-colors">Solutions</Link>
            <Link href="#pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-text-secondary hover:text-text-primary text-sm font-medium hidden sm:block">Log in</Link>
            <Link href="/signup" className="px-5 py-2 rounded-lg glass-panel text-text-primary text-sm font-bold hover:bg-slate-100 hover:border-brand-green/30 transition-all">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full mt-20">
        {children}
      </main>

      {/* Shared Footer */}
      <footer className="border-t border-slate-200 bg-background pt-20 pb-10">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-green to-emerald-600 shadow-glow flex items-center justify-center">
                  <Activity className="w-4 h-4 text-black" />
                </div>
                <span className="text-text-primary font-bold text-xl tracking-tight">GreenShop AI</span>
              </Link>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Smart Retail. Zero Waste. <br/>
                The premium AI intelligence platform.
              </p>
            </div>
            
            <div>
              <h4 className="text-text-primary font-bold mb-6">Product</h4>
              <ul className="flex flex-col gap-4 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Integrations</Link></li>
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-text-primary font-bold mb-6">Company</h4>
              <ul className="flex flex-col gap-4 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-text-primary font-bold mb-6">Legal</h4>
              <ul className="flex flex-col gap-4 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-brand-green-light transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200 text-center text-sm text-slate-500 font-light">
            &copy; {new Date().getFullYear()} GreenShop AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
