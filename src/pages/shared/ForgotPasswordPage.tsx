import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import { authApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { Field, Input } from "../../components/Field";
import { Button } from "../../components/Button";
import { ErrorBanner, InfoBanner } from "../../components/Feedback";

interface ForgotPasswordForm {
  email: string;
}

// BACKOFFICE_FRONTEND_BLUEPRINT.md §5 / SUPEROFFICE_FRONTEND_BLUEPRINT.md §4 (added
// 2026-08-15): this endpoint always 204s regardless of whether the email matches an
// account, so the UI must never reveal which — and there's no real email delivery yet, so
// this screen is built ahead of that landing rather than in response to it working today.
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  });

  if (sent) {
    return (
      <div className="section-stack">
        <InfoBanner>
          <MailCheck size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
          If that email has an account, reset instructions are on their way.
        </InfoBanner>
        <Link to="/login" className="btn btn-secondary" style={{ width: "100%" }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="section-stack">
      <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
        Enter the email on your account and we'll send you a link to reset your password.
      </p>
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
      <Button type="submit" variant="primary" loading={isSubmitting} style={{ width: "100%", marginTop: 4 }}>
        Send reset link
      </Button>
      <Link to="/login" className="btn btn-ghost btn-sm" style={{ width: "fit-content", margin: "0 auto" }}>
        <ArrowLeft size={13} /> Back to sign in
      </Link>
    </form>
  );
}
