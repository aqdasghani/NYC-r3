import React from 'react';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopHeader() {
  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
          <span className="text-sm font-medium text-slate-700">GreenMart - MG Road</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
        
        <div className="hidden md:flex items-center text-sm font-medium text-slate-500">
          May 28, 2025 • 9:30 AM
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-[8px] font-bold text-white leading-none absolute -top-1 -right-1">5</span>
            </span>
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
              RK
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-slate-900 leading-tight">Rahul Kumar</div>
              <div className="text-xs font-medium text-slate-500">Owner</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
