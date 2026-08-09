"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CornerDownLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ArrowRight
} from 'lucide-react';



function ReturnsPageContent() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Pending":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case "Approved":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case "Refunded":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Refunded</span>;
      case "Rejected":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
          <p className="text-slate-500 text-sm mt-1">Process and track customer returns and refunds.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            Export Data <ChevronDown className="w-4 h-4" />
          </button>
          <button className="px-4 py-2 bg-[#0FA958] text-white rounded-lg text-sm font-medium hover:bg-[#0c8f49] transition-colors shadow-sm shadow-green-500/20">
            Create Return
          </button>
        </div>
      </div>

      {/* Coming Soon State */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-100 rounded-xl shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
      >
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
          <CornerDownLeft className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Returns Tracking Coming Soon</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
          Returns tracking will be available once configured. For now, please log returns through the POS as refund transactions.
        </p>
      </motion.div>
    </div>
  );
}


export default function ReturnsPage() {
  return (
    <RoleGate module="returns">
      <ReturnsPageContent />
    </RoleGate>
  );
}
