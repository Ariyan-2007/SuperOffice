import { API_BASE_URL } from "../config/env";

// Uploaded files (§9.5) come back as paths relative to the API host — e.g.
// `/uploads/{businessId}/{file}` — not the frontend's own origin. Dropped straight into an
// <img src>, a bare relative path resolves against whatever page is showing it instead of the
// API, so it 404s (or in dev, hits the Vite server's SPA fallback and renders a broken image).
// Absolute URLs (http(s):, blob:, data:) and empty values pass through unchanged.
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (!API_BASE_URL) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
