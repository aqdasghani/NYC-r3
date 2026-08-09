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
          Ecosystem Integrations <span className="text-xs text-brand-green font-bold ml-1">(Roadmap / Coming Soon)</span>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap justify-center md:justify-between items-center w-full gap-6 opacity-70">
          {integrations.map((name, i) => (
            <div key={i} className="text-sm font-semibold text-text-primary tracking-tight flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
              <span>{name}</span>
              <span className="text-[10px] text-slate-500 font-normal">Coming Soon</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
