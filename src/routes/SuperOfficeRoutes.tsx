import { Navigate, Route, Routes } from "react-router-dom";
import { GuestOnly, RequireAuth } from "./guards";
import { buildSuperOfficeNav } from "../layouts/superofficeNav";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { LoginPage } from "../pages/shared/LoginPage";
import { ForgotPasswordPage } from "../pages/shared/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/shared/ResetPasswordPage";
import { ProfilePage } from "../pages/shared/ProfilePage";
import { SuperOfficeDashboardPage } from "../pages/superoffice/DashboardPage";
import { TenantProfilePage } from "../pages/superoffice/TenantProfilePage";
import { CreateBusinessPage } from "../pages/superoffice/CreateBusinessPage";
import { BusinessDetailPage } from "../pages/superoffice/BusinessDetailPage";
import { IntegrationsPage } from "../pages/superoffice/IntegrationsPage";

// SuperOffice is generic — no per-deployment Business to resolve, so the login screen just
// carries plain Vastora branding (SUPEROFFICE_FRONTEND_BLUEPRINT.md §3).
export function SuperOfficeRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <AuthLayout brandName="Vastora" tagline="Tenant control panel">
              <LoginPage />
            </AuthLayout>
          </GuestOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestOnly>
            <AuthLayout brandName="Vastora" tagline="Tenant control panel">
              <ForgotPasswordPage />
            </AuthLayout>
          </GuestOnly>
        }
      />
      <Route
        path="/reset-password"
        element={
          <GuestOnly>
            <AuthLayout brandName="Vastora" tagline="Tenant control panel">
              <ResetPasswordPage />
            </AuthLayout>
          </GuestOnly>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AuthenticatedSuperOffice />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function AuthenticatedSuperOffice() {
  const nav = buildSuperOfficeNav();
  return (
    <Routes>
      <Route element={<AppLayout brandName="Vastora" logoUrl={null} sections={nav} title="Businesses" />}>
        <Route index element={<SuperOfficeDashboardPage />} />
        <Route path="businesses/new" element={<CreateBusinessPage />} />
        <Route path="businesses/:businessId" element={<BusinessDetailPage />} />
        <Route path="tenant" element={<TenantProfilePage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
