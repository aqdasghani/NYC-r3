import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Providers } from "@/providers/Providers";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "GreenShop AI", template: "%s · GreenShop AI" },
  description:
    "AI-powered inventory intelligence for Indian kirana stores — stop waste before it happens.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  appleWebApp: {
    capable: true,
    title: "GreenShop AI",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "GreenShop AI",
    description:
      "The AI that tells shopkeepers what to do next — and measures the result.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1117",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-ink">
        {/* Ambient background: subtle grid + two soft radial glows */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="grid-bg absolute inset-0" />
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent opacity-[0.05] blur-[100px]" />
          <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple opacity-[0.04] blur-[100px]" />
        </div>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
