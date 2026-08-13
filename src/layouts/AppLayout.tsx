import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, type NavSection } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppLayoutProps {
  brandName: string;
  logoUrl?: string | null;
  sections: NavSection[];
  title: string;
}

export function AppLayout({ brandName, logoUrl, sections, title }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const activeLabel = sections.flatMap((s) => s.items).find((i) => location.pathname.startsWith(i.to) && i.to !== "/")?.label
    ?? (location.pathname === "/" ? title : title);

  return (
    <div className="app-shell">
      <Sidebar brandName={brandName} logoUrl={logoUrl} sections={sections} open={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <div className="app-main">
        <Topbar title={activeLabel} onMenuClick={() => setMobileOpen((o) => !o)} />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
