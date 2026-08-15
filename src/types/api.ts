// Shared Vastora API DTO shapes, mirrored from BACKOFFICE_FRONTEND_BLUEPRINT.md and
// SUPEROFFICE_FRONTEND_BLUEPRINT.md. Keep in sync with the backend's VASTORA_BLUEPRINT.md §10.

export type UserRole =
  | "PlatformSuperAdmin"
  | "TenantOwner"
  | "BusinessAdmin"
  | "BusinessStaff"
  | "DeliveryAgent"
  | "Customer";

export type UserStatus = "PendingVerification" | "Active" | "Blocked";

export interface UserSummaryResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  tenantId: string;
  businessId: string;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: UserSummaryResponse;
}

export type TenantType = "SingleBusiness" | "MultiBusiness";
export type TenantStatus = "PendingSetup" | "Active" | "Suspended" | "Cancelled";
export type TenantPlan = "Trial" | "Starter" | "Growth" | "Enterprise";

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  plan: TenantPlan;
  ownerUserId: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

export type BusinessStatus = "Draft" | "Active" | "Suspended";

export interface BusinessResponse {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  customDomain: string | null;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  themeColor: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  status: BusinessStatus;
  deliveryModuleEnabled: boolean;
  defaultDeliveryFee: number;
  createdAt: string;
}

export interface CreateBusinessRequest {
  name: string;
  slug?: string | null;
  description: string;
  contactEmail: string;
  contactPhone: string;
  currency?: string;
}

export interface UpdateBusinessRequest {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  themeColor: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  defaultDeliveryFee: number;
}

export interface CategoryResponse {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string | null;
  parentCategoryId?: string | null;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

export interface UpdateCategoryRequest {
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryTreeNode {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  children: CategoryTreeNode[];
}

export type ProductStatus = "Draft" | "Active" | "OutOfStock" | "Archived";

export interface ProductVariantResponse {
  id: string;
  attributeSummary: string;
  sku: string;
  priceOverride: number | null;
  stockQuantity: number;
}

export interface ProductVariantRequest {
  id?: string | null;
  attributeSummary: string;
  sku: string;
  priceOverride: number | null;
  stockQuantity: number;
}

export interface ProductResponse {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  discountExpiresAt: string | null;
  effectivePrice: number;
  stockQuantity: number;
  trackInventory: boolean;
  reorderThreshold: number | null;
  reorderQuantity: number | null;
  images: string[];
  tags: string[];
  status: ProductStatus;
  variants: ProductVariantResponse[];
}

export interface CreateProductRequest {
  categoryId: string;
  name: string;
  slug?: string | null;
  sku: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  images?: string[] | null;
  tags?: string[] | null;
  variants?: ProductVariantRequest[] | null;
}

export interface UpdateProductRequest {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  discountExpiresAt?: string | null;
  trackInventory: boolean;
  reorderThreshold?: number | null;
  reorderQuantity?: number | null;
  images: string[];
  tags: string[];
  variants?: ProductVariantRequest[] | null;
}

export type DiscountType = "Percentage" | "FixedAmount";

export interface CouponResponse {
  id: string;
  businessId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface CreateCouponRequest {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  startsAt: string;
  expiresAt: string;
}

export interface UpdateCouponRequest {
  isActive: boolean;
  expiresAt: string;
  maxUses: number | null;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: "BusinessAdmin" | "BusinessStaff" | "DeliveryAgent";
}

export type DeliveryAgentStatus = "Free" | "Busy" | "Offline" | "Blocked";

export interface DeliveryAgentResponse {
  id: string;
  businessId: string;
  userId: string;
  status: DeliveryAgentStatus;
  completedDeliveries: number;
  deliveryCharge: number;
  levelCode: number;
  balance: number;
}

export type OrderStatus =
  | "PendingPayment"
  | "Processing"
  | "Confirmed"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ShippingAddress {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface OrderStatusEventResponse {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface PaymentStatusEventResponse {
  status: PaymentStatus;
  timestamp: string;
  note: string;
}

export interface OrderResponse {
  id: string;
  businessId: string;
  orderNumber: string;
  customerUserId: string;
  items: OrderItem[];
  subtotal: number;
  couponCode: string | null;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress | null;
  deliveryAgentUserId: string | null;
  statusHistory: OrderStatusEventResponse[];
  paymentStatusHistory: PaymentStatusEventResponse[];
  placedAt: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  note: string;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
  note?: string | null;
}

export interface AssignDeliveryAgentRequest {
  deliveryAgentUserId: string;
}

// ---------- inventory (added 2026-08-15) ----------

export type StockMovementType = "Sale" | "Restock" | "Return" | "Adjustment" | "DamageWriteOff";

export interface StockMovementResponse {
  id: string;
  productId: string;
  type: StockMovementType;
  quantityDelta: number;
  reason: string;
  referenceOrderId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface AdjustStockRequest {
  quantityDelta: number;
  reason: string;
  type: "Restock" | "Adjustment" | "DamageWriteOff";
}

export interface LowStockProductResponse {
  productId: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  reorderThreshold: number;
  reorderQuantity: number | null;
}

export interface CategoryValuationEntry {
  categoryId: string;
  value: number;
}

export interface InventoryValuationResponse {
  totalValue: number;
  byCategory: CategoryValuationEntry[];
}

// ---------- accounting (added 2026-08-15, Admin-tier only) ----------

export interface ExpenseResponse {
  id: string;
  businessId: string;
  category: string;
  amount: number;
  note: string;
  incurredAt: string;
  createdByUserId: string;
}

export interface CreateExpenseRequest {
  category: string;
  amount: number;
  note: string;
  incurredAt: string;
}

export interface UpdateExpenseRequest {
  category: string;
  amount: number;
  note: string;
  incurredAt: string;
}

export interface ProfitAndLossResponse {
  from: string;
  to: string;
  revenue: number;
  refunds: number;
  expenses: number;
  deliveryPayouts: number;
  netProfit: number;
}

export interface BalanceSheetResponse {
  cashPosition: number;
  inventoryValue: number;
  totalAssets: number;
}

// ---------- tenant usage (added 2026-08-15, SuperOffice) ----------

export interface BusinessUsageEntry {
  businessId: string;
  businessName: string;
  staffCount: number;
  maxStaffPerBusiness: number | null;
  productCount: number;
  maxProductsPerBusiness: number | null;
}

export interface TenantUsageResponse {
  plan: TenantPlan;
  businessCount: number;
  maxBusinesses: number | null;
  businesses: BusinessUsageEntry[];
}

// ---------- analytics (added 2026-08-15, SuperOffice) ----------

export interface BusinessAnalyticsEntry {
  businessId: string;
  businessName: string;
  orderCount: number;
  revenue: number;
}

export interface TopProductStat {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface TenantAnalyticsResponse {
  totalRevenue: number;
  totalOrders: number;
  businesses: BusinessAnalyticsEntry[];
  topProducts: TopProductStat[];
}

export interface ProblemDetails {
  status: number;
  title: string;
  type: string;
  errors?: Record<string, string[]>;
}
