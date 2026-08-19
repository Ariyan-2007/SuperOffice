import { buildSeed, type DemoData, type DemoUserRecord } from "./seed";
import type {
  AdjustStockRequest,
  ApiKeyResponse,
  AuditLogResponse,
  BalanceSheetResponse,
  BusinessDashboardResponse,
  BusinessMailSettingsResponse,
  BusinessResponse,
  BusinessStatus,
  CategoryResponse,
  CategoryTreeNode,
  ContentBlockRequest,
  ContentBlockResponse,
  CouponResponse,
  CreateApiKeyRequest,
  CreateBusinessRequest,
  CreateCategoryRequest,
  CreateCouponRequest,
  CreateExpenseRequest,
  CreatePromotionRequest,
  CreateProductRequest,
  CreateShippingZoneRequest,
  CreateStaffRequest,
  CreateWebhookRequest,
  CustomerGroupRequest,
  CustomerGroupResponse,
  DecideReturnRequest,
  DeliveryAgentResponse,
  DeliveryAgentStatus,
  ExpenseResponse,
  GiftCardResponse,
  GrantStoreCreditRequest,
  InvoiceSettings,
  InventoryValuationResponse,
  InvoiceResponse,
  IssueGiftCardRequest,
  LowStockProductResponse,
  OrderResponse,
  OrderStatus,
  PaymentStatus,
  ProductResponse,
  ProductStatus,
  ProductVariantRequest,
  ProductVariantResponse,
  ProfitAndLossResponse,
  PromotionResponse,
  ReturnResponse,
  ReviewResponse,
  SendDiscountEmailRequest,
  SendDiscountEmailResult,
  ReviewStatus,
  ShippingZoneResponse,
  StockMovementResponse,
  StoreCreditBalanceResponse,
  TenantAnalyticsResponse,
  TenantResponse,
  TenantUsageResponse,
  UpdateBusinessDomainsRequest,
  UpdateBusinessMailSettingsRequest,
  UpdateBusinessRequest,
  UpdateCategoryRequest,
  UpdateCouponRequest,
  UpdateExpenseRequest,
  UpdateOrderStatusRequest,
  UpdateProductRequest,
  UpdateShipmentRequest,
  UserStatus,
  UserSummaryResponse,
  WebhookDeliveryResponse,
  WebhookResponse,
} from "../types/api";

const PLAN_LIMITS: Record<TenantResponse["plan"], { maxBusinesses: number | null; maxStaffPerBusiness: number | null; maxProductsPerBusiness: number | null }> = {
  Trial: { maxBusinesses: 1, maxStaffPerBusiness: 3, maxProductsPerBusiness: 20 },
  Starter: { maxBusinesses: 1, maxStaffPerBusiness: 10, maxProductsPerBusiness: 200 },
  Growth: { maxBusinesses: 5, maxStaffPerBusiness: 50, maxProductsPerBusiness: 2000 },
  Enterprise: { maxBusinesses: null, maxStaffPerBusiness: null, maxProductsPerBusiness: null },
};

// Two separate flows, chosen by fulfillmentMethod (§9.47, added 2026-08-18) — a Pickup order
// moves through AwaitingPickup/PickedUp instead of OutForDelivery/Delivered. Digital orders stay
// on the Delivery/ExternalCourier set (a known backend mismatch, not fixed by this change).
const DELIVERY_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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

const PICKUP_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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

function orderTransitionsFor(fulfillmentMethod: OrderResponse["fulfillmentMethod"]): Record<OrderStatus, OrderStatus[]> {
  return fulfillmentMethod === "Pickup" ? PICKUP_ORDER_TRANSITIONS : DELIVERY_ORDER_TRANSITIONS;
}

// "Finished" = revenue recognized, agent balance credited, return/review eligible — Delivered,
// or PickedUp for a Pickup order (§9.47).
function isOrderFinished(status: OrderStatus): boolean {
  return status === "Delivered" || status === "PickedUp";
}

const STORAGE_KEY = "vastora.demoData.v1";

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || uid("item");
}

function round2(n: number): number {
  return +n.toFixed(2);
}

// Several §9B response shapes are URL-scoped on the real API and never echo `businessId` back
// (see seed.ts's `WithBusiness<T>` comment) — every getter that reads from one of those internal
// arrays runs its result through this before returning it, so the shape matches the real API.
function stripBusinessId<T extends { businessId: string }>(value: T): Omit<T, "businessId"> {
  const { businessId: _businessId, ...rest } = value;
  return rest;
}

function toSummary(u: DemoUserRecord): UserSummaryResponse {
  const { password: _password, phone: _phone, ...summary } = u;
  return summary;
}

