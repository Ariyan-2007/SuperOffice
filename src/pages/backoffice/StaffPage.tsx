import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldOff, ShieldCheck, UserCog } from "lucide-react";
import { staffApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { UserStatusBadge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import type { CreateStaffRequest, UserSummaryResponse } from "../../types/api";

export function StaffPage() {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: staff, isLoading } = useQuery({ queryKey: ["staff", businessId], queryFn: () => staffApi.list(businessId) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffRequest) => staffApi.create(businessId, data),
    onSuccess: () => {
      invalidate();
      notify("Account created.", "success");
      setCreating(false);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create account.", "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserSummaryResponse["status"] }) => staffApi.setStatus(businessId, id, status),
    onSuccess: () => {
      invalidate();
      notify("Status updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update status.", "error"),
  });

  const columns: Column<UserSummaryResponse>[] = [
    { key: "name", header: "Name", render: (u) => <span style={{ fontWeight: 600 }}>{u.fullName}</span> },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "role", header: "Role", render: (u) => u.role.replace("Business", "") },
    { key: "status", header: "Status", render: (u) => <UserStatusBadge status={u.status} /> },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {u.status !== "Blocked" ? (
            <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: u.id, status: "Blocked" })} style={{ color: "var(--danger)" }}>
              <ShieldOff size={13} /> Block
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: u.id, status: "Active" })}>
              <ShieldCheck size={13} /> Unblock
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Staff"
        subtitle="Business admins, staff and delivery agents with access to this shop."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={14} /> New account
          </Button>
        }
      />

      {staff && staff.length === 0 ? (
        <EmptyState icon={UserCog} title="No Staff Accounts Yet" description="Invite your team to help run this shop." />
      ) : (
        <DataTable columns={columns} rows={staff ?? []} rowKey={(u) => u.id} />
      )}

      {creating && (
        <StaffModal
          onClose={() => setCreating(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function StaffModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: CreateStaffRequest) => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStaffRequest>({ defaultValues: { role: "BusinessStaff" } });

  return (
    <Modal
      open
      onClose={onClose}
      title="New Staff Account"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit(onSubmit)}>Create account</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Full Name" error={errors.fullName?.message}>
          <Input hasError={!!errors.fullName} {...register("fullName", { required: "Full name is required" })} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" hasError={!!errors.email} {...register("email", { required: "Email is required" })} />
        </Field>
        <Field label="Password" hint="Temporary password — they can change it later." error={errors.password?.message}>
          <Input type="password" hasError={!!errors.password} {...register("password", { required: "Password is required", minLength: { value: 8, message: "At least 8 characters" } })} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="Role">
          <Select {...register("role", { required: true })}>
            <option value="BusinessAdmin">Business admin</option>
            <option value="BusinessStaff">Business staff</option>
            <option value="DeliveryAgent">Delivery agent</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
