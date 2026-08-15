import { BUSINESS_SLUG, IS_BACKOFFICE } from "../config/env";
import { DEMO_EMAILS, DEMO_PASSWORD } from "./config";
import type {
  BusinessResponse,
  CategoryResponse,
  CouponResponse,
  DeliveryAgentResponse,
  OrderResponse,
  ProductResponse,
  TenantResponse,
  UserRole,
  UserStatus,
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

export interface DemoData {
  tenant: TenantResponse;
  businesses: BusinessResponse[];
  users: DemoUserRecord[];
  categories: CategoryResponse[];
  products: ProductResponse[];
  coupons: CouponResponse[];
  deliveryAgents: DeliveryAgentResponse[];
  orders: OrderResponse[];
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const TENANT_ID = "t-demo";
const BIZ_1 = "b-demo-1";
const BIZ_2 = "b-demo-2";
const BIZ_3 = "b-demo-3";

// A BackOffice deployment is pinned to one Business by slug — line the seeded shop's slug up
// with whatever's configured so BusinessContext resolves it even with no backend at all.
const PRIMARY_SLUG = (IS_BACKOFFICE && BUSINESS_SLUG) || "antivaly-demo";

export function buildSeed(): DemoData {
  const tenant: TenantResponse = {
    id: TENANT_ID,
    name: "Antivaly Holdings",
    slug: "antivaly-holdings",
    type: "MultiBusiness",
    status: "Active",
    plan: "Growth",
    ownerUserId: "u-owner",
    contactEmail: DEMO_EMAILS.owner,
    contactPhone: "+1 555 0100",
    createdAt: daysAgo(180),
  };

  const businesses: BusinessResponse[] = [
    {
      id: BIZ_1,
      tenantId: TENANT_ID,
      name: "Antivaly Grocers",
      slug: PRIMARY_SLUG,
      customDomain: null,
      description: "Neighborhood grocery delivering fresh produce, pantry staples and bakery goods same-day.",
      logoUrl: "",
      bannerUrl: "",
      themeColor: "#4338CA",
      currency: "USD",
      contactEmail: "hello@antivaly-demo.test",
      contactPhone: "+1 555 0101",
      status: "Active",
      deliveryModuleEnabled: true,
      createdAt: daysAgo(150),
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
      createdAt: daysAgo(12),
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
      createdAt: daysAgo(90),
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
    { id: "p-1", businessId: BIZ_1, categoryId: "c-produce", name: "Organic Avocado (each)", slug: "organic-avocado", sku: "PRD-AVO-01", description: "Ripe Hass avocados, sourced weekly.", price: 1.5, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 1.5, stockQuantity: 84, trackInventory: true, images: [], tags: ["fresh", "organic"], status: "Active" },
    { id: "p-2", businessId: BIZ_1, categoryId: "c-produce", name: "Heirloom Tomatoes (lb)", slug: "heirloom-tomatoes", sku: "PRD-TOM-02", description: "Locally grown heirloom tomatoes.", price: 3.25, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 3.25, stockQuantity: 4, trackInventory: true, images: [], tags: ["fresh"], status: "Active" },
    { id: "p-3", businessId: BIZ_1, categoryId: "c-bakery", name: "Sourdough Loaf", slug: "sourdough-loaf", sku: "PRD-BRD-01", description: "24-hour fermented sourdough, baked daily.", price: 6.5, compareAtPrice: 8, discountPercent: null, discountExpiresAt: null, effectivePrice: 6.5, stockQuantity: 11, trackInventory: true, images: [], tags: ["bestseller"], status: "Active" },
    { id: "p-4", businessId: BIZ_1, categoryId: "c-bakery", name: "Butter Croissant (pack of 4)", slug: "butter-croissant-4pk", sku: "PRD-CRO-01", description: "Flaky, all-butter croissants.", price: 7.0, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 7.0, stockQuantity: 0, trackInventory: true, images: [], tags: [], status: "OutOfStock" },
    { id: "p-5", businessId: BIZ_1, categoryId: "c-beverages", name: "Cold Brew Concentrate (32oz)", slug: "cold-brew-concentrate", sku: "PRD-CBC-01", description: "Small-batch cold brew, makes 4 servings.", price: 12.0, compareAtPrice: 15, discountPercent: 20, discountExpiresAt: daysAgo(-14), effectivePrice: 9.6, stockQuantity: 26, trackInventory: true, images: [], tags: ["featured"], status: "Active" },
    { id: "p-6", businessId: BIZ_1, categoryId: "c-beverages", name: "Sparkling Water 12-pack", slug: "sparkling-water-12pk", sku: "PRD-SPW-01", description: "Unflavored sparkling mineral water.", price: 8.99, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 8.99, stockQuantity: 3, trackInventory: true, images: [], tags: [], status: "Active" },
    { id: "p-7", businessId: BIZ_1, categoryId: "c-snacks", name: "Trail Mix (16oz)", slug: "trail-mix-16oz", sku: "PRD-TMX-01", description: "Nuts, seeds and dried fruit blend.", price: 9.5, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 9.5, stockQuantity: 40, trackInventory: true, images: [], tags: ["snack"], status: "Active" },
    { id: "p-8", businessId: BIZ_1, categoryId: "c-snacks", name: "Dark Chocolate Bar (85%)", slug: "dark-chocolate-85", sku: "PRD-CHC-01", description: "Single-origin dark chocolate.", price: 4.25, compareAtPrice: null, discountPercent: null, discountExpiresAt: null, effectivePrice: 4.25, stockQuantity: 60, trackInventory: false, images: [], tags: [], status: "Draft" },
  ];

  const coupons: CouponResponse[] = [
    { id: "cp-welcome", businessId: BIZ_1, code: "WELCOME10", discountType: "Percentage", discountValue: 10, minOrderAmount: 20, maxUses: 500, usedCount: 128, startsAt: daysAgo(60), expiresAt: daysAgo(-90), isActive: true },
    { id: "cp-summer", businessId: BIZ_1, code: "SUMMER5", discountType: "FixedAmount", discountValue: 5, minOrderAmount: 15, maxUses: 200, usedCount: 200, startsAt: daysAgo(120), expiresAt: daysAgo(5), isActive: false },
  ];

  const deliveryAgents: DeliveryAgentResponse[] = [
    { id: "da-1", businessId: BIZ_1, userId: "u-agent-1", status: "Free", completedDeliveries: 134, deliveryCharge: 3.5, levelCode: 3, balance: 212.4 },
    { id: "da-2", businessId: BIZ_1, userId: "u-agent-2", status: "Busy", completedDeliveries: 47, deliveryCharge: 3.0, levelCode: 1, balance: 68.0 },
  ];

  const address = (label: string, city: string): OrderResponse["shippingAddress"] => ({
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
    { id: "o-1", businessId: BIZ_1, orderNumber: "VAS-20260810-0001", customerUserId: "u-cust-1", items: items1, subtotal: 9.0, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 11.99, status: "Delivered", paymentStatus: "Paid", shippingAddress: address("Home", "San Francisco"), deliveryAgentUserId: "u-agent-1", placedAt: daysAgo(5) },
    { id: "o-2", businessId: BIZ_1, orderNumber: "VAS-20260812-0002", customerUserId: "u-cust-2", items: items2, subtotal: 22.6, couponCode: "WELCOME10", discountAmount: 2.26, deliveryFee: 2.99, total: 23.33, status: "OutForDelivery", paymentStatus: "Paid", shippingAddress: address("Home", "Oakland"), deliveryAgentUserId: "u-agent-2", placedAt: hoursAgo(6) },
    { id: "o-3", businessId: BIZ_1, orderNumber: "VAS-20260813-0003", customerUserId: "u-cust-3", items: items3, subtotal: 28.5, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 31.49, status: "Confirmed", paymentStatus: "Paid", shippingAddress: address("Work", "San Francisco"), deliveryAgentUserId: null, placedAt: hoursAgo(20) },
    { id: "o-4", businessId: BIZ_1, orderNumber: "VAS-20260814-0004", customerUserId: "u-cust-1", items: items4, subtotal: 17.98, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 20.97, status: "Processing", paymentStatus: "Paid", shippingAddress: address("Home", "San Francisco"), deliveryAgentUserId: null, placedAt: hoursAgo(9) },
    { id: "o-5", businessId: BIZ_1, orderNumber: "VAS-20260814-0005", customerUserId: "u-cust-2", items: items5, subtotal: 17.0, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 19.99, status: "PendingPayment", paymentStatus: "Pending", shippingAddress: address("Home", "Oakland"), deliveryAgentUserId: null, placedAt: hoursAgo(2) },
    { id: "o-6", businessId: BIZ_1, orderNumber: "VAS-20260809-0006", customerUserId: "u-cust-3", items: items6, subtotal: 6.5, couponCode: null, discountAmount: 0, deliveryFee: 2.99, total: 9.49, status: "Cancelled", paymentStatus: "Refunded", shippingAddress: address("Work", "San Francisco"), deliveryAgentUserId: null, placedAt: daysAgo(6) },
  ];

  return { tenant, businesses, users, categories, products, coupons, deliveryAgents, orders };
}
