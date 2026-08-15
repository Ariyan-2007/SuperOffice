import { demoStore } from "./store";
import type { DemoUserRecord } from "./seed";
import type {
  AdjustStockRequest,
  AssignDeliveryAgentRequest,
  AuthResponse,
  BusinessStatus,
  CreateBusinessRequest,
  CreateCategoryRequest,
  CreateCouponRequest,
  CreateExpenseRequest,
  CreateProductRequest,
  CreateStaffRequest,
  DeliveryAgentStatus,
  PaymentStatus,
  ProblemDetails,
  ProductStatus,
  UpdateBusinessRequest,
  UpdateCategoryRequest,
  UpdateCouponRequest,
  UpdateExpenseRequest,
  UpdateOrderStatusRequest,
  UpdatePaymentStatusRequest,
  UpdateProductRequest,
  UserStatus,
} from "../types/api";

export interface DemoResult {
  status: number;
  data: unknown;
}

interface AuthCtx {
  userId: string;
  user: DemoUserRecord;
}

interface HandlerCtx {
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown> | unknown;
  auth: AuthCtx | null;
}

type Handler = (ctx: HandlerCtx) => DemoResult;

interface RouteDef {
  method: string;
  path: string;
  auth: "none" | "required";
  handler: Handler;
}

function ok(data: unknown, status = 200): DemoResult {
  return { status, data };
}

function fail(status: number, title: string): DemoResult {
  const problem: ProblemDetails = { status, title, type: "about:blank" };
  return { status, data: problem };
}

function buildAuthResponse(user: DemoUserRecord): AuthResponse {
  const now = Date.now();
  return {
    accessToken: `demo-access:${user.id}:${crypto.randomUUID()}`,
    accessTokenExpiresAt: new Date(now + 6 * 3_600_000).toISOString(),
    refreshToken: `demo-refresh:${user.id}:${crypto.randomUUID()}`,
    refreshTokenExpiresAt: new Date(now + 30 * 24 * 3_600_000).toISOString(),
    user: demoStore.toSummary(user),
  };
}

function userIdFromToken(token: string, prefix: "demo-access" | "demo-refresh"): string | null {
  const match = token.match(new RegExp(`^${prefix}:([^:]+):`));
  return match ? match[1] : null;
}

