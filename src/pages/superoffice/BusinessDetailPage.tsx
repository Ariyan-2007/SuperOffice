import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { businessApi, superOfficeBusinessApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Field, Input, Textarea } from "../../components/Field";
import { ColorInput } from "../../components/ColorPicker";
import { CurrencyInput } from "../../components/CurrencyInput";
import { Button } from "../../components/Button";
import { PageLoader } from "../../components/Feedback";
import { BusinessStatusBadge } from "../../components/Badge";
import { ConfirmDialog } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { formatCurrencyLabel } from "../../lib/currencies";
import type { BusinessStatus, UpdateBusinessRequest } from "../../types/api";

export function BusinessDetailPage() {
  const { businessId = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [confirmingStatus, setConfirmingStatus] = useState<BusinessStatus | null>(null);

  const { data: business, isLoading } = useQuery({
    queryKey: ["so-business", businessId],
    queryFn: () => superOfficeBusinessApi.get(businessId),
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

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusinessRequest) => superOfficeBusinessApi.update(businessId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business", businessId], updated);
      queryClient.invalidateQueries({ queryKey: ["so-businesses"] });
      notify("Business updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update Business.", "error"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: BusinessStatus) => superOfficeBusinessApi.setStatus(businessId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business", businessId], updated);
      queryClient.invalidateQueries({ queryKey: ["so-businesses"] });
      notify(`Business is now ${updated.status}.`, "success");
      setConfirmingStatus(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not change status.", "error"),
  });

  const deliveryModuleMutation = useMutation({
    mutationFn: (enabled: boolean) => businessApi.setDeliveryModule(businessId, enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business", businessId], updated);
      queryClient.invalidateQueries({ queryKey: ["so-businesses"] });
      notify(updated.deliveryModuleEnabled ? "Delivery module enabled." : "Delivery module disabled.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update the delivery module.", "error"),
  });

  if (isLoading || !business) return <PageLoader />;

  const toggleTarget: BusinessStatus = business.status === "Suspended" ? "Active" : "Suspended";

  return (
    <div className="section-stack">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")} style={{ width: "fit-content" }}>
        <ArrowLeft size={13} /> Back to businesses
      </button>

      <PageHeader
        title={business.name}
        subtitle={`${business.slug} · ${formatCurrencyLabel(business.currency)}`}
        actions={
          <>
            <BusinessStatusBadge status={business.status} />
            <Button
              variant={toggleTarget === "Suspended" ? "danger" : "secondary"}
              onClick={() => setConfirmingStatus(toggleTarget)}
            >
              {toggleTarget === "Suspended" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
              {toggleTarget === "Suspended" ? "Suspend" : "Activate"}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="section-stack">
            <div className="form-grid">
              <Field label="Business Name" error={errors.name?.message}>
                <Input hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
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
                      hasError={!!errors.currency}
                    />
                  )}
                />
              </Field>
              <Field label="Contact Email" error={errors.contactEmail?.message}>
                <Input type="email" hasError={!!errors.contactEmail} {...register("contactEmail", { required: "Required" })} />
              </Field>
              <Field label="Contact Phone" error={errors.contactPhone?.message}>
                <Input hasError={!!errors.contactPhone} {...register("contactPhone", { required: "Required" })} />
              </Field>
              <Field label="Theme Color" hint="Pick a color or paste a hex value used to brand this Business's BackOffice/Shop">
                <Controller
                  control={control}
                  name="themeColor"
                  render={({ field }) => (
                    <ColorInput value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
              </Field>
              <Field label="Logo URL" optional>
                <Input {...register("logoUrl")} />
              </Field>
              <Field label="Banner URL" optional className="span-2">
                <Input {...register("bannerUrl")} />
              </Field>
              <Field
                label="Default Delivery Fee"
                hint="Flat fee the Shop falls back to at checkout when a delivery fee isn't otherwise specified."
              >
                <Input type="number" step="0.01" min="0" {...register("defaultDeliveryFee", { valueAsNumber: true, min: 0 })} />
              </Field>
              <Field label="Description" className="span-2">
                <Textarea rows={4} {...register("description")} />
              </Field>
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => reset(business)} disabled={!isDirty}>
                Discard
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting || updateMutation.isPending} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
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
              disabled={deliveryModuleMutation.isPending}
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

      <ConfirmDialog
        open={!!confirmingStatus}
        title={confirmingStatus === "Suspended" ? "Suspend Business" : "Activate Business"}
        description={
          confirmingStatus === "Suspended"
            ? "Suspending hides this Business's Shop and blocks its BackOffice logins. You can reactivate it anytime."
            : "This makes the Business's Shop and BackOffice accessible again."
        }
        confirmLabel={confirmingStatus === "Suspended" ? "Suspend" : "Activate"}
        danger={confirmingStatus === "Suspended"}
        loading={statusMutation.isPending}
        onConfirm={() => confirmingStatus && statusMutation.mutate(confirmingStatus)}
        onCancel={() => setConfirmingStatus(null)}
      />
    </div>
  );
}
