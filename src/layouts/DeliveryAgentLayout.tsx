import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { LogOut, Package, User as UserIcon, Truck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_NAME } from "../config/env";

const NAV = [
  { to: "/", label: "My Deliveries", icon: Package, end: true },
  { to: "/status", label: "My Status", icon: Truck },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

// DeliveryAgent accounts get a completely different, minimal shell — no catalog/staff/coupon
// screens exist for them at all (the API 403s them). Per BACKOFFICE_FRONTEND_BLUEPRINT.md §4.
export function DeliveryAgentLayout({ brandName }: { brandName: string }) {
  const { logout, user } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="topbar" style={{ position: "sticky" }}>
        <div className="topbar-title">{brandName}</div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button className="icon-btn" onClick={() => logout()} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="deliveryagent-shell" style={{ flex: 1, width: "100%" }}>
        <div style={{ marginBottom: 18 }}>
          <div className="page-title">Hi, {user?.fullName?.split(" ")[0] ?? "there"}</div>
          <div className="page-subtitle">{APP_NAME} · Delivery</div>
        </div>

        <div className="tabs">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx("tab", isActive && "active")}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <item.icon size={14} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
