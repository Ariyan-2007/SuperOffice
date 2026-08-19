import type { ReactNode } from "react";
import { APP_NAME } from "../config/env";
import { useDemoMode } from "../demo/DemoModeContext";
import { DEMO_LOGO_URL } from "../demo/config";
import { RemoteImage } from "../components/RemoteImage";

export function AuthLayout({
  brandName,
  logoUrl,
  tagline,
  children,
}: {
  brandName: string;
  logoUrl?: string | null;
  tagline?: string;
  children: ReactNode;
}) {
  const isDemoMode = useDemoMode();
  const initials = brandName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          {logoUrl ? (
            <RemoteImage src={logoUrl} alt="" className="auth-brand-logo" />
          ) : isDemoMode ? (
            <img src={DEMO_LOGO_URL} alt="" className="auth-brand-logo" />
          ) : (
            <div className="auth-brand-mark">{initials || "V"}</div>
          )}
          <div>
            <div className="auth-brand-name">{brandName}</div>
            <div className="auth-brand-app">
              {APP_NAME}
              {tagline ? ` · ${tagline}` : ""}
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
