import { API_BASE_URL } from "../config/env";
import { enableDemoAdapter, NGROK_SKIP_WARNING_HEADER } from "../api/client";

export type ConnectivityStatus = "checking" | "demo" | "live";

let status: ConnectivityStatus = "checking";

export function getConnectivityStatus(): ConnectivityStatus {
  return status;
}

export function isDemoMode(): boolean {
  return status === "demo";
}

async function probeBackend(timeoutMs = 3500): Promise<boolean> {
  if (!API_BASE_URL) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Any HTTP response — even 401/404 — proves a server is actually listening. Only a
    // network failure or timeout means there's nothing to talk to.
    await fetch(`${API_BASE_URL}/api/auth/me`, {
      signal: controller.signal,
      cache: "no-store",
      headers: NGROK_SKIP_WARNING_HEADER,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let checkPromise: Promise<ConnectivityStatus> | null = null;

export function ensureConnectivityChecked(): Promise<ConnectivityStatus> {
  checkPromise ??= probeBackend().then((reachable) => {
    status = reachable ? "live" : "demo";
    if (!reachable) enableDemoAdapter();
    return status;
  });
  return checkPromise;
}
