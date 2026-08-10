"use client";

import React, { useEffect, useState } from 'react';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { getCurrentUser } from '@/lib/api-client';

export function TopHeader() {
  const { toggle } = useSidebar();
  const [userName, setUserName] = useState('Rahul Kumar');
  const [userRole, setUserRole] = useState('Owner');
  const [userInitials, setUserInitials] = useState('RK');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
      setUserRole(user.role);
      const parts = user.name.split(' ');
      const initials = parts.length > 1 
        ? parts[0][0] + parts[parts.length - 1][0] 
        : parts[0].substring(0, 2);
      setUserInitials(initials.toUpperCase());
    }
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          aria-label="Toggle sidebar"
        >
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
          {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 cursor-pointer pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#063120] text-white flex items-center justify-center font-bold text-sm">
              {userInitials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-slate-900 leading-tight">{userName}</div>
              <div className="text-xs font-medium text-slate-500">{userRole}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
