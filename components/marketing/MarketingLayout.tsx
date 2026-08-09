import React from 'react';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

export function MarketingLayout({
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
            <div className="w-8 h-8 rounded bg-brand-green flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-text-primary font-bold text-xl tracking-tight">GreenShop AI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <Link href="#product" className="hover:text-text-primary transition-colors">Product</Link>
            <Link href="#solutions" className="hover:text-text-primary transition-colors">Solutions</Link>
            <Link href="#features" className="hover:text-text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
            <Link href="#resources" className="hover:text-text-primary transition-colors">Resources</Link>
            <Link href="#about" className="hover:text-text-primary transition-colors">About Us</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-text-primary hover:text-brand-green text-sm font-medium hidden sm:block border border-slate-200 px-4 py-2 rounded-lg bg-white">Log in</Link>
            <Link href="/signup" className="px-5 py-2 rounded-lg bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all shadow-md">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full mt-20">
        {children}
      </main>

      {/* Shared Footer */}
      <footer className="border-t border-slate-200 bg-white pt-20 pb-10">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-brand-green flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="text-text-primary font-bold text-xl tracking-tight">GreenShop AI</span>
              </Link>
              <p className="text-text-secondary text-sm font-medium leading-relaxed mb-6">
                Smart Retail. Zero Waste.
              </p>
              {/* Add social icons here if needed */}
            </div>
            
            <div>
              <h4 className="text-text-primary font-bold mb-6">Product</h4>
              <ul className="flex flex-col gap-4 text-sm text-text-secondary">
                <li><Link href="#" className="hover:text-brand-green transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-brand-green transition-colors">Integrations</Link></li>
                <li><Link href="#" className="hover:text-brand-green transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-text-primary font-bold mb-6">Solutions</h4>
              <ul className="flex flex-col gap-4 text-sm text-text-secondary">
                <li><Link href="#" className="hover:text-brand-green transition-colors">For Supermarkets</Link></li>
                <li><Link href="#" className="hover:text-brand-green transition-colors">For Pharmacies</Link></li>
                <li><Link href="#" className="hover:text-brand-green transition-colors">For Convenience Stores</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-text-primary font-bold mb-6">Company</h4>
              <ul className="flex flex-col gap-4 text-sm text-text-secondary">
                <li><Link href="#" className="hover:text-brand-green transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-brand-green transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-brand-green transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200 text-center md:flex justify-between items-center text-sm text-text-tertiary font-medium">
            <div>&copy; {new Date().getFullYear()} GreenShop AI. All rights reserved.</div>
            <div className="flex gap-6 mt-4 md:mt-0">
               <Link href="#" className="hover:text-brand-green">Privacy Policy</Link>
               <Link href="#" className="hover:text-brand-green">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
