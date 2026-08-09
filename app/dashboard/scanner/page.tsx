"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ScanLine, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ScannerPage() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success'>('idle');

  const startScan = () => {
    setScanState('scanning');
    setTimeout(() => {
      setScanState('success');
    }, 2500);
  };

  const resetScan = () => {
    setScanState('idle');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Smart Capture OCR</h1>
        <p className="text-text-secondary">Scan barcodes or invoices to automatically extract product data, batches, and expiry.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-4 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden bg-black rounded-2xl">
          {scanState === 'idle' && (
            <div className="text-center">
              <Camera className="w-16 h-16 text-text-muted mb-4 mx-auto" />
              <p className="text-text-secondary mb-6">Camera ready for scanning.</p>
              <button 
                onClick={startScan}
                className="bg-brand-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                Start Scanner
              </button>
            </div>
          )}

          {scanState === 'scanning' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-0 bg-brand-green/5 border-2 border-brand-green/50 rounded-xl max-w-sm max-h-80 m-auto" />
              <motion.div 
                animate={{ y: [-150, 150] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute w-full max-w-sm h-0.5 bg-brand-green text-glow shadow-[0_0_15px_rgba(34,197,94,1)] m-auto left-0 right-0" 
              />
              <p className="absolute bottom-10 text-brand-green animate-pulse font-mono">Analyzing packaging OCR...</p>
            </div>
          )}

          {scanState === 'success' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-green/20 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-green/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Extraction Complete</h2>
              <p className="text-text-secondary mb-6">AI successfully parsed the label.</p>
              <button 
                onClick={resetScan}
                className="text-brand-green hover:text-text-primary transition-colors underline"
              >
                Scan Another
              </button>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Extracted Data</h2>
          <div className={`glass-panel p-6 transition-opacity duration-500 ${scanState === 'success' ? 'opacity-100' : 'opacity-30'}`}>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted uppercase font-medium">Product Name</label>
                <input type="text" readOnly value={scanState === 'success' ? 'Amul Taaza Milk 1L' : ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-text-primary mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase font-medium">Batch No.</label>
                  <input type="text" readOnly value={scanState === 'success' ? 'BT-84920' : ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-text-primary mt-1 font-mono" />
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase font-medium">Barcode</label>
                  <div className="relative">
                    <input type="text" readOnly value={scanState === 'success' ? '8901262150493' : ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 pl-9 text-text-primary mt-1 font-mono" />
                    <ScanLine className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 mt-0.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase font-medium">Mfg Date</label>
                  <input type="text" readOnly value={scanState === 'success' ? '24 May 2026' : ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-text-primary mt-1" />
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase font-medium flex items-center justify-between">
                    Expiry Date
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  </label>
                  <input type="text" readOnly value={scanState === 'success' ? '30 May 2026 (6 Days)' : ''} className="w-full bg-[#111] border border-orange-500/50 text-orange-400 rounded px-3 py-2 mt-1 font-medium" />
                </div>
              </div>

              <div className="pt-4 border-t border-[#222] mt-6 flex justify-end gap-3">
                <button className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-[#222] rounded transition-colors" disabled={scanState !== 'success'}>
                  Discard
                </button>
                <button className="bg-white text-black px-4 py-2 rounded font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50" disabled={scanState !== 'success'}>
                  Confirm & Add to Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
