import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import { Field, Input } from "../../components/Field";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/Feedback";
import { useDemoMode } from "../../demo/DemoModeContext";
import { DEMO_ACCOUNTS, type DemoAccount } from "../../demo/config";
import { IS_BACKOFFICE } from "../../config/env";

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDemoMode = useDemoMode();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: Location })?.from;
      navigate(from ? `${from.pathname}${from.search ?? ""}` : "/", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  });

  const fill = (account: DemoAccount) => {
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
  };

  return (
    <form onSubmit={onSubmit} className="section-stack">
      {isDemoMode && (
        <DemoCredentialsHint accounts={IS_BACKOFFICE ? DEMO_ACCOUNTS.backoffice : DEMO_ACCOUNTS.superoffice} onFill={fill} />
      )}
      {serverError && <ErrorBanner>{serverError}</ErrorBanner>}
      <Field label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoFocus
          hasError={!!errors.email}
          placeholder="you@company.com"
          {...register("email", { required: "Email is required" })}
        />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input
          type="password"
          hasError={!!errors.password}
          placeholder="••••••••"
          {...register("password", { required: "Password is required" })}
        />
      </Field>
      <Button type="submit" variant="primary" loading={isSubmitting} style={{ width: "100%", marginTop: 4 }}>
        Sign in
      </Button>
      <Link to="/forgot-password" style={{ fontSize: 12.5, textAlign: "center" }}>
        Forgot password?
      </Link>
    </form>
  );
}

function DemoCredentialsHint({ accounts, onFill }: { accounts: DemoAccount[]; onFill: (account: DemoAccount) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="banner banner-info" style={{ position: "relative", alignItems: "center" }}>
      <Info size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        Project Showcase — no backend is connected. This is a live sandbox with sample data.
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Show demo credentials"
        title="Show demo credentials"
        onClick={() => setOpen((o) => !o)}
        style={{ flexShrink: 0 }}
      >
        <Info size={15} />
      </button>
      {open && (
        <div
          className="card"
          style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, left: 0, zIndex: 30, padding: 12, boxShadow: "var(--shadow-lg)" }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 8, color: "var(--text)" }}>Demo sign-ins</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {accounts.map((account) => (
              <div
                key={account.email}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{account.role}</div>
                  <div className="cell-mono cell-muted">{account.email}</div>
                  <div className="cell-mono cell-muted">{account.password}</div>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => onFill(account)}>
                  Use
                </Button>
              </div>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: 11.5, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
            These only work in Showcase mode — once a real backend is connected, they stop working.
          </p>
        </div>
      )}
    </div>
  );
}
