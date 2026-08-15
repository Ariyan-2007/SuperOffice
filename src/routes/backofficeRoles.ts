import type { UserRole } from "../types/api";

// Straight from BACKOFFICE_FRONTEND_BLUEPRINT.md §4's role/screen matrix. As of the
// 2026-08-15 revision, BusinessAdmin and BusinessStaff are genuinely split: Staff keeps
// full day-to-day catalog/order work but loses destructive and revenue-sensitive actions
// (category/product delete, all of coupon create/edit/delete, and the whole Accounting
// area) — ADMIN_LEVEL is the gate for every one of those, not just Business-profile editing.
export const STAFF_LEVEL: UserRole[] = ["BusinessAdmin", "BusinessStaff", "TenantOwner", "PlatformSuperAdmin"];
export const ADMIN_LEVEL: UserRole[] = ["BusinessAdmin", "TenantOwner", "PlatformSuperAdmin"];
export const CAN_EDIT_BUSINESS: UserRole[] = ["BusinessAdmin", "TenantOwner", "PlatformSuperAdmin"];
