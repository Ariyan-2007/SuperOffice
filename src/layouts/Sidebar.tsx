import { NavLink } from "react-router-dom";
import clsx from "clsx";
import type { ComponentType } from "react";
import { APP_NAME } from "../config/env";
import { useDemoMode } from "../demo/DemoModeContext";
import { DEMO_LOGO_URL } from "../demo/config";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  end?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  brandName: string;
  logoUrl?: string | null;
  sections: NavSection[];
  open: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ brandName, logoUrl, sections, open, onNavigate }: SidebarProps) {
  const isDemoMode = useDemoMode();
  const initials = brandName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className={clsx("sidebar", open && "open")}>
      <div className="sidebar-brand">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="sidebar-brand-logo" />
        ) : isDemoMode ? (
          <img src={DEMO_LOGO_URL} alt="" className="sidebar-brand-logo" style={{ background: "transparent" }} />
        ) : (
          <div className="sidebar-brand-mark">{initials || "V"}</div>
        )}
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">{brandName}</div>
          <div className="sidebar-brand-app">{APP_NAME}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {sections.map((section, i) => (
          <div key={section.label ?? i}>
            {section.label && <div className="sidebar-nav-group-label">{section.label}</div>}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => clsx("sidebar-link", isActive && "active")}
              >
                <item.icon size={16.5} strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
