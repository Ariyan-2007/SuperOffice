import clsx from "clsx";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand" | "exchange";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={clsx("badge", `badge-${tone}`)}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

const BUSINESS_STATUS_TONE: Record<string, Tone> = { Draft: "neutral", Active: "success", Suspended: "danger" };
const PRODUCT_STATUS_TONE: Record<string, Tone> = {
  Draft: "neutral",
  Active: "success",
  OutOfStock: "warning",
  Archived: "danger",
};
const USER_STATUS_TONE: Record<string, Tone> = { PendingVerification: "warning", Active: "success", Blocked: "danger" };
const DELIVERY_STATUS_TONE: Record<string, Tone> = { Free: "success", Busy: "info", Offline: "neutral", Blocked: "danger" };
const ORDER_STATUS_TONE: Record<string, Tone> = {
  PendingPayment: "warning",
  Processing: "info",
  Confirmed: "info",
  OutForDelivery: "brand",
  Delivered: "success",
  AwaitingPickup: "brand", // §9.47 — occupies the same position as OutForDelivery, for a Pickup order
  PickedUp: "success", // §9.47 — occupies the same position as Delivered, for a Pickup order
  Cancelled: "danger",
  Refunded: "neutral",
};
const PAYMENT_STATUS_TONE: Record<string, Tone> = { Pending: "warning", Paid: "success", Failed: "danger", Refunded: "neutral" };

function StatusBadge({ status, map }: { status: string; map: Record<string, Tone> }) {
  return <Badge tone={map[status] ?? "neutral"}>{status}</Badge>;
}

export const BusinessStatusBadge = (p: { status: string }) => <StatusBadge status={p.status} map={BUSINESS_STATUS_TONE} />;
export const ProductStatusBadge = (p: { status: string }) => <StatusBadge status={p.status} map={PRODUCT_STATUS_TONE} />;
export const UserStatusBadge = (p: { status: string }) => <StatusBadge status={p.status} map={USER_STATUS_TONE} />;
export const DeliveryStatusBadge = (p: { status: string }) => <StatusBadge status={p.status} map={DELIVERY_STATUS_TONE} />;
export const OrderStatusBadge = (p: { status: string }) => <StatusBadge status={p.status} map={ORDER_STATUS_TONE} />;
export const PaymentStatusBadge = (p: { status: string }) => <StatusBadge status={p.status} map={PAYMENT_STATUS_TONE} />;
