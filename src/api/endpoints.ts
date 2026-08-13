// Thin, typed wrappers over every Vastora endpoint used by this app. Grouped by resource,
// mirroring §7 of the BackOffice blueprint and §6 of the SuperOffice blueprint.
import { http } from "./client";
import { API_BASE_URL } from "../config/env";
import type {
  AssignDeliveryAgentRequest,
  AuthResponse,
  BusinessResponse,
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
  TenantResponse,
  UpdateBusinessRequest,
  UpdateCategoryRequest,
  UpdateCouponRequest,
  UpdateOrderStatusRequest,
  UpdateProductRequest,
  UserSummaryResponse,
} from "../types/api";

// ---------- public, unauthenticated ----------

export async function fetchBusinessBySlug(slug: string): Promise<BusinessResponse> {
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
};

// ---------- tenant (SuperOffice) ----------

export const tenantApi = {
  me: () => http.get<TenantResponse>("/api/tenants/me").then((r) => r.data),
};

// ---------- superoffice businesses ----------

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
};

// ---------- categories ----------

export const categoryApi = {
  list: (businessId: string) => http.get<CategoryResponse[]>(`/api/businesses/${businessId}/categories`).then((r) => r.data),
  get: (businessId: string, categoryId: string) =>
    http.get<CategoryResponse>(`/api/businesses/${businessId}/categories/${categoryId}`).then((r) => r.data),
  create: (businessId: string, data: CreateCategoryRequest) =>
    http.post<CategoryResponse>(`/api/businesses/${businessId}/categories`, data).then((r) => r.data),
  update: (businessId: string, categoryId: string, data: UpdateCategoryRequest) =>
    http.put<CategoryResponse>(`/api/businesses/${businessId}/categories/${categoryId}`, data).then((r) => r.data),
  remove: (businessId: string, categoryId: string) =>
    http.delete<void>(`/api/businesses/${businessId}/categories/${categoryId}`).then((r) => r.data),
};

// ---------- products ----------

export const productApi = {
  list: (businessId: string) => http.get<ProductResponse[]>(`/api/businesses/${businessId}/products`).then((r) => r.data),
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

export const orderApi = {
  list: (businessId: string) => http.get<OrderResponse[]>(`/api/businesses/${businessId}/orders`).then((r) => r.data),
  assignedToMe: (businessId: string) => http.get<OrderResponse[]>(`/api/businesses/${businessId}/orders/assigned-to-me`).then((r) => r.data),
  get: (businessId: string, orderId: string) =>
    http.get<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}`).then((r) => r.data),
  setStatus: (businessId: string, orderId: string, data: UpdateOrderStatusRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/status`, data).then((r) => r.data),
  assignDelivery: (businessId: string, orderId: string, data: AssignDeliveryAgentRequest) =>
    http.patch<OrderResponse>(`/api/businesses/${businessId}/orders/${orderId}/assign-delivery`, data).then((r) => r.data),
};
