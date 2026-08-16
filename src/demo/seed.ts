import { BUSINESS_SLUG, IS_BACKOFFICE } from "../config/env";
import { DEMO_EMAILS, DEMO_PASSWORD } from "./config";
import type {
  ApiKeyResponse,
  AuditLogResponse,
  BusinessResponse,
  CategoryResponse,
  ContentBlockResponse,
  CouponResponse,
  CustomerGroupResponse,
  DeliveryAgentResponse,
  ExpenseResponse,
  GiftCardResponse,
  OrderItem,
  OrderResponse,
  ProductResponse,
  PromotionResponse,
  ReturnResponse,
  ReviewResponse,
  ShippingAddress,
  ShippingZoneResponse,
  StockMovementResponse,
  StoreCreditEntry,
  InvoiceSettings,
  TaxSettings,
  TenantResponse,
  UserRole,
  UserStatus,
  WebhookDeliveryResponse,
  WebhookResponse,
} from "../types/api";

export interface DemoUserRecord {
  id: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  tenantId: string;
  businessId: string;
  status: UserStatus;
}

// Several §9B response shapes are URL-scoped on the real API (no `businessId` field in the
// JSON) — but the demo store still needs to know which Business a record belongs to in order
// to filter a multi-business seed. `WithBusiness<T>` is this module's internal storage shape
// only; every DemoStore getter strips the extra field back off before returning, matching the
// real response exactly (see e.g. `listPromotions`).
type WithBusiness<T> = T & { businessId: string };

