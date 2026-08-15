import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { authenticate, resolveRoute } from "./router";

// Simulated network latency so loading states in the UI still feel real.
const MIN_DELAY_MS = 180;
const MAX_DELAY_MS = 420;

function parseBody(data: unknown): unknown {
  if (data == null) return {};
  if (typeof data === "string") {
    if (data.trim() === "") return {};
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function getAuthorizationHeader(config: InternalAxiosRequestConfig): string | undefined {
  const headers = config.headers as unknown as { get?: (name: string) => unknown };
  if (headers && typeof headers.get === "function") {
    const value = headers.get("Authorization");
    return typeof value === "string" ? value : undefined;
  }
  return (config.headers as Record<string, string> | undefined)?.Authorization;
}

function buildResponse(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
}

function buildError(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const title = (data as { title?: string } | null)?.title ?? `Demo request failed with status ${status}`;
  const error = new Error(title) as Error & {
    isAxiosError: boolean;
    config: InternalAxiosRequestConfig;
    response: AxiosResponse;
  };
  error.isAxiosError = true;
  error.config = config;
  error.response = buildResponse(config, status, data);
  return error;
}

// Stands in for the real network transport when Project Showcase mode is active — resolves
// every request against the in-browser DemoStore instead of the Vastora API. Installed as
// `http.defaults.adapter` (see api/client.ts) once connectivity checking confirms there's no
// backend to talk to.
export const demoAdapter: AxiosAdapter = (config) =>
  new Promise((resolve, reject) => {
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    setTimeout(() => {
      try {
        const method = (config.method ?? "get").toUpperCase();
        const pathname = (config.url ?? "").split("?")[0];
        const match = resolveRoute(method, pathname);
        if (!match) {
          reject(buildError(config, 404, { status: 404, title: `No demo route for ${method} ${pathname}`, type: "about:blank" }));
          return;
        }

        let auth = null;
        if (match.route.auth === "required") {
          auth = authenticate(getAuthorizationHeader(config));
          if (!auth) {
            reject(buildError(config, 401, { status: 401, title: "Unauthorized", type: "about:blank" }));
            return;
          }
        }

        const result = match.route.handler({ params: match.params, body: parseBody(config.data), auth });
        if (result.status >= 200 && result.status < 300) {
          resolve(buildResponse(config, result.status, result.data));
        } else {
          reject(buildError(config, result.status, result.data));
        }
      } catch (err) {
        reject(
          buildError(config, 500, {
            status: 500,
            title: err instanceof Error ? err.message : "Showcase demo backend error.",
            type: "about:blank",
          }),
        );
      }
    }, delay);
  });
