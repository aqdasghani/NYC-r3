import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { BottomCTA } from '@/components/marketing/BottomCTA';

export const metadata = { title: "Features - GreenShop AI" };

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      <section className="pt-32 pb-12 bg-white overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl lg:text-[4rem] font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Everything You Need to <br/><span className="text-brand-green">Run a Smart Store</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed">
              From automated expiry tracking to AI-powered dynamic pricing recommendations, discover the complete feature set of GreenShop AI.
            </p>
          </div>
        </div>
      </section>

      {/* Re-using the features grid from the homepage */}
      <FeaturesGrid />
      
      <BottomCTA />
    </MarketingLayout>
  );
}
