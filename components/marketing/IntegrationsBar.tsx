"use client";

import React from 'react';

const integrations = [
  "Tally Prime",
  "Busy Accounting",
  "Marg ERP",
  "GSTR Network",
  "e-Way Bill",
  "WhatsApp Business",
  "Razorpay"
];

export function IntegrationsBar() {
  return (
    <section className="py-12 border-y border-border-default bg-bg-surface backdrop-blur-sm overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row items-center gap-8">
        <div className="text-text-secondary font-medium text-sm whitespace-nowrap">
          Works seamlessly with
        </div>
        
        {/* Simple Marquee implementation using CSS animation or just flex wrap for now */}
        <div className="flex flex-wrap md:flex-nowrap justify-center md:justify-between items-center w-full gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {integrations.map((name, i) => (
            <div key={i} className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
              <span className="text-brand-green-light/50">/</span> {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
