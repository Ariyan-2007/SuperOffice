import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { couponApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatMoney, toDatetimeLocalValue } from "../../lib/format";
import type { CouponResponse, CreateCouponRequest, DiscountType, UpdateCouponRequest } from "../../types/api";

interface CouponForm {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  isActive: "true" | "false";
}

export function CouponsPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CouponResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<CouponResponse | null>(null);

  const { data: coupons, isLoading } = useQuery({ queryKey: ["coupons", businessId], queryFn: () => couponApi.list(businessId) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["coupons", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CreateCouponRequest) => couponApi.create(businessId, data),
    onSuccess: () => {
      invalidate();
      notify("Coupon created.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create coupon.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCouponRequest }) => couponApi.update(businessId, id, data),
    onSuccess: () => {
      invalidate();
      notify("Coupon updated.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update coupon.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponApi.remove(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Coupon deleted.", "success");
      setDeleting(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete coupon.", "error"),
  });

  const columns: Column<CouponResponse>[] = [
    { key: "code", header: "Code", render: (c) => <span className="cell-mono" style={{ fontWeight: 650 }}>{c.code}</span> },
    {
      key: "discount",
      header: "Discount",
      render: (c) => (c.discountType === "Percentage" ? `${c.discountValue}%` : formatMoney(c.discountValue, business?.currency ?? "USD")),
    },
    { key: "uses", header: "Uses", render: (c) => `${c.usedCount}${c.maxUses ? ` / ${c.maxUses}` : ""}` },
    { key: "expires", header: "Expires", render: (c) => formatDate(c.expiresAt) },
    {
      key: "status",
      header: "Status",
      render: (c) => {
        const expired = new Date(c.expiresAt) < new Date();
        return <Badge tone={!c.isActive ? "neutral" : expired ? "danger" : "success"}>{!c.isActive ? "Inactive" : expired ? "Expired" : "Active"}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
            <Pencil size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} style={{ color: "var(--danger)" }}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Coupons"
        subtitle="Codes are always stored uppercase — shown here exactly as customers must type them."
        actions={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus size={14} /> New coupon
          </Button>
        }
      />

      {coupons && coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" description="Create a discount code for customers to use at checkout." />
      ) : (
        <DataTable columns={columns} rows={coupons ?? []} rowKey={(c) => c.id} />
      )}

      {editing && (
        <CouponModal
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete coupon"
        description={<>Delete <strong>{deleting?.code}</strong>? This can't be undone.</>}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function CouponModal({
  coupon,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  coupon: CouponResponse | null;
  onClose: () => void;
  onCreate: (data: CreateCouponRequest) => void;
  onUpdate: (id: string, data: UpdateCouponRequest) => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponForm>({
    defaultValues: coupon
      ? {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : "",
          maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
          startsAt: toDatetimeLocalValue(coupon.startsAt),
          expiresAt: toDatetimeLocalValue(coupon.expiresAt),
          isActive: coupon.isActive ? "true" : "false",
        }
      : {
          code: "",
          discountType: "Percentage",
          discountValue: 10,
          minOrderAmount: "",
          maxUses: "",
          startsAt: toDatetimeLocalValue(new Date().toISOString()),
          expiresAt: "",
          isActive: "true",
        },
  });

  const submit = handleSubmit((values) => {
    const minOrderAmount = values.minOrderAmount.trim() === "" ? null : Number(values.minOrderAmount);
    const maxUses = values.maxUses.trim() === "" ? null : Number(values.maxUses);
    const startsAt = new Date(values.startsAt).toISOString();
    const expiresAt = new Date(values.expiresAt).toISOString();

    if (coupon) {
      onUpdate(coupon.id, { isActive: values.isActive === "true", expiresAt, maxUses });
    } else {
      onCreate({
        code: values.code.trim().toUpperCase(),
        discountType: values.discountType,
        discountValue: values.discountValue,
        minOrderAmount,
        maxUses,
        startsAt,
        expiresAt,
      });
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={coupon ? "Edit coupon" : "New coupon"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>{coupon ? "Save changes" : "Create coupon"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <Field label="Code" error={errors.code?.message} hint={coupon ? undefined : "Will be stored uppercase"}>
          <Input disabled={!!coupon} hasError={!!errors.code} {...register("code", { required: "Code is required" })} />
        </Field>
        <div className="form-grid">
          <Field label="Discount type">
            <Select disabled={!!coupon} {...register("discountType")}>
              <option value="Percentage">Percentage</option>
              <option value="FixedAmount">Fixed amount</option>
            </Select>
          </Field>
          <Field label="Discount value">
            <Input disabled={!!coupon} type="number" min="0" step="0.01" {...register("discountValue", { valueAsNumber: true, min: 0 })} />
          </Field>
          <Field label="Minimum order amount" optional>
            <Input disabled={!!coupon} type="number" min="0" step="0.01" {...register("minOrderAmount")} />
          </Field>
          <Field label="Max uses" optional>
            <Input type="number" min="0" {...register("maxUses")} />
          </Field>
          <Field label="Starts at">
            <Input disabled={!!coupon} type="datetime-local" {...register("startsAt", { required: true })} />
          </Field>
          <Field label="Expires at">
            <Input type="datetime-local" {...register("expiresAt", { required: true })} />
          </Field>
        </div>
        {coupon && (
          <Field label="Status">
            <Select {...register("isActive")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}
