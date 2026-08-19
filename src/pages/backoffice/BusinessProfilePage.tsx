import { useEffect, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
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
import { RemoteImage } from "../../components/RemoteImage";
import type { UpdateBusinessRequest } from "../../types/api";

interface ProfileForm {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  themeColor: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  defaultDeliveryFee: number;
}

interface PolicyForm {
  returnWindowDays: number;
  reviewsEnabled: boolean;
  autoPublishReviews: boolean;
  guestCheckoutEnabled: boolean;
}

interface TaxForm {
  enabled: boolean;
  defaultRatePercent: number;
  pricesIncludeTax: boolean;
  taxShipping: boolean;
  registrationNumber: string;
  displayName: string;
  classRates: { key: string; value: number }[];
}

interface InvoiceForm {
  numberPrefix: string;
  legalName: string;
  legalAddress: string;
  registrationNumber: string;
  footerNote: string;
}

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
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>();

  const currencyValue = watch("currency");
  const logoUrl = watch("logoUrl");
  const bannerUrl = watch("bannerUrl");
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => businessApi.uploadLogo(businessId, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      setValue("logoUrl", updated.logoUrl, { shouldDirty: true });
      notify("Logo uploaded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not upload logo.", "error"),
  });

  const uploadBannerMutation = useMutation({
    mutationFn: (file: File) => businessApi.uploadBanner(businessId, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      setValue("bannerUrl", updated.bannerUrl, { shouldDirty: true });
      notify("Banner uploaded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not upload banner.", "error"),
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

  const submitProfile = handleSubmit((values) =>
    mutation.mutate({
      name: values.name,
      description: values.description,
      logoUrl: values.logoUrl,
      bannerUrl: values.bannerUrl,
      themeColor: values.themeColor,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone,
      currency: values.currency,
      defaultDeliveryFee: values.defaultDeliveryFee,
    }),
  );

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
          <form onSubmit={submitProfile} className="section-stack">
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
              <Field label="Logo URL" optional hint={canEdit ? "Or upload a file (JPEG/PNG/WEBP/GIF, 5MB max)." : undefined}>
                <Input disabled={!canEdit} {...register("logoUrl")} placeholder="https://…" />
                {(logoUrl || canEdit) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    {logoUrl && (
                      <div style={{ position: "relative" }}>
                        <RemoteImage src={logoUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                        {canEdit && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setValue("logoUrl", "", { shouldDirty: true })}
                            style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20 }}
                            aria-label="Remove logo"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    )}
                    {canEdit && (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </Field>
              <Field label="Banner URL" optional className="span-2" hint={canEdit ? "Or upload a file (JPEG/PNG/WEBP/GIF, 5MB max)." : undefined}>
                <Input disabled={!canEdit} {...register("bannerUrl")} placeholder="https://…" />
                {(bannerUrl || canEdit) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    {bannerUrl && (
                      <div style={{ position: "relative" }}>
                        <RemoteImage src={bannerUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                        {canEdit && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setValue("bannerUrl", "", { shouldDirty: true })}
                            style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20 }}
                            aria-label="Remove banner"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    )}
                    {canEdit && (
                      <>
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
                      </>
                    )}
                  </div>
                )}
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

      <TaxCard businessId={businessId} business={business} canEdit={canEdit} />
      <InvoicingCard businessId={businessId} business={business} canEdit={canEdit} />
      <PoliciesCard businessId={businessId} business={business} canEdit={canEdit} />
    </div>
  );
}

function saveBusinessPatch(businessId: string, business: Awaited<ReturnType<typeof businessApi.get>>, patch: Partial<UpdateBusinessRequest>) {
  return businessApi.update(businessId, {
    name: business.name,
    description: business.description,
    logoUrl: business.logoUrl,
    bannerUrl: business.bannerUrl,
    themeColor: business.themeColor,
    contactEmail: business.contactEmail,
    contactPhone: business.contactPhone,
    currency: business.currency,
    defaultDeliveryFee: business.defaultDeliveryFee,
    ...patch,
  });
}

function TaxCard({ businessId, business, canEdit }: { businessId: string; business: Awaited<ReturnType<typeof businessApi.get>>; canEdit: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isDirty, isSubmitting },
  } = useForm<TaxForm>({
    defaultValues: {
      enabled: business.tax.enabled,
      defaultRatePercent: business.tax.defaultRatePercent,
      pricesIncludeTax: business.tax.pricesIncludeTax,
      taxShipping: business.tax.taxShipping,
      registrationNumber: business.tax.registrationNumber,
      displayName: business.tax.displayName,
      classRates: Object.entries(business.tax.classRates).map(([key, value]) => ({ key, value })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "classRates" });

  const mutation = useMutation({
    mutationFn: (values: TaxForm) =>
      saveBusinessPatch(businessId, business, {
        tax: {
          enabled: values.enabled,
          defaultRatePercent: values.defaultRatePercent,
          pricesIncludeTax: values.pricesIncludeTax,
          taxShipping: values.taxShipping,
          registrationNumber: values.registrationNumber,
          displayName: values.displayName,
          classRates: Object.fromEntries(values.classRates.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])),
        },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      notify("Tax settings updated.", "success");
      reset({
        enabled: updated.tax.enabled,
        defaultRatePercent: updated.tax.defaultRatePercent,
        pricesIncludeTax: updated.tax.pricesIncludeTax,
        taxShipping: updated.tax.taxShipping,
        registrationNumber: updated.tax.registrationNumber,
        displayName: updated.tax.displayName,
        classRates: Object.entries(updated.tax.classRates).map(([key, value]) => ({ key, value })),
      });
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update tax settings.", "error"),
  });

  return (
    <Card>
      <CardHeader title="Tax" />
      <CardBody>
        <form className="section-stack" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <label className="checkbox-row" style={{ height: 38 }}>
            <input type="checkbox" disabled={!canEdit} {...register("enabled")} /> Collect tax on orders
          </label>
          <div className="form-grid">
            <Field label="Default Rate (%)">
              <Input disabled={!canEdit} type="number" step="0.01" min="0" {...register("defaultRatePercent", { valueAsNumber: true })} />
            </Field>
            <Field label="Display Name" hint='e.g. "VAT", "GST", "Sales Tax"'>
              <Input disabled={!canEdit} {...register("displayName")} />
            </Field>
            <Field label="Registration Number" optional hint="Printed on invoices">
              <Input disabled={!canEdit} {...register("registrationNumber")} />
            </Field>
          </div>
          <Field label="" hint="This determines whether catalog prices already contain tax, or tax is added at checkout — getting it backwards over- or under-charges every customer.">
            <label className="checkbox-row" style={{ height: 38 }}>
              <input type="checkbox" disabled={!canEdit} {...register("pricesIncludeTax")} /> My prices already include tax
            </label>
          </Field>
          <label className="checkbox-row" style={{ height: 38 }}>
            <input type="checkbox" disabled={!canEdit} {...register("taxShipping")} /> Also tax the delivery fee
          </label>

          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>
              Per-class rates <span className="optional">(overrides the default rate for a product's Tax Class — see Products)</span>
            </div>
            <div className="section-stack" style={{ gap: 8 }}>
              {fields.map((field, index) => (
                <div key={field.id} className="form-grid" style={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "end" }}>
                  <Field label="Tax Class">
                    <Input disabled={!canEdit} {...register(`classRates.${index}.key` as const)} placeholder="e.g. reduced" />
                  </Field>
                  <Field label="Rate (%)">
                    <Input disabled={!canEdit} type="number" step="0.01" min="0" {...register(`classRates.${index}.value` as const, { valueAsNumber: true })} />
                  </Field>
                  {canEdit && (
                    <Button type="button" variant="ghost" onClick={() => remove(index)} style={{ color: "var(--danger)" }}>
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              ))}
              {canEdit && (
                <Button type="button" variant="secondary" size="sm" onClick={() => append({ key: "", value: 0 })} style={{ width: "fit-content" }}>
                  <Plus size={13} /> Add class rate
                </Button>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty}>Discard</Button>
              <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>Save changes</Button>
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

// The real API never echoes `invoicing` back on BusinessResponse — it's write-only (verified
// against the live OpenAPI spec, not just the blueprint's abbreviated type block). So this form
// can't be pre-filled with "current" values; it always starts blank and just re-sends whatever
// was last entered, same as any other one-way settings write.
function InvoicingCard({ businessId, business, canEdit }: { businessId: string; business: Awaited<ReturnType<typeof businessApi.get>>; canEdit: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<InvoiceForm>({
    defaultValues: { numberPrefix: "INV-", legalName: "", legalAddress: "", registrationNumber: "", footerNote: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: InvoiceForm) => saveBusinessPatch(businessId, business, { invoicing: { ...values, lastNumber: 0 } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      notify("Invoicing settings updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update invoicing settings.", "error"),
  });

  return (
    <Card>
      <CardHeader title="Invoicing" />
      <CardBody>
        <InfoBanner>These values aren't returned by the API once saved — re-enter them here any time you need to change something.</InfoBanner>
        <form className="section-stack" style={{ marginTop: 16 }} onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <div className="form-grid">
            <Field label="Invoice Number Prefix">
              <Input disabled={!canEdit} {...register("numberPrefix")} placeholder="INV-" />
            </Field>
            <Field label="Seller Legal Name">
              <Input disabled={!canEdit} {...register("legalName")} />
            </Field>
            <Field label="Registration Number" optional>
              <Input disabled={!canEdit} {...register("registrationNumber")} />
            </Field>
            <Field label="Seller Legal Address" className="span-2">
              <Textarea disabled={!canEdit} rows={2} {...register("legalAddress")} />
            </Field>
            <Field label="Footer Note" optional className="span-2">
              <Textarea disabled={!canEdit} rows={2} {...register("footerNote")} />
            </Field>
          </div>
          {canEdit && (
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty}>Discard</Button>
              <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>Save changes</Button>
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

function PoliciesCard({ businessId, business, canEdit }: { businessId: string; business: Awaited<ReturnType<typeof businessApi.get>>; canEdit: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<PolicyForm>({
    defaultValues: {
      returnWindowDays: business.returnWindowDays,
      reviewsEnabled: business.reviewsEnabled,
      autoPublishReviews: false,
      guestCheckoutEnabled: business.guestCheckoutEnabled,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PolicyForm) =>
      saveBusinessPatch(businessId, business, {
        returnWindowDays: values.returnWindowDays,
        reviewsEnabled: values.reviewsEnabled,
        autoPublishReviews: values.autoPublishReviews,
        guestCheckoutEnabled: values.guestCheckoutEnabled,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business", businessId], updated);
      notify("Storefront policies updated.", "success");
      reset({ returnWindowDays: updated.returnWindowDays, reviewsEnabled: updated.reviewsEnabled, autoPublishReviews: false, guestCheckoutEnabled: updated.guestCheckoutEnabled });
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update storefront policies.", "error"),
  });

  return (
    <Card>
      <CardHeader title="Storefront Policies" />
      <CardBody>
        <form className="section-stack" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <div className="form-grid">
            <Field label="Return Window (days)" hint="0 disables returns entirely">
              <Input disabled={!canEdit} type="number" min="0" {...register("returnWindowDays", { valueAsNumber: true, min: 0 })} />
            </Field>
          </div>
          <label className="checkbox-row" style={{ height: 38 }}>
            <input type="checkbox" disabled={!canEdit} {...register("reviewsEnabled")} /> Allow customer reviews
          </label>
          <label className="checkbox-row" style={{ height: 38 }}>
            <input type="checkbox" disabled={!canEdit} {...register("autoPublishReviews")} /> Auto-publish reviews (skip the moderation queue)
          </label>
          <label className="checkbox-row" style={{ height: 38 }}>
            <input type="checkbox" disabled={!canEdit} {...register("guestCheckoutEnabled")} /> Allow guest checkout
          </label>
          {canEdit && (
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty}>Discard</Button>
              <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>Save changes</Button>
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
