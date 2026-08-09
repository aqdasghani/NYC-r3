"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, PackageSearch, TrendingUp, ShoppingCart,
  Users, ArrowRightLeft, CornerDownLeft, Zap, FileText, Leaf, Bell,
  MessageCircle, Settings, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from './SidebarContext';
import { getCurrentUser } from '@/lib/api-client';

const navItems = [
  { name: 'Dashboard',      path: '/dashboard',             icon: LayoutDashboard },
  { name: 'Products',       path: '/dashboard/products',    icon: PackageSearch },
  { name: 'Inventory',      path: '/dashboard/inventory',   icon: Package },
  { name: 'Sales & POS',    path: '/dashboard/sales',       icon: TrendingUp },
  { name: 'Procurement',    path: '/dashboard/procurement', icon: ShoppingCart },
  { name: 'Suppliers',      path: '/dashboard/suppliers',   icon: Users },
  { name: 'Transfers',      path: '/dashboard/transfers',   icon: ArrowRightLeft },
  { name: 'Returns',        path: '/dashboard/returns',     icon: CornerDownLeft },
  { name: 'Daily Briefing', path: '/dashboard/briefing',    icon: Zap },
  { name: 'Reports',        path: '/dashboard/reports',     icon: FileText },
  { name: 'Sustainability', path: '/dashboard/sustainability', icon: Leaf },
  { name: 'Alerts',         path: '/dashboard/alerts',      icon: Bell, badge: 5 },
  { name: 'Settings',       path: '/dashboard/settings',    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const [role, setRole] = React.useState<string>('OWNER');

  React.useEffect(() => {
    try {
      const u = getCurrentUser();
      if (u && u.role) setRole(u.role);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-[#063120] border-r border-[#0A412A] flex flex-col pt-6 pb-4 overflow-y-auto overflow-x-hidden flex-shrink-0"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Logo */}
      <div className={`mb-8 flex flex-col gap-1 ${collapsed ? 'px-3 items-center' : 'px-5'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0FA958] flex items-center justify-center shadow-[0_0_15px_rgba(15,169,88,0.5)] flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <span className="font-bold text-xl text-white tracking-tight whitespace-nowrap">Green Quant AI</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-[#0FA958] font-medium ml-10 whitespace-nowrap"
            >
              Smart Retail. Zero Waste.
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className={`flex-1 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.filter(item => {
          if (role === 'WORKER') {
            return ['Products', 'Sales & POS'].includes(item.name);
          }
          return true;
        }).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                title={collapsed ? item.name : undefined}
                className={`flex items-center justify-between rounded-lg transition-all duration-200 group
                  ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'}
                  ${isActive ? 'bg-[#0FA958]' : 'hover:bg-white/5'}`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`text-sm font-medium whitespace-nowrap overflow-hidden ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {!collapsed && item.badge && (
                  <div className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {item.badge}
                  </div>
                )}
                {collapsed && item.badge && (
                  <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-red-500" />
                )}
                {!collapsed && !item.badge && (
                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white/70' : 'text-slate-500 opacity-0 group-hover:opacity-100'} transition-opacity`} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Green Score */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 mt-8"
          >
            <div className="bg-[#042417] rounded-xl p-4 border border-[#0A412A] relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-white">Green Score</span>
                <span className="text-slate-500 text-xs">✕</span>
              </div>
              <div className="relative flex justify-center items-center py-2">
                <svg viewBox="0 0 100 50" className="w-32 h-16 overflow-visible">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#0A412A" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 75 25" fill="none" stroke="#0FA958" strokeWidth="8" strokeLinecap="round"
                    style={{ strokeDasharray: '125', strokeDashoffset: '0', filter: 'drop-shadow(0 0 4px rgba(15,169,88,0.6))' }} />
                </svg>
                <div className="absolute bottom-0 text-center flex flex-col items-center">
                  <div className="text-2xl font-bold text-white leading-none">84<span className="text-sm text-slate-400 font-normal">/100</span></div>
                </div>
                <div className="absolute bottom-1 bg-[#0FA958] p-1 rounded-full shadow-[0_0_10px_rgba(15,169,88,0.8)] border-2 border-[#042417]"
                  style={{ transform: 'rotate(25deg) translateY(-25px)' }}>
                  <Leaf className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-[10px] font-semibold text-[#0FA958] flex items-center justify-center gap-1">
                  <span>↑ 7 this month</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">Great Progress!</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