// Every route the BackOffice / SuperOffice frontends call (see api/endpoints.ts), reimplemented
// against the local DemoStore instead of the network. Order matters: literal segments must be
// listed before the ":param" route they'd otherwise collide with (e.g. "assigned-to-me" before
// ":orderId") since the first matching route wins.
const routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/auth/login",
    auth: "none",
    handler: ({ body }) => {
      const b = body as { email?: string; password?: string };
      const user = demoStore.findUserByEmail(b.email ?? "");
      if (!user || user.password !== b.password) return fail(401, "Invalid email or password.");
      if (user.status === "Blocked") return fail(403, "This account has been blocked.");
      return ok(buildAuthResponse(user));
    },
  },
  {
    method: "POST",
    path: "/api/auth/refresh",
    auth: "none",
    handler: ({ body }) => {
      const b = body as { refreshToken?: string };
      const userId = b.refreshToken ? userIdFromToken(b.refreshToken, "demo-refresh") : null;
      const user = userId ? demoStore.findUserById(userId) : undefined;
      if (!user) return fail(401, "Session expired. Please sign in again.");
      return ok(buildAuthResponse(user));
    },
  },
  { method: "POST", path: "/api/auth/logout", auth: "none", handler: () => ok(undefined, 204) },
  { method: "GET", path: "/api/auth/me", auth: "required", handler: ({ auth }) => ok(demoStore.toSummary(auth!.user)) },
  {
    method: "PUT",
    path: "/api/auth/me",
    auth: "required",
    handler: ({ auth, body }) => {
      const b = body as { fullName?: string; phone?: string };
      const updated = demoStore.updateProfile(auth!.userId, { fullName: b.fullName ?? "", phone: b.phone ?? "" });
      return updated ? ok(updated) : fail(404, "Account not found.");
    },
  },
  {
    method: "POST",
    path: "/api/auth/forgot-password",
    auth: "none",
    handler: ({ body }) => {
      const b = body as { email?: string };
      demoStore.requestPasswordReset(b.email ?? "");
      return ok(undefined, 204);
    },
  },
  {
    method: "POST",
    path: "/api/auth/reset-password",
    auth: "none",
    handler: ({ body }) => {
      const b = body as { token?: string; newPassword?: string };
      const success = demoStore.resetPassword(b.token ?? "", b.newPassword ?? "");
      return success ? ok(undefined, 204) : fail(400, "This reset link is invalid or has expired.");
    },
  },
  { method: "GET", path: "/api/tenants/me", auth: "required", handler: () => ok(demoStore.getTenant()) },
  { method: "GET", path: "/api/tenants/me/usage", auth: "required", handler: () => ok(demoStore.getTenantUsage()) },
  { method: "GET", path: "/api/superoffice/analytics", auth: "required", handler: () => ok(demoStore.getAnalytics()) },

  { method: "GET", path: "/api/superoffice/businesses", auth: "required", handler: () => ok(demoStore.listBusinesses()) },
  {
    method: "POST",
    path: "/api/superoffice/businesses",
    auth: "required",
    handler: ({ body }) => {
      const tenant = demoStore.getTenant();
      const usage = demoStore.getTenantUsage();
      if (tenant.type === "SingleBusiness" && usage.businessCount >= 1) {
        return fail(409, "Your Tenant is on a Single-business plan. Upgrade to Multi-business to add another.");
      }
      if (usage.maxBusinesses != null && usage.businessCount >= usage.maxBusinesses) {
        return fail(409, `Your '${usage.plan}' plan allows up to ${usage.maxBusinesses} Business(es). Upgrade your plan to add another.`);
      }
      return ok(demoStore.createBusiness(body as CreateBusinessRequest), 201);
    },
  },
  {
    method: "GET",
    path: "/api/superoffice/businesses/:businessId",
    auth: "required",
    handler: ({ params }) => demoStore.getBusiness(params.businessId) ? ok(demoStore.getBusiness(params.businessId)) : fail(404, "Business not found."),
  },
  {
    method: "PUT",
    path: "/api/superoffice/businesses/:businessId",
    auth: "required",
    handler: ({ params, body }) => {
      const business = demoStore.updateBusiness(params.businessId, body as UpdateBusinessRequest);
      return business ? ok(business) : fail(404, "Business not found.");
    },
  },
  {
    method: "PATCH",
    path: "/api/superoffice/businesses/:businessId/status",
    auth: "required",
    handler: ({ params, body }) => {
      const business = demoStore.setBusinessStatus(params.businessId, body as BusinessStatus);
      return business ? ok(business) : fail(404, "Business not found.");
    },
  },

  {
    method: "GET",
    path: "/api/businesses/:businessId",
    auth: "required",
    handler: ({ params }) => {
      const business = demoStore.getBusiness(params.businessId);
      return business ? ok(business) : fail(404, "Business not found.");
    },
  },
  {
    method: "PUT",
    path: "/api/businesses/:businessId",
    auth: "required",
    handler: ({ params, body }) => {
      const business = demoStore.updateBusiness(params.businessId, body as UpdateBusinessRequest);
      return business ? ok(business) : fail(404, "Business not found.");
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/delivery-module",
    auth: "required",
    handler: ({ params, body }) => {
      const b = body as { enabled: boolean };
      const business = demoStore.setDeliveryModule(params.businessId, b.enabled);
      return business ? ok(business) : fail(404, "Business not found.");
    },
  },

  { method: "GET", path: "/api/businesses/:businessId/categories", auth: "required", handler: ({ params }) => ok(demoStore.listCategories(params.businessId)) },
  { method: "GET", path: "/api/businesses/:businessId/categories/tree", auth: "required", handler: ({ params }) => ok(demoStore.getCategoryTree(params.businessId)) },
  {
    method: "POST",
    path: "/api/businesses/:businessId/categories",
    auth: "required",
    handler: ({ params, body }) => ok(demoStore.createCategory(params.businessId, body as CreateCategoryRequest), 201),
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/categories/:categoryId",
    auth: "required",
    handler: ({ params }) => {
      const category = demoStore.getCategory(params.businessId, params.categoryId);
      return category ? ok(category) : fail(404, "Category not found.");
    },
  },
  {
    method: "PUT",
    path: "/api/businesses/:businessId/categories/:categoryId",
    auth: "required",
    handler: ({ params, body }) => {
      const category = demoStore.updateCategory(params.businessId, params.categoryId, body as UpdateCategoryRequest);
      return category ? ok(category) : fail(404, "Category not found.");
    },
  },
  {
    method: "DELETE",
    path: "/api/businesses/:businessId/categories/:categoryId",
    auth: "required",
    handler: ({ params }) => (demoStore.removeCategory(params.businessId, params.categoryId) ? ok(undefined, 204) : fail(404, "Category not found.")),
  },

  { method: "GET", path: "/api/businesses/:businessId/products", auth: "required", handler: ({ params }) => ok(demoStore.listProducts(params.businessId)) },
  {
    method: "POST",
    path: "/api/businesses/:businessId/products",
    auth: "required",
    handler: ({ params, body }) => {
      const usage = demoStore.getTenantUsage().businesses.find((b) => b.businessId === params.businessId);
      if (usage?.maxProductsPerBusiness != null && usage.productCount >= usage.maxProductsPerBusiness) {
        return fail(409, `Your '${demoStore.getTenant().plan}' plan allows up to ${usage.maxProductsPerBusiness} product(s) per Business. Upgrade your plan to add more.`);
      }
      return ok(demoStore.createProduct(params.businessId, body as CreateProductRequest), 201);
    },
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/products/:productId",
    auth: "required",
    handler: ({ params }) => {
      const product = demoStore.getProduct(params.businessId, params.productId);
      return product ? ok(product) : fail(404, "Product not found.");
    },
  },
  {
    method: "PUT",
    path: "/api/businesses/:businessId/products/:productId",
    auth: "required",
    handler: ({ params, body }) => {
      const product = demoStore.updateProduct(params.businessId, params.productId, body as UpdateProductRequest);
      return product ? ok(product) : fail(404, "Product not found.");
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/products/:productId/status",
    auth: "required",
    handler: ({ params, body }) => {
      const product = demoStore.setProductStatus(params.businessId, params.productId, body as ProductStatus);
      return product ? ok(product) : fail(404, "Product not found.");
    },
  },
  {
    method: "DELETE",
    path: "/api/businesses/:businessId/products/:productId",
    auth: "required",
    handler: ({ params }) => (demoStore.removeProduct(params.businessId, params.productId) ? ok(undefined, 204) : fail(404, "Product not found.")),
  },
  {
    method: "POST",
    path: "/api/businesses/:businessId/products/:productId/images",
    auth: "required",
    handler: ({ params, body }) => {
      const b = body as { url?: string };
      const product = demoStore.addProductImage(params.businessId, params.productId, b.url ?? "");
      return product ? ok(product) : fail(404, "Product not found.");
    },
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/products/:productId/stock-movements",
    auth: "required",
    handler: ({ params }) => ok(demoStore.listStockMovements(params.businessId, params.productId)),
  },
  {
    method: "POST",
    path: "/api/businesses/:businessId/products/:productId/stock-adjustments",
    auth: "required",
    handler: ({ params, body, auth }) => {
      const product = demoStore.adjustStock(params.businessId, params.productId, body as AdjustStockRequest, auth?.userId ?? null);
      return product ? ok(product) : fail(404, "Product not found.");
    },
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/inventory/low-stock",
    auth: "required",
    handler: ({ params }) => ok(demoStore.getLowStock(params.businessId)),
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/inventory/valuation",
    auth: "required",
    handler: ({ params }) => ok(demoStore.getValuation(params.businessId)),
  },

  { method: "GET", path: "/api/businesses/:businessId/coupons", auth: "required", handler: ({ params }) => ok(demoStore.listCoupons(params.businessId)) },
  {
    method: "POST",
    path: "/api/businesses/:businessId/coupons",
    auth: "required",
    handler: ({ params, body }) => ok(demoStore.createCoupon(params.businessId, body as CreateCouponRequest), 201),
  },
  {
    method: "PUT",
    path: "/api/businesses/:businessId/coupons/:couponId",
    auth: "required",
    handler: ({ params, body }) => {
      const coupon = demoStore.updateCoupon(params.businessId, params.couponId, body as UpdateCouponRequest);
      return coupon ? ok(coupon) : fail(404, "Coupon not found.");
    },
  },
  {
    method: "DELETE",
    path: "/api/businesses/:businessId/coupons/:couponId",
    auth: "required",
    handler: ({ params }) => (demoStore.removeCoupon(params.businessId, params.couponId) ? ok(undefined, 204) : fail(404, "Coupon not found.")),
  },

  { method: "GET", path: "/api/businesses/:businessId/staff", auth: "required", handler: ({ params }) => ok(demoStore.listStaff(params.businessId)) },
  {
    method: "POST",
    path: "/api/businesses/:businessId/staff",
    auth: "required",
    handler: ({ params, body }) => {
      const req = body as CreateStaffRequest;
      if (demoStore.findUserByEmail(req.email)) return fail(409, "An account with this email already exists.");
      if (req.role === "DeliveryAgent" && !demoStore.getBusiness(params.businessId)?.deliveryModuleEnabled) {
        return fail(409, "Delivery module is disabled for this business.");
      }
      const usage = demoStore.getTenantUsage().businesses.find((b) => b.businessId === params.businessId);
      if (usage?.maxStaffPerBusiness != null && usage.staffCount >= usage.maxStaffPerBusiness) {
        return fail(409, `Your '${demoStore.getTenant().plan}' plan allows up to ${usage.maxStaffPerBusiness} staff member(s) per Business. Upgrade your plan to add more.`);
      }
      return ok(demoStore.createStaff(params.businessId, req), 201);
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/staff/:userId/status",
    auth: "required",
    handler: ({ params, body }) => {
      const user = demoStore.setStaffStatus(params.businessId, params.userId, body as UserStatus);
      return user ? ok(user) : fail(404, "Account not found.");
    },
  },

  { method: "GET", path: "/api/businesses/:businessId/customers", auth: "required", handler: ({ params }) => ok(demoStore.listCustomers(params.businessId)) },

  { method: "GET", path: "/api/businesses/:businessId/delivery-agents", auth: "required", handler: ({ params }) => ok(demoStore.listDeliveryAgents(params.businessId)) },
  {
    method: "GET",
    path: "/api/businesses/:businessId/delivery-agents/me",
    auth: "required",
    handler: ({ params, auth }) => {
      const agent = demoStore.getMyDeliveryAgent(params.businessId, auth!.userId);
      return agent ? ok(agent) : fail(404, "No Delivery Agent profile for this account.");
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/delivery-agents/me/status",
    auth: "required",
    handler: ({ params, auth, body }) => {
      const b = body as { status: DeliveryAgentStatus };
      const agent = demoStore.setDeliveryAgentStatus(params.businessId, auth!.userId, b.status);
      return agent ? ok(agent) : fail(404, "No Delivery Agent profile for this account.");
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/delivery-agents/:userId/status",
    auth: "required",
    handler: ({ params, body }) => {
      const b = body as { status: DeliveryAgentStatus };
      const agent = demoStore.setDeliveryAgentStatus(params.businessId, params.userId, b.status);
      return agent ? ok(agent) : fail(404, "Delivery Agent not found.");
    },
  },

  {
    method: "GET",
    path: "/api/businesses/:businessId/orders/assigned-to-me",
    auth: "required",
    handler: ({ params, auth }) => ok(demoStore.listOrdersAssignedToMe(params.businessId, auth!.userId)),
  },
  { method: "GET", path: "/api/businesses/:businessId/orders", auth: "required", handler: ({ params }) => ok(demoStore.listOrders(params.businessId)) },
  {
    method: "GET",
    path: "/api/businesses/:businessId/orders/:orderId",
    auth: "required",
    handler: ({ params }) => {
      const order = demoStore.getOrder(params.businessId, params.orderId);
      return order ? ok(order) : fail(404, "Order not found.");
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/orders/:orderId/status",
    auth: "required",
    handler: ({ params, body }) => {
      const result = demoStore.setOrderStatus(params.businessId, params.orderId, body as UpdateOrderStatusRequest);
      if (!result) return fail(404, "Order not found.");
      if ("error" in result) return fail(409, result.error);
      return ok(result);
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/orders/:orderId/payment-status",
    auth: "required",
    handler: ({ params, body }) => {
      const b = body as UpdatePaymentStatusRequest;
      const order = demoStore.setPaymentStatus(params.businessId, params.orderId, b.status as PaymentStatus, b.note ?? null);
      return order ? ok(order) : fail(404, "Order not found.");
    },
  },
  {
    method: "PATCH",
    path: "/api/businesses/:businessId/orders/:orderId/assign-delivery",
    auth: "required",
    handler: ({ params, body }) => {
      if (!demoStore.getBusiness(params.businessId)?.deliveryModuleEnabled) {
        return fail(409, "Delivery module is disabled for this business.");
      }
      const b = body as AssignDeliveryAgentRequest;
      const order = demoStore.assignDelivery(params.businessId, params.orderId, b.deliveryAgentUserId);
      return order ? ok(order) : fail(404, "Order not found.");
    },
  },

  { method: "GET", path: "/api/businesses/:businessId/expenses", auth: "required", handler: ({ params }) => ok(demoStore.listExpenses(params.businessId)) },
  {
    method: "POST",
    path: "/api/businesses/:businessId/expenses",
    auth: "required",
    handler: ({ params, body, auth }) => ok(demoStore.createExpense(params.businessId, body as CreateExpenseRequest, auth!.userId), 201),
  },
  {
    method: "PUT",
    path: "/api/businesses/:businessId/expenses/:expenseId",
    auth: "required",
    handler: ({ params, body }) => {
      const expense = demoStore.updateExpense(params.businessId, params.expenseId, body as UpdateExpenseRequest);
      return expense ? ok(expense) : fail(404, "Expense not found.");
    },
  },
  {
    method: "DELETE",
    path: "/api/businesses/:businessId/expenses/:expenseId",
    auth: "required",
    handler: ({ params }) => (demoStore.removeExpense(params.businessId, params.expenseId) ? ok(undefined, 204) : fail(404, "Expense not found.")),
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/accounting/profit-and-loss",
    auth: "required",
    handler: ({ params, query }) => ok(demoStore.getProfitAndLoss(params.businessId, query.from ?? "", query.to ?? "")),
  },
  {
    method: "GET",
    path: "/api/businesses/:businessId/accounting/balance-sheet",
    auth: "required",
    handler: ({ params }) => ok(demoStore.getBalanceSheet(params.businessId)),
  },
];

interface CompiledRoute extends RouteDef {
  regex: RegExp;
  keys: string[];
}

const compiled: CompiledRoute[] = routes.map((route) => {
  const keys: string[] = [];
  const pattern = route.path
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg;
    })
    .join("/");
  return { ...route, regex: new RegExp(`^/${pattern}/?$`), keys };
});

export function resolveRoute(method: string, pathname: string): { route: RouteDef; params: Record<string, string> } | null {
  for (const route of compiled) {
    if (route.method !== method) continue;
    const match = route.regex.exec(pathname);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1]);
    });
    return { route, params };
  }
  return null;
}

export function authenticate(authorizationHeader: string | null | undefined): AuthCtx | null {
  if (!authorizationHeader) return null;
  const bearer = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7) : authorizationHeader;
  const userId = userIdFromToken(bearer, "demo-access");
  if (!userId) return null;
  const user = demoStore.findUserById(userId);
  return user ? { userId, user } : null;
}

export { fail, ok };
