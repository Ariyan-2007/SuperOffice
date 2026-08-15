import type { OrderStatus } from "../types/api";

// A real order-status state machine is now enforced server-side (BACKOFFICE_FRONTEND_
// BLUEPRINT.md §7.8, changed 2026-08-15) — an illegal jump now gets a 409 naming the
// from/to states. This table is a genuine backend guarantee to mirror, not just a UI
// convention: PendingPayment→Processing/Cancelled, Processing→Confirmed/OutForDelivery/
// Cancelled, Confirmed→OutForDelivery/Cancelled, OutForDelivery→Delivered/Cancelled,
// Delivered→Refunded only. Cancelled/Refunded are terminal.
const LEGAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PendingPayment: ["Processing", "Cancelled"],
  Processing: ["Confirmed", "OutForDelivery", "Cancelled"],
  Confirmed: ["OutForDelivery", "Cancelled"],
  OutForDelivery: ["Delivered", "Cancelled"],
  Delivered: ["Refunded"],
  Cancelled: [],
  Refunded: [],
};

export function nextStatusOptions(current: OrderStatus): OrderStatus[] {
  return LEGAL_TRANSITIONS[current];
}
