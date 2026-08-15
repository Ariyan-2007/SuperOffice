import { buildSeed, type DemoData, type DemoUserRecord } from "./seed";
import type {
  BusinessResponse,
  BusinessStatus,
  CategoryResponse,
  CouponResponse,
  CreateBusinessRequest,
  CreateCategoryRequest,
  CreateCouponRequest,
  CreateProductRequest,
  CreateStaffRequest,
  DeliveryAgentResponse,
  DeliveryAgentStatus,
  OrderResponse,
  ProductResponse,
  ProductStatus,
  TenantResponse,
  UpdateBusinessRequest,
  UpdateCategoryRequest,
  UpdateCouponRequest,
  UpdateOrderStatusRequest,
  UpdateProductRequest,
  UserStatus,
  UserSummaryResponse,
} from "../types/api";

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
      images: data.images ?? [],
      tags: data.tags ?? [],
      status: "Draft",
    };
    this.data.products.push(product);
    this.persist();
    return product;
  }

  updateProduct(businessId: string, id: string, data: UpdateProductRequest): ProductResponse | null {
    const product = this.getProduct(businessId, id);
    if (!product) return null;
    Object.assign(product, data);
    const discount = product.discountPercent && product.discountPercent > 0 ? product.discountPercent : 0;
    product.effectivePrice = discount ? +(product.price * (1 - discount / 100)).toFixed(2) : product.price;
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

  setOrderStatus(businessId: string, id: string, data: UpdateOrderStatusRequest): OrderResponse | null {
    const order = this.getOrder(businessId, id);
    if (!order) return null;
    order.status = data.status;
    if (data.status === "Delivered") order.paymentStatus = "Paid";
    if (data.status === "Cancelled") {
      order.paymentStatus = order.paymentStatus === "Paid" ? "Refunded" : order.paymentStatus;
      for (const item of order.items) {
        const product = this.getProduct(businessId, item.productId);
        if (product?.trackInventory) product.stockQuantity += item.quantity;
      }
    }
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
}

export const demoStore = new DemoStore();
