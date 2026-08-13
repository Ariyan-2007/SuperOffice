import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useAuth } from "../../auth/AuthContext";
import { CAN_EDIT_BUSINESS } from "../../routes/backofficeRoles";
import { applyBrandColor } from "../../theme/color";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Field, Input, Textarea } from "../../components/Field";
import { Button } from "../../components/Button";
import { PageLoader, InfoBanner } from "../../components/Feedback";
import { BusinessStatusBadge } from "../../components/Badge";
import { useToast } from "../../context/ToastContext";
import type { UpdateBusinessRequest } from "../../types/api";

export function BusinessProfilePage() {
  const businessId = useBusinessId();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canEdit = CAN_EDIT_BUSINESS.includes(user!.role);

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => businessApi.get(businessId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessRequest>();

  useEffect(() => {
    if (business) reset(business);
  }, [business, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateBusinessRequest) => businessApi.update(businessId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      applyBrandColor(updated.themeColor);
      notify("Business profile updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update profile.", "error"),
  });

  if (isLoading || !business) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Business profile"
        subtitle={`${business.slug} · ${business.currency}`}
        actions={<BusinessStatusBadge status={business.status} />}
      />

      {!canEdit && <InfoBanner>Only a Business admin can edit this profile. You have read-only access.</InfoBanner>}

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="section-stack">
            <div className="form-grid">
              <Field label="Business name" error={errors.name?.message}>
                <Input disabled={!canEdit} hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
              </Field>
              <Field label="Currency" error={errors.currency?.message}>
                <Input disabled={!canEdit} hasError={!!errors.currency} {...register("currency", { required: "Currency is required" })} />
              </Field>
              <Field label="Contact email" error={errors.contactEmail?.message}>
                <Input disabled={!canEdit} type="email" hasError={!!errors.contactEmail} {...register("contactEmail", { required: "Required" })} />
              </Field>
              <Field label="Contact phone" error={errors.contactPhone?.message}>
                <Input disabled={!canEdit} hasError={!!errors.contactPhone} {...register("contactPhone", { required: "Required" })} />
              </Field>
              <Field label="Theme color" hint="Hex value used to brand this deployment, e.g. #4338CA">
                <Input disabled={!canEdit} type="text" {...register("themeColor")} />
              </Field>
              <Field label="Logo URL" optional>
                <Input disabled={!canEdit} {...register("logoUrl")} />
              </Field>
              <Field label="Banner URL" optional className="span-2">
                <Input disabled={!canEdit} {...register("bannerUrl")} />
              </Field>
              <Field label="Description" className="span-2">
                <Textarea disabled={!canEdit} rows={4} {...register("description")} />
              </Field>
            </div>
            {canEdit && (
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => reset(business)} disabled={!isDirty}>
                  Discard
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>
                  Save changes
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
