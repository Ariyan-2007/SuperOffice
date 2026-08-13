// The single source of truth for "which app is this deployment?" — everything else
// (nav, routing, theming, which pages exist) branches off APP_MODE.
//
// BackOffice deployment  (one per Business): VITE_APP_MODE=backoffice + VITE_BUSINESS_SLUG
// SuperOffice deployment (one per Tenant owner, spans all their Businesses): VITE_APP_MODE=superoffice
export type AppMode = "backoffice" | "superoffice";

function resolveAppMode(): AppMode {
  const raw = (import.meta.env.VITE_APP_MODE ?? "").trim().toLowerCase();
  if (raw === "superoffice") return "superoffice";
  if (raw === "backoffice") return "backoffice";
  // No explicit mode set: a BUSINESS_SLUG implies a per-Business BackOffice deployment,
  // otherwise default to SuperOffice (the mode that needs no per-client config at all).
  return import.meta.env.VITE_BUSINESS_SLUG ? "backoffice" : "superoffice";
}

export const APP_MODE: AppMode = resolveAppMode();
export const IS_BACKOFFICE = APP_MODE === "backoffice";
export const IS_SUPEROFFICE = APP_MODE === "superoffice";

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export const BUSINESS_SLUG: string | undefined = import.meta.env.VITE_BUSINESS_SLUG || undefined;

export const APP_NAME = IS_BACKOFFICE ? "BackOffice" : "SuperOffice";

export function assertConfigured(): string | null {
  if (!API_BASE_URL) {
    return "VITE_API_BASE_URL is not set. This deployment is missing required configuration.";
  }
  if (IS_BACKOFFICE && !BUSINESS_SLUG) {
    return "VITE_BUSINESS_SLUG is not set. A BackOffice deployment must be pinned to one Business.";
  }
  return null;
}
