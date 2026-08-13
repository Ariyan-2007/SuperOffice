import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const initials = (user?.fullName ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onMenuClick && (
          <button className="icon-btn" onClick={onMenuClick} aria-label="Toggle menu">
            <Menu size={17} />
          </button>
        )}
        <div className="topbar-title">{title}</div>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        <div
          className="user-menu"
          tabIndex={0}
          onClick={() => setMenuOpen((o) => !o)}
          onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
          style={{ position: "relative" }}
        >
          <div className="avatar">{initials}</div>
          <span>{user?.fullName ?? "Account"}</span>
          <ChevronDown size={13} />
          {menuOpen && (
            <div
              className="card"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                minWidth: 180,
                zIndex: 20,
                padding: 6,
              }}
            >
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => navigate("/profile")}
              >
                <UserIcon size={14} /> My profile
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}
                onClick={() => logout()}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
