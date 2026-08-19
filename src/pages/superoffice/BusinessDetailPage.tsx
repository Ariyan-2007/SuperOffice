import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CheckCircle2, Globe, ImagePlus, Mail, X } from "lucide-react";
import { businessApi, mailSettingsApi, superOfficeBusinessApi } from "../../api/endpoints";
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
import { RemoteImage } from "../../components/RemoteImage";
import { useToast } from "../../context/ToastContext";
import { formatCurrencyLabel } from "../../lib/currencies";
import type { BusinessResponse, BusinessStatus, UpdateBusinessDomainsRequest, UpdateBusinessMailSettingsRequest, UpdateBusinessRequest } from "../../types/api";

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
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessRequest>();

  const currencyValue = watch("currency");
  const logoUrl = watch("logoUrl");
  const bannerUrl = watch("bannerUrl");
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => businessApi.uploadLogo(businessId, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business", businessId], updated);
      setValue("logoUrl", updated.logoUrl, { shouldDirty: true });
      notify("Logo uploaded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not upload logo.", "error"),
  });

  const uploadBannerMutation = useMutation({
    mutationFn: (file: File) => businessApi.uploadBanner(businessId, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business", businessId], updated);
      setValue("bannerUrl", updated.bannerUrl, { shouldDirty: true });
      notify("Banner uploaded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not upload banner.", "error"),
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
              <Field label="Logo URL" optional hint="Or upload a file (JPEG/PNG/WEBP/GIF, 5MB max).">
                <Input {...register("logoUrl")} placeholder="https://…" />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  {logoUrl && (
                    <div style={{ position: "relative" }}>
                      <RemoteImage src={logoUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setValue("logoUrl", "", { shouldDirty: true })}
                        style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20 }}
                        aria-label="Remove logo"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) uploadLogoMutation.mutate(file);
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" loading={uploadLogoMutation.isPending} onClick={() => logoFileInputRef.current?.click()}>
                    <ImagePlus size={13} /> Upload logo
                  </Button>
                </div>
              </Field>
              <Field label="Banner URL" optional className="span-2" hint="Or upload a file (JPEG/PNG/WEBP/GIF, 5MB max).">
                <Input {...register("bannerUrl")} placeholder="https://…" />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  {bannerUrl && (
                    <div style={{ position: "relative" }}>
                      <RemoteImage src={bannerUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setValue("bannerUrl", "", { shouldDirty: true })}
                        style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20 }}
                        aria-label="Remove banner"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) uploadBannerMutation.mutate(file);
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" loading={uploadBannerMutation.isPending} onClick={() => bannerFileInputRef.current?.click()}>
                    <ImagePlus size={13} /> Upload banner
                  </Button>
                </div>
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

      <DomainsCard business={business} />

      <MailSettingsCard businessId={businessId} />

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

function DomainsCard({ business }: { business: BusinessResponse }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessDomainsRequest>({
    defaultValues: { shopDomain: business.shopDomain, backOfficeDomain: business.backOfficeDomain },
  });

  useEffect(() => {
    reset({ shopDomain: business.shopDomain, backOfficeDomain: business.backOfficeDomain });
  }, [business.shopDomain, business.backOfficeDomain, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusinessDomainsRequest) =>
      superOfficeBusinessApi.setDomains(business.id, {
        shopDomain: data.shopDomain?.trim() || null,
        backOfficeDomain: data.backOfficeDomain?.trim() || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business", business.id], updated);
      queryClient.invalidateQueries({ queryKey: ["so-businesses"] });
      notify("Domains saved.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not save domains.", "error"),
  });

  return (
    <Card>
      <CardHeader title={<><Globe size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Domains</>} />
      <CardBody>
        <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
          Not a routing/DNS/TLS feature yet — pointing an actual domain's DNS at Vastora is still open
          infrastructure work. Setting these controls what outbound email links resolve to and which
          address a password-reset link is allowed to redirect back to. Safe to leave both unset.
        </p>
        <form
          onSubmit={handleSubmit((v) => updateMutation.mutate(v))}
          className="section-stack"
        >
          <div className="form-grid">
            <Field
              label="Shop Domain"
              optional
              error={errors.shopDomain?.message}
              hint="This Business's customer-facing Shop address, e.g. shop.antivaly.com"
            >
              <Input hasError={!!errors.shopDomain} placeholder="shop.example.com" {...register("shopDomain")} />
            </Field>
            <Field
              label="BackOffice Domain"
              optional
              error={errors.backOfficeDomain?.message}
              hint="Where this Business's own staff sign in, e.g. staff.antivaly.com"
            >
              <Input hasError={!!errors.backOfficeDomain} placeholder="staff.example.com" {...register("backOfficeDomain")} />
            </Field>
          </div>
          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset({ shopDomain: business.shopDomain, backOfficeDomain: business.backOfficeDomain })}
              disabled={!isDirty}
            >
              Discard
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting || updateMutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function MailSettingsCard({ businessId }: { businessId: string }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const { data: mailSettings, isLoading } = useQuery({
    queryKey: ["so-business-mail", businessId],
    queryFn: () => mailSettingsApi.get(businessId),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessMailSettingsRequest>();

  const enabled = watch("enabled");

  useEffect(() => {
    if (mailSettings) reset({ ...mailSettings, password: null });
  }, [mailSettings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusinessMailSettingsRequest) => mailSettingsApi.update(businessId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["so-business-mail", businessId], updated);
      notify("Mail settings saved.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not save mail settings.", "error"),
  });

  if (isLoading || !mailSettings) return null;

  return (
    <Card>
      <CardHeader title={<><Mail size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Email</>} />
      <CardBody>
        <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
          Every email addressed to this Business's world — customers, staff, delivery agents — sends through this
          SMTP account once enabled. Leaving it off is a safe default: mail silently falls back to the platform's
          own account instead.
        </p>
        <form onSubmit={handleSubmit((v) => updateMutation.mutate({ ...v, password: v.password || null }))} className="section-stack">
          <label className="checkbox-row" style={{ height: 38 }}>
            <input type="checkbox" {...register("enabled")} />
            Send this Business's email through its own SMTP account
          </label>
          <div className="form-grid">
            <Field label="SMTP Host" error={errors.host?.message}>
              <Input hasError={!!errors.host} placeholder="smtp.example.com" {...register("host", { required: enabled ? "Host is required" : false })} />
            </Field>
            <Field label="Port" error={errors.port?.message}>
              <Input type="number" hasError={!!errors.port} {...register("port", { valueAsNumber: true, required: enabled ? "Port is required" : false, min: 1, max: 65535 })} />
            </Field>
            <Field label="Username" error={errors.username?.message}>
              <Input hasError={!!errors.username} {...register("username", { required: enabled ? "Username is required" : false })} />
            </Field>
            <Field
              label="Password"
              optional
              hint={mailSettings.hasPassword ? "A password is on file — leave blank to keep it unchanged." : "No password on file yet."}
            >
              <Input type="password" autoComplete="new-password" placeholder={mailSettings.hasPassword ? "••••••••" : ""} {...register("password")} />
            </Field>
            <Field label="From Address" error={errors.fromAddress?.message}>
              <Input
                type="email"
                hasError={!!errors.fromAddress}
                placeholder="orders@example.com"
                {...register("fromAddress", { required: enabled ? "From address is required" : false })}
              />
            </Field>
            <Field label="From Name" error={errors.fromName?.message}>
              <Input hasError={!!errors.fromName} placeholder={mailSettings.fromName || "e.g. Business Name"} {...register("fromName")} />
            </Field>
          </div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => reset({ ...mailSettings, password: null })} disabled={!isDirty}>
              Discard
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting || updateMutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
