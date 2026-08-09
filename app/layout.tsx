import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenShop AI | Stop Money Walking Out",
  description: "Autonomous retail intelligence platform that prevents inventory waste before it happens.",
};

import { GlobalStateProvider } from "@/components/GlobalState";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GlobalStateProvider>
          {children}
        </GlobalStateProvider>
      </body>
    </html>
  );
}
