import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, History, Truck, UserX } from "lucide-react";
import { deliveryAgentApi, orderApi, staffApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { nextStatusOptions } from "../../lib/orderTransitions";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, Input, Select, Textarea } from "../../components/Field";
import { PageLoader } from "../../components/Feedback";
import { Badge, OrderStatusBadge, PaymentStatusBadge } from "../../components/Badge";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import type { InvoiceResponse, OrderResponse, OrderStatus, UpdateShipmentRequest } from "../../types/api";

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canSeeNames = ADMIN_LEVEL.includes(user!.role);

  const { data: order, isLoading } = useQuery({ queryKey: ["order", businessId, orderId], queryFn: () => orderApi.get(businessId, orderId) });
  const { data: agents } = useQuery({ queryKey: ["delivery-agents", businessId], queryFn: () => deliveryAgentApi.list(businessId) });
  const { data: staff } = useQuery({ queryKey: ["staff", businessId], queryFn: () => staffApi.list(businessId), enabled: canSeeNames });

  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const currency = order?.currency || business?.currency || "USD";

  const statusMutation = useMutation({
    mutationFn: (data: { status: OrderStatus; note: string }) => orderApi.setStatus(businessId, orderId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", businessId, orderId], updated);
      queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      notify(`Order marked ${updated.status}.`, "success");
      setNextStatus("");
      setNote("");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update order status.", "error"),
  });

  const assignMutation = useMutation({
    mutationFn: (deliveryAgentUserId: string) => orderApi.assignDelivery(businessId, orderId, { deliveryAgentUserId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", businessId, orderId], updated);
      notify("Delivery agent assigned.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not assign delivery agent.", "error"),
  });

  const paymentMutation = useMutation({
    mutationFn: () => orderApi.setPaymentStatus(businessId, orderId, { status: "Paid", note: "Marked paid from BackOffice." }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", businessId, orderId], updated);
      queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      notify("Order marked as paid.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update payment status.", "error"),
  });

  const invoiceQuery = useQuery({
    queryKey: ["order-invoice", businessId, orderId],
    queryFn: () => orderApi.getInvoice(businessId, orderId),
    enabled: invoiceOpen,
  });

  if (isLoading || !order) return <PageLoader />;

  const nameOf = (userId: string) => (staff ?? []).find((s) => s.id === userId);
  const assignedAgent = order.deliveryAgentUserId ? nameOf(order.deliveryAgentUserId) : null;
  const options = nextStatusOptions(order.status);
  const freeAgents = (agents ?? []).filter((a) => a.status === "Free" || a.userId === order.deliveryAgentUserId);

  return (
    <div className="section-stack">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("/orders")} style={{ width: "fit-content" }}>
        <ArrowLeft size={13} /> Back to orders
      </button>

      <PageHeader
        title={order.orderNumber}
        subtitle={`Placed ${formatDateTime(order.placedAt)}${order.isGuestOrder ? " · Guest order" : ""}`}
        actions={
          <>
            {order.isGuestOrder && (
              <Badge tone="neutral"><UserX size={11} style={{ marginRight: 2 }} /> Guest</Badge>
            )}
            <PaymentStatusBadge status={order.paymentStatus} />
            <OrderStatusBadge status={order.status} />
            {order.paymentStatus === "Pending" && (
              <Button variant="secondary" loading={paymentMutation.isPending} onClick={() => paymentMutation.mutate()}>
                <CheckCircle2 size={14} /> Mark as Paid
              </Button>
            )}
            <Button variant="secondary" onClick={() => setInvoiceOpen(true)}>
              <FileText size={14} /> Issue invoice
            </Button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="section-stack">
          <Card>
            <CardHeader title="Items" />
            <CardBody style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.productId + (item.variantId ?? "")}>
                      <td>
                        {item.productName}
                        {item.variantSummary && <div className="cell-muted" style={{ fontSize: 11.5 }}>{item.variantSummary}</div>}
                        {item.refundedQuantity > 0 && (
                          <div style={{ fontSize: 11.5, color: "var(--warning)" }}>{item.refundedQuantity} refunded</div>
                        )}
                      </td>
                      <td className="cell-muted">{formatMoney(item.unitPrice, currency)}</td>
                      <td>{item.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(item.lineTotal, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
            <CardBody style={{ borderTop: "1px solid var(--border)" }}>
              <dl className="kv-grid">
                <dt>Subtotal</dt>
                <dd>{formatMoney(order.subtotal, currency)}</dd>
                {order.discounts.flatMap((d, i) => [
                  <dt key={`dt-${i}`}>{d.label}</dt>,
                  <dd key={`dd-${i}`}>−{formatMoney(d.amount, currency)}</dd>,
                ])}
                {order.taxAmount > 0 && (
                  <>
                    <dt>Tax ({order.taxRatePercent}%{order.pricesIncludeTax ? ", included" : ""})</dt>
                    <dd>{formatMoney(order.taxAmount, currency)}</dd>
                  </>
                )}
                <dt>Delivery Fee</dt>
                <dd>{formatMoney(order.deliveryFee, currency)}</dd>
                <dt style={{ fontWeight: 650, color: "var(--text)" }}>Total</dt>
                <dd style={{ fontWeight: 650 }}>{formatMoney(order.total, currency)}</dd>
                {order.giftCardTotal > 0 && (
                  <>
                    <dt>Gift Card Applied</dt>
                    <dd>−{formatMoney(order.giftCardTotal, currency)}</dd>
                  </>
                )}
                {order.storeCreditApplied > 0 && (
                  <>
                    <dt>Store Credit Applied</dt>
                    <dd>−{formatMoney(order.storeCreditApplied, currency)}</dd>
                  </>
                )}
                {order.refundedAmount > 0 && (
                  <>
                    <dt>Refunded</dt>
                    <dd>{formatMoney(order.refundedAmount, currency)}</dd>
                  </>
                )}
                <dt style={{ fontWeight: 650, color: "var(--text)" }}>Amount Due</dt>
                <dd style={{ fontWeight: 650 }}>{formatMoney(order.amountDue, currency)}</dd>
              </dl>
            </CardBody>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader title="Shipping Address" />
              <CardBody>
                <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 600 }}>{order.shippingAddress.label}</div>
                  <div>{order.shippingAddress.line1}</div>
                  {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </div>
                  <div>{order.shippingAddress.country}</div>
                  <div className="text-muted">{order.shippingAddress.phone}</div>
                  <div className="text-muted" style={{ marginTop: 6 }}>{order.contactEmail}</div>
                </div>
              </CardBody>
            </Card>
          )}

          <ShipmentCard businessId={businessId} order={order} />

          <Card>
            <CardHeader title="Internal Note" />
            <CardBody>
              <InternalNoteForm businessId={businessId} order={order} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" actions={<History size={15} color="var(--text-faint)" />} />
            <CardBody>
              <OrderTimeline order={order} />
            </CardBody>
          </Card>
        </div>

        <div className="section-stack">
          <Card>
            <CardHeader title="Update Status" />
            <CardBody>
              {options.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13 }}>This order is in a final state.</p>
              ) : (
                <div className="section-stack">
                  <Field label="New Status">
                    <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus)}>
                      <option value="">Choose…</option>
                      {options.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note" optional>
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for this change" />
                  </Field>
                  <Button
                    variant={nextStatus === "Cancelled" ? "danger" : "primary"}
                    disabled={!nextStatus}
                    loading={statusMutation.isPending}
                    onClick={() => nextStatus && statusMutation.mutate({ status: nextStatus, note })}
                    style={{ width: "100%" }}
                  >
                    Apply
                  </Button>
                  {nextStatus === "Cancelled" && (
                    <p className="text-muted" style={{ fontSize: 12 }}>Cancelling restocks tracked items automatically.</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Delivery" />
            <CardBody>
              <div className="section-stack">
                <div style={{ fontSize: 13 }}>
                  <span className="text-muted">Assigned: </span>
                  {assignedAgent ? assignedAgent.fullName : order.deliveryAgentUserId ? order.deliveryAgentUserId.slice(0, 8) + "…" : "Unassigned"}
                </div>
                {business?.deliveryModuleEnabled ? (
                  <>
                    <Field label="Assign Delivery Agent">
                      <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                        <option value="">Choose an agent…</option>
                        {freeAgents.map((a) => {
                          const info = nameOf(a.userId);
                          return (
                            <option key={a.id} value={a.userId}>
                              {info ? info.fullName : a.userId.slice(0, 8) + "…"} ({a.status})
                            </option>
                          );
                        })}
                      </Select>
                    </Field>
                    <Button
                      variant="secondary"
                      disabled={!assigneeId}
                      loading={assignMutation.isPending}
                      onClick={() => assigneeId && assignMutation.mutate(assigneeId)}
                      style={{ width: "100%" }}
                    >
                      Assign
                    </Button>
                  </>
                ) : (
                  <p className="text-muted" style={{ fontSize: 12.5 }}>
                    Delivery module is disabled for this Business — enable it in Business Profile to assign new deliveries.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {invoiceOpen && <InvoiceModal onClose={() => setInvoiceOpen(false)} invoice={invoiceQuery.data} isLoading={invoiceQuery.isLoading} />}
    </div>
  );
}

function ShipmentCard({ businessId, order }: { businessId: string; order: OrderResponse }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<{ carrierName: string; trackingNumber: string; trackingUrl: string; shippingMethodName: string }>({
    defaultValues: {
      carrierName: order.carrierName ?? "",
      trackingNumber: order.trackingNumber ?? "",
      trackingUrl: order.trackingUrl ?? "",
      shippingMethodName: order.shippingMethodName ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateShipmentRequest) => orderApi.setShipment(businessId, order.id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", businessId, order.id], updated);
      queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      notify("Shipment recorded. Recording a tracking number also marks the order Out for Delivery.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not record shipment.", "error"),
  });

  return (
    <Card>
      <CardHeader title="Shipment" actions={<Truck size={15} color="var(--text-faint)" />} />
      <CardBody>
        <form
          className="form-grid"
          onSubmit={handleSubmit((v) =>
            mutation.mutate({
              carrierName: v.carrierName || null,
              trackingNumber: v.trackingNumber || null,
              trackingUrl: v.trackingUrl || null,
              shippingMethodName: v.shippingMethodName || null,
            }),
          )}
        >
          <Field label="Carrier" optional>
            <Input {...register("carrierName")} placeholder="UPS, FedEx, courier…" />
          </Field>
          <Field label="Tracking Number" optional hint="Recording this ships the order automatically.">
            <Input {...register("trackingNumber")} />
          </Field>
          <Field label="Tracking URL" optional>
            <Input {...register("trackingUrl")} />
          </Field>
          <Field label="Shipping Method" optional>
            <Input {...register("shippingMethodName")} />
          </Field>
          <div style={{ alignSelf: "end" }}>
            <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={!isDirty}>
              Save shipment
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// The API never echoes internal notes back on OrderResponse — genuinely write-only, so this
// form always starts blank rather than pretending to show "the current note."
function InternalNoteForm({ businessId, order }: { businessId: string; order: OrderResponse }) {
  const { notify } = useToast();
  const [value, setValue] = useState("");

  const mutation = useMutation({
    mutationFn: (internalNote: string) => orderApi.setInternalNote(businessId, order.id, { internalNote }),
    onSuccess: () => notify("Internal note saved.", "success"),
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not save note.", "error"),
  });

  return (
    <div className="section-stack">
      <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Staff-only — never shown to the customer. Not returned by the API, so this always starts blank." />
      <Button variant="secondary" size="sm" style={{ width: "fit-content" }} loading={mutation.isPending} onClick={() => mutation.mutate(value)}>
        Save note
      </Button>
    </div>
  );
}

function InvoiceModal({ onClose, invoice, isLoading }: { onClose: () => void; invoice?: InvoiceResponse; isLoading: boolean }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div className="modal-title">Invoice</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {isLoading || !invoice ? (
            <PageLoader />
          ) : (
            <div className="section-stack">
              <p style={{ fontSize: 13.5 }}>
                Invoice <strong>{invoice.invoiceNumber}</strong> for order <strong>{invoice.orderNumber}</strong>, issued {formatDateTime(invoice.issuedAt)}.
              </p>
              <table className="data-table">
                <thead><tr><th>Product</th><th>Unit Price</th><th>Qty</th><th>Line Total</th></tr></thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.productId + (item.variantId ?? "")}>
                      <td>{item.productName}</td>
                      <td className="cell-muted">{formatMoney(item.unitPrice, invoice.currency)}</td>
                      <td>{item.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(item.lineTotal, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="kv-grid">
                <dt>Subtotal</dt>
                <dd>{formatMoney(invoice.subtotal, invoice.currency)}</dd>
                {invoice.discountTotal > 0 && (
                  <>
                    <dt>Discounts</dt>
                    <dd>−{formatMoney(invoice.discountTotal, invoice.currency)}</dd>
                  </>
                )}
                <dt>Delivery Fee</dt>
                <dd>{formatMoney(invoice.deliveryFee, invoice.currency)}</dd>
                {invoice.taxAmount > 0 && (
                  <>
                    <dt>{invoice.taxLabel} ({invoice.taxRatePercent}%)</dt>
                    <dd>{formatMoney(invoice.taxAmount, invoice.currency)}</dd>
                  </>
                )}
                <dt style={{ fontWeight: 650, color: "var(--text)" }}>Total</dt>
                <dd style={{ fontWeight: 650 }}>{formatMoney(invoice.total, invoice.currency)}</dd>
                <dt>Amount Paid</dt>
                <dd>{formatMoney(invoice.amountPaid, invoice.currency)}</dd>
                <dt>Amount Due</dt>
                <dd>{formatMoney(invoice.amountDue, invoice.currency)}</dd>
              </dl>
              <p className="text-muted" style={{ fontSize: 12 }}>
                {invoice.sellerLegalName} · {invoice.sellerAddress}
                {invoice.footerNote && <> · {invoice.footerNote}</>}
              </p>
              <p className="text-muted" style={{ fontSize: 11.5 }}>
                The invoice number is assigned once and reused on every later request — printing/PDF rendering is this app's job; the data above is what the API returns.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <Button variant="primary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// statusHistory/paymentStatusHistory are backend-provided (BACKOFFICE_FRONTEND_BLUEPRINT.md
// §7.8) — merge the two event streams into one chronological timeline.
function OrderTimeline({ order }: { order: OrderResponse }) {
  const events = [
    ...order.statusHistory.map((e) => ({ kind: "status" as const, status: e.status, timestamp: e.timestamp, note: e.note })),
    ...order.paymentStatusHistory.map((e) => ({ kind: "payment" as const, status: e.status, timestamp: e.timestamp, note: e.note })),
  ].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  if (events.length === 0) {
    return <p className="text-muted" style={{ fontSize: 13 }}>No history recorded yet.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                marginTop: 5,
                background: e.kind === "payment" ? "var(--info)" : "var(--brand-500)",
                flexShrink: 0,
              }}
            />
            {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 4 }} />}
          </div>
          <div style={{ paddingBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {e.kind === "payment" ? "Payment → " : "Status → "}
              {e.status}
            </div>
            <div className="text-muted" style={{ fontSize: 11.5 }}>{formatDateTime(e.timestamp)}</div>
            {e.note && <div style={{ fontSize: 12.5, marginTop: 3 }}>{e.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