function loadFromStorage(): DemoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no stored demo data");
    const parsed = JSON.parse(raw) as Partial<DemoData>;
    if (!parsed?.tenant || !Array.isArray(parsed.businesses)) throw new Error("corrupt demo data");
    // Backfill any §9B collections missing from a demo snapshot persisted before this session's
    // schema additions — without this, upgrading the app with existing localStorage data would
    // crash every new-area page instead of just starting those areas out empty.
    const seed = buildSeed();
    return { ...seed, ...parsed } as DemoData;
  } catch {
    const seed = buildSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

class DemoStore {
  private data: DemoData = loadFromStorage();

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  reset(): void {
    this.data = buildSeed();
    this.persist();
  }

  // ---------- auth ----------

  findUserByEmail(email: string): DemoUserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  findUserById(id: string): DemoUserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  toSummary = toSummary;

  updateProfile(userId: string, patch: { fullName: string; phone: string }): UserSummaryResponse | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.fullName = patch.fullName;
    user.phone = patch.phone;
    this.persist();
    return toSummary(user);
  }

  // ---------- tenant ----------

  getTenant(): TenantResponse {
    return this.data.tenant;
  }

  // ---------- businesses ----------

  listBusinesses(): BusinessResponse[] {
    return this.data.businesses;
  }

  getBusiness(id: string): BusinessResponse | undefined {
    return this.data.businesses.find((b) => b.id === id);
  }

  getBusinessBySlug(slug: string): BusinessResponse | undefined {
    return this.data.businesses.find((b) => b.slug === slug);
  }

  createBusiness(data: CreateBusinessRequest): BusinessResponse {
    const business: BusinessResponse = {
      id: uid("b"),
      tenantId: this.data.tenant.id,
      name: data.name,
      slug: data.slug?.trim() || slugify(data.name),
      shopDomain: null,
      backOfficeDomain: null,
      description: data.description,
      logoUrl: "",
      bannerUrl: "",
      themeColor: "#4338CA",
      currency: data.currency || "USD",
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      status: "Draft",
      deliveryModuleEnabled: true,
      defaultDeliveryFee: 0,
      createdAt: new Date().toISOString(),
      tax: { enabled: false, defaultRatePercent: 0, pricesIncludeTax: false, taxShipping: false, classRates: {}, registrationNumber: "", displayName: "Tax" },
      returnWindowDays: 14,
      reviewsEnabled: true,
      guestCheckoutEnabled: true,
    };
    this.data.businesses.push(business);
    this.data.invoicingByBusiness[business.id] = { numberPrefix: "INV-", lastNumber: 0, legalName: data.name, legalAddress: "", registrationNumber: "", footerNote: "" };
    this.persist();
    return business;
  }

  // `invoicing` is genuinely write-only on the real API — BusinessResponse never echoes it back
  // (confirmed against the live OpenAPI spec), so the demo store tracks it in a side map keyed
  // by businessId rather than on the BusinessResponse object itself.
  getInvoicingSettings(businessId: string): InvoiceSettings {
    return this.data.invoicingByBusiness[businessId] ?? { numberPrefix: "INV-", lastNumber: 0, legalName: "", legalAddress: "", registrationNumber: "", footerNote: "" };
  }

  updateBusiness(id: string, data: UpdateBusinessRequest): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    // §9B fields are patch semantics, not a full replace — omitting a section (or sending null)
    // leaves it as it was, so a pre-2026-08-16 client body still works unchanged.
    const { tax, invoicing, returnWindowDays, reviewsEnabled, autoPublishReviews: _autoPublishReviews, guestCheckoutEnabled, ...rest } = data;
    Object.assign(business, rest);
    if (tax) business.tax = tax;
    if (invoicing) {
      const current = this.getInvoicingSettings(id);
      this.data.invoicingByBusiness[id] = { ...invoicing, lastNumber: current.lastNumber }; // lastNumber ignored on write
    }
    if (returnWindowDays != null) business.returnWindowDays = returnWindowDays;
    if (reviewsEnabled != null) business.reviewsEnabled = reviewsEnabled;
    if (guestCheckoutEnabled != null) business.guestCheckoutEnabled = guestCheckoutEnabled;
    this.persist();
    return business;
  }

  setBusinessLogo(id: string, url: string): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    business.logoUrl = url;
    this.persist();
    return business;
  }

  setBusinessBanner(id: string, url: string): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    business.bannerUrl = url;
    this.persist();
    return business;
  }

  setBusinessStatus(id: string, status: BusinessStatus): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    business.status = status;
    this.persist();
    return business;
  }

  setDeliveryModule(id: string, enabled: boolean): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    business.deliveryModuleEnabled = enabled;
    this.persist();
    return business;
  }

  setDomains(id: string, data: UpdateBusinessDomainsRequest): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    business.shopDomain = data.shopDomain?.trim() || null;
    business.backOfficeDomain = data.backOfficeDomain?.trim() || null;
    this.persist();
    return business;
  }

  // ---------- mail settings (added 2026-08-19, §9.10) ----------
  // Password is genuinely write-only on the real API (never echoed back), so it's kept in the
  // side record alongside the rest and stripped off before returning, same pattern as invoicing.

  getMailSettings(businessId: string): BusinessMailSettingsResponse | null {
    if (!this.getBusiness(businessId)) return null;
    const stored = this.data.mailSettingsByBusiness[businessId];
    if (!stored) return { enabled: false, host: "", port: 587, username: "", hasPassword: false, fromAddress: "", fromName: "" };
    const { password: _password, ...rest } = stored;
    return rest;
  }

  updateMailSettings(businessId: string, data: UpdateBusinessMailSettingsRequest): BusinessMailSettingsResponse | null {
    if (!this.getBusiness(businessId)) return null;
    const current = this.data.mailSettingsByBusiness[businessId];
    const password = data.password ? data.password : (current?.password ?? "");
    const stored = {
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      username: data.username,
      hasPassword: !!password,
      fromAddress: data.fromAddress,
      fromName: data.fromName,
      password,
    };
    this.data.mailSettingsByBusiness[businessId] = stored;
    this.persist();
    const { password: _password, ...rest } = stored;
    return rest;
  }

  // ---------- categories ----------

  listCategories(businessId: string): CategoryResponse[] {
    return this.data.categories.filter((c) => c.businessId === businessId);
  }

  getCategory(businessId: string, id: string): CategoryResponse | undefined {
    return this.data.categories.find((c) => c.businessId === businessId && c.id === id);
  }

  getCategoryTree(businessId: string): CategoryTreeNode[] {
    const flat = this.listCategories(businessId);
    const toNode = (c: CategoryResponse): CategoryTreeNode => ({
      id: c.id,
      businessId: c.businessId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      children: flat.filter((child) => child.parentCategoryId === c.id).map(toNode),
    });
    return flat.filter((c) => c.parentCategoryId == null).map(toNode);
  }

  createCategory(businessId: string, data: CreateCategoryRequest): CategoryResponse {
    const category: CategoryResponse = {
      id: uid("c"),
      businessId,
      name: data.name,
      slug: data.slug?.trim() || slugify(data.name),
      parentCategoryId: data.parentCategoryId ?? null,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder,
      isActive: true,
    };
    this.data.categories.push(category);
    this.persist();
    return category;
  }

  updateCategory(businessId: string, id: string, data: UpdateCategoryRequest): CategoryResponse | null {
    const category = this.getCategory(businessId, id);
    if (!category) return null;
    Object.assign(category, data);
    this.persist();
    return category;
  }

  removeCategory(businessId: string, id: string): boolean {
    const before = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => !(c.businessId === businessId && c.id === id));
    this.persist();
    return this.data.categories.length < before;
  }

  setCategoryImage(businessId: string, id: string, url: string): CategoryResponse | null {
    const category = this.getCategory(businessId, id);
    if (!category) return null;
    category.imageUrl = url;
    this.persist();
    return category;
  }

  // ---------- products ----------

  listProducts(businessId: string, search?: string): ProductResponse[] {
    let list = this.data.products.filter((p) => p.businessId === businessId);
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return list;
  }

  getProduct(businessId: string, id: string): ProductResponse | undefined {
    return this.data.products.find((p) => p.businessId === businessId && p.id === id);
  }

  getProductById(id: string): ProductResponse | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  private normalizeVariants(requested: ProductVariantRequest[] | null | undefined): ProductVariantResponse[] {
    return (requested ?? []).map((v) => ({
      id: v.id?.trim() || uid("pv"),
      attributeSummary: v.attributeSummary,
      sku: v.sku,
      priceOverride: v.priceOverride,
      stockQuantity: v.stockQuantity,
    }));
  }

  private recomputeAvailability(product: ProductResponse): void {
    product.isAvailable = product.status === "Active" && (product.trackInventory ? product.stockQuantity > 0 : true);
  }

  createProduct(businessId: string, data: CreateProductRequest): ProductResponse {
    const costPrice = data.costPrice ?? null;
    const product: ProductResponse = {
      id: uid("p"),
      businessId,
      categoryId: data.categoryId,
      name: data.name,
      slug: data.slug?.trim() || slugify(data.name),
      sku: data.sku,
      description: data.description,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      discountPercent: null,
      discountExpiresAt: null,
      effectivePrice: data.price,
      stockQuantity: data.stockQuantity,
      trackInventory: data.trackInventory,
      reorderThreshold: null,
      reorderQuantity: null,
      images: data.images ?? [],
      tags: data.tags ?? [],
      status: "Draft",
      variants: this.normalizeVariants(data.variants),
      costPrice,
      unitMargin: costPrice != null ? round2(data.price - costPrice) : null,
      averageRating: 0,
      reviewCount: 0,
      brand: data.brand ?? "",
      barcode: data.barcode ?? "",
      weightKg: data.weightKg ?? null,
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      publishedAt: data.publishedAt ?? null,
      unpublishedAt: data.unpublishedAt ?? null,
      isFeatured: data.isFeatured ?? false,
      sortWeight: data.sortWeight ?? 0,
      taxClass: data.taxClass ?? "",
      isAvailable: false,
    };
    this.data.products.push(product);
    this.persist();
    return product;
  }

  updateProduct(businessId: string, id: string, data: UpdateProductRequest): ProductResponse | null {
    const product = this.getProduct(businessId, id);
    if (!product) return null;
    const { variants, costPrice, brand, barcode, weightKg, metaTitle, metaDescription, publishedAt, unpublishedAt, isFeatured, sortWeight, taxClass, ...rest } = data;
    Object.assign(product, rest);
    product.variants = this.normalizeVariants(variants);
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (brand !== undefined) product.brand = brand;
    if (barcode !== undefined) product.barcode = barcode;
    if (weightKg !== undefined) product.weightKg = weightKg;
    if (metaTitle !== undefined) product.metaTitle = metaTitle;
    if (metaDescription !== undefined) product.metaDescription = metaDescription;
    if (publishedAt !== undefined) product.publishedAt = publishedAt;
    if (unpublishedAt !== undefined) product.unpublishedAt = unpublishedAt;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (sortWeight !== undefined) product.sortWeight = sortWeight;
    if (taxClass !== undefined) product.taxClass = taxClass;
    const discount = product.discountPercent && product.discountPercent > 0 ? product.discountPercent : 0;
    product.effectivePrice = discount ? round2(product.price * (1 - discount / 100)) : product.price;
    product.unitMargin = product.costPrice != null ? round2(product.effectivePrice - product.costPrice) : null;
    this.recomputeAvailability(product);
    this.persist();
    return product;
  }

  addProductImage(businessId: string, id: string, url: string): ProductResponse | null {
    const product = this.getProduct(businessId, id);
    if (!product) return null;
    product.images = [...product.images, url];
    this.persist();
    return product;
  }

  setProductStatus(businessId: string, id: string, status: ProductStatus): ProductResponse | null {
    const product = this.getProduct(businessId, id);
    if (!product) return null;
    product.status = status;
    this.recomputeAvailability(product);
    this.persist();
    return product;
  }

  removeProduct(businessId: string, id: string): boolean {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter((p) => !(p.businessId === businessId && p.id === id));
    this.persist();
    return this.data.products.length < before;
  }

  importProductsCsv(businessId: string, csvText: string): { created: number; updated: number; skipped: number; errors: string[] } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { created: 0, updated: 0, skipped: 0, errors: ["File is empty."] };
    const rows = lines.slice(1);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    rows.forEach((line, i) => {
      const cols = line.split(",").map((c) => c.trim());
      const [sku, name, categorySlug, description, price, costPrice, stockQuantity, brand, barcode, weightKg, tags] = cols;
      if (!sku || !name) {
        skipped++;
        errors.push(`Row ${i + 2}: missing sku or name.`);
        return;
      }
      const category = this.data.categories.find((c) => c.businessId === businessId && c.slug === categorySlug);
      if (!category) {
        skipped++;
        errors.push(`Row ${i + 2}: category "${categorySlug}" not found — skipped.`);
        return;
      }
      const existing = this.data.products.find((p) => p.businessId === businessId && p.sku === sku);
      if (existing) {
        existing.name = name;
        existing.categoryId = category.id;
        existing.description = description ?? existing.description;
        existing.price = Number(price) || existing.price;
        existing.costPrice = costPrice ? Number(costPrice) : existing.costPrice;
        existing.stockQuantity = stockQuantity ? Number(stockQuantity) : existing.stockQuantity;
        existing.brand = brand ?? existing.brand;
        existing.barcode = barcode ?? existing.barcode;
        existing.weightKg = weightKg ? Number(weightKg) : existing.weightKg;
        existing.tags = tags ? tags.split("|").map((t) => t.trim()).filter(Boolean) : existing.tags;
        existing.unitMargin = existing.costPrice != null ? round2(existing.effectivePrice - existing.costPrice) : null;
        updated++;
      } else {
        this.createProduct(businessId, {
          categoryId: category.id,
          name,
          sku,
          description: description ?? "",
          price: Number(price) || 0,
          stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
          trackInventory: true,
          costPrice: costPrice ? Number(costPrice) : null,
          brand: brand ?? "",
          barcode: barcode ?? "",
          weightKg: weightKg ? Number(weightKg) : null,
          tags: tags ? tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
        });
        created++;
      }
    });
    this.persist();
    return { created, updated, skipped, errors };
  }

  exportProductsCsv(businessId: string): string {
    const header = "sku,name,category,description,price,costPrice,stockQuantity,brand,barcode,weightKg,tags";
    const categoryById = new Map(this.data.categories.map((c) => [c.id, c.slug]));
    const rows = this.listProducts(businessId).map((p) =>
      [
        p.sku,
        p.name,
        categoryById.get(p.categoryId) ?? "",
        p.description,
        p.price,
        p.costPrice ?? "",
        p.stockQuantity,
        p.brand,
        p.barcode,
        p.weightKg ?? "",
        p.tags.join("|"),
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }

  // ---------- inventory ----------

  listStockMovements(businessId: string, productId: string): StockMovementResponse[] {
    const productIds = new Set(this.data.products.filter((p) => p.businessId === businessId).map((p) => p.id));
    return this.data.stockMovements.filter((m) => m.productId === productId && productIds.has(m.productId));
  }

  adjustStock(businessId: string, productId: string, data: AdjustStockRequest, userId: string | null): ProductResponse | null {
    const product = this.getProduct(businessId, productId);
    if (!product) return null;
    product.stockQuantity += data.quantityDelta;
    this.recomputeAvailability(product);
    const movement: StockMovementResponse = {
      id: uid("sm"),
      productId,
      type: data.type,
      quantityDelta: data.quantityDelta,
      reason: data.reason,
      referenceOrderId: null,
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
    };
    this.data.stockMovements.push(movement);
    this.persist();
    return product;
  }

  getLowStock(businessId: string): LowStockProductResponse[] {
    return this.data.products
      .filter((p) => p.businessId === businessId && p.reorderThreshold != null && p.stockQuantity <= p.reorderThreshold)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        reorderThreshold: p.reorderThreshold!,
        reorderQuantity: p.reorderQuantity,
      }));
  }

  // CHANGED 2026-08-16 (§9.31) — cost/retail split, replaces the old flat `totalValue` (which
  // valued stock at retail and overstated balance-sheet assets by the whole margin).
  getValuation(businessId: string): InventoryValuationResponse {
    const products = this.data.products.filter((p) => p.businessId === businessId);
    const byCategory = new Map<string, { cost: number; retail: number }>();
    let unvaluedProductCount = 0;
    for (const p of products) {
      const retailValue = p.price * p.stockQuantity;
      const costValue = p.costPrice != null ? p.costPrice * p.stockQuantity : 0;
      if (p.costPrice == null && p.stockQuantity > 0) unvaluedProductCount++;
      const entry = byCategory.get(p.categoryId) ?? { cost: 0, retail: 0 };
      entry.cost += costValue;
      entry.retail += retailValue;
      byCategory.set(p.categoryId, entry);
    }
    const byCategoryEntries = [...byCategory.entries()].map(([categoryId, v]) => ({
      categoryId,
      valueAtCost: round2(v.cost),
      valueAtRetail: round2(v.retail),
    }));
    const totalValueAtCost = round2(byCategoryEntries.reduce((sum, e) => sum + e.valueAtCost, 0));
    const totalValueAtRetail = round2(byCategoryEntries.reduce((sum, e) => sum + e.valueAtRetail, 0));
    return {
      totalValueAtCost,
      totalValueAtRetail,
      potentialMargin: round2(totalValueAtRetail - totalValueAtCost),
      unvaluedProductCount,
      byCategory: byCategoryEntries,
    };
  }

  // ---------- coupons ----------

  listCoupons(businessId: string): CouponResponse[] {
    return this.data.coupons.filter((c) => c.businessId === businessId);
  }

  getCoupon(businessId: string, id: string): CouponResponse | undefined {
    return this.data.coupons.find((c) => c.businessId === businessId && c.id === id);
  }

  createCoupon(businessId: string, data: CreateCouponRequest): CouponResponse {
    const coupon: CouponResponse = {
      id: uid("cp"),
      businessId,
      code: data.code.toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount ?? null,
      maxUses: data.maxUses ?? null,
      usedCount: 0,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt ?? null,
      isActive: true,
      visibility: data.visibility ?? "Public",
    };
    this.data.coupons.push(coupon);
    this.persist();
    return coupon;
  }

  updateCoupon(businessId: string, id: string, data: UpdateCouponRequest): CouponResponse | null {
    const coupon = this.getCoupon(businessId, id);
    if (!coupon) return null;
    Object.assign(coupon, data);
    this.persist();
    return coupon;
  }

  removeCoupon(businessId: string, id: string): boolean {
    const before = this.data.coupons.length;
    this.data.coupons = this.data.coupons.filter((c) => !(c.businessId === businessId && c.id === id));
    this.persist();
    return this.data.coupons.length < before;
  }

  // ---------- staff & customers ----------

  listStaff(businessId: string): UserSummaryResponse[] {
    return this.data.users
      .filter((u) => u.businessId === businessId && ["BusinessAdmin", "BusinessStaff", "DeliveryAgent"].includes(u.role))
      .map(toSummary);
  }

  createStaff(businessId: string, data: CreateStaffRequest): UserSummaryResponse {
    const user: DemoUserRecord = {
      id: uid("u"),
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      role: data.role,
      tenantId: this.data.tenant.id,
      businessId,
      status: "Active",
    };
    this.data.users.push(user);
    if (data.role === "DeliveryAgent") {
      this.data.deliveryAgents.push({
        id: uid("da"),
        businessId,
        userId: user.id,
        status: "Offline",
        completedDeliveries: 0,
        deliveryCharge: 3.0,
        levelCode: 1,
        balance: 0,
      });
    }
    this.persist();
    return toSummary(user);
  }

  setStaffStatus(businessId: string, userId: string, status: UserStatus): UserSummaryResponse | null {
    const user = this.data.users.find((u) => u.id === userId && u.businessId === businessId);
    if (!user) return null;
    user.status = status;
    if (status === "Blocked") {
      const agent = this.data.deliveryAgents.find((a) => a.userId === userId && a.businessId === businessId);
      if (agent) agent.status = "Blocked";
    }
    this.persist();
    return toSummary(user);
  }

  listCustomers(businessId: string): UserSummaryResponse[] {
    return this.data.users.filter((u) => u.businessId === businessId && u.role === "Customer").map(toSummary);
  }

  // ---------- delivery agents ----------

  listDeliveryAgents(businessId: string): DeliveryAgentResponse[] {
    return this.data.deliveryAgents.filter((a) => a.businessId === businessId);
  }

  getMyDeliveryAgent(businessId: string, userId: string): DeliveryAgentResponse | undefined {
    return this.data.deliveryAgents.find((a) => a.businessId === businessId && a.userId === userId);
  }

  setDeliveryAgentStatus(businessId: string, userId: string, status: DeliveryAgentStatus): DeliveryAgentResponse | null {
    const agent = this.getMyDeliveryAgent(businessId, userId);
    if (!agent) return null;
    agent.status = status;
    this.persist();
    return agent;
  }

  // ---------- orders ----------

  listOrders(
    businessId: string,
    filters: { status?: string; paymentStatus?: string; search?: string; from?: string; to?: string } = {},
  ): OrderResponse[] {
    let list = this.data.orders.filter((o) => o.businessId === businessId);
    if (filters.status) list = list.filter((o) => o.status === filters.status);
    if (filters.paymentStatus) list = list.filter((o) => o.paymentStatus === filters.paymentStatus);
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((o) => o.orderNumber.toLowerCase().includes(q) || o.contactEmail.toLowerCase().includes(q));
    }
    if (filters.from) {
      const fromT = +new Date(filters.from);
      list = list.filter((o) => +new Date(o.placedAt) >= fromT);
    }
    if (filters.to) {
      const toT = +new Date(filters.to);
      list = list.filter((o) => +new Date(o.placedAt) <= toT);
    }
    return [...list].sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));
  }

  listOrdersAssignedToMe(businessId: string, userId: string): OrderResponse[] {
    return this.data.orders
      .filter((o) => o.businessId === businessId && o.deliveryAgentUserId === userId)
      .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));
  }

  getOrder(businessId: string, id: string): OrderResponse | undefined {
    return this.data.orders.find((o) => o.businessId === businessId && o.id === id);
  }

  setOrderStatus(businessId: string, id: string, data: UpdateOrderStatusRequest): OrderResponse | { error: string } | null {
    const order = this.getOrder(businessId, id);
    if (!order) return null;
    if (!orderTransitionsFor(order.fulfillmentMethod)[order.status].includes(data.status)) {
      return { error: `Cannot move an order from '${order.status}' to '${data.status}'.` };
    }
    order.status = data.status;
    order.statusHistory.push({ status: data.status, timestamp: new Date().toISOString(), note: data.note ?? "" });
    if (isOrderFinished(data.status)) {
      order.paymentStatus = "Paid";
      if (order.deliveryAgentUserId) {
        const agent = this.data.deliveryAgents.find((a) => a.businessId === businessId && a.userId === order.deliveryAgentUserId);
        if (agent) {
          agent.balance = round2(agent.balance + agent.deliveryCharge);
          agent.completedDeliveries += 1;
        }
      }
    }
    if (data.status === "Cancelled") {
      if (order.paymentStatus === "Paid") {
        order.paymentStatus = "Refunded";
        order.paymentStatusHistory.push({ status: "Refunded", timestamp: new Date().toISOString(), note: "Refunded on cancellation." });
        order.refundedAmount = order.total;
        order.amountDue = 0;
      }
      for (const item of order.items) {
        const product = this.getProduct(businessId, item.productId);
        if (product?.trackInventory) {
          product.stockQuantity += item.quantity;
          this.recomputeAvailability(product);
          this.data.stockMovements.push({
            id: uid("sm"),
            productId: product.id,
            type: "Return",
            quantityDelta: item.quantity,
            reason: `Order ${order.orderNumber} cancelled`,
            referenceOrderId: order.id,
            createdByUserId: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    this.persist();
    return order;
  }

  setPaymentStatus(businessId: string, id: string, status: PaymentStatus, note: string | null): OrderResponse | null {
    const order = this.getOrder(businessId, id);
    if (!order) return null;
    order.paymentStatus = status;
    order.paymentStatusHistory.push({ status, timestamp: new Date().toISOString(), note: note ?? "" });
    order.amountDue = status === "Paid" || status === "Refunded" ? 0 : order.total;
    this.persist();
    return order;
  }

  assignDelivery(businessId: string, id: string, deliveryAgentUserId: string): OrderResponse | null {
    const order = this.getOrder(businessId, id);
    if (!order) return null;
    order.deliveryAgentUserId = deliveryAgentUserId;
    this.persist();
    return order;
  }

  setShipment(businessId: string, id: string, data: UpdateShipmentRequest): OrderResponse | null {
    const order = this.getOrder(businessId, id);
    if (!order) return null;
    order.carrierName = data.carrierName;
    order.trackingNumber = data.trackingNumber;
    order.trackingUrl = data.trackingUrl;
    order.shippingMethodName = data.shippingMethodName;
    // Recording a tracking number ships the order — mirrors the real API's side effect so the
    // BackOffice UI never needs a second manual status change afterward. Naturally a no-op for a
    // Pickup order (§9.47) — OutForDelivery isn't in its transition set.
    if (data.trackingNumber && orderTransitionsFor(order.fulfillmentMethod)[order.status].includes("OutForDelivery")) {
      order.status = "OutForDelivery";
      order.statusHistory.push({ status: "OutForDelivery", timestamp: new Date().toISOString(), note: `Shipped via ${data.carrierName ?? "courier"}.` });
    }
    this.persist();
    return order;
  }

  // `internalNote` is genuinely write-only on the real API — OrderResponse never echoes it back
  // (confirmed against the live OpenAPI spec) — so there's nothing meaningful for the demo store
  // to persist or for the UI to prefill; this just validates the order exists.
  setInternalNote(businessId: string, id: string): OrderResponse | null {
    return this.getOrder(businessId, id) ?? null;
  }

  getInvoice(businessId: string, id: string): InvoiceResponse | null {
    const order = this.getOrder(businessId, id);
    const business = this.getBusiness(businessId);
    if (!order || !business) return null;
    const invoicing = this.getInvoicingSettings(businessId);
    if (!order.invoiceNumber) {
      invoicing.lastNumber += 1;
      order.invoiceNumber = `${invoicing.numberPrefix}${String(invoicing.lastNumber).padStart(5, "0")}`;
      this.persist();
    }
    const buyer = order.customerUserId ? this.findUserById(order.customerUserId) : undefined;
    const discountTotal = round2(order.discounts.reduce((sum, d) => sum + d.amount, 0));
    return {
      invoiceNumber: order.invoiceNumber,
      issuedAt: new Date().toISOString(),
      orderNumber: order.orderNumber,
      orderPlacedAt: order.placedAt,
      sellerLegalName: invoicing.legalName,
      sellerAddress: invoicing.legalAddress,
      sellerRegistrationNumber: invoicing.registrationNumber,
      sellerTaxRegistrationNumber: business.tax.registrationNumber,
      buyerName: buyer?.fullName ?? order.shippingAddress?.label ?? "Guest",
      buyerEmail: order.contactEmail,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      items: order.items,
      subtotal: order.subtotal,
      discounts: order.discounts,
      discountTotal,
      deliveryFee: order.deliveryFee,
      taxLabel: business.tax.displayName,
      taxRatePercent: order.taxRatePercent,
      taxAmount: order.taxAmount,
      pricesIncludeTax: order.pricesIncludeTax,
      total: order.total,
      amountPaid: round2(order.total - order.amountDue),
      amountDue: order.amountDue,
      currency: order.currency,
      footerNote: invoicing.footerNote,
    };
  }

  // ---------- returns / RMAs (added 2026-08-16, §9.21) ----------

  listReturns(businessId: string, status?: string): ReturnResponse[] {
    let list = this.data.returns.filter((r) => r.businessId === businessId);
    if (status) list = list.filter((r) => r.status === status);
    return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map(stripBusinessId);
  }

  getReturn(businessId: string, id: string): (typeof this.data.returns)[number] | undefined {
    return this.data.returns.find((r) => r.businessId === businessId && r.id === id);
  }

  decideReturn(businessId: string, id: string, data: DecideReturnRequest): ReturnResponse | { error: string } | null {
    const ret = this.getReturn(businessId, id);
    if (!ret) return null;
    if (ret.status !== "Requested") return { error: `This return is already ${ret.status}.` };
    const amount = data.approvedRefundAmount ?? ret.requestedRefundAmount;
    if (amount > ret.requestedRefundAmount) return { error: "Approved amount can't exceed the requested amount." };
    ret.status = data.approve ? "Approved" : "Rejected";
    ret.approvedRefundAmount = data.approve ? amount : null;
    ret.statusHistory.push({ status: ret.status, timestamp: new Date().toISOString(), note: data.note ?? null });
    this.persist();
    return stripBusinessId(ret);
  }

  markReturnReceived(businessId: string, id: string): ReturnResponse | { error: string } | null {
    const ret = this.getReturn(businessId, id);
    if (!ret) return null;
    if (ret.status !== "Approved") return { error: "Only an approved return can be marked received." };
    ret.status = "Received";
    ret.statusHistory.push({ status: "Received", timestamp: new Date().toISOString(), note: null });
    // Damaged returns don't restock — a DamageWriteOff-flavored note is recorded instead.
    ret.restocked = ret.reason !== "Damaged";
    for (const item of ret.items) {
      const product = this.getProductById(item.productId);
      if (!product?.trackInventory) continue;
      if (ret.restocked) {
        product.stockQuantity += item.quantity;
        this.recomputeAvailability(product);
      }
      this.data.stockMovements.push({
        id: uid("sm"),
        productId: product.id,
        type: ret.restocked ? "Return" : "DamageWriteOff",
        quantityDelta: ret.restocked ? item.quantity : 0,
        reason: `Return ${ret.rmaNumber} received`,
        referenceOrderId: ret.orderId,
        createdByUserId: null,
        createdAt: new Date().toISOString(),
      });
    }
    this.persist();
    return stripBusinessId(ret);
  }

  refundReturn(businessId: string, id: string): ReturnResponse | { error: string } | null {
    const ret = this.getReturn(businessId, id);
    if (!ret) return null;
    // §9.49 (added 2026-08-18) — an Exchange-resolution return settles through /exchange instead;
    // calling /refund on one 409s so it can't accidentally move money for a swap that shouldn't.
    if (ret.resolution === "Exchange") return { error: "This return is resolved as an Exchange — use the Exchange action instead." };
    if (ret.status !== "Received") return { error: "A return must be received before it can be refunded." };
    ret.status = "Refunded";
    ret.refundedAt = new Date().toISOString();
    ret.statusHistory.push({ status: "Refunded", timestamp: ret.refundedAt, note: null });
    const order = this.getOrder(businessId, ret.orderId);
    if (order && ret.approvedRefundAmount) {
      order.refundedAmount = round2(order.refundedAmount + ret.approvedRefundAmount);
      for (const retItem of ret.items) {
        const orderItem = order.items.find((i) => i.productId === retItem.productId);
        if (orderItem) orderItem.refundedQuantity += retItem.quantity;
      }
      // §9.48 (added 2026-08-18) — a refund also reverses the returned lines' costOfGoodsSold and
      // their share of taxCollected, not just `refunds`. Both figures are computed dynamically off
      // `refundedQuantity` (see getProfitAndLoss/getBalanceSheet), so bumping it above is enough —
      // no separate ledger entry to write here.
    }
    this.persist();
    return stripBusinessId(ret);
  }

  // §9.49 (added 2026-08-18) — Staff-tier, not Admin: an exchange moves no money. Ships the
  // desired variant (stock deducted, 409 if it's since sold out) and updates the order's own
  // items to match — same line if the whole quantity was exchanged, a new line otherwise.
  exchangeReturn(businessId: string, id: string): ReturnResponse | { error: string } | null {
    const ret = this.getReturn(businessId, id);
    if (!ret) return null;
    if (ret.resolution !== "Exchange") return { error: "This return isn't resolved as an Exchange — use the Refund action instead." };
    if (ret.status !== "Received") return { error: "A return must be received before it can be exchanged." };

    for (const retItem of ret.items) {
      if (!retItem.desiredVariantId) continue;
      const product = this.getProductById(retItem.productId);
      const desiredVariant = product?.variants.find((v) => v.id === retItem.desiredVariantId);
      if (desiredVariant && desiredVariant.stockQuantity < retItem.quantity) {
        return { error: `${desiredVariant.attributeSummary} has since sold out — can't complete this exchange.` };
      }
    }

    ret.status = "Exchanged";
    ret.exchanged = true;
    ret.exchangedAt = new Date().toISOString();
    ret.statusHistory.push({ status: "Exchanged", timestamp: ret.exchangedAt, note: null });

    const order = this.getOrder(businessId, ret.orderId);
    for (const retItem of ret.items) {
      if (!retItem.desiredVariantId) continue;
      const product = this.getProductById(retItem.productId);
      const desiredVariant = product?.variants.find((v) => v.id === retItem.desiredVariantId);
      if (desiredVariant) desiredVariant.stockQuantity -= retItem.quantity;

      const orderItem = order?.items.find((i) => i.productId === retItem.productId && i.variantId === retItem.variantId);
      if (!orderItem) continue;
      if (orderItem.quantity === retItem.quantity) {
        orderItem.variantId = retItem.desiredVariantId;
        orderItem.variantSummary = retItem.desiredVariantSummary;
      } else if (order) {
        orderItem.quantity -= retItem.quantity;
        orderItem.lineTotal = round2(orderItem.unitPrice * orderItem.quantity);
        order.items.push({
          productId: retItem.productId,
          variantId: retItem.desiredVariantId,
          variantSummary: retItem.desiredVariantSummary,
          productName: orderItem.productName,
          unitPrice: orderItem.unitPrice,
          quantity: retItem.quantity,
          refundedQuantity: 0,
          lineTotal: round2(orderItem.unitPrice * retItem.quantity),
        });
      }
    }
    this.persist();
    return stripBusinessId(ret);
  }

  // ---------- reviews (added 2026-08-16, §9.25) ----------

  listReviews(businessId: string, status?: string): ReviewResponse[] {
    let list = this.data.reviews.filter((r) => r.businessId === businessId);
    if (status) list = list.filter((r) => r.status === status);
    return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map(stripBusinessId);
  }

  private recomputeProductRating(productId: string): void {
    const published = this.data.reviews.filter((r) => r.productId === productId && r.status === "Published");
    const product = this.getProductById(productId);
    if (!product) return;
    product.reviewCount = published.length;
    product.averageRating = published.length ? round2(published.reduce((sum, r) => sum + r.rating, 0) / published.length) : 0;
  }

  setReviewStatus(businessId: string, id: string, status: ReviewStatus): ReviewResponse | null {
    const review = this.data.reviews.find((r) => r.businessId === businessId && r.id === id);
    if (!review) return null;
    review.status = status;
    this.recomputeProductRating(review.productId);
    this.persist();
    return stripBusinessId(review);
  }

  replyToReview(businessId: string, id: string, reply: string): ReviewResponse | null {
    const review = this.data.reviews.find((r) => r.businessId === businessId && r.id === id);
    if (!review) return null;
    review.merchantReply = reply;
    review.merchantRepliedAt = new Date().toISOString();
    this.persist();
    return stripBusinessId(review);
  }

  removeReview(businessId: string, id: string): boolean {
    const review = this.data.reviews.find((r) => r.businessId === businessId && r.id === id);
    if (!review) return false;
    this.data.reviews = this.data.reviews.filter((r) => r.id !== id);
    this.recomputeProductRating(review.productId);
    this.persist();
    return true;
  }

  // ---------- merchandising: promotions, customer groups, gift cards, store credit, shipping zones, content ----------

  private promotionIsLiveNow(p: { startsAt: string; endsAt: string | null; isActive: boolean }): boolean {
    const now = Date.now();
    return p.isActive && +new Date(p.startsAt) <= now && (p.endsAt == null || +new Date(p.endsAt) >= now);
  }

  listPromotions(businessId: string): PromotionResponse[] {
    return this.data.promotions.filter((p) => p.businessId === businessId).map((p) => stripBusinessId({ ...p, isLiveNow: this.promotionIsLiveNow(p) }));
  }

  createPromotion(businessId: string, data: CreatePromotionRequest): PromotionResponse {
    const promo = { id: uid("promo"), businessId, usedCount: 0, isLiveNow: false, visibility: "Public" as const, ...data };
    promo.isLiveNow = this.promotionIsLiveNow(promo);
    this.data.promotions.push(promo);
    this.persist();
    return stripBusinessId(promo);
  }

  updatePromotion(businessId: string, id: string, data: CreatePromotionRequest): PromotionResponse | null {
    const promo = this.data.promotions.find((p) => p.businessId === businessId && p.id === id);
    if (!promo) return null;
    Object.assign(promo, data);
    promo.isLiveNow = this.promotionIsLiveNow(promo);
    this.persist();
    return stripBusinessId(promo);
  }

  removePromotion(businessId: string, id: string): boolean {
    const before = this.data.promotions.length;
    this.data.promotions = this.data.promotions.filter((p) => !(p.businessId === businessId && p.id === id));
    this.persist();
    return this.data.promotions.length < before;
  }

  listCustomerGroups(businessId: string): CustomerGroupResponse[] {
    return this.data.customerGroups
      .filter((g) => g.businessId === businessId)
      .map((g) => stripBusinessId({ ...g, memberCount: this.data.customerGroupMembers.filter((m) => m.groupId === g.id).length }));
  }

  createCustomerGroup(businessId: string, data: CustomerGroupRequest): CustomerGroupResponse {
    const group = { id: uid("cg"), businessId, memberCount: 0, ...data };
    this.data.customerGroups.push(group);
    this.persist();
    return stripBusinessId(group);
  }

  updateCustomerGroup(businessId: string, id: string, data: CustomerGroupRequest): CustomerGroupResponse | null {
    const group = this.data.customerGroups.find((g) => g.businessId === businessId && g.id === id);
    if (!group) return null;
    Object.assign(group, data);
    this.persist();
    return stripBusinessId(group);
  }

  removeCustomerGroup(businessId: string, id: string): boolean {
    const before = this.data.customerGroups.length;
    this.data.customerGroups = this.data.customerGroups.filter((g) => !(g.businessId === businessId && g.id === id));
    this.data.customerGroupMembers = this.data.customerGroupMembers.filter((m) => m.groupId !== id);
    this.persist();
    return this.data.customerGroups.length < before;
  }

  addCustomerGroupMembers(groupId: string, customerUserIds: string[]): void {
    for (const customerUserId of customerUserIds) {
      if (!this.data.customerGroupMembers.some((m) => m.groupId === groupId && m.customerUserId === customerUserId)) {
        this.data.customerGroupMembers.push({ groupId, customerUserId });
      }
    }
    this.persist();
  }

  removeCustomerGroupMembers(groupId: string, customerUserIds: string[]): void {
    const remove = new Set(customerUserIds);
    this.data.customerGroupMembers = this.data.customerGroupMembers.filter((m) => !(m.groupId === groupId && remove.has(m.customerUserId)));
    this.persist();
  }

  listGiftCards(businessId: string): GiftCardResponse[] {
    return this.data.giftCards.filter((g) => g.businessId === businessId).map((g) => stripBusinessId({ ...g, code: null }));
  }

  issueGiftCard(businessId: string, data: IssueGiftCardRequest): GiftCardResponse {
    const plaintext = `GIFT-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const business = this.getBusiness(businessId);
    const card = {
      id: uid("gc"),
      businessId,
      codeSuffix: plaintext.slice(-4),
      code: plaintext,
      initialBalance: data.amount,
      remainingBalance: data.amount,
      currency: business?.currency ?? "USD",
      issuedToEmail: data.issuedToEmail,
      expiresAt: data.expiresAt,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.data.giftCards.push(card);
    this.persist();
    return stripBusinessId(card);
  }

  deactivateGiftCard(businessId: string, id: string): boolean {
    const card = this.data.giftCards.find((g) => g.businessId === businessId && g.id === id);
    if (!card) return false;
    card.isActive = false;
    this.persist();
    return true;
  }

  giftCardLiability(businessId: string): number {
    return round2(this.data.giftCards.filter((g) => g.businessId === businessId && g.isActive).reduce((sum, g) => sum + g.remainingBalance, 0));
  }

  storeCreditStatement(businessId: string, customerUserId: string): StoreCreditBalanceResponse {
    const entries = this.data.storeCredit
      .filter((e) => e.businessId === businessId && e.customerUserId === customerUserId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const business = this.getBusiness(businessId);
    return {
      balance: round2(entries.reduce((sum, e) => sum + e.amount, 0)),
      currency: business?.currency ?? "USD",
      recentEntries: entries.map(stripBusinessId).map(({ customerUserId: _c, ...rest }) => rest),
    };
  }

  grantStoreCredit(businessId: string, customerUserId: string, data: GrantStoreCreditRequest): void {
    const business = this.getBusiness(businessId);
    this.data.storeCredit.push({
      id: uid("sc"),
      businessId,
      customerUserId,
      amount: data.amount,
      currency: business?.currency ?? "USD",
      reason: "ManualAdjustment",
      note: data.note || null,
      referenceOrderId: null,
      createdAt: new Date().toISOString(),
    });
    this.persist();
  }

  sendDiscountEmail(_businessId: string, data: SendDiscountEmailRequest): SendDiscountEmailResult {
    const recipientIds = new Set(data.customerUserIds ?? []);
    if (data.customerGroupId) {
      this.data.customerGroupMembers.filter((m) => m.groupId === data.customerGroupId).forEach((m) => recipientIds.add(m.customerUserId));
    }
    // The demo has no marketing opt-out modeled on customers, so everyone in scope "receives" it.
    const totalRecipients = recipientIds.size;
    return { totalRecipients, sent: totalRecipients, skippedOptedOut: 0 };
  }

  listShippingZones(businessId: string): ShippingZoneResponse[] {
    return this.data.shippingZones.filter((z) => z.businessId === businessId).map(stripBusinessId);
  }

  createShippingZone(businessId: string, data: CreateShippingZoneRequest): ShippingZoneResponse {
    const zone = { id: uid("zone"), businessId, ...data, rates: data.rates.map((r) => ({ ...r, id: uid("rate") })) };
    this.data.shippingZones.push(zone);
    this.persist();
    return stripBusinessId(zone);
  }

  updateShippingZone(businessId: string, id: string, data: CreateShippingZoneRequest): ShippingZoneResponse | null {
    const zone = this.data.shippingZones.find((z) => z.businessId === businessId && z.id === id);
    if (!zone) return null;
    Object.assign(zone, data);
    // Editing a zone replaces its whole rates array and issues new ids — mirrors the real API.
    zone.rates = data.rates.map((r) => ({ ...r, id: uid("rate") }));
    this.persist();
    return stripBusinessId(zone);
  }

  removeShippingZone(businessId: string, id: string): boolean {
    const before = this.data.shippingZones.length;
    this.data.shippingZones = this.data.shippingZones.filter((z) => !(z.businessId === businessId && z.id === id));
    this.persist();
    return this.data.shippingZones.length < before;
  }

  private contentIsVisibleNow(c: { isPublished: boolean; startsAt: string | null; endsAt: string | null }): boolean {
    const now = Date.now();
    return c.isPublished && (c.startsAt == null || +new Date(c.startsAt) <= now) && (c.endsAt == null || +new Date(c.endsAt) >= now);
  }

  listContent(businessId: string, type?: string): ContentBlockResponse[] {
    let list = this.data.content.filter((c) => c.businessId === businessId);
    if (type) list = list.filter((c) => c.type === type);
    return list.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => stripBusinessId({ ...c, isVisibleNow: this.contentIsVisibleNow(c) }));
  }

  createContent(businessId: string, data: ContentBlockRequest): ContentBlockResponse {
    const block = { id: uid("cb"), businessId, isVisibleNow: false, ...data };
    block.isVisibleNow = this.contentIsVisibleNow(block);
    this.data.content.push(block);
    this.persist();
    return stripBusinessId(block);
  }

  updateContent(businessId: string, id: string, data: ContentBlockRequest): ContentBlockResponse | null {
    const block = this.data.content.find((c) => c.businessId === businessId && c.id === id);
    if (!block) return null;
    Object.assign(block, data);
    block.isVisibleNow = this.contentIsVisibleNow(block);
    this.persist();
    return stripBusinessId(block);
  }

  removeContent(businessId: string, id: string): boolean {
    const before = this.data.content.length;
    this.data.content = this.data.content.filter((c) => !(c.businessId === businessId && c.id === id));
    this.persist();
    return this.data.content.length < before;
  }

  setContentImage(businessId: string, id: string, url: string): ContentBlockResponse | null {
    const block = this.data.content.find((c) => c.businessId === businessId && c.id === id);
    if (!block) return null;
    block.imageUrl = url;
    this.persist();
    return stripBusinessId(block);
  }

  // ---------- audit log (added 2026-08-16, §9.35) ----------
  // Populated centrally by the router's dispatch wrapper (see router.ts) rather than by each
  // individual route handler — every mutation across every area lands here automatically.

  recordAudit(entry: Omit<AuditLogResponse, "id">): void {
    this.data.auditLog.unshift({ id: uid("audit"), ...entry });
    if (this.data.auditLog.length > 500) this.data.auditLog.length = 500;
    this.persist();
  }

  listAuditLog(businessId: string, filters: { userId?: string; resourceId?: string; from?: string; to?: string }): AuditLogResponse[] {
    const businessResourceIds = new Set([
      ...this.data.products.filter((p) => p.businessId === businessId).map((p) => p.id),
      ...this.data.orders.filter((o) => o.businessId === businessId).map((o) => o.id),
      ...this.data.categories.filter((c) => c.businessId === businessId).map((c) => c.id),
      businessId,
    ]);
    let list = this.data.auditLog.filter((a) => !a.resourceId || businessResourceIds.has(a.resourceId) || a.path.includes(businessId));
    if (filters.userId) list = list.filter((a) => a.userId === filters.userId);
    if (filters.resourceId) list = list.filter((a) => a.resourceId === filters.resourceId);
    if (filters.from) {
      const fromT = +new Date(filters.from);
      list = list.filter((a) => +new Date(a.createdAt) >= fromT);
    }
    if (filters.to) {
      const toT = +new Date(filters.to);
      list = list.filter((a) => +new Date(a.createdAt) <= toT);
    }
    return list;
  }

  // ---------- accounting (reshaped 2026-08-16, §9.31) ----------

  listExpenses(businessId: string): ExpenseResponse[] {
    return this.data.expenses.filter((e) => e.businessId === businessId);
  }

  createExpense(businessId: string, data: CreateExpenseRequest, userId: string): ExpenseResponse {
    const expense: ExpenseResponse = { id: uid("exp"), businessId, createdByUserId: userId, ...data };
    this.data.expenses.push(expense);
    this.persist();
    return expense;
  }

  updateExpense(businessId: string, id: string, data: UpdateExpenseRequest): ExpenseResponse | null {
    const expense = this.data.expenses.find((e) => e.businessId === businessId && e.id === id);
    if (!expense) return null;
    Object.assign(expense, data);
    this.persist();
    return expense;
  }

  removeExpense(businessId: string, id: string): boolean {
    const before = this.data.expenses.length;
    this.data.expenses = this.data.expenses.filter((e) => !(e.businessId === businessId && e.id === id));
    this.persist();
    return this.data.expenses.length < before;
  }

  // Revenue-recognition rule shared with getDashboard() and SuperOffice's getAnalytics() —
  // "Delivered = revenue" is stated three times across both blueprints specifically so these
  // numbers never quietly disagree; keep every caller going through this one helper. Treats
  // PickedUp the same as Delivered for a Pickup order (§9.47, added 2026-08-18).
  private deliveredOrdersInWindow(businessId: string, fromT: number, toT: number): OrderResponse[] {
    return this.data.orders.filter((o) => o.businessId === businessId && isOrderFinished(o.status) && +new Date(o.placedAt) >= fromT && +new Date(o.placedAt) <= toT);
  }

  // §9.48 (added 2026-08-18) — no line-level tax breakdown exists on OrderResponse, so a
  // refund's share of tax is prorated by the fraction of the order's quantity that's been
  // returned, the same basis the COGS reversal above uses.
  private orderRemainingTax(order: OrderResponse): number {
    const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQty === 0) return order.taxAmount;
    const refundedQty = order.items.reduce((sum, i) => sum + i.refundedQuantity, 0);
    return order.taxAmount * (1 - refundedQty / totalQty);
  }

  getProfitAndLoss(businessId: string, from: string, to: string): ProfitAndLossResponse {
    const fromT = +new Date(from);
    const toT = +new Date(to);
    const windowOrders = this.data.orders.filter((o) => o.businessId === businessId && +new Date(o.placedAt) >= fromT && +new Date(o.placedAt) <= toT);
    const delivered = this.deliveredOrdersInWindow(businessId, fromT, toT);
    const revenue = delivered.reduce((sum, o) => sum + o.total, 0);
    const refunds = windowOrders.filter((o) => o.paymentStatus === "Refunded").reduce((sum, o) => sum + o.total, 0);
    const expenses = this.data.expenses
      .filter((e) => e.businessId === businessId && +new Date(e.incurredAt) >= fromT && +new Date(e.incurredAt) <= toT)
      .reduce((sum, e) => sum + e.amount, 0);
    const deliveryPayouts = delivered
      .filter((o) => o.deliveryAgentUserId)
      .reduce((sum, o) => {
        const agent = this.data.deliveryAgents.find((a) => a.businessId === businessId && a.userId === o.deliveryAgentUserId);
        return sum + (agent?.deliveryCharge ?? 0);
      }, 0);
    // §9.48 (added 2026-08-18) — a refund reverses the returned lines' costOfGoodsSold and their
    // share of taxCollected, not just `refunds`. Both are computed fresh here off `quantity` net
    // of `refundedQuantity` (see refundReturn — a refund is what bumps refundedQuantity), so the
    // reversal falls out of the same loop rather than needing a separate ledger adjustment.
    let costOfGoodsSold = 0;
    let uncostedOrderCount = 0;
    for (const order of delivered) {
      let hasUncosted = false;
      for (const item of order.items) {
        const remainingQty = item.quantity - item.refundedQuantity;
        if (remainingQty <= 0) continue;
        const product = this.getProductById(item.productId);
        if (product?.costPrice != null) costOfGoodsSold += product.costPrice * remainingQty;
        else hasUncosted = true;
      }
      if (hasUncosted) uncostedOrderCount++;
    }
    const grossProfit = revenue - refunds - costOfGoodsSold;
    const grossMarginPercent = revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(1) : 0;
    const netProfit = grossProfit - expenses - deliveryPayouts;
    const taxCollected = delivered.reduce((sum, o) => sum + this.orderRemainingTax(o), 0);
    return {
      from,
      to,
      revenue: round2(revenue),
      refunds: round2(refunds),
      costOfGoodsSold: round2(costOfGoodsSold),
      grossProfit: round2(grossProfit),
      grossMarginPercent,
      expenses: round2(expenses),
      deliveryPayouts: round2(deliveryPayouts),
      netProfit: round2(netProfit),
      taxCollected: round2(taxCollected),
      uncostedOrderCount,
    };
  }

  getBalanceSheet(businessId: string): BalanceSheetResponse {
    const orders = this.data.orders.filter((o) => o.businessId === businessId);
    const revenue = orders.filter((o) => isOrderFinished(o.status)).reduce((sum, o) => sum + o.total, 0);
    const refunds = orders.filter((o) => o.paymentStatus === "Refunded").reduce((sum, o) => sum + o.total, 0);
    const expensesTotal = this.data.expenses.filter((e) => e.businessId === businessId).reduce((sum, e) => sum + e.amount, 0);
    const cashPosition = round2(revenue - refunds - expensesTotal);
    const valuation = this.getValuation(businessId);
    // §9.48 — a refund reverses its share of tax payable too, same basis as the P&L (see
    // orderRemainingTax).
    const taxPayable = round2(orders.filter((o) => isOrderFinished(o.status)).reduce((sum, o) => sum + this.orderRemainingTax(o), 0));
    const giftCardLiability = this.giftCardLiability(businessId);
    const totalAssets = round2(cashPosition + valuation.totalValueAtCost);
    const totalLiabilities = round2(taxPayable + giftCardLiability);
    return {
      cashPosition,
      inventoryValueAtCost: valuation.totalValueAtCost,
      inventoryValueAtRetail: valuation.totalValueAtRetail,
      totalAssets,
      taxPayable,
      giftCardLiability,
      totalLiabilities,
      netPosition: round2(totalAssets - totalLiabilities),
    };
  }

  // ---------- dashboard (added 2026-08-16, §9.32) ----------

  getDashboard(businessId: string, from: string, to: string): BusinessDashboardResponse {
    const fromT = +new Date(from);
    const toT = +new Date(to);
    const windowOrders = this.data.orders.filter((o) => o.businessId === businessId && +new Date(o.placedAt) >= fromT && +new Date(o.placedAt) <= toT);
    const nonCancelled = windowOrders.filter((o) => o.status !== "Cancelled");
    const delivered = this.deliveredOrdersInWindow(businessId, fromT, toT);
    const pnl = this.getProfitAndLoss(businessId, from, to);
    const revenue = pnl.revenue;

    const customerOrderCounts = new Map<string, number>();
    for (const o of delivered) {
      if (!o.customerUserId) continue;
      customerOrderCounts.set(o.customerUserId, (customerOrderCounts.get(o.customerUserId) ?? 0) + 1);
    }
    const uniqueCustomers = customerOrderCounts.size;
    const repeatCustomers = [...customerOrderCounts.values()].filter((n) => n > 1).length;

    const byDay = new Map<string, { revenue: number; orderCount: number }>();
    for (const o of nonCancelled) {
      const day = o.placedAt.slice(0, 10);
      const entry = byDay.get(day) ?? { revenue: 0, orderCount: 0 };
      entry.orderCount += 1;
      if (isOrderFinished(o.status)) entry.revenue += o.total;
      byDay.set(day, entry);
    }
    const dailySales = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, revenue: round2(v.revenue), orderCount: v.orderCount }));

    const productStats = new Map<string, { productId: string; productName: string; quantitySold: number; revenue: number }>();
    for (const o of delivered) {
      for (const item of o.items) {
        const entry = productStats.get(item.productId) ?? { productId: item.productId, productName: item.productName, quantitySold: 0, revenue: 0 };
        entry.quantitySold += item.quantity;
        entry.revenue += item.lineTotal;
        productStats.set(item.productId, entry);
      }
    }
    const topProducts = [...productStats.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5).map((p) => ({ ...p, revenue: round2(p.revenue) }));

    const statusCounts = new Map<string, number>();
    for (const o of windowOrders) statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
    const statusBreakdown = [...statusCounts.entries()].map(([status, count]) => ({ status, count }));

    const business = this.getBusiness(businessId);

    return {
      from,
      to,
      revenue,
      grossProfit: pnl.grossProfit,
      orderCount: nonCancelled.length,
      deliveredCount: delivered.length,
      cancelledCount: windowOrders.filter((o) => o.status === "Cancelled").length,
      averageOrderValue: delivered.length ? round2(revenue / delivered.length) : 0,
      uniqueCustomers,
      repeatCustomers,
      repeatCustomerRate: uniqueCustomers ? round2((repeatCustomers / uniqueCustomers) * 100) : 0,
      newCustomers: uniqueCustomers - repeatCustomers,
      pendingReturns: this.data.returns.filter((r) => r.businessId === businessId && r.status === "Requested").length,
      lowStockCount: this.getLowStock(businessId).length,
      dailySales,
      topProducts,
      statusBreakdown,
      currency: business?.currency ?? "USD",
    };
  }

  // ---------- tenant usage & analytics (SuperOffice) ----------

  getTenantUsage(): TenantUsageResponse {
    const limits = PLAN_LIMITS[this.data.tenant.plan];
    const businesses = this.data.businesses.map((b) => ({
      businessId: b.id,
      businessName: b.name,
      staffCount: this.data.users.filter((u) => u.businessId === b.id && ["BusinessAdmin", "BusinessStaff", "DeliveryAgent"].includes(u.role)).length,
      maxStaffPerBusiness: limits.maxStaffPerBusiness,
      productCount: this.data.products.filter((p) => p.businessId === b.id).length,
      maxProductsPerBusiness: limits.maxProductsPerBusiness,
    }));
    return { plan: this.data.tenant.plan, businessCount: this.data.businesses.length, maxBusinesses: limits.maxBusinesses, businesses };
  }

  getAnalytics(): TenantAnalyticsResponse {
    const businesses = this.data.businesses.map((b) => {
      const orders = this.data.orders.filter((o) => o.businessId === b.id);
      const revenue = orders.filter((o) => isOrderFinished(o.status)).reduce((sum, o) => sum + o.total, 0);
      const orderCount = orders.filter((o) => o.status !== "Cancelled").length;
      return { businessId: b.id, businessName: b.name, orderCount, revenue: round2(revenue) };
    });
    const productStats = new Map<string, { productId: string; productName: string; quantitySold: number; revenue: number }>();
    for (const order of this.data.orders) {
      if (!isOrderFinished(order.status)) continue;
      for (const item of order.items) {
        const entry = productStats.get(item.productId) ?? { productId: item.productId, productName: item.productName, quantitySold: 0, revenue: 0 };
        entry.quantitySold += item.quantity;
        entry.revenue += item.lineTotal;
        productStats.set(item.productId, entry);
      }
    }
    const topProducts = [...productStats.values()]
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: round2(p.revenue) }));
    return {
      totalRevenue: round2(businesses.reduce((sum, b) => sum + b.revenue, 0)),
      totalOrders: businesses.reduce((sum, b) => sum + b.orderCount, 0),
      businesses,
      topProducts,
    };
  }

  // ---------- integrations: webhooks & API keys (added 2026-08-16, §9.39) ----------

  webhookEventNames(): string[] {
    // order.picked_up added 2026-08-18, §9.47 — the Pickup-order equivalent of order.delivered;
    // fired instead of it, never alongside it, when a Pickup order reaches PickedUp.
    return ["order.created", "order.status_changed", "order.delivered", "order.picked_up", "product.low_stock", "return.requested", "review.submitted"];
  }

  listWebhooks(): WebhookResponse[] {
    return this.data.webhooks.map((w) => ({ ...w, secret: null }));
  }

  createWebhook(data: CreateWebhookRequest): WebhookResponse {
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    const webhook: WebhookResponse = {
      id: uid("wh"),
      url: data.url,
      events: data.events,
      description: data.description,
      businessId: data.businessId,
      isActive: true,
      secret,
      lastDeliveryAt: null,
      consecutiveFailures: 0,
      disabledAt: null,
      createdAt: new Date().toISOString(),
    };
    this.data.webhooks.push(webhook);
    // A couple of synthetic delivery rows so the deliveries log has something real to show,
    // without simulating an actual delivery engine (see BACKOFFICE_FRONTEND_BLUEPRINT.md's
    // demo-mode notes on why webhooks don't attempt real HTTP delivery from the browser).
    this.data.webhookDeliveries.push(
      { id: uid("whd"), eventName: data.events[0] ?? "order.created", responseStatusCode: 200, error: null, attemptCount: 1, succeeded: true, createdAt: new Date().toISOString() },
    );
    this.persist();
    return webhook;
  }

  removeWebhook(id: string): boolean {
    const before = this.data.webhooks.length;
    this.data.webhooks = this.data.webhooks.filter((w) => w.id !== id);
    this.persist();
    return this.data.webhooks.length < before;
  }

  listWebhookDeliveries(webhookId: string): WebhookDeliveryResponse[] {
    void webhookId;
    return this.data.webhookDeliveries;
  }

  listApiKeys(): ApiKeyResponse[] {
    return this.data.apiKeys.map((k) => ({ ...k, secret: null }));
  }

  createApiKey(data: CreateApiKeyRequest): ApiKeyResponse {
    const keyId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const secretPart = crypto.randomUUID().replace(/-/g, "");
    const key: ApiKeyResponse = {
      id: uid("key"),
      name: data.name,
      keyId,
      secret: `${keyId}.${secretPart}`,
      businessId: data.businessId ?? "",
      scopes: data.scopes ?? ["read"],
      expiresAt: data.expiresAt,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.data.apiKeys.push(key);
    this.persist();
    return key;
  }

  revokeApiKey(id: string): boolean {
    const key = this.data.apiKeys.find((k) => k.id === id);
    if (!key) return false;
    key.revokedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  // ---------- password reset ----------

  private resetTokens = new Map<string, string>();

  requestPasswordReset(email: string): void {
    const user = this.findUserByEmail(email);
    if (!user) return;
    const token = uid("reset");
    this.resetTokens.set(token, user.id);
    // Mirrors the real backend: no email provider wired in yet, the reset link only ever
    // reaches a server log — this is that log, stood in by the browser console.
    console.info(`[Showcase] Password reset requested for ${email}. Reset link: ${window.location.origin}/reset-password?token=${token}`);
  }

  resetPassword(token: string, newPassword: string): boolean {
    const userId = this.resetTokens.get(token);
    if (!userId) return false;
    const user = this.findUserById(userId);
    if (!user) return false;
    user.password = newPassword;
    this.resetTokens.delete(token);
    this.persist();
    return true;
  }
}

export const demoStore = new DemoStore();
