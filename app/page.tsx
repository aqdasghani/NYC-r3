import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatsBar } from '@/components/marketing/StatsBar';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { AppMockupSection } from '@/components/marketing/AppMockupSection';
import { IntegrationsBar } from '@/components/marketing/IntegrationsBar';
import { BottomCTA } from '@/components/marketing/BottomCTA';

export const metadata = { title: "GreenShop AI - Smart Retail, Zero Waste" };

export default function MarketingPage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <StatsBar />
      <FeaturesGrid />
      <AppMockupSection />
      <IntegrationsBar />
      <BottomCTA />
    </MarketingLayout>
  );
}
