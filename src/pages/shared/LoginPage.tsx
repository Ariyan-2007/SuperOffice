import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import { Field, Input } from "../../components/Field";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/Feedback";

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
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

  return (
    <form onSubmit={onSubmit} className="section-stack">
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
    </form>
  );
}
