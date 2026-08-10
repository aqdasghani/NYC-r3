"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Loader2,
  PackageX
} from 'lucide-react';
import { getReturns } from '@/lib/api';

function ReturnsPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReturns() {
      try {
        const data = await getReturns();
        setReturns(data);
      } catch (err) {
        console.error("Failed to load returns", err);
      } finally {
        setLoading(false);
      }
    }
    loadReturns();
  }, []);

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

  const filteredReturns = returns.filter(ret => 
    ret.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search returns by ID or Customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
            />
          </div>
          <button className="w-full sm:w-auto px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Status
          </button>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
            <p>Loading returns data...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <PackageX className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">No returns found</h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
              There are currently no returns matching your criteria. Process new returns through the POS system.
            </p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Return ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((ret, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={ret.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{ret.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{ret.items_count} items</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {ret.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-bold">
                      ₹{ret.amount?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ret.status || 'Pending')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-green-50">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
