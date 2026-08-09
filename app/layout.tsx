import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Green Quant AI | Stop Money Walking Out",
  description: "Autonomous retail intelligence platform that prevents inventory waste before it happens.",
};

import { GlobalStateProvider } from "@/components/GlobalState";
import { LiveProvider } from "@/providers/LiveProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <GlobalStateProvider>
          <LiveProvider>{children}</LiveProvider>
        </GlobalStateProvider>
      </body>
    </html>
  );
}
