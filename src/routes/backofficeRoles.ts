import type { UserRole } from "../types/api";

// Straight from BACKOFFICE_FRONTEND_BLUEPRINT.md §4's role/screen matrix. BusinessAdmin and
// BusinessStaff have identical backend permissions today except Business-profile editing —
// that's intentional, not an oversight (see the blueprint note on this).
export const STAFF_LEVEL: UserRole[] = ["BusinessAdmin", "BusinessStaff", "TenantOwner", "PlatformSuperAdmin"];
export const ADMIN_LEVEL: UserRole[] = ["BusinessAdmin", "TenantOwner", "PlatformSuperAdmin"];
export const CAN_EDIT_BUSINESS: UserRole[] = ["BusinessAdmin", "TenantOwner", "PlatformSuperAdmin"];
