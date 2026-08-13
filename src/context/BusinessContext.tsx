import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL, BUSINESS_SLUG, IS_BACKOFFICE } from "../config/env";
import { fetchBusinessBySlug } from "../api/endpoints";
import { applyBrandColor, resetBrandColor } from "../theme/color";
import type { BusinessResponse } from "../types/api";

type BusinessResolutionStatus = "idle" | "loading" | "ready" | "error";

interface BusinessContextValue {
  business: BusinessResponse | null;
  status: BusinessResolutionStatus;
  error: string | null;
}

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  status: "idle",
  error: null,
});

// BackOffice deployments are pinned to one Business via VITE_BUSINESS_SLUG. Before rendering
// the login screen we resolve that slug through the public /api/shop/{slug} endpoint so the
// app is already branded (name/logo/theme color) for whoever's about to log in — see
// BACKOFFICE_FRONTEND_BLUEPRINT.md §3. SuperOffice has no per-deployment Business, so it
// always uses the default brand palette.
export function BusinessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BusinessContextValue>({
    business: null,
    status: IS_BACKOFFICE ? "loading" : "ready",
    error: null,
  });

  useEffect(() => {
    if (!IS_BACKOFFICE) {
      resetBrandColor();
      return;
    }
    if (!BUSINESS_SLUG) {
      setState({ business: null, status: "error", error: "VITE_BUSINESS_SLUG is not configured." });
      return;
    }
    let cancelled = false;
    fetchBusinessBySlug(BUSINESS_SLUG)
      .then((business) => {
        if (cancelled) return;
        applyBrandColor(business.themeColor);
        document.title = `${business.name} · BackOffice`;
        setState({ business, status: "ready", error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        const message =
          status === 404
            ? `No active Business found for slug "${BUSINESS_SLUG}". This deployment isn't configured correctly.`
            : `Could not reach the Vastora API at ${API_BASE_URL}. Check VITE_API_BASE_URL and that the backend is running.`;
        setState({ business: null, status: "error", error: message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <BusinessContext.Provider value={state}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessContextValue {
  return useContext(BusinessContext);
}
