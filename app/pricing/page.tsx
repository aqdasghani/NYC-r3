import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { BottomCTA } from '@/components/marketing/BottomCTA';
import { Check } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: "Pricing - GreenShop AI" };

export default function PricingPage() {
  return (
    <MarketingLayout>
      <section className="pt-32 pb-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 className="text-5xl lg:text-[4rem] font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Simple, <span className="text-brand-green">Transparent</span> Pricing
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed">
              Plans that scale with your business. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 flex flex-col shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
              <p className="text-slate-500 font-medium mb-6">Perfect for single locations.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-slate-900">₹999</span>
                <span className="text-slate-500 font-medium">/month</span>
              </div>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                {["1 Store Location", "Up to 5,000 SKUs", "Basic Expiry Alerts", "Standard Email Support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                     <div className="w-5 h-5 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-brand-green" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-brand-green hover:text-brand-green transition-colors text-center">
                Start Free Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 flex flex-col shadow-2xl relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-green text-white text-xs font-bold uppercase tracking-wider rounded-full">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
              <p className="text-slate-400 font-medium mb-6">For growing retail chains.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">₹2,499</span>
                <span className="text-slate-400 font-medium">/month</span>
              </div>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                {["Up to 5 Store Locations", "Unlimited SKUs", "Advanced AI Forecasting", "Dynamic Pricing Drafts", "Priority 24/7 Support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-200 font-medium text-sm">
                     <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full py-4 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green-dark transition-colors text-center shadow-lg hover:-translate-y-0.5 active:scale-95">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 flex flex-col shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
              <p className="text-slate-500 font-medium mb-6">Custom solutions for large networks.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-slate-900">Custom</span>
              </div>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                {["Unlimited Locations", "Custom API Integrations", "Dedicated Success Manager", "Custom BI Dashboards", "SLA Guarantee"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                     <div className="w-5 h-5 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-brand-green" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/demo" className="w-full py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-brand-green hover:text-brand-green transition-colors text-center">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      <BottomCTA />
    </MarketingLayout>
  );
}
