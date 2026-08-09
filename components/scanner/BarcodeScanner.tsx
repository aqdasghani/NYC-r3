"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playBeepSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext safe catch
    }
  };

  useEffect(() => {
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScannedTimeRef.current > 2000) {
            lastScannedTimeRef.current = now;
            playBeepSound();
            onScan(decodedText);
          }
        },
        () => {}
      )
      .then(() => setIsScanning(true))
      .catch((err) => {
        console.error("Scanner error:", err);
        setError("Could not access camera. Please check browser permissions or camera availability.");
      });

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    };
  }, [onScan]);

  return (
    <div className="w-full flex flex-col items-center relative">
      <style jsx global>{`
        #barcode-reader {
          width: 100% !important;
          border: none !important;
          background: #090d16 !important;
        }
        #barcode-reader video {
          width: 100% !important;
          max-height: 280px !important;
          object-fit: cover !important;
          border-radius: 1rem !important;
        }
        #barcode-reader img {
          display: none !important;
        }
        #barcode-reader__scan_region {
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>

      {error ? (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs text-center font-bold">
          {error}
        </div>
      ) : (
        <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-800 bg-slate-950">
          <div id="barcode-reader" className="w-full" />

          {/* Scanning reticle overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-emerald-500/60 rounded-xl relative shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <div className="absolute w-full h-0.5 bg-emerald-400 top-1/2 -translate-y-1/2 shadow-[0_0_10px_#10B981] animate-pulse"></div>
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 rounded-tl"></div>
                <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 rounded-tr"></div>
                <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 rounded-bl"></div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 rounded-br"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {!error && !isScanning && (
        <div className="mt-3 text-emerald-400 text-xs font-bold animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Initializing camera feed...
        </div>
      )}
    </div>
  );
}
