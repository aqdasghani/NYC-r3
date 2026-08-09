import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Green Quant AI | Stop Money Walking Out",
  description: "Autonomous retail intelligence platform that prevents inventory waste before it happens.",
};

import { GlobalStateProvider } from "@/components/GlobalState";
import { LiveProvider } from "@/providers/LiveProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Falls back to empty string — GoogleOAuthProvider still needs a value but
  // the GoogleAuthButton component won't render the real button without a valid ID.
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={clientId}>
          <GlobalStateProvider>
            <LiveProvider>{children}</LiveProvider>
          </GlobalStateProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
