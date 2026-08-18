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

// ---------- pagination (breaking change, added 2026-08-16) ----------

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type BusinessStatus = "Draft" | "Active" | "Suspended";

// ---------- business settings (added 2026-08-16, §9B) ----------

export interface TaxSettings {
  enabled: boolean;
  defaultRatePercent: number;
  pricesIncludeTax: boolean;
  taxShipping: boolean;
  classRates: Record<string, number>;
  registrationNumber: string;
  displayName: string;
}

export interface InvoiceSettings {
  numberPrefix: string;
  lastNumber: number;
  legalName: string;
  legalAddress: string;
  registrationNumber: string;
  footerNote: string;
}

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
  tax: TaxSettings;
  returnWindowDays: number;
  reviewsEnabled: boolean;
  guestCheckoutEnabled: boolean;
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
  tax?: TaxSettings | null;
  invoicing?: InvoiceSettings | null;
  returnWindowDays?: number | null;
  reviewsEnabled?: boolean | null;
  autoPublishReviews?: boolean | null;
  guestCheckoutEnabled?: boolean | null;
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
  parentCategoryId: string | null;
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
  // --- added 2026-08-16 (§9.25, §9.28, §9.31) ---
  costPrice: number | null;
  unitMargin: number | null;
  averageRating: number;
  reviewCount: number;
  brand: string;
  barcode: string;
  weightKg: number | null;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string | null;
  unpublishedAt: string | null;
  isFeatured: boolean;
  sortWeight: number;
  taxClass: string;
  isAvailable: boolean;
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
  costPrice?: number | null;
  brand?: string;
  barcode?: string;
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string | null;
  unpublishedAt?: string | null;
  isFeatured?: boolean;
  sortWeight?: number;
  taxClass?: string;
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
  costPrice?: number | null;
  brand?: string;
  barcode?: string;
  weightKg?: number | null;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string | null;
  unpublishedAt?: string | null;
  isFeatured?: boolean;
  sortWeight?: number;
  taxClass?: string;
}

export interface ProductQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export type DiscountType = "Percentage" | "FixedAmount";
// §9.43 (added 2026-08-18) — governs whether the Shop's "available offers" panel lists the code
// automatically (Public) or it only works when typed exactly (Hidden).
export type OfferVisibility = "Public" | "Hidden";

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
  expiresAt: string | null; // nullable since 2026-08-18, §9.43 — null = never expires
  isActive: boolean;
  visibility: OfferVisibility; // added 2026-08-18, §9.43
}

export interface CreateCouponRequest {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  startsAt: string;
  expiresAt?: string | null; // omit/null for a coupon that never expires
  visibility?: OfferVisibility; // defaults to "Public"
}

export interface UpdateCouponRequest {
  isActive: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  visibility: OfferVisibility;
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
export type FulfillmentMethod = "Delivery" | "Pickup" | "ExternalCourier" | "Digital";

export interface OrderItem {
  productId: string;
  variantId: string | null;
  variantSummary: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  refundedQuantity: number;
  lineTotal: number;
}

export interface OrderDiscountLine {
  source: string;
  label: string;
  amount: number;
}

export interface GiftCardApplication {
  codeSuffix: string;
  amountApplied: number;
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
  isGuestOrder: boolean;
  contactEmail: string;
  contactPhone: string;
  items: OrderItem[];
  subtotal: number;
  couponCode: string | null;
  discountAmount: number;
  discounts: OrderDiscountLine[];
  deliveryFee: number;
  taxAmount: number;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  total: number;
  giftCardTotal: number;
  giftCardsUsed: GiftCardApplication[];
  storeCreditApplied: number;
  amountDue: number;
  refundedAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentMethod: FulfillmentMethod;
  shippingAddress: ShippingAddress | null;
  billingAddress: ShippingAddress | null;
  deliveryAgentUserId: string | null;
  shippingMethodName: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  invoiceNumber: string | null;
  customerNote: string;
  statusHistory: OrderStatusEventResponse[];
  paymentStatusHistory: PaymentStatusEventResponse[];
  placedAt: string;
}

export interface OrderQuery {
  status?: string;
  paymentStatus?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
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

export interface UpdateShipmentRequest {
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingMethodName: string | null;
}

export interface UpdateOrderNoteRequest {
  internalNote: string;
}

export interface InvoiceResponse {
  invoiceNumber: string;
  issuedAt: string;
  orderNumber: string;
  orderPlacedAt: string;
  sellerLegalName: string;
  sellerAddress: string;
  sellerRegistrationNumber: string;
  sellerTaxRegistrationNumber: string;
  buyerName: string;
  buyerEmail: string;
  billingAddress: ShippingAddress | null;
  shippingAddress: ShippingAddress | null;
  items: OrderItem[];
  subtotal: number;
  discounts: OrderDiscountLine[];
  discountTotal: number;
  deliveryFee: number;
  taxLabel: string;
  taxRatePercent: number;
  taxAmount: number;
  pricesIncludeTax: boolean;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  footerNote: string;
}

// ---------- inventory (added 2026-08-15, reshaped 2026-08-16 §9.31) ----------

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
  valueAtCost: number;
  valueAtRetail: number;
}

export interface InventoryValuationResponse {
  totalValueAtCost: number;
  totalValueAtRetail: number;
  potentialMargin: number;
  unvaluedProductCount: number;
  byCategory: CategoryValuationEntry[];
}

// ---------- accounting (added 2026-08-15, reshaped 2026-08-16 §9.31, Admin-tier only) ----------

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
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: number;
  deliveryPayouts: number;
  netProfit: number;
  taxCollected: number;
  uncostedOrderCount: number;
}

