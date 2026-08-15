import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { authApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { Field, Input } from "../../components/Field";
import { Button } from "../../components/Button";
import { ErrorBanner, InfoBanner } from "../../components/Feedback";

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

// A successful reset revokes every active session for the user, including this device —
// so there's nowhere useful to send them but back to /login (main blueprint §9.10).
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>();

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setServerError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  });

  if (!token) {
    return (
      <div className="section-stack">
        <ErrorBanner>This reset link is missing its token. Request a new one from the sign-in page.</ErrorBanner>
        <Link to="/forgot-password" className="btn btn-secondary" style={{ width: "100%" }}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="section-stack">
        <InfoBanner>
          <CheckCircle2 size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
          Password reset. Every active session on this account has been signed out — sign in again with your new password.
        </InfoBanner>
        <Button variant="primary" onClick={() => navigate("/login")} style={{ width: "100%" }}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="section-stack">
      {serverError && <ErrorBanner>{serverError}</ErrorBanner>}
      <Field label="New Password" error={errors.newPassword?.message}>
        <Input
          type="password"
          autoFocus
          hasError={!!errors.newPassword}
          placeholder="••••••••"
          {...register("newPassword", { required: "Password is required", minLength: { value: 8, message: "At least 8 characters" } })}
        />
      </Field>
      <Field label="Confirm Password" error={errors.confirmPassword?.message}>
        <Input
          type="password"
          hasError={!!errors.confirmPassword}
          placeholder="••••••••"
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (v) => v === watch("newPassword") || "Passwords don't match",
          })}
        />
      </Field>
      <Button type="submit" variant="primary" loading={isSubmitting} style={{ width: "100%", marginTop: 4 }}>
        Reset password
      </Button>
    </form>
  );
}
