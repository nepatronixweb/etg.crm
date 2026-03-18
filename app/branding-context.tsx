"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface Branding {
  companyName: string;
  shortCode: string;
  tagline: string;
  logoPath: string;
  faviconPath: string;
  brandColor: string;
  paymentQrPath: string;
}

const defaultBranding: Branding = {
  companyName: "Education Tree Global",
  shortCode: "ETG",
  tagline: "CRM Portal — Staff Access",
  logoPath: "",
  faviconPath: "",
  brandColor: "#2563eb",
  paymentQrPath: "",
};

interface BrandingContextValue {
  branding: Branding;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: defaultBranding,
  refreshBranding: () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);

  const load = useCallback(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (d?.companyName) {
          setBranding({
            companyName: d.companyName || defaultBranding.companyName,
            shortCode: d.shortCode || defaultBranding.shortCode,
            tagline: d.tagline || defaultBranding.tagline,
            logoPath: d.logoPath || "",
            faviconPath: d.faviconPath || "",
            brandColor: d.brandColor || defaultBranding.brandColor,
            paymentQrPath: d.paymentQrPath || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Update document title when branding loads
  useEffect(() => {
    document.title = `${branding.shortCode} CRM — ${branding.companyName}`;
  }, [branding.shortCode, branding.companyName]);

  // Update favicon dynamically
  useEffect(() => {
    if (branding.faviconPath) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconPath;
    }
  }, [branding.faviconPath]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const { branding } = useContext(BrandingContext);
  return branding;
}

export function useBrandingRefresh() {
  const { refreshBranding } = useContext(BrandingContext);
  return refreshBranding;
}
