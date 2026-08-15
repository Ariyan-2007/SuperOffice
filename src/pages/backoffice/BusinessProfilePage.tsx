import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { ColorInput } from "../../components/ColorPicker";
import { CurrencyInput } from "../../components/CurrencyInput";
import { Button } from "../../components/Button";
import { PageLoader, InfoBanner } from "../../components/Feedback";
import { BusinessStatusBadge } from "../../components/Badge";
import { useToast } from "../../context/ToastContext";
import { formatCurrencyLabel } from "../../lib/currencies";
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
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessRequest>();

  const currencyValue = watch("currency");

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

  const deliveryModuleMutation = useMutation({
    mutationFn: (enabled: boolean) => businessApi.setDeliveryModule(businessId, enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      notify(updated.deliveryModuleEnabled ? "Delivery module enabled." : "Delivery module disabled.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update the delivery module.", "error"),
  });

  if (isLoading || !business) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Business Profile"
        subtitle={`${business.slug} · ${formatCurrencyLabel(business.currency)}`}
        actions={<BusinessStatusBadge status={business.status} />}
      />

      {!canEdit && <InfoBanner>Only a Business admin can edit this profile. You have read-only access.</InfoBanner>}

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="section-stack">
            <div className="form-grid">
              <Field label="Business Name" error={errors.name?.message}>
                <Input disabled={!canEdit} hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
              </Field>
              <Field
                label="Currency"
                error={errors.currency?.message}
                hint={!errors.currency && currencyValue ? formatCurrencyLabel(currencyValue) : undefined}
              >
                <Controller
                  control={control}
                  name="currency"
                  rules={{ required: "Currency is required" }}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={!canEdit}
                      hasError={!!errors.currency}
                    />
                  )}
                />
              </Field>
              <Field label="Contact Email" error={errors.contactEmail?.message}>
                <Input disabled={!canEdit} type="email" hasError={!!errors.contactEmail} {...register("contactEmail", { required: "Required" })} />
              </Field>
              <Field label="Contact Phone" error={errors.contactPhone?.message}>
                <Input disabled={!canEdit} hasError={!!errors.contactPhone} {...register("contactPhone", { required: "Required" })} />
              </Field>
              <Field label="Theme Color" hint="Pick a color or paste a hex value, e.g. #4338CA">
                <Controller
                  control={control}
                  name="themeColor"
                  render={({ field }) => (
                    <ColorInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={!canEdit}
                    />
                  )}
                />
              </Field>
              <Field label="Logo URL" optional>
                <Input disabled={!canEdit} {...register("logoUrl")} />
              </Field>
              <Field label="Banner URL" optional className="span-2">
                <Input disabled={!canEdit} {...register("bannerUrl")} />
              </Field>
              <Field
                label="Default Delivery Fee"
                hint="Flat fee the Shop falls back to at checkout when a delivery fee isn't otherwise specified."
              >
                <Input
                  disabled={!canEdit}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("defaultDeliveryFee", { valueAsNumber: true, min: 0 })}
                />
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

      <Card>
        <CardHeader title="Delivery" />
        <CardBody>
          <label className="checkbox-row" style={{ height: 38 }}>
            <input
              type="checkbox"
              checked={business.deliveryModuleEnabled}
              disabled={!canEdit || deliveryModuleMutation.isPending}
              onChange={(e) => deliveryModuleMutation.mutate(e.target.checked)}
            />
            Delivery agent workflow enabled
          </label>
          <p className="text-muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.6 }}>
            Turn this off for pickup-only shops or ones using a third-party courier. Existing delivery agents and
            any order already assigned to one are unaffected — this only blocks adding new delivery agents and
            assigning new deliveries.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
