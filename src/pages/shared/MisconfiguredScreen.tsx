import { AlertOctagon } from "lucide-react";

export function MisconfiguredScreen({ message }: { message: string }) {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <AlertOctagon size={36} color="var(--danger)" style={{ margin: "0 auto 14px" }} />
        <div style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>This deployment isn't configured correctly</div>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
}
