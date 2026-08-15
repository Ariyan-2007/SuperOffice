import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { orderApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader } from "../../components/StatCard";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/Badge";
import { Select } from "../../components/Field";
import { formatDateTime, formatMoney } from "../../lib/format";
import type { OrderResponse, OrderStatus } from "../../types/api";

const ALL_STATUSES: OrderStatus[] = ["PendingPayment", "Processing", "Confirmed", "OutForDelivery", "Delivered", "Cancelled", "Refunded"];

export function OrdersPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");

  const { data: orders, isLoading } = useQuery({ queryKey: ["orders", businessId], queryFn: () => orderApi.list(businessId) });

  const filtered = (orders ?? [])
    .filter((o) => statusFilter === "All" || o.status === statusFilter)
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));

  const columns: Column<OrderResponse>[] = [
    { key: "number", header: "Order", render: (o) => <span style={{ fontWeight: 650 }}>{o.orderNumber}</span> },
    { key: "placed", header: "Placed", render: (o) => formatDateTime(o.placedAt) },
    { key: "items", header: "Items", render: (o) => o.items.reduce((sum, i) => sum + i.quantity, 0) },
    { key: "total", header: "Total", render: (o) => <span style={{ fontWeight: 600 }}>{formatMoney(o.total, business?.currency ?? "USD")}</span> },
    { key: "payment", header: "Payment", render: (o) => <PaymentStatusBadge status={o.paymentStatus} /> },
    { key: "status", header: "Status", render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Orders" subtitle="All orders placed on this shop." />

      <div className="filter-bar">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "All")}>
          <option value="All">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No Orders" description="Orders placed on the Shop will show up here." />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(o) => o.id} onRowClick={(o) => navigate(`/orders/${o.id}`)} />
      )}
    </div>
  );
}
