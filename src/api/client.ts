import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/env";
import { tokenStore } from "./tokenStore";
import type { AuthResponse, ProblemDetails } from "../types/api";

export class ApiError extends Error {
  status: number;
  problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.title || `Request failed with status ${problem.status}`);
    this.status = problem.status;
    this.problem = problem;
  }

  fieldErrors(): Record<string, string[]> {
    return this.problem.errors ?? {};
  }

  firstFieldError(): string | null {
    const entries = Object.values(this.fieldErrors());
    return entries[0]?.[0] ?? null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Paths that must never trigger a refresh-and-retry loop on 401 — refreshing here either
// makes no sense (login) or would recurse into itself (refresh).
const NO_REFRESH_PATHS = ["/api/auth/login", "/api/auth/refresh"];

let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(fn: () => void): void {
  onAuthFailure = fn;
}

export const http: AxiosInstance = axios.create({ baseURL: API_BASE_URL });

http.interceptors.request.use((config) => {
  const tokens = tokenStore.get();
  if (tokens?.accessToken) {
    config.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens?.refreshToken) return null;
  try {
    const res = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken: tokens.refreshToken,
    });
    tokenStore.set({
      accessToken: res.data.accessToken,
      accessTokenExpiresAt: res.data.accessTokenExpiresAt,
      refreshToken: res.data.refreshToken,
    });
    return res.data.accessToken;
  } catch {
    return null;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ProblemDetails>) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthPath = NO_REFRESH_PATHS.some((p) => original?.url?.includes(p));

    if (error.response?.status === 401 && original && !original._retried && !isAuthPath) {
      original._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        original.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return http.request(original);
      }
      tokenStore.clear();
      onAuthFailure?.();
    }

    if (error.response?.data && typeof error.response.data === "object") {
      throw new ApiError(error.response.data);
    }
    throw new ApiError({
      status: error.response?.status ?? 0,
      title: error.message || "Network error — check your connection and try again.",
      type: "about:blank",
    });
  },
);
