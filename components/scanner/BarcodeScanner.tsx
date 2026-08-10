"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine, CheckCircle2 } from "lucide-react";

// Add TypeScript support for BarcodeDetector API
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  throttleMs?: number;
}

export function BarcodeScanner({ onScan, throttleMs = 700 }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);

  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Ignore audio errors (e.g. user hasn't interacted yet)
    }
  }, []);

  const triggerSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < throttleMs) return; // Throttled

    lastScanTimeRef.current = now;
    setLastScanned(decodedText);
    setScanSuccess(true);
    
    // Feedback
    playBeep();
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    onScan(decodedText);

    setTimeout(() => {
      setScanSuccess(false);
    }, 1000);
  }, [onScan, throttleMs, playBeep]);

  // Attempt to use native BarcodeDetector API first (very fast on Android/Chrome)
  useEffect(() => {
    let isComponentMounted = true;

    const startNativeScanner = async () => {
      if (!('BarcodeDetector' in window)) {
        return false; // Fallback to html5-qrcode
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        
        if (!isComponentMounted) {
          stream.getTracks().forEach(t => t.stop());
          return true;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsScanning(true);
        }

        const barcodeDetector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"]
        });

        const detectFrame = async () => {
          if (!isComponentMounted || !videoRef.current || videoRef.current.readyState < 2) {
            requestRef.current = requestAnimationFrame(detectFrame);
            return;
          }

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              triggerSuccess(barcodes[0].rawValue);
            }
          } catch (err) {
            // Some frames might fail, ignore and continue
          }
          
          if (isComponentMounted) {
            requestRef.current = requestAnimationFrame(detectFrame);
          }
        };

        requestRef.current = requestAnimationFrame(detectFrame);
        return true;
      } catch (err) {
        console.error("Native scanner failed:", err);
        return false;
      }
    };

    const startFallbackScanner = () => {
      const scanner = new Html5Qrcode("barcode-reader-fallback");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => triggerSuccess(decodedText),
          () => {} // ignore errors per frame
        )
        .then(() => {
          if (isComponentMounted) setIsScanning(true);
        })
        .catch((err) => {
          console.error("Fallback scanner error:", err);
          if (isComponentMounted) {
            setError("Could not access camera. Please check permissions.");
          }
        });
    };

    const init = async () => {
      const nativeSuccess = await startNativeScanner();
      if (!nativeSuccess && isComponentMounted) {
        // Delay slightly to ensure DOM is ready for fallback
        setTimeout(() => {
          if (isComponentMounted) startFallbackScanner();
        }, 100);
      }
    };

    init();

    return () => {
      isComponentMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [triggerSuccess]);

  return (
    <div className="w-full flex flex-col items-center relative" ref={containerRef}>
      {error ? (
        <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm w-full text-center">
          {error}
        </div>
      ) : (
        <div className="relative w-full max-w-md mx-auto aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-md">
          {/* Native Video Element */}
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover" 
            playsInline 
            muted 
          />
          
          {/* Fallback Container */}
          <div id="barcode-reader-fallback" className="absolute inset-0 w-full h-full [&_video]:object-cover" />
          
          {/* UI Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Scanner Frame */}
            <div className="w-3/4 max-w-[250px] aspect-[5/3] border-2 border-white/50 rounded-xl relative">
               <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl -mt-1 -ml-1"></div>
               <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl -mt-1 -mr-1"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl -mb-1 -ml-1"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br-xl -mb-1 -mr-1"></div>
               
               {/* Animated Scan Line */}
               {!scanSuccess && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/80 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-scan-line"></div>
               )}
            </div>
            
            <div className="mt-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
              {scanSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Barcode Detected</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4" />
                  <span>Point at Barcode</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
