// Thin, typed wrappers over every Vastora endpoint used by this app. Grouped by resource,
// mirroring §7 of the BackOffice blueprint and §6 of the SuperOffice blueprint.
import { http } from "./client";
import { API_BASE_URL } from "../config/env";
import { isDemoMode } from "../demo/state";
import { demoStore } from "../demo/store";
import type {
  AdjustStockRequest,
  ApiKeyResponse,
  AssignDeliveryAgentRequest,
  AuditLogQuery,
  AuditLogResponse,
  AuthResponse,
  BalanceSheetResponse,
  BusinessDashboardResponse,
  BusinessResponse,
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
  InvoiceResponse,
  InventoryValuationResponse,
  IssueGiftCardRequest,
  LowStockProductResponse,
  OrderQuery,
  OrderResponse,
  PagedResult,
  ProductImportResult,
  ProductQuery,
  ProductResponse,
  ProfitAndLossResponse,
  PromotionResponse,
  ReturnResponse,
  ReviewResponse,
  ReviewStatus,
  SendDiscountEmailRequest,
  SendDiscountEmailResult,
  ShippingZoneResponse,
  StockMovementResponse,
  StoreCreditBalanceResponse,
  TenantAnalyticsResponse,
  TenantResponse,
  TenantUsageResponse,
  UpdateBusinessRequest,
  UpdateCategoryRequest,
  UpdateCouponRequest,
  UpdateExpenseRequest,
  UpdateOrderNoteRequest,
  UpdateOrderStatusRequest,
  UpdatePaymentStatusRequest,
  UpdateProductRequest,
  UpdateShipmentRequest,
  UserSummaryResponse,
  WebhookDeliveryResponse,
  WebhookResponse,
} from "../types/api";

// ---------- public, unauthenticated ----------

