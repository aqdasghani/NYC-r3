import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { BottomCTA } from '@/components/marketing/BottomCTA';
import { ArrowRight, Box, Cpu, Zap, Activity } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: "Product - GreenShop AI" };

export default function ProductPage() {
  return (
    <MarketingLayout>
      <section className="pt-32 pb-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl lg:text-[4rem] font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              The Engine Behind <br/><span className="text-brand-green">Zero Waste Retail</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed">
              Explore the core modules of GreenShop AI that transform your store's raw data into profitable, sustainable actions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-24">
            {[
               { icon: <Activity className="w-8 h-8 text-brand-green" />, title: "Inventory Engine", text: "Real-time stock tracking with automated threshold alerts and shelf-life predictions." },
               { icon: <Cpu className="w-8 h-8 text-brand-green" />, title: "AI Analytics", text: "Deep learning models that forecast demand spikes and identify slow-moving inventory." },
               { icon: <Zap className="w-8 h-8 text-brand-green" />, title: "Action Automations", text: "Automatic markdown suggestions and supplier reorder drafts based on sales velocity." },
               { icon: <Box className="w-8 h-8 text-brand-green" />, title: "Multi-Location Sync", text: "Seamless stock transfers and unified reporting across all your retail outlets." }
            ].map((mod, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:shadow-lg transition-all group">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-6 group-hover:scale-110 group-hover:bg-brand-green/10 transition-transform">
                  {mod.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{mod.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{mod.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <BottomCTA />
    </MarketingLayout>
  );
}
