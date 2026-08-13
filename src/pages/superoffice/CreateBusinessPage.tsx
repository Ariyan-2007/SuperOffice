import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { superOfficeBusinessApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/StatCard";
import { Card } from "../../components/Card";
import { Field, Input, Textarea } from "../../components/Field";
import { CurrencyInput } from "../../components/CurrencyInput";
import { Button } from "../../components/Button";
import { useToast } from "../../context/ToastContext";
import { formatCurrencyLabel } from "../../lib/currencies";
import type { CreateBusinessRequest } from "../../types/api";

interface CreateBusinessForm {
  name: string;
  slug: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
}

export function CreateBusinessPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessForm>({ defaultValues: { currency: "USD" } });

  const currencyValue = watch("currency");

  const mutation = useMutation({
    mutationFn: (data: CreateBusinessRequest) => superOfficeBusinessApi.create(data),
    onSuccess: (business) => {
      queryClient.invalidateQueries({ queryKey: ["so-businesses"] });
      notify("Business created.", "success");
      navigate(`/businesses/${business.id}`);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create Business.", "error"),
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      name: values.name,
      slug: values.slug.trim() || null,
      description: values.description,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone,
      currency: values.currency || undefined,
    });
  });

  return (
    <div className="section-stack">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")} style={{ width: "fit-content" }}>
        <ArrowLeft size={13} /> Back to businesses
      </button>
      <PageHeader title="New Business" subtitle="Creates a new storefront under your Tenant." />

      <Card padded>
        <form onSubmit={onSubmit} className="section-stack">
          <div className="form-grid">
            <Field label="Business Name" error={errors.name?.message}>
              <Input hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
            </Field>
            <Field label="Slug" optional hint="Leave blank to auto-generate from the name">
              <Input {...register("slug")} placeholder="antivaly" />
            </Field>
            <Field label="Contact Email" error={errors.contactEmail?.message}>
              <Input type="email" hasError={!!errors.contactEmail} {...register("contactEmail", { required: "Required" })} />
            </Field>
            <Field label="Contact Phone" error={errors.contactPhone?.message}>
              <Input hasError={!!errors.contactPhone} {...register("contactPhone", { required: "Required" })} />
            </Field>
            <Field label="Currency" hint={currencyValue ? formatCurrencyLabel(currencyValue) : undefined}>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <CurrencyInput value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </Field>
            <Field label="Description" className="span-2">
              <Textarea rows={4} {...register("description")} />
            </Field>
          </div>
          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending}>
              Create business
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
