import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/endpoints";
import { ApiError, setAuthFailureHandler } from "../api/client";
import { tokenStore } from "../api/tokenStore";
import { useBusiness } from "../context/BusinessContext";
import { IS_BACKOFFICE } from "../config/env";
import type { UserSummaryResponse } from "../types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: UserSummaryResponse | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Roles this deployment mode accepts, per each blueprint's login contract.
const ALLOWED_ROLES: Record<"backoffice" | "superoffice", UserSummaryResponse["role"][]> = {
  backoffice: ["BusinessAdmin", "BusinessStaff", "DeliveryAgent", "TenantOwner", "PlatformSuperAdmin"],
  superoffice: ["TenantOwner"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { business } = useBusiness();
  const [user, setUser] = useState<UserSummaryResponse | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    setAuthFailureHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    const tokens = tokenStore.get();
    if (!tokens) {
      setStatus("unauthenticated");
      return;
    }
    authApi
      .me()
      .then((me) => {
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => clearSession());
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email, password);
      const mode = IS_BACKOFFICE ? "backoffice" : "superoffice";

      if (!ALLOWED_ROLES[mode].includes(auth.user.role)) {
        throw new ApiError({
          status: 403,
          title: IS_BACKOFFICE
            ? "This account can't sign in to BackOffice."
            : "Only Tenant owner accounts can sign in to SuperOffice.",
          type: "about:blank",
        });
      }

      // BACKOFFICE_FRONTEND_BLUEPRINT.md §3: businessId is empty for TenantOwner /
      // PlatformSuperAdmin (not subject to this check) but must match the resolved
      // Business for BusinessAdmin/BusinessStaff/DeliveryAgent.
      if (IS_BACKOFFICE && auth.user.businessId && business && auth.user.businessId !== business.id) {
        throw new ApiError({
          status: 403,
          title: "This account doesn't belong to this shop.",
          type: "about:blank",
        });
      }

      tokenStore.set({
        accessToken: auth.accessToken,
        accessTokenExpiresAt: auth.accessTokenExpiresAt,
        refreshToken: auth.refreshToken,
      });
      setUser(auth.user);
      setStatus("authenticated");
    },
    [business],
  );

  const logout = useCallback(async () => {
    const tokens = tokenStore.get();
    if (tokens?.refreshToken) {
      await authApi.logout(tokens.refreshToken).catch(() => undefined);
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refreshUser }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
