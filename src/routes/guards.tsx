import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PageLoader } from "../components/Feedback";
import type { UserRole } from "../types/api";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageLoader />;
  if (status === "unauthenticated") return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <>{children}</>;
}

// UX-level guard only — the API is the real enforcement point (403s wrong-role calls per
// both blueprints). This just avoids showing a dead-end screen for a route the backend
// would reject anyway.
export function RoleRoute({ allow, userRole, children }: { allow: UserRole[]; userRole: UserRole; children: ReactNode }) {
  if (!allow.includes(userRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
