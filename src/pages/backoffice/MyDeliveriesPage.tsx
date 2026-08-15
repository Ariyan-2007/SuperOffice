import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { orderApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { nextStatusOptions } from "../../lib/orderTransitions";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Select } from "../../components/Field";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { OrderStatusBadge } from "../../components/Badge";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import type { OrderResponse, OrderStatus } from "../../types/api";

export function MyDeliveriesPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-assigned-to-me", businessId],
    queryFn: () => orderApi.assignedToMe(businessId),
  });

  if (isLoading) return <PageLoader />;

  const active = (orders ?? []).filter((o) => !["Delivered", "Cancelled", "Refunded"].includes(o.status));
  const done = (orders ?? []).filter((o) => ["Delivered", "Cancelled", "Refunded"].includes(o.status));

  return (
    <div className="section-stack">
      {orders && orders.length === 0 ? (
        <EmptyState icon={Package} title="No Deliveries Assigned" description="Assigned orders will show up here." />
      ) : (
        <>
          {active.map((o) => (
            <DeliveryCard key={o.id} order={o} currency={business?.currency ?? "USD"} businessId={businessId} queryClient={queryClient} notify={notify} />
          ))}
          {done.length > 0 && (
            <>
              <div className="page-subtitle" style={{ marginTop: 8 }}>Completed</div>
              {done.map((o) => (
                <DeliveryCard key={o.id} order={o} currency={business?.currency ?? "USD"} businessId={businessId} queryClient={queryClient} notify={notify} readOnly />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function DeliveryCard({
  order,
  currency,
  businessId,
  queryClient,
  notify,
  readOnly,
}: {
  order: OrderResponse;
  currency: string;
  businessId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  notify: (msg: string, kind?: "success" | "error" | "info") => void;
  readOnly?: boolean;
}) {
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const options = nextStatusOptions(order.status);

  const mutation = useMutation({
    mutationFn: (status: OrderStatus) => orderApi.setStatus(businessId, order.id, { status, note: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-assigned-to-me", businessId] });
      notify("Status updated.", "success");
      setNextStatus("");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update status.", "error"),
  });

  return (
    <Card padded>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 650 }}>{order.orderNumber}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{formatDateTime(order.placedAt)}</div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.shippingAddress && (
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.6 }}>
          {order.shippingAddress.line1}, {order.shippingAddress.city} · {order.shippingAddress.phone}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{formatMoney(order.total, currency)}</div>
      {!readOnly && options.length > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus)} style={{ flex: 1 }}>
            <option value="">Update status…</option>
            {options.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Button
            variant="primary"
            size="sm"
            disabled={!nextStatus}
            loading={mutation.isPending}
            onClick={() => nextStatus && mutation.mutate(nextStatus)}
          >
            Go
          </Button>
        </div>
      )}
    </Card>
  );
}
