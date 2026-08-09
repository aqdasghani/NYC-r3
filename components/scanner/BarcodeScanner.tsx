"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!isScanningRef.current) return;
          isScanningRef.current = false;
          onScan(decodedText);
          setTimeout(() => { isScanningRef.current = true; }, 2000);
        },
        () => {}
      )
      .then(() => setIsScanning(true))
      .catch((err) => {
        console.error("Scanner error:", err);
        setError("Could not access camera. Please check permissions.");
      });

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="w-full flex flex-col items-center">
      {error ? (
        <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm">
          {error}
        </div>
      ) : (
        <div
          id="barcode-reader"
          className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-sm border border-border-default"
        />
      )}
      {!error && !isScanning && (
        <div className="mt-4 text-text-muted text-sm animate-pulse">
          Initializing camera...
        </div>
      )}
    </div>
  );
}

