import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { ThemeModeProvider } from "./theme/ThemeModeContext";
import { ToastProvider } from "./context/ToastContext";
import { BusinessProvider } from "./context/BusinessContext";
import { AuthProvider } from "./auth/AuthContext";
import { AppRouter } from "./routes/AppRouter";
import { assertConfigured } from "./config/env";
import { MisconfiguredScreen } from "./pages/shared/MisconfiguredScreen";

export default function App() {
  const configError = assertConfigured();
  if (configError) return <MisconfiguredScreen message={configError} />;

  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <BusinessProvider>
              <AuthProvider>
                <AppRouter />
              </AuthProvider>
            </BusinessProvider>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}
