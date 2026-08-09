import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { BottomCTA } from '@/components/marketing/BottomCTA';
import Link from 'next/link';
import { ArrowRight, BookOpen, Video, FileText } from 'lucide-react';

export const metadata = { title: "Resources - Green Quant AI" };

export default function ResourcesPage() {
  return (
    <MarketingLayout>
      <section className="pt-32 pb-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 className="text-5xl lg:text-[4rem] font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Insights & <span className="text-brand-green">Resources</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed">
              Guides, industry reports, and tutorials to help you run a more profitable and sustainable retail business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Resource Card 1 */}
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 hover:shadow-lg transition-shadow group flex flex-col">
              <div className="w-full aspect-video bg-slate-200 rounded-xl mb-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-brand-green/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <ArrowRight className="w-5 h-5 text-brand-green" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-brand-green font-bold text-xs uppercase tracking-wider mb-3">
                <BookOpen className="w-4 h-4" /> E-Book
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                The Retailer's Guide to Zero Food Waste in 2026
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-6 flex-1 line-clamp-3">
                Discover actionable strategies to cut down spoilage by 40% while improving your bottom line.
              </p>
              <Link href="#" className="text-brand-green font-bold text-sm hover:underline flex items-center gap-1">
                Read More <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Resource Card 2 */}
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 hover:shadow-lg transition-shadow group flex flex-col">
              <div className="w-full aspect-video bg-slate-200 rounded-xl mb-6 overflow-hidden relative">
                 <div className="absolute inset-0 bg-brand-green/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <ArrowRight className="w-5 h-5 text-brand-green" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wider mb-3">
                <Video className="w-4 h-4" /> Webinar
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                Mastering Dynamic Pricing with AI
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-6 flex-1 line-clamp-3">
                Watch our latest webinar on how to use AI to safely discount near-expiry items without cannibalizing regular sales.
              </p>
              <Link href="#" className="text-brand-green font-bold text-sm hover:underline flex items-center gap-1">
                Watch Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Resource Card 3 */}
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 hover:shadow-lg transition-shadow group flex flex-col">
              <div className="w-full aspect-video bg-slate-200 rounded-xl mb-6 overflow-hidden relative">
                 <div className="absolute inset-0 bg-brand-green/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <ArrowRight className="w-5 h-5 text-brand-green" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-wider mb-3">
                <FileText className="w-4 h-4" /> Case Study
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                How FreshMart Saved ₹5M Annually
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-6 flex-1 line-clamp-3">
                A deep dive into how a 12-location grocery chain implemented Green Quant AI to revolutionize their inventory.
              </p>
              <Link href="#" className="text-brand-green font-bold text-sm hover:underline flex items-center gap-1">
                Read Study <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      <BottomCTA />
    </MarketingLayout>
  );
}
