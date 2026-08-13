import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { deliveryAgentApi, staffApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { PageHeader } from "../../components/StatCard";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { useToast } from "../../context/ToastContext";
import type { DeliveryAgentResponse, DeliveryAgentStatus } from "../../types/api";

const STATUS_OPTIONS: DeliveryAgentStatus[] = ["Free", "Busy", "Offline", "Blocked"];

export function DeliveryAgentsPage() {
  const businessId = useBusinessId();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canSeeNames = ADMIN_LEVEL.includes(user!.role);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["delivery-agents", businessId],
    queryFn: () => deliveryAgentApi.list(businessId),
  });
  const { data: staff } = useQuery({
    queryKey: ["staff", businessId],
    queryFn: () => staffApi.list(businessId),
    enabled: canSeeNames,
  });

  const nameOf = useMemo(() => {
    const map = new Map((staff ?? []).map((s) => [s.id, s]));
    return (userId: string) => map.get(userId);
  }, [staff]);

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: DeliveryAgentStatus }) => deliveryAgentApi.setStatus(businessId, userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-agents", businessId] });
      notify("Status updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update status.", "error"),
  });

  const columns: Column<DeliveryAgentResponse>[] = [
    {
      key: "name",
      header: "Agent",
      render: (a) => {
        const info = nameOf(a.userId);
        return info ? (
          <div>
            <div style={{ fontWeight: 600 }}>{info.fullName}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{info.email}</div>
          </div>
        ) : (
          <span className="cell-mono cell-muted">{a.userId.slice(0, 8)}…</span>
        );
      },
    },
    { key: "level", header: "Level", render: (a) => a.levelCode },
    { key: "completed", header: "Completed deliveries", render: (a) => a.completedDeliveries },
    { key: "charge", header: "Delivery charge", render: (a) => a.deliveryCharge },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <select
          className="select"
          style={{ height: 30, fontSize: 12, width: "auto", paddingRight: 26 }}
          value={a.status}
          onChange={(e) => statusMutation.mutate({ userId: a.userId, status: e.target.value as DeliveryAgentStatus })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Delivery agents" subtitle="Manage availability for order deliveries." />
      {agents && agents.length === 0 ? (
        <EmptyState icon={Truck} title="No delivery agents yet" description="Create a delivery agent account from Staff." />
      ) : (
        <DataTable columns={columns} rows={agents ?? []} rowKey={(a) => a.id} />
      )}
    </div>
  );
}
