import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { BottomCTA } from '@/components/marketing/BottomCTA';
import { StatsBar } from '@/components/marketing/StatsBar';
import { Leaf } from 'lucide-react';

export const metadata = { title: "About Us - Green Quant AI" };

export default function AboutPage() {
  return (
    <MarketingLayout>
      <section className="pt-32 pb-16 bg-white overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-8">
              <Leaf className="w-8 h-8 text-brand-green" />
            </div>
            <h1 className="text-5xl lg:text-[4rem] font-bold text-slate-900 tracking-tight leading-[1.1] mb-8">
              Our Mission is to <br/><span className="text-brand-green">Eliminate Retail Waste</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed mb-8">
              Green Quant AI was founded on a simple premise: technology should make it easy to do the right thing for your business and the planet. We're building the intelligence layer for modern retail to ensure perfectly balanced inventory.
            </p>
          </div>
        </div>
      </section>

      {/* Reuse StatsBar to show traction */}
      <div className="pb-24 bg-white">
         <StatsBar />
      </div>

      <section className="py-24 bg-slate-50 border-y border-slate-100">
         <div className="container mx-auto px-6 max-w-7xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
               <div>
                 <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">The Story So Far</h2>
                 <p className="text-lg text-slate-600 font-medium leading-relaxed mb-6">
                   Every year, billions of dollars of perfectly good products are thrown away simply because they reached their expiration date before they could be sold. This isn't just a financial loss for retailers; it's an environmental catastrophe.
                 </p>
                 <p className="text-lg text-slate-600 font-medium leading-relaxed">
                   We started Green Quant AI to bridge the gap between complex data science and the everyday reality of running a store. By predicting demand and automating pricing, we help stores sell what they buy, when they should.
                 </p>
               </div>
               <div className="relative">
                  <div className="aspect-square rounded-[3rem] bg-slate-200 overflow-hidden relative shadow-xl">
                     <div className="absolute inset-0 bg-gradient-to-tr from-brand-green/30 to-brand-green-light/10 mix-blend-multiply" />
                     {/* Placeholder image representation */}
                     <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xl">
                       Team Photo Placeholder
                     </div>
                  </div>
                  {/* Decorative element */}
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white rounded-full p-2 shadow-xl">
                     <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center font-bold text-brand-green text-sm text-center p-2">
                       Est. 2024
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>
      
      <BottomCTA />
    </MarketingLayout>
  );
}
