import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Repeat, RotateCcw } from "lucide-react";
import { returnApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { usePagedQuery } from "../../lib/usePagedQuery";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { Field, Input, Select, Textarea } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatMoney } from "../../lib/format";
import type { ReturnResolution, ReturnResponse, ReturnStatus } from "../../types/api";

const STATUS_OPTIONS: (ReturnStatus | "All")[] = ["All", "Requested", "Approved", "Rejected", "Received", "Refunded", "Exchanged", "Cancelled"];
// "Exchanged" gets its own tone (never the same color as "Refunded" — §9.49, an exchange moves
// no money and is a genuinely distinct terminal state).
const STATUS_TONE: Record<ReturnStatus, "warning" | "info" | "danger" | "brand" | "success" | "neutral" | "exchange"> = {
  Requested: "warning",
  Approved: "info",
  Rejected: "danger",
  Received: "brand",
  Refunded: "success",
  Exchanged: "exchange",
  Cancelled: "neutral",
};
const RESOLUTION_TONE: Record<ReturnResolution, "neutral" | "exchange" | "info"> = {
  Refund: "neutral",
  Exchange: "exchange",
  StoreCredit: "info",
};

export function ReturnsPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canRefund = ADMIN_LEVEL.includes(user!.role);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "All">("All");
  const [deciding, setDeciding] = useState<ReturnResponse | null>(null);
  const currency = business?.currency ?? "USD";

  const { items: returns, isLoading, paginationProps } = usePagedQuery(
    ["returns", businessId, statusFilter],
    (page, pageSize) => returnApi.list(businessId, statusFilter === "All" ? undefined : statusFilter, page, pageSize),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["returns", businessId] });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => returnApi.markReceived(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Marked received — tracked items were restocked.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not mark received.", "error"),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => returnApi.refund(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Refund recorded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not record refund.", "error"),
  });

  // §9.49 (added 2026-08-18) — Staff-tier, not Admin: an exchange moves no money, so it isn't
  // gated behind canRefund the way the Refund action is.
  const exchangeMutation = useMutation({
    mutationFn: (id: string) => returnApi.exchange(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Exchange completed — the order's items were updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not complete exchange.", "error"),
  });

  const columns: Column<ReturnResponse>[] = [
    { key: "rma", header: "RMA", render: (r) => <span style={{ fontWeight: 650 }}>{r.rmaNumber}</span> },
    { key: "order", header: "Order", render: (r) => r.orderNumber },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "resolution", header: "Resolution", render: (r) => <Badge tone={RESOLUTION_TONE[r.resolution]}>{r.resolution}</Badge> },
    { key: "items", header: "Items", render: (r) => r.items.reduce((sum, i) => sum + i.quantity, 0) },
    {
      key: "requested",
      header: "Requested / Value",
      render: (r) => formatMoney(r.requestedRefundAmount, r.currency || currency),
    },
    {
      key: "approved",
      header: "Approved",
      render: (r) => (r.approvedRefundAmount != null ? formatMoney(r.approvedRefundAmount, r.currency || currency) : "—"),
    },
    { key: "date", header: "Requested At", render: (r) => formatDate(r.createdAt) },
    { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {r.status === "Requested" && (
            <Button size="sm" variant="primary" onClick={() => setDeciding(r)}>Decide</Button>
          )}
          {r.status === "Approved" && (
            <Button size="sm" variant="secondary" loading={receiveMutation.isPending} onClick={() => receiveMutation.mutate(r.id)}>
              Mark received
            </Button>
          )}
          {r.status === "Received" && r.resolution === "Exchange" && (
            <Button size="sm" variant="primary" loading={exchangeMutation.isPending} onClick={() => exchangeMutation.mutate(r.id)}>
              <Repeat size={13} /> Exchange
            </Button>
          )}
          {r.status === "Received" && r.resolution !== "Exchange" && canRefund && (
            <Button size="sm" variant="primary" loading={refundMutation.isPending} onClick={() => refundMutation.mutate(r.id)}>
              Refund
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
        title="Returns"
        subtitle="Requested → Approved → Received → Refunded or Exchanged, branched on Resolution. Each step is a distinct action, not one button."
      />

      <div className="filter-bar">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReturnStatus | "All")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
          ))}
        </Select>
      </div>

      {returns.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No Returns" description="Return requests from customers will show up here." />
      ) : (
        <DataTable columns={columns} rows={returns} rowKey={(r) => r.id} pagination={paginationProps} />
      )}

      {deciding && (
        <DecisionModal
          businessId={businessId}
          ret={deciding}
          currency={currency}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function DecisionModal({
  businessId,
  ret,
  currency,
  onClose,
  onDone,
}: {
  businessId: string;
  ret: ReturnResponse;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [approve, setApprove] = useState(true);
  const [amount, setAmount] = useState(String(ret.requestedRefundAmount));
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      returnApi.decide(businessId, ret.id, { approve, approvedRefundAmount: approve ? Number(amount) : null, note }),
    onSuccess: () => {
      notify(approve ? "Return approved." : "Return rejected.", "success");
      onDone();
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not save decision.", "error"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Decide — ${ret.orderNumber}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={approve ? "primary" : "danger"} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {approve ? "Approve" : "Reject"}
          </Button>
        </>
      }
    >
      <div className="section-stack">
        {ret.resolution === "Exchange" && (
          <Badge tone="exchange">Exchange — no money changes hands, same price/different variant only</Badge>
        )}
        <div style={{ fontSize: 13 }}>
          <div className="text-muted" style={{ marginBottom: 6 }}>{ret.reason}{ret.reasonNote ? `: ${ret.reasonNote}` : ""}</div>
          {ret.items.map((i) => (
            <div key={i.productId} style={{ marginBottom: 4 }}>
              {i.quantity}× {i.productName}
              {i.desiredVariantSummary ? (
                <> → exchange for <strong>{i.desiredVariantSummary}</strong></>
              ) : (
                <> — <span className="text-muted">{formatMoney(i.lineRefund, ret.currency || currency)}</span></>
              )}
            </div>
          ))}
        </div>
        <Field label="Decision">
          <Select value={approve ? "approve" : "reject"} onChange={(e) => setApprove(e.target.value === "approve")}>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </Select>
        </Field>
        {approve && (
          <Field
            label={ret.resolution === "Exchange" ? "Approved Value" : "Approved Refund Amount"}
            hint={
              ret.resolution === "Exchange"
                ? "The value of the goods being exchanged — no money actually changes hands, this doesn't settle a refund."
                : `Can be less than the requested ${formatMoney(ret.requestedRefundAmount, ret.currency || currency)} (e.g. a restocking fee), never more.`
            }
          >
            <Input type="number" step="0.01" min="0" max={ret.requestedRefundAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        )}
        <Field label="Note" optional>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
