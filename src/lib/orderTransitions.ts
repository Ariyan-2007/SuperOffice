import type { FulfillmentMethod, OrderStatus } from "../types/api";

// A real order-status state machine is enforced server-side (BACKOFFICE_FRONTEND_BLUEPRINT.md
// §7.8) — an illegal jump gets a 409 naming the from/to states. These tables are a genuine
// backend guarantee to mirror, not just a UI convention.
//
// Two separate flows, chosen by `fulfillmentMethod` (added 2026-08-18, §9.47) — a Pickup order
// never goes "out for delivery," so it moves through AwaitingPickup/PickedUp instead of
// OutForDelivery/Delivered. Digital orders are still, for now, on the Delivery/ExternalCourier
// set (a known mismatch the backend hasn't fixed yet — don't build a third flow for them).
const DELIVERY_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PendingPayment: ["Processing", "Cancelled"],
  Processing: ["Confirmed", "OutForDelivery", "Cancelled"],
  Confirmed: ["OutForDelivery", "Cancelled"],
  OutForDelivery: ["Delivered", "Cancelled"],
  Delivered: ["Refunded"],
  AwaitingPickup: [],
  PickedUp: [],
  Cancelled: [],
  Refunded: [],
};

const PICKUP_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PendingPayment: ["Processing", "Cancelled"],
  Processing: ["Confirmed", "AwaitingPickup", "Cancelled"],
  Confirmed: ["AwaitingPickup", "Cancelled"],
  AwaitingPickup: ["PickedUp", "Cancelled"],
  PickedUp: ["Refunded"],
  OutForDelivery: [],
  Delivered: [],
  Cancelled: [],
  Refunded: [],
};

export function nextStatusOptions(current: OrderStatus, fulfillmentMethod: FulfillmentMethod): OrderStatus[] {
  return fulfillmentMethod === "Pickup" ? PICKUP_TRANSITIONS[current] : DELIVERY_TRANSITIONS[current];
}

// "Finished" here means the same thing revenue recognition, returns eligibility and reviews'
// verified-purchase check all mean by it — Delivered, or PickedUp for a Pickup order (§9.47).
export function isOrderFinished(status: OrderStatus): boolean {
  return status === "Delivered" || status === "PickedUp";
}
