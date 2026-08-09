import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { BottomCTA } from '@/components/marketing/BottomCTA';
import { Store, Cross, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: "Solutions - Green Quant AI" };

export default function SolutionsPage() {
  return (
    <MarketingLayout>
      <section className="pt-32 pb-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-20">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/10 text-brand-green font-semibold text-sm w-fit mb-6">
              Tailored for Your Business
            </div>
            <h1 className="text-5xl lg:text-[4rem] font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Built for <span className="text-brand-green">Every Aisle</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed">
              Whether you run a local pharmacy or a chain of supermarkets, Green Quant AI adapts to your unique inventory challenges.
            </p>
          </div>

          <div className="flex flex-col gap-12 max-w-5xl mx-auto mb-24">
            {[
               { icon: <Store className="w-10 h-10 text-brand-green" />, title: "Supermarkets & Grocery", text: "Manage thousands of SKUs. Automatically detect short-shelf-life items like dairy and produce before they expire to maximize margins." },
               { icon: <Cross className="w-10 h-10 text-brand-green" />, title: "Pharmacies & Health", text: "Ensure strict compliance with automated batch tracking and expiry alerts for medications. Never sell an expired product again." },
               { icon: <ShoppingBag className="w-10 h-10 text-brand-green" />, title: "Convenience Stores", text: "Keep fast-moving items fully stocked. AI predictions help you balance your limited shelf space for maximum daily turnover." }
            ].map((sol, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 p-8 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row gap-8 items-start md:items-center shadow-sm hover:shadow-xl transition-all group">
                <div className="w-24 h-24 shrink-0 rounded-3xl bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-105 group-hover:bg-brand-green/10 transition-transform">
                  {sol.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">{sol.title}</h3>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed">{sol.text}</p>
                </div>
                <Link href="/demo" className="shrink-0 w-12 h-12 rounded-full bg-brand-green text-white flex items-center justify-center hover:bg-brand-green-dark transition-colors mt-4 md:mt-0">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <BottomCTA />
    </MarketingLayout>
  );
}
