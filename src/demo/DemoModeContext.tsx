import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ensureConnectivityChecked, getConnectivityStatus, type ConnectivityStatus } from "./state";

const DemoModeContext = createContext<ConnectivityStatus>("checking");

// Gates the rest of the app behind a one-time connectivity check: if the Vastora API can't be
// reached, every child mounts with the demo axios adapter already installed (see api/client.ts
// enableDemoAdapter) so nothing downstream ever has to know the difference.
export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectivityStatus>(getConnectivityStatus());

  useEffect(() => {
    let cancelled = false;
    ensureConnectivityChecked().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return <DemoModeContext.Provider value={status}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext) === "demo";
}
