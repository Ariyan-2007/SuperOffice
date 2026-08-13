import { Navigate, Route, Routes } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../auth/AuthContext";
import { GuestOnly, RequireAuth, RoleRoute } from "./guards";
import { ADMIN_LEVEL, STAFF_LEVEL } from "./backofficeRoles";
import { buildBackOfficeNav } from "../layouts/backofficeNav";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { DeliveryAgentLayout } from "../layouts/DeliveryAgentLayout";
import { PageLoader } from "../components/Feedback";
import { MisconfiguredScreen } from "../pages/shared/MisconfiguredScreen";
import { LoginPage } from "../pages/shared/LoginPage";
import { ProfilePage } from "../pages/shared/ProfilePage";
import { DashboardPage } from "../pages/backoffice/DashboardPage";
import { BusinessProfilePage } from "../pages/backoffice/BusinessProfilePage";
import { CategoriesPage } from "../pages/backoffice/CategoriesPage";
import { ProductsPage } from "../pages/backoffice/ProductsPage";
import { CouponsPage } from "../pages/backoffice/CouponsPage";
import { StaffPage } from "../pages/backoffice/StaffPage";
import { CustomersPage } from "../pages/backoffice/CustomersPage";
import { DeliveryAgentsPage } from "../pages/backoffice/DeliveryAgentsPage";
import { OrdersPage } from "../pages/backoffice/OrdersPage";
import { OrderDetailPage } from "../pages/backoffice/OrderDetailPage";
import { MyDeliveriesPage } from "../pages/backoffice/MyDeliveriesPage";
import { MyStatusPage } from "../pages/backoffice/MyStatusPage";

export function BackOfficeRoutes() {
  const { status, error, business } = useBusiness();

  if (status === "loading" || status === "idle") return <PageLoader />;
  if (status === "error" || !business) return <MisconfiguredScreen message={error ?? "Could not resolve this Business."} />;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <AuthLayout brandName={business.name} logoUrl={business.logoUrl}>
              <LoginPage />
            </AuthLayout>
          </GuestOnly>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AuthenticatedBackOffice businessName={business.name} logoUrl={business.logoUrl} />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function AuthenticatedBackOffice({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  const { user } = useAuth();
  if (!user) return <PageLoader />;

  if (user.role === "DeliveryAgent") {
    return (
      <Routes>
        <Route element={<DeliveryAgentLayout brandName={businessName} />}>
          <Route index element={<MyDeliveriesPage />} />
          <Route path="status" element={<MyStatusPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  const nav = buildBackOfficeNav(user.role);

  return (
    <Routes>
      <Route element={<AppLayout brandName={businessName} logoUrl={logoUrl} sections={nav} title="Dashboard" />}>
        <Route index element={<DashboardPage />} />
        <Route path="business" element={<BusinessProfilePage />} />
        <Route
          path="categories"
          element={
            <RoleRoute allow={STAFF_LEVEL} userRole={user.role}>
              <CategoriesPage />
            </RoleRoute>
          }
        />
        <Route
          path="products"
          element={
            <RoleRoute allow={STAFF_LEVEL} userRole={user.role}>
              <ProductsPage />
            </RoleRoute>
          }
        />
        <Route
          path="coupons"
          element={
            <RoleRoute allow={STAFF_LEVEL} userRole={user.role}>
              <CouponsPage />
            </RoleRoute>
          }
        />
        <Route
          path="staff"
          element={
            <RoleRoute allow={ADMIN_LEVEL} userRole={user.role}>
              <StaffPage />
            </RoleRoute>
          }
        />
        <Route
          path="customers"
          element={
            <RoleRoute allow={ADMIN_LEVEL} userRole={user.role}>
              <CustomersPage />
            </RoleRoute>
          }
        />
        <Route
          path="delivery-agents"
          element={
            <RoleRoute allow={STAFF_LEVEL} userRole={user.role}>
              <DeliveryAgentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="orders"
          element={
            <RoleRoute allow={STAFF_LEVEL} userRole={user.role}>
              <OrdersPage />
            </RoleRoute>
          }
        />
        <Route
          path="orders/:orderId"
          element={
            <RoleRoute allow={STAFF_LEVEL} userRole={user.role}>
              <OrderDetailPage />
            </RoleRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
