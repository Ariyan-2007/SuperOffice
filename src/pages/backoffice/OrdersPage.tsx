import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search } from "lucide-react";
import { orderApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { usePagedQuery } from "../../lib/usePagedQuery";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { PageHeader } from "../../components/StatCard";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/Badge";
import { Input, Select } from "../../components/Field";
import { formatDateTime, formatMoney } from "../../lib/format";
import type { OrderResponse, OrderStatus, PaymentStatus } from "../../types/api";

const ALL_STATUSES: OrderStatus[] = [
  "PendingPayment",
  "Processing",
  "Confirmed",
  "OutForDelivery",
  "Delivered",
  "AwaitingPickup",
  "PickedUp",
  "Cancelled",
  "Refunded",
];
const ALL_PAYMENT_STATUSES: PaymentStatus[] = ["Pending", "Paid", "Failed", "Refunded"];

export function OrdersPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "All">("All");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const search = useDebouncedValue(searchInput, 300);

  const { items: orders, isLoading, paginationProps } = usePagedQuery(
    ["orders", businessId, statusFilter, paymentFilter, search, from, to],
    (page, pageSize) =>
      orderApi.list(businessId, {
        status: statusFilter === "All" ? undefined : statusFilter,
        paymentStatus: paymentFilter === "All" ? undefined : paymentFilter,
        search: search || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        page,
        pageSize,
      }),
  );

  const columns: Column<OrderResponse>[] = [
    { key: "number", header: "Order", render: (o) => <span style={{ fontWeight: 650 }}>{o.orderNumber}</span> },
    { key: "placed", header: "Placed", render: (o) => formatDateTime(o.placedAt) },
    { key: "items", header: "Items", render: (o) => o.items.reduce((sum, i) => sum + i.quantity, 0) },
    { key: "total", header: "Total", render: (o) => <span style={{ fontWeight: 600 }}>{formatMoney(o.total, o.currency || business?.currency || "USD")}</span> },
    { key: "payment", header: "Payment", render: (o) => <PaymentStatusBadge status={o.paymentStatus} /> },
    { key: "status", header: "Status", render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Orders" subtitle="All orders placed on this shop." />

      <div className="filter-bar">
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 12, color: "var(--text-faint)" }} />
          <Input style={{ paddingLeft: 32, minWidth: 200 }} placeholder="Order # or email…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "All")}>
          <option value="All">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | "All")}>
          <option value="All">All payment statuses</option>
          {ALL_PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No Orders" description="Try different filters, or check back once orders come in." />
      ) : (
        <DataTable columns={columns} rows={orders} rowKey={(o) => o.id} onRowClick={(o) => navigate(`/orders/${o.id}`)} pagination={paginationProps} />
      )}
    </div>
  );
}