export interface BalanceSheetResponse {
  cashPosition: number;
  inventoryValueAtCost: number;
  inventoryValueAtRetail: number;
  totalAssets: number;
  taxPayable: number;
  giftCardLiability: number;
  totalLiabilities: number;
  netPosition: number;
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

// ---------- BackOffice dashboard (added 2026-08-16, §9.32, Admin-tier only) ----------

export interface DailySalesPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductPoint {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface StatusBreakdownPoint {
  status: string;
  count: number;
}

export interface BusinessDashboardResponse {
  from: string;
  to: string;
  revenue: number;
  grossProfit: number;
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  newCustomers: number;
  pendingReturns: number;
  lowStockCount: number;
  dailySales: DailySalesPoint[];
  topProducts: TopProductPoint[];
  statusBreakdown: StatusBreakdownPoint[];
  currency: string;
}

// ---------- returns / RMAs (added 2026-08-16, §9.21) ----------

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Received" | "Refunded" | "Cancelled";
export type ReturnReason = "Damaged" | "WrongItem" | "NotAsDescribed" | "ChangedMind" | "SizeOrFit" | "Other";
export type ReturnResolution = "Refund" | "Exchange" | "StoreCredit";

export interface ReturnItem {
  productId: string;
  variantId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineRefund: number;
}

export interface ReturnStatusEventResponse {
  status: ReturnStatus;
  timestamp: string;
  note: string | null;
}

export interface ReturnResponse {
  id: string;
  rmaNumber: string;
  orderId: string;
  orderNumber: string;
  customerUserId: string;
  items: ReturnItem[];
  reason: ReturnReason;
  reasonNote: string;
  resolution: ReturnResolution;
  status: ReturnStatus;
  requestedRefundAmount: number;
  approvedRefundAmount: number | null;
  currency: string;
  restocked: boolean;
  refundedAt: string | null;
  statusHistory: ReturnStatusEventResponse[];
  createdAt: string;
}

export interface DecideReturnRequest {
  approve: boolean;
  approvedRefundAmount: number | null;
  note: string;
}

// ---------- reviews (added 2026-08-16, §9.25) ----------

export type ReviewStatus = "Pending" | "Published" | "Rejected";

export interface ReviewResponse {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  helpfulCount: number;
  createdAt: string;
}

// ---------- merchandising (added 2026-08-16, §9.20, §9.23, §9.24, §9.30, Admin-tier only) ----------

export type PromotionEffect = "PercentageOff" | "FixedAmountOff" | "FreeShipping" | "BuyXGetY";
export type PromotionScope = "Order" | "Products" | "Categories";

export interface PromotionResponse {
  id: string;
  name: string;
  code: string | null;
  effect: PromotionEffect;
  scope: PromotionScope;
  value: number;
  productIds: string[];
  categoryIds: string[];
  buyQuantity: number;
  getQuantity: number;
  minOrderAmount: number | null;
  customerGroupIds: string[];
  firstOrderOnly: boolean;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usedCount: number;
  priority: number;
  stackable: boolean;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  isLiveNow: boolean;
  visibility: OfferVisibility; // added 2026-08-18, §9.43 — meaningless when code is null (automatic)
}

export interface CreatePromotionRequest {
  name: string;
  code: string | null;
  effect: PromotionEffect;
  scope: PromotionScope;
  value: number;
  productIds: string[];
  categoryIds: string[];
  buyQuantity: number;
  getQuantity: number;
  minOrderAmount: number | null;
  customerGroupIds: string[];
  firstOrderOnly: boolean;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  priority: number;
  stackable: boolean;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  visibility?: OfferVisibility; // defaults to "Public"; meaningless when code is null
}

export interface CustomerGroupResponse {
  id: string;
  name: string;
  description: string;
  discountPercent: number | null;
  isActive: boolean;
  memberCount: number;
}

export interface CustomerGroupRequest {
  name: string;
  description: string;
  discountPercent: number | null;
  isActive: boolean;
}

export interface GiftCardResponse {
  id: string;
  code: string | null; // non-null ONLY on the create response
  codeSuffix: string;
  initialBalance: number;
  remainingBalance: number;
  currency: string;
  issuedToEmail: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface IssueGiftCardRequest {
  amount: number;
  issuedToEmail: string | null;
  expiresAt: string | null;
}

export type StoreCreditReason = "GiftCardRedemption" | "RefundToCredit" | "LoyaltyReward" | "ManualAdjustment" | "Spent";

export interface StoreCreditEntry {
  id: string;
  amount: number;
  currency: string;
  reason: StoreCreditReason;
  note: string | null;
  referenceOrderId: string | null;
  createdAt: string;
}

export interface GrantStoreCreditRequest {
  amount: number; // negative amounts deduct
  note: string;
  expiresAt?: string | null; // added 2026-08-18, §9.43 — omit/null for a permanent grant (the usual case)
}

export interface StoreCreditBalanceResponse {
  balance: number;
  currency: string;
  recentEntries: StoreCreditEntry[];
}

// ---------- discount emails (added 2026-08-18, §9.43) — the delivery mechanism a Hidden coupon
// or promotion code needs, since it won't ever surface itself on the Shop. ----------

export interface SendDiscountEmailRequest {
  code: string; // a Coupon or Promotion code — resolved automatically, no "type" field needed
  customerUserIds: string[] | null; // explicit recipients
  customerGroupId: string | null; // whole segment's members — unioned with customerUserIds, not either/or
}

export interface SendDiscountEmailResult {
  totalRecipients: number;
  sent: number;
  skippedOptedOut: number;
}

export interface ShippingRate {
  id?: string;
  name: string;
  price: number;
  minOrderSubtotal: number | null;
  maxOrderSubtotal: number | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isActive: boolean;
}

export interface ShippingZoneResponse {
  id: string;
  name: string;
  countries: string[];
  regions: string[];
  rates: ShippingRate[];
  priority: number;
  isActive: boolean;
}

export interface CreateShippingZoneRequest {
  name: string;
  countries: string[];
  regions: string[];
  rates: ShippingRate[];
  priority: number;
  isActive: boolean;
}

export type ContentBlockType = "Banner" | "Page" | "MenuItem" | "Article";

export interface ContentBlockResponse {
  id: string;
  type: ContentBlockType;
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  parentId: string | null;
  sortOrder: number;
  isPublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
  metaTitle: string;
  metaDescription: string;
  isVisibleNow: boolean;
}

export interface ContentBlockRequest {
  type: ContentBlockType;
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  parentId: string | null;
  sortOrder: number;
  isPublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
  metaTitle: string;
  metaDescription: string;
}

// ---------- audit log (added 2026-08-16, §9.35, Admin-tier only) ----------

export interface AuditLogResponse {
  id: string;
  userId: string;
  userEmail: string;
  role: string;
  method: string;
  path: string;
  routeTemplate: string;
  statusCode: number;
  ipAddress: string;
  resourceId: string | null;
  durationMs: number;
  createdAt: string;
}

export interface AuditLogQuery {
  userId?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ---------- integrations: webhooks & API keys (added 2026-08-16, §9.39, SuperOffice/TenantOwner only) ----------

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  description: string;
  businessId: string;
}

export interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  description: string;
  businessId: string;
  isActive: boolean;
  secret: string | null;
  lastDeliveryAt: string | null;
  consecutiveFailures: number;
  disabledAt: string | null;
  createdAt: string;
}

export interface WebhookDeliveryResponse {
  id: string;
  eventName: string;
  responseStatusCode: number | null;
  error: string | null;
  attemptCount: number;
  succeeded: boolean;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  businessId: string | null;
  scopes: ("read" | "write")[] | null;
  expiresAt: string | null;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyId: string;
  secret: string | null;
  businessId: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ProblemDetails {
  status: number;
  title: string;
  type: string;
  errors?: Record<string, string[]>;
}
