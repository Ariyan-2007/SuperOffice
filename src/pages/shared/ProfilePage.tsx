import { useForm } from "react-hook-form";
import { useAuth } from "../../auth/AuthContext";
import { authApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Field, Input } from "../../components/Field";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/StatCard";
import { UserStatusBadge } from "../../components/Badge";
import { useToast } from "../../context/ToastContext";

interface ProfileForm {
  fullName: string;
  phone: string;
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { notify } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({ defaultValues: { fullName: user?.fullName ?? "", phone: "" } });

  if (!user) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.updateMe(values);
      await refreshUser();
      notify("Profile updated.", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not update profile.", "error");
    }
  });

  return (
    <div className="section-stack">
      <PageHeader title="My Profile" subtitle="Your account details for this login." />

      <Card>
        <CardHeader title="Account" />
        <CardBody>
          <dl className="kv-grid">
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Role</dt>
            <dd>{user.role}</dd>
            <dt>Status</dt>
            <dd>
              <UserStatusBadge status={user.status} />
            </dd>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Edit Profile" />
        <CardBody>
          <form onSubmit={onSubmit} className="section-stack">
            <div className="form-grid">
              <Field label="Full Name" error={errors.fullName?.message}>
                <Input hasError={!!errors.fullName} {...register("fullName", { required: "Full name is required" })} />
              </Field>
              <Field label="Phone" optional>
                <Input {...register("phone")} />
              </Field>
            </div>
            <div className="form-actions">
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
