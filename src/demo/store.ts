import { buildSeed, type DemoData, type DemoUserRecord } from "./seed";
import type {
  AdjustStockRequest,
  BalanceSheetResponse,
  BusinessResponse,
  BusinessStatus,
  CategoryResponse,
  CategoryTreeNode,
  CouponResponse,
  CreateBusinessRequest,
  CreateCategoryRequest,
  CreateCouponRequest,
  CreateExpenseRequest,
  CreateProductRequest,
  CreateStaffRequest,
  DeliveryAgentResponse,
  DeliveryAgentStatus,
  ExpenseResponse,
  InventoryValuationResponse,
  LowStockProductResponse,
  OrderResponse,
  OrderStatus,
  PaymentStatus,
  ProductResponse,
  ProductStatus,
  ProductVariantRequest,
  ProductVariantResponse,
  ProfitAndLossResponse,
  StockMovementResponse,
  TenantAnalyticsResponse,
  TenantResponse,
  TenantUsageResponse,
  UpdateBusinessRequest,
  UpdateCategoryRequest,
  UpdateCouponRequest,
  UpdateExpenseRequest,
  UpdateOrderStatusRequest,
  UpdateProductRequest,
  UserStatus,
  UserSummaryResponse,
} from "../types/api";

const PLAN_LIMITS: Record<TenantResponse["plan"], { maxBusinesses: number | null; maxStaffPerBusiness: number | null; maxProductsPerBusiness: number | null }> = {
  Trial: { maxBusinesses: 1, maxStaffPerBusiness: 3, maxProductsPerBusiness: 20 },
  Starter: { maxBusinesses: 1, maxStaffPerBusiness: 10, maxProductsPerBusiness: 200 },
  Growth: { maxBusinesses: 5, maxStaffPerBusiness: 50, maxProductsPerBusiness: 2000 },
  Enterprise: { maxBusinesses: null, maxStaffPerBusiness: null, maxProductsPerBusiness: null },
};

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PendingPayment: ["Processing", "Cancelled"],
  Processing: ["Confirmed", "OutForDelivery", "Cancelled"],
  Confirmed: ["OutForDelivery", "Cancelled"],
  OutForDelivery: ["Delivered", "Cancelled"],
  Delivered: ["Refunded"],
  Cancelled: [],
  Refunded: [],
};

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

function toSummary(u: DemoUserRecord): UserSummaryResponse {
  const { password: _password, phone: _phone, ...summary } = u;
  return summary;
}

