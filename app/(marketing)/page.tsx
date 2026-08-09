import React from 'react';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatsBar } from '@/components/marketing/StatsBar';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { AppMockupSection } from '@/components/marketing/AppMockupSection';
import { IntegrationsBar } from '@/components/marketing/IntegrationsBar';
import { BottomCTA } from '@/components/marketing/BottomCTA';

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <FeaturesGrid />
      <AppMockupSection />
      <IntegrationsBar />
      <BottomCTA />
    </>
  );
}
