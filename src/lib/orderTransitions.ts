import type { OrderStatus } from "../types/api";

// No order-status state machine is enforced server-side yet (BACKOFFICE_FRONTEND_BLUEPRINT.md
// §7.8) — any allowed caller can set any status on any order. This only decides which
// transitions the UI *offers*; it isn't a guarantee the API will reject anything else.
const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  PendingPayment: "Confirmed",
  Processing: "Confirmed",
  Confirmed: "OutForDelivery",
  OutForDelivery: "Delivered",
};

const CANCELLABLE_FROM: OrderStatus[] = ["PendingPayment", "Processing", "Confirmed", "OutForDelivery"];

export function nextStatusOptions(current: OrderStatus): OrderStatus[] {
  const options: OrderStatus[] = [];
  const forward = FORWARD[current];
  if (forward) options.push(forward);
  if (CANCELLABLE_FROM.includes(current)) options.push("Cancelled");
  return options;
}