export async function fetchBusinessBySlug(slug: string): Promise<BusinessResponse> {
  if (isDemoMode()) {
    const business = demoStore.getBusinessBySlug(slug);
    if (!business) throw Object.assign(new Error(`No active Business found for slug "${slug}".`), { status: 404 });
    return business;
  }

  const res = await fetch(`${API_BASE_URL}/api/shop/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw Object.assign(new Error(body?.title ?? `Business lookup failed (${res.status})`), {
      status: res.status,
    });
  }
  return res.json();
}

// ---------- auth ----------

export const authApi = {
  login: (email: string, password: string) => http.post<AuthResponse>("/api/auth/login", { email, password }).then((r) => r.data),
  refresh: (refreshToken: string) => http.post<AuthResponse>("/api/auth/refresh", { refreshToken }).then((r) => r.data),
  logout: (refreshToken: string) => http.post<void>("/api/auth/logout", { refreshToken }).then((r) => r.data),
  me: () => http.get<UserSummaryResponse>("/api/auth/me").then((r) => r.data),
  updateMe: (data: { fullName: string; phone: string }) => http.put<UserSummaryResponse>("/api/auth/me", data).then((r) => r.data),
  forgotPassword: (email: string) => http.post<void>("/api/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token: string, newPassword: string) =>
    http.post<void>("/api/auth/reset-password", { token, newPassword }).then((r) => r.data),
};

// ---------- tenant (SuperOffice) ----------

export const tenantApi = {
  me: () => http.get<TenantResponse>("/api/tenants/me").then((r) => r.data),
  usage: () => http.get<TenantUsageResponse>("/api/tenants/me/usage").then((r) => r.data),
};

// ---------- superoffice analytics ----------

export const analyticsApi = {
  get: () => http.get<TenantAnalyticsResponse>("/api/superoffice/analytics").then((r) => r.data),
};

// ---------- superoffice businesses ----------
// NOT paged, verified against the live API's OpenAPI spec — the blueprint's §9.18 banner claims
// "every list endpoint," but this one genuinely still returns a bare array with no page/pageSize
// params. Small list (one Tenant's Businesses), so this isn't a practical problem either way.

export const superOfficeBusinessApi = {
  list: () => http.get<BusinessResponse[]>("/api/superoffice/businesses").then((r) => r.data),
  create: (data: CreateBusinessRequest) => http.post<BusinessResponse>("/api/superoffice/businesses", data).then((r) => r.data),
  get: (businessId: string) => http.get<BusinessResponse>(`/api/superoffice/businesses/${businessId}`).then((r) => r.data),
  update: (businessId: string, data: UpdateBusinessRequest) =>
    http.put<BusinessResponse>(`/api/superoffice/businesses/${businessId}`, data).then((r) => r.data),
  setStatus: (businessId: string, status: BusinessResponse["status"]) =>
    http.patch<BusinessResponse>(`/api/superoffice/businesses/${businessId}/status`, JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.data),
};

// ---------- backoffice business profile ----------

export const businessApi = {
  get: (businessId: string) => http.get<BusinessResponse>(`/api/businesses/${businessId}`).then((r) => r.data),
  update: (businessId: string, data: UpdateBusinessRequest) =>
    http.put<BusinessResponse>(`/api/businesses/${businessId}`, data).then((r) => r.data),
  // Shared route, not under /superoffice/ — but a TenantOwner's JWT works here too, so
  // SuperOffice's Business detail page calls this same function.
  setDeliveryModule: (businessId: string, enabled: boolean) =>
    http.patch<BusinessResponse>(`/api/businesses/${businessId}/delivery-module`, { enabled }).then((r) => r.data),
  // Added 2026-08-18 — same shape as product images (§7.4): multipart, field `file`, 5MB limit.
  // logoUrl/bannerUrl on UpdateBusinessRequest still work for setting a URL directly.
  uploadLogo: (businessId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post<BusinessResponse>(`/api/businesses/${businessId}/logo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  uploadBanner: (businessId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post<BusinessResponse>(`/api/businesses/${businessId}/banner`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

// ---------- categories ----------

export const categoryApi = {
  list: (businessId: string) => http.get<CategoryResponse[]>(`/api/businesses/${businessId}/categories`).then((r) => r.data),
  tree: (businessId: string) => http.get<CategoryTreeNode[]>(`/api/businesses/${businessId}/categories/tree`).then((r) => r.data),
  get: (businessId: string, categoryId: string) =>
    http.get<CategoryResponse>(`/api/businesses/${businessId}/categories/${categoryId}`).then((r) => r.data),
  create: (businessId: string, data: CreateCategoryRequest) =>
    http.post<CategoryResponse>(`/api/businesses/${businessId}/categories`, data).then((r) => r.data),
  update: (businessId: string, categoryId: string, data: UpdateCategoryRequest) =>
    http.put<CategoryResponse>(`/api/businesses/${businessId}/categories/${categoryId}`, data).then((r) => r.data),
  remove: (businessId: string, categoryId: string) =>
    http.delete<void>(`/api/businesses/${businessId}/categories/${categoryId}`).then((r) => r.data),
  // Added 2026-08-18 — same shape as product images (§7.4): multipart, field `file`, 5MB limit.
  // Requires an existing category (create it first without an image, then upload).
  uploadImage: (businessId: string, categoryId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post<CategoryResponse>(`/api/businesses/${businessId}/categories/${categoryId}/image`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

// ---------- products ----------
// Paged + server-side `search` as of 2026-08-16 (§9.18 breaking-change banner).

export const productApi = {
  list: (businessId: string, query: ProductQuery = {}) =>
    http.get<PagedResult<ProductResponse>>(`/api/businesses/${businessId}/products`, { params: query }).then((r) => r.data),
  get: (businessId: string, productId: string) =>
    http.get<ProductResponse>(`/api/businesses/${businessId}/products/${productId}`).then((r) => r.data),
  create: (businessId: string, data: CreateProductRequest) =>
    http.post<ProductResponse>(`/api/businesses/${businessId}/products`, data).then((r) => r.data),
  update: (businessId: string, productId: string, data: UpdateProductRequest) =>
    http.put<ProductResponse>(`/api/businesses/${businessId}/products/${productId}`, data).then((r) => r.data),
  setStatus: (businessId: string, productId: string, status: ProductResponse["status"]) =>
    http.patch<ProductResponse>(`/api/businesses/${businessId}/products/${productId}/status`, JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.data),
  remove: (businessId: string, productId: string) =>
    http.delete<void>(`/api/businesses/${businessId}/products/${productId}`).then((r) => r.data),
  uploadImage: (businessId: string, productId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post<ProductResponse>(`/api/businesses/${businessId}/products/${productId}/images`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  // §7.14 — not JSON in/out like the rest of the API: import takes a file, export returns a
  // CSV download, so both are special-cased here rather than the usual `.then(r => r.data)`.
  importCsv: (businessId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post<ProductImportResult>(`/api/businesses/${businessId}/products/import`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  exportCsv: (businessId: string) =>
    http.get<string>(`/api/businesses/${businessId}/products/export`, { responseType: "text" }).then((r) => r.data),
};

// ---------- inventory ----------

export const inventoryApi = {
  stockMovements: (businessId: string, productId: string, page = 1, pageSize = 100) =>
    http
      .get<PagedResult<StockMovementResponse>>(`/api/businesses/${businessId}/products/${productId}/stock-movements`, { params: { page, pageSize } })
      .then((r) => r.data),
  adjustStock: (businessId: string, productId: string, data: AdjustStockRequest) =>
    http.post<ProductResponse>(`/api/businesses/${businessId}/products/${productId}/stock-adjustments`, data).then((r) => r.data),
  lowStock: (businessId: string) =>
    http.get<LowStockProductResponse[]>(`/api/businesses/${businessId}/inventory/low-stock`).then((r) => r.data),
  valuation: (businessId: string) =>
    http.get<InventoryValuationResponse>(`/api/businesses/${businessId}/inventory/valuation`).then((r) => r.data),
};

// ---------- accounting (Admin-tier only) ----------

export const accountingApi = {
  listExpenses: (businessId: string) => http.get<ExpenseResponse[]>(`/api/businesses/${businessId}/expenses`).then((r) => r.data),
  createExpense: (businessId: string, data: CreateExpenseRequest) =>
    http.post<ExpenseResponse>(`/api/businesses/${businessId}/expenses`, data).then((r) => r.data),
  updateExpense: (businessId: string, expenseId: string, data: UpdateExpenseRequest) =>
    http.put<ExpenseResponse>(`/api/businesses/${businessId}/expenses/${expenseId}`, data).then((r) => r.data),
  removeExpense: (businessId: string, expenseId: string) =>
    http.delete<void>(`/api/businesses/${businessId}/expenses/${expenseId}`).then((r) => r.data),
  profitAndLoss: (businessId: string, from: string, to: string) =>
    http
      .get<ProfitAndLossResponse>(`/api/businesses/${businessId}/accounting/profit-and-loss`, { params: { from, to } })
      .then((r) => r.data),
  balanceSheet: (businessId: string) =>
    http.get<BalanceSheetResponse>(`/api/businesses/${businessId}/accounting/balance-sheet`).then((r) => r.data),
};

// ---------- coupons ----------

export const couponApi = {
  list: (businessId: string) => http.get<CouponResponse[]>(`/api/businesses/${businessId}/coupons`).then((r) => r.data),
  create: (businessId: string, data: CreateCouponRequest) =>
    http.post<CouponResponse>(`/api/businesses/${businessId}/coupons`, data).then((r) => r.data),
  update: (businessId: string, couponId: string, data: UpdateCouponRequest) =>
    http.put<CouponResponse>(`/api/businesses/${businessId}/coupons/${couponId}`, data).then((r) => r.data),
  remove: (businessId: string, couponId: string) =>
    http.delete<void>(`/api/businesses/${businessId}/coupons/${couponId}`).then((r) => r.data),
};

// ---------- staff & customers ----------

export const staffApi = {
  list: (businessId: string) => http.get<UserSummaryResponse[]>(`/api/businesses/${businessId}/staff`).then((r) => r.data),
  create: (businessId: string, data: CreateStaffRequest) =>
    http.post<UserSummaryResponse>(`/api/businesses/${businessId}/staff`, data).then((r) => r.data),
  setStatus: (businessId: string, userId: string, status: UserSummaryResponse["status"]) =>
    http.patch<UserSummaryResponse>(`/api/businesses/${businessId}/staff/${userId}/status`, JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.data),
};

export const customerApi = {
  list: (businessId: string) => http.get<UserSummaryResponse[]>(`/api/businesses/${businessId}/customers`).then((r) => r.data),
};

// ---------- delivery agents ----------

export const deliveryAgentApi = {
  list: (businessId: string) => http.get<DeliveryAgentResponse[]>(`/api/businesses/${businessId}/delivery-agents`).then((r) => r.data),
  me: (businessId: string) => http.get<DeliveryAgentResponse>(`/api/businesses/${businessId}/delivery-agents/me`).then((r) => r.data),
  setMyStatus: (businessId: string, status: DeliveryAgentStatus) =>
    http.patch<DeliveryAgentResponse>(`/api/businesses/${businessId}/delivery-agents/me/status`, { status }).then((r) => r.data),
  setStatus: (businessId: string, userId: string, status: DeliveryAgentStatus) =>
    http.patch<DeliveryAgentResponse>(`/api/businesses/${businessId}/delivery-agents/${userId}/status`, { status }).then((r) => r.data),
};

// ---------- orders ----------
// Paged + server-side filters as of 2026-08-16 (§9.18) — status/paymentStatus/search/from/to.

export const orderApi = {
  list: (businessId: string, query: OrderQuery = {}) =>
    http.get<PagedResult<OrderResponse>>(`/api/businesses/${businessId}/orders`, { params: query }).then((r) => r.data),
  assignedToMe: (businessId: string, page = 1, pageSize = 25) =>
    http
      .get<PagedResult<OrderResponse>>(`/api/businesses/${businessId}/orders/assigned-to-me`, { params: { page, pageSize } })
      .then((r) => r.data),
  get: (businessId: string, orderId: string) =>
    http.get<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}`).then((r) => r.data),
  setStatus: (businessId: string, orderId: string, data: UpdateOrderStatusRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/status`, data).then((r) => r.data),
  setPaymentStatus: (businessId: string, orderId: string, data: UpdatePaymentStatusRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/payment-status`, data).then((r) => r.data),
  assignDelivery: (businessId: string, orderId: string, data: AssignDeliveryAgentRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/assign-delivery`, data).then((r) => r.data),
  setShipment: (businessId: string, orderId: string, data: UpdateShipmentRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/shipment`, data).then((r) => r.data),
  setInternalNote: (businessId: string, orderId: string, data: UpdateOrderNoteRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/internal-note`, data).then((r) => r.data),
  getInvoice: (businessId: string, orderId: string) =>
    http.get<InvoiceResponse>(`/api/businesses/${businessId}/orders/${orderId}/invoice`).then((r) => r.data),
};

// ---------- returns / RMAs (added 2026-08-16, §9.21) ----------

export const returnApi = {
  list: (businessId: string, status: string | undefined, page = 1, pageSize = 25) =>
    http
      .get<PagedResult<ReturnResponse>>(`/api/businesses/${businessId}/returns`, { params: { status, page, pageSize } })
      .then((r) => r.data),
  get: (businessId: string, returnId: string) =>
    http.get<ReturnResponse>(`/api/businesses/${businessId}/returns/${returnId}`).then((r) => r.data),
  decide: (businessId: string, returnId: string, data: DecideReturnRequest) =>
    http.post<ReturnResponse>(`/api/businesses/${businessId}/returns/${returnId}/decision`, data).then((r) => r.data),
  markReceived: (businessId: string, returnId: string) =>
    http.post<ReturnResponse>(`/api/businesses/${businessId}/returns/${returnId}/received`, {}).then((r) => r.data),
  refund: (businessId: string, returnId: string) =>
    http.post<ReturnResponse>(`/api/businesses/${businessId}/returns/${returnId}/refund`, {}).then((r) => r.data),
};

// ---------- reviews (added 2026-08-16, §9.25) ----------

export const reviewApi = {
  list: (businessId: string, status: string | undefined, page = 1, pageSize = 25) =>
    http
      .get<PagedResult<ReviewResponse>>(`/api/businesses/${businessId}/reviews`, { params: { status, page, pageSize } })
      .then((r) => r.data),
  setStatus: (businessId: string, reviewId: string, status: ReviewStatus) =>
    http.patch<ReviewResponse>(`/api/businesses/${businessId}/reviews/${reviewId}/status`, { status }).then((r) => r.data),
  reply: (businessId: string, reviewId: string, reply: string) =>
    http.post<ReviewResponse>(`/api/businesses/${businessId}/reviews/${reviewId}/reply`, { reply }).then((r) => r.data),
  remove: (businessId: string, reviewId: string) =>
    http.delete<void>(`/api/businesses/${businessId}/reviews/${reviewId}`).then((r) => r.data),
};

// ---------- merchandising (added 2026-08-16, §9.20/§9.23/§9.24/§9.30, Admin-tier only) ----------

// All five list endpoints below are paged, verified against the live API's OpenAPI spec (the
// blueprint's abbreviated type block didn't show `PagedResult<T>` for any of these, but the
// spec confirms every one of them takes page/pageSize and returns the envelope).

export const promotionApi = {
  list: (businessId: string, page = 1, pageSize = 100) =>
    http.get<PagedResult<PromotionResponse>>(`/api/businesses/${businessId}/promotions`, { params: { page, pageSize } }).then((r) => r.data),
  create: (businessId: string, data: CreatePromotionRequest) =>
    http.post<PromotionResponse>(`/api/businesses/${businessId}/promotions`, data).then((r) => r.data),
  update: (businessId: string, id: string, data: CreatePromotionRequest) =>
    http.put<PromotionResponse>(`/api/businesses/${businessId}/promotions/${id}`, data).then((r) => r.data),
  remove: (businessId: string, id: string) => http.delete<void>(`/api/businesses/${businessId}/promotions/${id}`).then((r) => r.data),
};

export const customerGroupApi = {
  list: (businessId: string, page = 1, pageSize = 100) =>
    http.get<PagedResult<CustomerGroupResponse>>(`/api/businesses/${businessId}/customer-groups`, { params: { page, pageSize } }).then((r) => r.data),
  create: (businessId: string, data: CustomerGroupRequest) =>
    http.post<CustomerGroupResponse>(`/api/businesses/${businessId}/customer-groups`, data).then((r) => r.data),
  update: (businessId: string, id: string, data: CustomerGroupRequest) =>
    http.put<CustomerGroupResponse>(`/api/businesses/${businessId}/customer-groups/${id}`, data).then((r) => r.data),
  remove: (businessId: string, id: string) => http.delete<void>(`/api/businesses/${businessId}/customer-groups/${id}`).then((r) => r.data),
  addMembers: (businessId: string, id: string, customerUserIds: string[]) =>
    http.post<void>(`/api/businesses/${businessId}/customer-groups/${id}/members`, { customerUserIds }).then((r) => r.data),
  removeMembers: (businessId: string, id: string, customerUserIds: string[]) =>
    http.delete<void>(`/api/businesses/${businessId}/customer-groups/${id}/members`, { data: { customerUserIds } }).then((r) => r.data),
};

export const giftCardApi = {
  list: (businessId: string, page = 1, pageSize = 100) =>
    http.get<PagedResult<GiftCardResponse>>(`/api/businesses/${businessId}/gift-cards`, { params: { page, pageSize } }).then((r) => r.data),
  issue: (businessId: string, data: IssueGiftCardRequest) =>
    http.post<GiftCardResponse>(`/api/businesses/${businessId}/gift-cards`, data).then((r) => r.data),
  deactivate: (businessId: string, id: string) => http.delete<void>(`/api/businesses/${businessId}/gift-cards/${id}`).then((r) => r.data),
};

export const storeCreditApi = {
  statement: (businessId: string, customerUserId: string) =>
    http.get<StoreCreditBalanceResponse>(`/api/businesses/${businessId}/customers/${customerUserId}/store-credit`).then((r) => r.data),
  grant: (businessId: string, customerUserId: string, data: GrantStoreCreditRequest) =>
    http.post<void>(`/api/businesses/${businessId}/customers/${customerUserId}/store-credit`, data).then((r) => r.data),
};

export const shippingZoneApi = {
  list: (businessId: string, page = 1, pageSize = 100) =>
    http.get<PagedResult<ShippingZoneResponse>>(`/api/businesses/${businessId}/shipping-zones`, { params: { page, pageSize } }).then((r) => r.data),
  create: (businessId: string, data: CreateShippingZoneRequest) =>
    http.post<ShippingZoneResponse>(`/api/businesses/${businessId}/shipping-zones`, data).then((r) => r.data),
  update: (businessId: string, id: string, data: CreateShippingZoneRequest) =>
    http.put<ShippingZoneResponse>(`/api/businesses/${businessId}/shipping-zones/${id}`, data).then((r) => r.data),
  remove: (businessId: string, id: string) => http.delete<void>(`/api/businesses/${businessId}/shipping-zones/${id}`).then((r) => r.data),
};

export const contentApi = {
  list: (businessId: string, type?: string, page = 1, pageSize = 100) =>
    http.get<PagedResult<ContentBlockResponse>>(`/api/businesses/${businessId}/content`, { params: { type, page, pageSize } }).then((r) => r.data),
  create: (businessId: string, data: ContentBlockRequest) =>
    http.post<ContentBlockResponse>(`/api/businesses/${businessId}/content`, data).then((r) => r.data),
  update: (businessId: string, id: string, data: ContentBlockRequest) =>
    http.put<ContentBlockResponse>(`/api/businesses/${businessId}/content/${id}`, data).then((r) => r.data),
  remove: (businessId: string, id: string) => http.delete<void>(`/api/businesses/${businessId}/content/${id}`).then((r) => r.data),
  // Added 2026-08-18 — same shape as product images (§7.4): multipart, field `file`, 5MB limit.
  // Requires an existing block (create it first, then upload).
  uploadImage: (businessId: string, id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post<ContentBlockResponse>(`/api/businesses/${businessId}/content/${id}/image`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

// ---------- discount emails (added 2026-08-18, §9.43, Admin-tier only) ----------

export const discountEmailApi = {
  send: (businessId: string, data: SendDiscountEmailRequest) =>
    http.post<SendDiscountEmailResult>(`/api/businesses/${businessId}/discount-emails`, data).then((r) => r.data),
};

// ---------- audit log (added 2026-08-16, §9.35, Admin-tier only) ----------

export const auditLogApi = {
  list: (businessId: string, query: AuditLogQuery = {}) =>
    http.get<PagedResult<AuditLogResponse>>(`/api/businesses/${businessId}/audit-log`, { params: query }).then((r) => r.data),
};

// ---------- dashboard (added 2026-08-16, §9.32, Admin-tier only) ----------

export const dashboardApi = {
  get: (businessId: string, from?: string, to?: string) =>
    http.get<BusinessDashboardResponse>(`/api/businesses/${businessId}/analytics/dashboard`, { params: { from, to } }).then((r) => r.data),
};

// ---------- integrations: webhooks & API keys (added 2026-08-16, §9.39, SuperOffice/TenantOwner only) ----------

export const webhookApi = {
  events: () => http.get<string[]>("/api/integrations/webhooks/events").then((r) => r.data),
  list: (page = 1, pageSize = 25) =>
    http.get<PagedResult<WebhookResponse>>("/api/integrations/webhooks", { params: { page, pageSize } }).then((r) => r.data),
  create: (data: CreateWebhookRequest) => http.post<WebhookResponse>("/api/integrations/webhooks", data).then((r) => r.data),
  remove: (webhookId: string) => http.delete<void>(`/api/integrations/webhooks/${webhookId}`).then((r) => r.data),
  deliveries: (webhookId: string, page = 1, pageSize = 25) =>
    http
      .get<PagedResult<WebhookDeliveryResponse>>(`/api/integrations/webhooks/${webhookId}/deliveries`, { params: { page, pageSize } })
      .then((r) => r.data),
};

export const apiKeyApi = {
  list: (page = 1, pageSize = 25) =>
    http.get<PagedResult<ApiKeyResponse>>("/api/integrations/api-keys", { params: { page, pageSize } }).then((r) => r.data),
  create: (data: CreateApiKeyRequest) => http.post<ApiKeyResponse>("/api/integrations/api-keys", data).then((r) => r.data),
  remove: (apiKeyId: string) => http.delete<void>(`/api/integrations/api-keys/${apiKeyId}`).then((r) => r.data),
};
