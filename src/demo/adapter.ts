import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { authenticate, resolveRoute } from "./router";
import { demoStore } from "./store";

// Simulated network latency so loading states in the UI still feel real.
const MIN_DELAY_MS = 180;
const MAX_DELAY_MS = 420;

async function parseBody(data: unknown, pathname: string): Promise<unknown> {
  if (data == null) return {};
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const file = data.get("file");
    if (!(file instanceof File)) return { url: "" };
    // The CSV import route needs the file's actual text content; every other multipart upload
    // (product images) is stored nowhere in the demo backend, so an object URL stands in for
    // "the server's generated filename".
    if (pathname.endsWith("/import")) return { csvText: await file.text() };
    return { url: URL.createObjectURL(file) };
  }
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

const AUDITED_PREFIX = "/api/businesses/";

// Stands in for the real network transport when Project Showcase mode is active — resolves
// every request against the in-browser DemoStore instead of the Vastora API. Installed as
// `http.defaults.adapter` (see api/client.ts) once connectivity checking confirms there's no
// backend to talk to.
export const demoAdapter: AxiosAdapter = (config) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

    (async () => {
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

        const query: Record<string, string> = {};
        if (config.params && typeof config.params === "object") {
          for (const [key, value] of Object.entries(config.params as Record<string, unknown>)) {
            if (value != null) query[key] = String(value);
          }
        }

        const body = await parseBody(config.data, pathname);

        await new Promise((r) => setTimeout(r, delay));

        const result = match.route.handler({ params: match.params, query, body, auth });

        // Every mutating request against a Business-scoped route is recorded centrally here —
        // BACKOFFICE_FRONTEND_BLUEPRINT.md §7.15/§9.35 — so the audit log has real data for
        // every area without each individual route handler needing to remember to log itself.
        if (method !== "GET" && auth && pathname.startsWith(AUDITED_PREFIX) && result.status >= 200 && result.status < 300) {
          const resourceId = Object.values(match.params).at(-1) ?? null;
          demoStore.recordAudit({
            userId: auth.userId,
            userEmail: auth.user.email,
            role: auth.user.role,
            method,
            path: pathname,
            routeTemplate: match.route.path,
            statusCode: result.status,
            ipAddress: "127.0.0.1",
            resourceId,
            durationMs: Date.now() - startedAt,
            createdAt: new Date().toISOString(),
          });
        }

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
    })();
  });
