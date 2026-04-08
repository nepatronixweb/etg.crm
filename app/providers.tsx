"use client";
import { SessionProvider } from "next-auth/react";
import { BrandingProvider } from "./branding-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={45} refetchOnWindowFocus>
      <BrandingProvider>{children}</BrandingProvider>
    </SessionProvider>
  );
}