export interface DemoData {
  tenant: TenantResponse;
  businesses: BusinessResponse[];
  users: DemoUserRecord[];
  categories: CategoryResponse[];
  products: ProductResponse[];
  coupons: CouponResponse[];
  deliveryAgents: DeliveryAgentResponse[];
  orders: OrderResponse[];
  stockMovements: StockMovementResponse[];
  expenses: ExpenseResponse[];
  // --- added 2026-08-16 (§9B) ---
  invoicingByBusiness: Record<string, InvoiceSettings>;
  returns: WithBusiness<ReturnResponse>[];
  reviews: WithBusiness<ReviewResponse>[];
  promotions: WithBusiness<PromotionResponse>[];
  customerGroups: WithBusiness<CustomerGroupResponse>[];
  customerGroupMembers: { groupId: string; customerUserId: string }[];
  giftCards: WithBusiness<GiftCardResponse>[];
  storeCredit: (StoreCreditEntry & { businessId: string; customerUserId: string })[];
  shippingZones: WithBusiness<ShippingZoneResponse>[];
  content: WithBusiness<ContentBlockResponse>[];
  auditLog: AuditLogResponse[];
  webhooks: WebhookResponse[];
  webhookDeliveries: WebhookDeliveryResponse[];
  apiKeys: ApiKeyResponse[];
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const TENANT_ID = "t-demo";
const BIZ_1 = "b-demo-1";
const BIZ_2 = "b-demo-2";
const BIZ_3 = "b-demo-3";

// A BackOffice deployment is pinned to one Business by slug — line the seeded shop's slug up
// with whatever's configured so BusinessContext resolves it even with no backend at all.
const PRIMARY_SLUG = (IS_BACKOFFICE && BUSINESS_SLUG) || "vastora";

function noTax(displayName = "Tax"): TaxSettings {
  // Tax config is new (§9B) and every seeded order below predates it, so it starts disabled —
  // toggling it on in Business Profile is a live, fully-functional demo action either way.
  return { enabled: false, defaultRatePercent: 0, pricesIncludeTax: false, taxShipping: false, classRates: {}, registrationNumber: "", displayName };
}

function defaultInvoicing(legalName: string): InvoiceSettings {
  return { numberPrefix: "INV-", lastNumber: 0, legalName, legalAddress: "", registrationNumber: "", footerNote: "" };
}

type ProductBase = Omit<
  ProductResponse,
  | "costPrice"
  | "unitMargin"
  | "averageRating"
  | "reviewCount"
  | "brand"
  | "barcode"
  | "weightKg"
  | "metaTitle"
  | "metaDescription"
  | "publishedAt"
  | "unpublishedAt"
  | "isFeatured"
  | "sortWeight"
  | "taxClass"
  | "isAvailable"
>;

function finishProduct(
  base: ProductBase,
  extra: {
    costPrice?: number | null;
    brand?: string;
    barcode?: string;
    weightKg?: number | null;
    isFeatured?: boolean;
    averageRating?: number;
    reviewCount?: number;
  } = {},
): ProductResponse {
  const costPrice = extra.costPrice === undefined ? +(base.price * 0.55).toFixed(2) : extra.costPrice;
  const unitMargin = costPrice == null ? null : +(base.effectivePrice - costPrice).toFixed(2);
  const isAvailable = base.status === "Active" && (base.trackInventory ? base.stockQuantity > 0 : true);
  return {
    ...base,
    costPrice,
    unitMargin,
    averageRating: extra.averageRating ?? 0,
    reviewCount: extra.reviewCount ?? 0,
    brand: extra.brand ?? "",
    barcode: extra.barcode ?? "",
    weightKg: extra.weightKg ?? 0.4,
    metaTitle: "",
    metaDescription: "",
    publishedAt: base.status === "Draft" ? null : daysAgo(45),
    unpublishedAt: null,
    isFeatured: extra.isFeatured ?? false,
    sortWeight: 0,
    taxClass: "standard",
    isAvailable,
  };
}

type OrderBase = Omit<
  OrderResponse,
  | "isGuestOrder"
  | "contactEmail"
  | "contactPhone"
  | "discounts"
  | "taxAmount"
  | "taxRatePercent"
  | "pricesIncludeTax"
  | "giftCardTotal"
  | "giftCardsUsed"
  | "storeCreditApplied"
  | "amountDue"
  | "refundedAmount"
  | "currency"
  | "fulfillmentMethod"
  | "billingAddress"
  | "shippingMethodName"
  | "carrierName"
  | "trackingNumber"
  | "trackingUrl"
  | "invoiceNumber"
  | "customerNote"
  | "internalNote"
  | "items"
> & { items: Omit<OrderItem, "variantId" | "variantSummary" | "refundedQuantity">[] };

function finishOrder(base: OrderBase, contactEmail: string, contactPhone: string): OrderResponse {
  const refundedAmount = base.paymentStatus === "Refunded" ? base.total : 0;
  return {
    ...base,
    items: base.items.map((i) => ({ ...i, variantId: null, variantSummary: null, refundedQuantity: 0 })),
    isGuestOrder: false,
    contactEmail,
    contactPhone,
    discounts: base.couponCode ? [{ source: "Coupon", label: base.couponCode, amount: base.discountAmount }] : [],
    taxAmount: 0,
    taxRatePercent: 0,
    pricesIncludeTax: false,
    giftCardTotal: 0,
    giftCardsUsed: [],
    storeCreditApplied: 0,
    amountDue: base.paymentStatus === "Paid" || base.paymentStatus === "Refunded" ? 0 : base.total,
    refundedAmount,
    currency: "USD",
    fulfillmentMethod: "Delivery",
    billingAddress: base.shippingAddress,
    shippingMethodName: null,
    carrierName: null,
    trackingNumber: null,
    trackingUrl: null,
    invoiceNumber: null,
    customerNote: "",
  };
}

export function buildSeed(): DemoData {
  const tenant: TenantResponse = {
    id: TENANT_ID,
    name: "Vastora Holdings",
    slug: "vastora-holdings",
    type: "MultiBusiness",
    status: "Active",
    plan: "Growth",
    ownerUserId: "u-owner",
    contactEmail: "ariyanjahangireng@gmail.com",
    contactPhone: "+8801817274124",
    createdAt: daysAgo(180),
  };

  const businesses: BusinessResponse[] = [
    {
      id: BIZ_1,
      tenantId: TENANT_ID,
      name: "Vastora",
      slug: PRIMARY_SLUG,
      customDomain: null,
      description: "Neighborhood grocery delivering fresh produce, pantry staples and bakery goods same-day.",
      logoUrl: "",
      bannerUrl: "",
      themeColor: "#4338CA",
      currency: "USD",
      contactEmail: "ariyanjahangireng@gmail.com",
      contactPhone: "+8801817274124",
      status: "Active",
      deliveryModuleEnabled: true,
      defaultDeliveryFee: 2.99,
      createdAt: daysAgo(150),
      tax: noTax("Sales Tax"),
      returnWindowDays: 14,
      reviewsEnabled: true,
      guestCheckoutEnabled: true,
    },
    {
      id: BIZ_2,
      tenantId: TENANT_ID,
      name: "Northwind Bakery",
      slug: "northwind-bakery",
      customDomain: null,
      description: "Small-batch sourdough and pastries. Still finishing setup.",
      logoUrl: "",
      bannerUrl: "",
      themeColor: "#B45309",
      currency: "USD",
      contactEmail: "hello@northwind-demo.test",
      contactPhone: "+1 555 0102",
      status: "Draft",
      deliveryModuleEnabled: false,
      defaultDeliveryFee: 0,
      createdAt: daysAgo(12),
      tax: noTax(),
      returnWindowDays: 14,
      reviewsEnabled: true,
      guestCheckoutEnabled: true,
    },
    {
      id: BIZ_3,
      tenantId: TENANT_ID,
      name: "Cedar & Sage",
      slug: "cedar-and-sage",
      customDomain: null,
      description: "Home & wellness goods. Paused while restocking suppliers.",
      logoUrl: "",
      bannerUrl: "",
      themeColor: "#0F766E",
      currency: "USD",
      contactEmail: "hello@cedarsage-demo.test",
      contactPhone: "+1 555 0103",
      status: "Suspended",
      deliveryModuleEnabled: true,
      defaultDeliveryFee: 3.5,
      createdAt: daysAgo(90),
      tax: noTax(),
      returnWindowDays: 30,
      reviewsEnabled: true,
      guestCheckoutEnabled: false,
    },
  ];

  const users: DemoUserRecord[] = [
    {
      id: "u-owner",
      fullName: "Ariyan Jahangir",
      email: DEMO_EMAILS.owner,
      password: DEMO_PASSWORD,
      phone: "+1 555 0110",
      role: "TenantOwner",
      tenantId: TENANT_ID,
      businessId: "",
      status: "Active",
    },
    {
      id: "u-admin",
      fullName: "Maya Chowdhury",
      email: DEMO_EMAILS.admin,
      password: DEMO_PASSWORD,
      phone: "+1 555 0111",
      role: "BusinessAdmin",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "Active",
    },
    {
      id: "u-staff",
      fullName: "Leo Fontaine",
      email: DEMO_EMAILS.staff,
      password: DEMO_PASSWORD,
      phone: "+1 555 0112",
      role: "BusinessStaff",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "Active",
    },
    {
      id: "u-agent-1",
      fullName: "Priya Nair",
      email: DEMO_EMAILS.agent,
      password: DEMO_PASSWORD,
      phone: "+1 555 0113",
      role: "DeliveryAgent",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "Active",
    },
    {
      id: "u-agent-2",
      fullName: "Tomas Rivera",
      email: "rider2@showcase.vastora.dev",
      password: DEMO_PASSWORD,
      phone: "+1 555 0114",
      role: "DeliveryAgent",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "Active",
    },
    {
      id: "u-cust-1",
      fullName: "Grace Kim",
      email: "grace.kim@example.test",
      password: DEMO_PASSWORD,
      phone: "+1 555 0121",
      role: "Customer",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "Active",
    },
    {
      id: "u-cust-2",
      fullName: "Daniel Osei",
      email: "daniel.osei@example.test",
      password: DEMO_PASSWORD,
      phone: "+1 555 0122",
      role: "Customer",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "Active",
    },
    {
      id: "u-cust-3",
      fullName: "Isabel Torres",
      email: "isabel.torres@example.test",
      password: DEMO_PASSWORD,
      phone: "+1 555 0123",
      role: "Customer",
      tenantId: TENANT_ID,
      businessId: BIZ_1,
      status: "PendingVerification",
    },
  ];

  const categories: CategoryResponse[] = [
    { id: "c-produce", businessId: BIZ_1, name: "Produce", slug: "produce", parentCategoryId: null, description: "Fresh fruit & vegetables", imageUrl: "", sortOrder: 0, isActive: true },
    { id: "c-bakery", businessId: BIZ_1, name: "Bakery", slug: "bakery", parentCategoryId: null, description: "Bread and baked goods", imageUrl: "", sortOrder: 1, isActive: true },
    { id: "c-beverages", businessId: BIZ_1, name: "Beverages", slug: "beverages", parentCategoryId: null, description: "Drinks, hot & cold", imageUrl: "", sortOrder: 2, isActive: true },
    { id: "c-snacks", businessId: BIZ_1, name: "Snacks", slug: "snacks", parentCategoryId: null, description: "Chips, bars & treats", imageUrl: "", sortOrder: 3, isActive: true },
  ];

  const products: ProductResponse[] = [
    finishProduct(
      { id: "p-1", businessId: BIZ_1, categoryId: "c-produce", name: "Organic Avocado (each)", slug: "organic-avocado", sku: "PRD-AVO-01", description: "Ripe Hass avocados, sourced weekly.", price: 1.5, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 1.5, stockQuantity: 84, trackInventory: true, reorderThreshold: 20, reorderQuantity: 100, images: [], tags: ["fresh", "organic"], status: "Active", variants: [] },
      { brand: "Vastora Farms", averageRating: 3.5, reviewCount: 1 },
    ),
    finishProduct(
      { id: "p-2", businessId: BIZ_1, categoryId: "c-produce", name: "Heirloom Tomatoes (lb)", slug: "heirloom-tomatoes", sku: "PRD-TOM-02", description: "Locally grown heirloom tomatoes.", price: 3.25, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 3.25, stockQuantity: 4, trackInventory: true, reorderThreshold: 10, reorderQuantity: 50, images: [], tags: ["fresh"], status: "Active", variants: [] },
    ),
    finishProduct(
      { id: "p-3", businessId: BIZ_1, categoryId: "c-bakery", name: "Sourdough Loaf", slug: "sourdough-loaf", sku: "PRD-BRD-01", description: "24-hour fermented sourdough, baked daily.", price: 6.5, compareAtPrice: 8, discountPercent: null, discountExpiresAt: null, effectivePrice: 6.5, stockQuantity: 11, trackInventory: true, reorderThreshold: null, reorderQuantity: null, images: [], tags: ["bestseller"], status: "Active", variants: [] },
      { brand: "Vastora Bakehouse", isFeatured: true, averageRating: 5, reviewCount: 1 },
    ),
    finishProduct(
      { id: "p-4", businessId: BIZ_1, categoryId: "c-bakery", name: "Butter Croissant (pack of 4)", slug: "butter-croissant-4pk", sku: "PRD-CRO-01", description: "Flaky, all-butter croissants.", price: 7.0, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 7.0, stockQuantity: 0, trackInventory: true, reorderThreshold: 5, reorderQuantity: 30, images: [], tags: [], status: "OutOfStock", variants: [] },
    ),
    finishProduct(
      { id: "p-5", businessId: BIZ_1, categoryId: "c-beverages", name: "Cold Brew Concentrate (32oz)", slug: "cold-brew-concentrate", sku: "PRD-CBC-01", description: "Small-batch cold brew, makes 4 servings.", price: 12.0, compareAtPrice: 15, discountPercent: 20, discountExpiresAt: daysAgo(-14), effectivePrice: 9.6, stockQuantity: 26, trackInventory: true, reorderThreshold: null, reorderQuantity: null, images: [], tags: ["featured"], status: "Active", variants: [] },
      { brand: "Vastora Roasters", isFeatured: true, averageRating: 4, reviewCount: 1 },
    ),
    finishProduct(
      { id: "p-6", businessId: BIZ_1, categoryId: "c-beverages", name: "Sparkling Water 12-pack", slug: "sparkling-water-12pk", sku: "PRD-SPW-01", description: "Unflavored sparkling mineral water.", price: 8.99, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 8.99, stockQuantity: 3, trackInventory: true, reorderThreshold: 8, reorderQuantity: 24, images: [], tags: [], status: "Active", variants: [] },
      { averageRating: 1, reviewCount: 1 },
    ),
    finishProduct(
      {
        id: "p-7", businessId: BIZ_1, categoryId: "c-snacks", name: "Trail Mix (16oz)", slug: "trail-mix-16oz", sku: "PRD-TMX-01", description: "Nuts, seeds and dried fruit blend.", price: 9.5, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 9.5, stockQuantity: 40, trackInventory: true, reorderThreshold: null, reorderQuantity: null, images: [], tags: ["snack"], status: "Active", variants: [
          { id: "pv-1", attributeSummary: "Size: Small", sku: "PRD-TMX-01-S", priceOverride: null, stockQuantity: 18 },
          { id: "pv-2", attributeSummary: "Size: Large", sku: "PRD-TMX-01-L", priceOverride: 14.5, stockQuantity: 22 },
        ],
      },
      { reviewCount: 0 },
    ),
    // Deliberately left without a cost price — this is what makes the accounting screens'
    // `uncostedOrderCount` / `unvaluedProductCount` warnings show up as something real, not
    // just a hardcoded UI state that can never actually appear.
    finishProduct(
      { id: "p-8", businessId: BIZ_1, categoryId: "c-snacks", name: "Dark Chocolate Bar (85%)", slug: "dark-chocolate-85", sku: "PRD-CHC-01", description: "Single-origin dark chocolate.", price: 4.25, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 4.25, stockQuantity: 60, trackInventory: false, reorderThreshold: null, reorderQuantity: null, images: [], tags: [], status: "Draft", variants: [] },
      { costPrice: null },
    ),
  ];

  const stockMovements: StockMovementResponse[] = [
    { id: "sm-1", productId: "p-2", type: "Sale", quantityDelta: -6, reason: "Order VAS-20260809-0006", referenceOrderId: "o-6", createdByUserId: null, createdAt: daysAgo(6) },
    { id: "sm-2", productId: "p-2", type: "Restock", quantityDelta: 10, reason: "Weekly produce delivery", referenceOrderId: null, createdByUserId: "u-admin", createdAt: daysAgo(3) },
    { id: "sm-3", productId: "p-6", type: "DamageWriteOff", quantityDelta: -2, reason: "Cracked bottles from delivery", referenceOrderId: null, createdByUserId: "u-staff", createdAt: daysAgo(1) },
  ];

  const expenses: ExpenseResponse[] = [
    { id: "exp-1", businessId: BIZ_1, category: "Rent", amount: 2400, note: "Storefront monthly rent", incurredAt: daysAgo(20), createdByUserId: "u-admin" },
    { id: "exp-2", businessId: BIZ_1, category: "Supplies", amount: 186.4, note: "Packaging and bags", incurredAt: daysAgo(9), createdByUserId: "u-admin" },
    { id: "exp-3", businessId: BIZ_1, category: "Utilities", amount: 310.75, note: "Electricity and water", incurredAt: daysAgo(4), createdByUserId: "u-admin" },
  ];

  const coupons: CouponResponse[] = [
    { id: "cp-welcome", businessId: BIZ_1, code: "WELCOME10", discountType: "Percentage", discountValue: 10, minOrderAmount: 20, maxUses: 500, usedCount: 128, startsAt: daysAgo(60), expiresAt: daysAgo(-90), isActive: true },
    { id: "cp-summer", businessId: BIZ_1, code: "SUMMER5", discountType: "FixedAmount", discountValue: 5, minOrderAmount: 15, maxUses: 200, usedCount: 200, startsAt: daysAgo(120), expiresAt: daysAgo(5), isActive: false },
  ];

  const deliveryAgents: DeliveryAgentResponse[] = [
    { id: "da-1", businessId: BIZ_1, userId: "u-agent-1", status: "Free", completedDeliveries: 134, deliveryCharge: 3.5, levelCode: 3, balance: 212.4 },
    { id: "da-2", businessId: BIZ_1, userId: "u-agent-2", status: "Busy", completedDeliveries: 47, deliveryCharge: 3.0, levelCode: 1, balance: 68.0 },
  ];

  const address = (label: string, city: string): ShippingAddress => ({
    label,
    line1: "412 Willow Street",
    line2: "",
    city,
    state: "CA",
    postalCode: "94110",
    country: "United States",
    phone: "+1 555 0199",
    isDefault: true,
  });

  const items1 = [{ productId: "p-1", productName: "Organic Avocado (each)", unitPrice: 1.5, quantity: 6, lineTotal: 9.0 }];
  const items2 = [
    { productId: "p-3", productName: "Sourdough Loaf", unitPrice: 6.5, quantity: 2, lineTotal: 13.0 },
    { productId: "p-5", productName: "Cold Brew Concentrate (32oz)", unitPrice: 9.6, quantity: 1, lineTotal: 9.6 },
  ];
  const items3 = [{ productId: "p-7", productName: "Trail Mix (16oz)", unitPrice: 9.5, quantity: 3, lineTotal: 28.5 }];
  const items4 = [{ productId: "p-6", productName: "Sparkling Water 12-pack", unitPrice: 8.99, quantity: 2, lineTotal: 17.98 }];
  const items5 = [{ productId: "p-8", productName: "Dark Chocolate Bar (85%)", unitPrice: 4.25, quantity: 4, lineTotal: 17.0 }];
  const items6 = [{ productId: "p-2", productName: "Heirloom Tomatoes (lb)", unitPrice: 3.25, quantity: 2, lineTotal: 6.5 }];

  const orders: OrderResponse[] = [
    finishOrder(
      {
        id: "o-1", businessId: BIZ_1, orderNumber: "VAS-20260810-0001", customerUserId: "u-cust-1", items: items1, subtotal: 9.0, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 11.99, status: "Delivered", paymentStatus: "Paid", shippingAddress: address("Home", "San Francisco"), deliveryAgentUserId: "u-agent-1", placedAt: daysAgo(5),
        statusHistory: [
          { status: "PendingPayment", timestamp: daysAgo(5), note: "Order placed." },
          { status: "Processing", timestamp: hoursAgo(118), note: "" },
          { status: "Confirmed", timestamp: hoursAgo(100), note: "" },
          { status: "OutForDelivery", timestamp: hoursAgo(80), note: "" },
          { status: "Delivered", timestamp: hoursAgo(60), note: "Handed to customer." },
        ],
        paymentStatusHistory: [
          { status: "Pending", timestamp: daysAgo(5), note: "" },
          { status: "Paid", timestamp: hoursAgo(119), note: "" },
        ],
      },
      "grace.kim@example.test",
      "+1 555 0121",
    ),
    finishOrder(
      {
        id: "o-2", businessId: BIZ_1, orderNumber: "VAS-20260812-0002", customerUserId: "u-cust-2", items: items2, subtotal: 22.6, couponCode: "WELCOME10", discountAmount: 2.26, deliveryFee: 2.99, total: 23.33, status: "OutForDelivery", paymentStatus: "Paid", shippingAddress: address("Home", "Oakland"), deliveryAgentUserId: "u-agent-2", placedAt: hoursAgo(6),
        statusHistory: [
          { status: "PendingPayment", timestamp: hoursAgo(6), note: "Order placed." },
          { status: "Processing", timestamp: hoursAgo(5.5), note: "" },
          { status: "Confirmed", timestamp: hoursAgo(4), note: "" },
          { status: "OutForDelivery", timestamp: hoursAgo(1), note: "Assigned to Tomas Rivera." },
        ],
        paymentStatusHistory: [
          { status: "Pending", timestamp: hoursAgo(6), note: "" },
          { status: "Paid", timestamp: hoursAgo(5.5), note: "" },
        ],
      },
      "daniel.osei@example.test",
      "+1 555 0122",
    ),
    finishOrder(
      {
        id: "o-3", businessId: BIZ_1, orderNumber: "VAS-20260813-0003", customerUserId: "u-cust-3", items: items3, subtotal: 28.5, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 31.49, status: "Confirmed", paymentStatus: "Paid", shippingAddress: address("Work", "San Francisco"), deliveryAgentUserId: null, placedAt: hoursAgo(20),
        statusHistory: [
          { status: "PendingPayment", timestamp: hoursAgo(20), note: "Order placed." },
          { status: "Processing", timestamp: hoursAgo(19), note: "" },
          { status: "Confirmed", timestamp: hoursAgo(15), note: "" },
        ],
        paymentStatusHistory: [
          { status: "Pending", timestamp: hoursAgo(20), note: "" },
          { status: "Paid", timestamp: hoursAgo(19), note: "" },
        ],
      },
      "isabel.torres@example.test",
      "+1 555 0123",
    ),
    finishOrder(
      {
        id: "o-4", businessId: BIZ_1, orderNumber: "VAS-20260814-0004", customerUserId: "u-cust-1", items: items4, subtotal: 17.98, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 20.97, status: "Processing", paymentStatus: "Paid", shippingAddress: address("Home", "San Francisco"), deliveryAgentUserId: null, placedAt: hoursAgo(9),
        statusHistory: [
          { status: "PendingPayment", timestamp: hoursAgo(9), note: "Order placed." },
          { status: "Processing", timestamp: hoursAgo(8.5), note: "" },
        ],
        paymentStatusHistory: [
          { status: "Pending", timestamp: hoursAgo(9), note: "" },
          { status: "Paid", timestamp: hoursAgo(8.5), note: "" },
        ],
      },
      "grace.kim@example.test",
      "+1 555 0121",
    ),
    finishOrder(
      {
        id: "o-5", businessId: BIZ_1, orderNumber: "VAS-20260814-0005", customerUserId: "u-cust-2", items: items5, subtotal: 17.0, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 19.99, status: "PendingPayment", paymentStatus: "Pending", shippingAddress: address("Home", "Oakland"), deliveryAgentUserId: null, placedAt: hoursAgo(2),
        statusHistory: [{ status: "PendingPayment", timestamp: hoursAgo(2), note: "Order placed." }],
        paymentStatusHistory: [{ status: "Pending", timestamp: hoursAgo(2), note: "" }],
      },
      "daniel.osei@example.test",
      "+1 555 0122",
    ),
    finishOrder(
      {
        id: "o-6", businessId: BIZ_1, orderNumber: "VAS-20260809-0006", customerUserId: "u-cust-3", items: items6, subtotal: 6.5, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 9.49, status: "Cancelled", paymentStatus: "Refunded", shippingAddress: address("Work", "San Francisco"), deliveryAgentUserId: null, placedAt: daysAgo(6),
        statusHistory: [
          { status: "PendingPayment", timestamp: daysAgo(6), note: "Order placed." },
          { status: "Processing", timestamp: hoursAgo(140), note: "" },
          { status: "Cancelled", timestamp: hoursAgo(130), note: "Customer requested cancellation." },
        ],
        paymentStatusHistory: [
          { status: "Pending", timestamp: daysAgo(6), note: "" },
          { status: "Paid", timestamp: hoursAgo(141), note: "" },
          { status: "Refunded", timestamp: hoursAgo(130), note: "Refunded on cancellation." },
        ],
      },
      "isabel.torres@example.test",
      "+1 555 0123",
    ),
  ];

  const returns: DemoData["returns"] = [
    {
      id: "ret-1", businessId: BIZ_1, rmaNumber: "RMA-0001", orderId: "o-1", orderNumber: "VAS-20260810-0001", customerUserId: "u-cust-1",
      items: [{ productId: "p-1", variantId: null, productName: "Organic Avocado (each)", quantity: 2, unitPrice: 1.5, lineRefund: 3.0 }],
      reason: "Damaged", reasonNote: "Bruised on arrival", resolution: "Refund",
      status: "Requested", requestedRefundAmount: 3.0, approvedRefundAmount: null, currency: "USD", restocked: false, refundedAt: null,
      statusHistory: [{ status: "Requested", timestamp: hoursAgo(18), note: null }],
      createdAt: hoursAgo(18),
    },
    {
      id: "ret-2", businessId: BIZ_1, rmaNumber: "RMA-0002", orderId: "o-1", orderNumber: "VAS-20260810-0001", customerUserId: "u-cust-1",
      items: [{ productId: "p-1", variantId: null, productName: "Organic Avocado (each)", quantity: 1, unitPrice: 1.5, lineRefund: 1.5 }],
      reason: "WrongItem", reasonNote: "Wrong item shipped", resolution: "Refund",
      status: "Received", requestedRefundAmount: 1.5, approvedRefundAmount: 1.5, currency: "USD", restocked: true, refundedAt: null,
      statusHistory: [
        { status: "Requested", timestamp: daysAgo(3), note: null },
        { status: "Approved", timestamp: daysAgo(2), note: "Approved in full." },
        { status: "Received", timestamp: hoursAgo(10), note: null },
      ],
      createdAt: daysAgo(3),
    },
    {
      id: "ret-3", businessId: BIZ_1, rmaNumber: "RMA-0003", orderId: "o-1", orderNumber: "VAS-20260810-0001", customerUserId: "u-cust-1",
      items: [{ productId: "p-1", variantId: null, productName: "Organic Avocado (each)", quantity: 3, unitPrice: 1.5, lineRefund: 4.0 }],
      reason: "ChangedMind", reasonNote: "No longer needed", resolution: "Refund",
      status: "Refunded", requestedRefundAmount: 4.5, approvedRefundAmount: 4.0, currency: "USD", restocked: true, refundedAt: daysAgo(6),
      statusHistory: [
        { status: "Requested", timestamp: daysAgo(9), note: null },
        { status: "Approved", timestamp: daysAgo(8), note: "Restocking fee applied." },
        { status: "Received", timestamp: daysAgo(7), note: null },
        { status: "Refunded", timestamp: daysAgo(6), note: null },
      ],
      createdAt: daysAgo(9),
    },
  ];

  const reviews: DemoData["reviews"] = [
    { id: "rev-1", businessId: BIZ_1, productId: "p-3", customerName: "Grace Kim", rating: 5, title: "Best sourdough in the city", body: "Crusty outside, perfect crumb. Ordering weekly now.", isVerifiedPurchase: true, status: "Published", merchantReply: "Thank you, Grace! See you next week.", merchantRepliedAt: daysAgo(3), helpfulCount: 4, createdAt: daysAgo(4) },
    { id: "rev-2", businessId: BIZ_1, productId: "p-5", customerName: "Daniel Osei", rating: 4, title: "Strong and smooth", body: "Great value once diluted. Would like an unsweetened option.", isVerifiedPurchase: true, status: "Published", merchantReply: null, merchantRepliedAt: null, helpfulCount: 1, createdAt: daysAgo(2) },
    { id: "rev-3", businessId: BIZ_1, productId: "p-1", customerName: "Isabel Torres", rating: 2, title: "A few were bruised", body: "Half the batch had soft spots on arrival.", isVerifiedPurchase: false, status: "Pending", merchantReply: null, merchantRepliedAt: null, helpfulCount: 0, createdAt: hoursAgo(14) },
    { id: "rev-4", businessId: BIZ_1, productId: "p-7", customerName: "Grace Kim", rating: 5, title: "Great mix, not too sweet", body: "My go-to snack for hikes now.", isVerifiedPurchase: true, status: "Pending", merchantReply: null, merchantRepliedAt: null, helpfulCount: 0, createdAt: hoursAgo(5) },
    { id: "rev-5", businessId: BIZ_1, productId: "p-6", customerName: "Daniel Osei", rating: 1, title: "Box arrived crushed", body: "Two bottles were shattered in transit.", isVerifiedPurchase: true, status: "Rejected", merchantReply: null, merchantRepliedAt: null, helpfulCount: 0, createdAt: daysAgo(7) },
  ];

  const promotions: DemoData["promotions"] = [
    { id: "promo-1", businessId: BIZ_1, name: "Free Shipping Weekend", code: null, effect: "FreeShipping", scope: "Order", value: 0, productIds: [], categoryIds: [], buyQuantity: 0, getQuantity: 0, minOrderAmount: 25, customerGroupIds: [], firstOrderOnly: false, maxUses: null, maxUsesPerCustomer: null, usedCount: 34, priority: 1, stackable: true, startsAt: daysAgo(10), endsAt: daysAgo(-4), isActive: true, isLiveNow: true },
    { id: "promo-2", businessId: BIZ_1, name: "New Customer 15% Off", code: "NEWHERE", effect: "PercentageOff", scope: "Order", value: 15, productIds: [], categoryIds: [], buyQuantity: 0, getQuantity: 0, minOrderAmount: null, customerGroupIds: [], firstOrderOnly: true, maxUses: null, maxUsesPerCustomer: 1, usedCount: 12, priority: 2, stackable: false, startsAt: daysAgo(60), endsAt: null, isActive: true, isLiveNow: true },
  ];

  const customerGroups: DemoData["customerGroups"] = [
    { id: "cg-vip", businessId: BIZ_1, name: "VIP", description: "Repeat customers with 10+ orders", discountPercent: 5, isActive: true, memberCount: 1 },
  ];
  const customerGroupMembers = [{ groupId: "cg-vip", customerUserId: "u-cust-1" }];

  const giftCards: DemoData["giftCards"] = [
    { id: "gc-1", businessId: BIZ_1, codeSuffix: "4F2A", code: null, initialBalance: 50, remainingBalance: 32.5, currency: "USD", issuedToEmail: "grace.kim@example.test", expiresAt: null, isActive: true, createdAt: daysAgo(40) },
    { id: "gc-2", businessId: BIZ_1, codeSuffix: "9B7C", code: null, initialBalance: 25, remainingBalance: 25, currency: "USD", issuedToEmail: null, expiresAt: daysAgo(-180), isActive: true, createdAt: daysAgo(5) },
  ];

  const storeCredit: DemoData["storeCredit"] = [
    { id: "sc-1", businessId: BIZ_1, customerUserId: "u-cust-2", amount: 10, currency: "USD", reason: "ManualAdjustment", note: "Apology credit for late delivery", referenceOrderId: null, createdAt: daysAgo(15) },
  ];

  const shippingZones: DemoData["shippingZones"] = [
    {
      id: "zone-bay-area", businessId: BIZ_1, name: "Bay Area", countries: ["United States"], regions: ["CA"], priority: 1, isActive: true,
      rates: [
        { id: "rate-1", name: "Standard", price: 2.99, minOrderSubtotal: null, maxOrderSubtotal: null, minWeightKg: null, maxWeightKg: null, estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true },
        { id: "rate-2", name: "Free over $50", price: 0, minOrderSubtotal: 50, maxOrderSubtotal: null, minWeightKg: null, maxWeightKg: null, estimatedDaysMin: 1, estimatedDaysMax: 3, isActive: true },
      ],
    },
    {
      id: "zone-catchall", businessId: BIZ_1, name: "Everywhere Else", countries: [], regions: [], priority: 99, isActive: true,
      rates: [{ id: "rate-3", name: "Standard Shipping", price: 5.99, minOrderSubtotal: null, maxOrderSubtotal: null, minWeightKg: null, maxWeightKg: null, estimatedDaysMin: 3, estimatedDaysMax: 7, isActive: true }],
    },
  ];

  const content: DemoData["content"] = [
    { id: "content-terms", businessId: BIZ_1, type: "Page", slug: "terms", title: "Terms of Service", subtitle: "", body: "", imageUrl: "", linkUrl: "", linkLabel: "", parentId: null, sortOrder: 0, isPublished: false, startsAt: null, endsAt: null, metaTitle: "", metaDescription: "", isVisibleNow: false },
    { id: "content-privacy", businessId: BIZ_1, type: "Page", slug: "privacy", title: "Privacy Policy", subtitle: "", body: "", imageUrl: "", linkUrl: "", linkLabel: "", parentId: null, sortOrder: 1, isPublished: false, startsAt: null, endsAt: null, metaTitle: "", metaDescription: "", isVisibleNow: false },
    { id: "content-summer", businessId: BIZ_1, type: "Banner", slug: "summer-sale", title: "Summer Sale", subtitle: "20% off cold brew, this week only", body: "", imageUrl: "", linkUrl: "/products/cold-brew-concentrate", linkLabel: "Shop now", parentId: null, sortOrder: 0, isPublished: true, startsAt: daysAgo(3), endsAt: daysAgo(-11), metaTitle: "", metaDescription: "", isVisibleNow: true },
  ];

  const invoicingByBusiness: Record<string, InvoiceSettings> = {
    [BIZ_1]: defaultInvoicing("Vastora"),
    [BIZ_2]: defaultInvoicing("Northwind Bakery"),
    [BIZ_3]: defaultInvoicing("Cedar & Sage"),
  };

  return {
    tenant, businesses, users, categories, products, coupons, deliveryAgents, orders, stockMovements, expenses,
    invoicingByBusiness,
    returns, reviews, promotions, customerGroups, customerGroupMembers, giftCards, storeCredit, shippingZones, content,
    auditLog: [], webhooks: [], webhookDeliveries: [], apiKeys: [],
  };
}