function loadFromStorage(): DemoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no stored demo data");
    const parsed = JSON.parse(raw) as DemoData;
    if (!parsed?.tenant || !Array.isArray(parsed.businesses)) throw new Error("corrupt demo data");
    return parsed;
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
      customDomain: null,
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
    };
    this.data.businesses.push(business);
    this.persist();
    return business;
  }

  updateBusiness(id: string, data: UpdateBusinessRequest): BusinessResponse | null {
    const business = this.getBusiness(id);
    if (!business) return null;
    Object.assign(business, data);
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

  // ---------- products ----------

  listProducts(businessId: string): ProductResponse[] {
    return this.data.products.filter((p) => p.businessId === businessId);
  }

  getProduct(businessId: string, id: string): ProductResponse | undefined {
    return this.data.products.find((p) => p.businessId === businessId && p.id === id);
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

  createProduct(businessId: string, data: CreateProductRequest): ProductResponse {
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
    };
    this.data.products.push(product);
    this.persist();
    return product;
  }

  updateProduct(businessId: string, id: string, data: UpdateProductRequest): ProductResponse | null {
    const product = this.getProduct(businessId, id);
    if (!product) return null;
    const { variants, ...rest } = data;
    Object.assign(product, rest);
    product.variants = this.normalizeVariants(variants);
    const discount = product.discountPercent && product.discountPercent > 0 ? product.discountPercent : 0;
    product.effectivePrice = discount ? +(product.price * (1 - discount / 100)).toFixed(2) : product.price;
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
    this.persist();
    return product;
  }

  removeProduct(businessId: string, id: string): boolean {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter((p) => !(p.businessId === businessId && p.id === id));
    this.persist();
    return this.data.products.length < before;
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

  getValuation(businessId: string): InventoryValuationResponse {
    const products = this.data.products.filter((p) => p.businessId === businessId);
    const byCategory = new Map<string, number>();
    for (const p of products) {
      const value = p.price * p.stockQuantity;
      byCategory.set(p.categoryId, (byCategory.get(p.categoryId) ?? 0) + value);
    }
    const entries = [...byCategory.entries()].map(([categoryId, value]) => ({ categoryId, value: +value.toFixed(2) }));
    return { totalValue: +entries.reduce((sum, e) => sum + e.value, 0).toFixed(2), byCategory: entries };
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
      expiresAt: data.expiresAt,
      isActive: true,
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

  listOrders(businessId: string): OrderResponse[] {
    return this.data.orders.filter((o) => o.businessId === businessId);
  }

  listOrdersAssignedToMe(businessId: string, userId: string): OrderResponse[] {
    return this.data.orders.filter((o) => o.businessId === businessId && o.deliveryAgentUserId === userId);
  }

  getOrder(businessId: string, id: string): OrderResponse | undefined {
    return this.data.orders.find((o) => o.businessId === businessId && o.id === id);
  }

  setOrderStatus(businessId: string, id: string, data: UpdateOrderStatusRequest): OrderResponse | { error: string } | null {
    const order = this.getOrder(businessId, id);
    if (!order) return null;
    if (!ORDER_TRANSITIONS[order.status].includes(data.status)) {
      return { error: `Cannot move an order from '${order.status}' to '${data.status}'.` };
    }
    order.status = data.status;
    order.statusHistory.push({ status: data.status, timestamp: new Date().toISOString(), note: data.note ?? "" });
    if (data.status === "Delivered") {
      order.paymentStatus = "Paid";
      if (order.deliveryAgentUserId) {
        const agent = this.data.deliveryAgents.find((a) => a.businessId === businessId && a.userId === order.deliveryAgentUserId);
        if (agent) {
          agent.balance = +(agent.balance + agent.deliveryCharge).toFixed(2);
          agent.completedDeliveries += 1;
        }
      }
    }
    if (data.status === "Cancelled") {
      if (order.paymentStatus === "Paid") {
        order.paymentStatus = "Refunded";
        order.paymentStatusHistory.push({ status: "Refunded", timestamp: new Date().toISOString(), note: "Refunded on cancellation." });
      }
      for (const item of order.items) {
        const product = this.getProduct(businessId, item.productId);
        if (product?.trackInventory) {
          product.stockQuantity += item.quantity;
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

  // ---------- accounting ----------

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

  getProfitAndLoss(businessId: string, from: string, to: string): ProfitAndLossResponse {
    const fromT = +new Date(from);
    const toT = +new Date(to);
    const orders = this.data.orders.filter((o) => o.businessId === businessId && +new Date(o.placedAt) >= fromT && +new Date(o.placedAt) <= toT);
    const revenue = orders.filter((o) => o.status === "Delivered").reduce((sum, o) => sum + o.total, 0);
    const refunds = orders.filter((o) => o.paymentStatus === "Refunded").reduce((sum, o) => sum + o.total, 0);
    const expenses = this.data.expenses
      .filter((e) => e.businessId === businessId && +new Date(e.incurredAt) >= fromT && +new Date(e.incurredAt) <= toT)
      .reduce((sum, e) => sum + e.amount, 0);
    const deliveryPayouts = orders
      .filter((o) => o.status === "Delivered" && o.deliveryAgentUserId)
      .reduce((sum, o) => {
        const agent = this.data.deliveryAgents.find((a) => a.businessId === businessId && a.userId === o.deliveryAgentUserId);
        return sum + (agent?.deliveryCharge ?? 0);
      }, 0);
    const round = (n: number) => +n.toFixed(2);
    return {
      from,
      to,
      revenue: round(revenue),
      refunds: round(refunds),
      expenses: round(expenses),
      deliveryPayouts: round(deliveryPayouts),
      netProfit: round(revenue - refunds - expenses - deliveryPayouts),
    };
  }

  getBalanceSheet(businessId: string): BalanceSheetResponse {
    const orders = this.data.orders.filter((o) => o.businessId === businessId);
    const revenue = orders.filter((o) => o.status === "Delivered").reduce((sum, o) => sum + o.total, 0);
    const refunds = orders.filter((o) => o.paymentStatus === "Refunded").reduce((sum, o) => sum + o.total, 0);
    const expensesTotal = this.data.expenses.filter((e) => e.businessId === businessId).reduce((sum, e) => sum + e.amount, 0);
    const cashPosition = +(revenue - refunds - expensesTotal).toFixed(2);
    const inventoryValue = this.getValuation(businessId).totalValue;
    return { cashPosition, inventoryValue, totalAssets: +(cashPosition + inventoryValue).toFixed(2) };
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
      const revenue = orders.filter((o) => o.status === "Delivered").reduce((sum, o) => sum + o.total, 0);
      const orderCount = orders.filter((o) => o.status !== "Cancelled").length;
      return { businessId: b.id, businessName: b.name, orderCount, revenue: +revenue.toFixed(2) };
    });
    const productStats = new Map<string, { productId: string; productName: string; quantitySold: number; revenue: number }>();
    for (const order of this.data.orders) {
      if (order.status !== "Delivered") continue;
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
      .map((p) => ({ ...p, revenue: +p.revenue.toFixed(2) }));
    return {
      totalRevenue: +businesses.reduce((sum, b) => sum + b.revenue, 0).toFixed(2),
      totalOrders: businesses.reduce((sum, b) => sum + b.orderCount, 0),
      businesses,
      topProducts,
    };
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
