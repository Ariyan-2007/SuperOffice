import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { superOfficeBusinessApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Field, Input, Textarea } from "../../components/Field";
import { Button } from "../../components/Button";
import { PageLoader } from "../../components/Feedback";
import { BusinessStatusBadge } from "../../components/Badge";
import { ConfirmDialog } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessRequest>();

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

  if (isLoading || !business) return <PageLoader />;

  const toggleTarget: BusinessStatus = business.status === "Suspended" ? "Active" : "Suspended";

  return (
    <div className="section-stack">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")} style={{ width: "fit-content" }}>
        <ArrowLeft size={13} /> Back to businesses
      </button>

      <PageHeader
        title={business.name}
        subtitle={`${business.slug} · ${business.currency}`}
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
              <Field label="Business name" error={errors.name?.message}>
                <Input hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
              </Field>
              <Field label="Currency" error={errors.currency?.message}>
                <Input hasError={!!errors.currency} {...register("currency", { required: "Currency is required" })} />
              </Field>
              <Field label="Contact email" error={errors.contactEmail?.message}>
                <Input type="email" hasError={!!errors.contactEmail} {...register("contactEmail", { required: "Required" })} />
              </Field>
              <Field label="Contact phone" error={errors.contactPhone?.message}>
                <Input hasError={!!errors.contactPhone} {...register("contactPhone", { required: "Required" })} />
              </Field>
              <Field label="Theme color" hint="Hex value used to brand this Business's BackOffice/Shop">
                <Input {...register("themeColor")} />
              </Field>
              <Field label="Logo URL" optional>
                <Input {...register("logoUrl")} />
              </Field>
              <Field label="Banner URL" optional className="span-2">
                <Input {...register("bannerUrl")} />
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

      <ConfirmDialog
        open={!!confirmingStatus}
        title={confirmingStatus === "Suspended" ? "Suspend business" : "Activate business"}
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
