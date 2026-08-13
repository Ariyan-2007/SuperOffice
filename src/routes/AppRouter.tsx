import { IS_BACKOFFICE } from "../config/env";
import { BackOfficeRoutes } from "./BackOfficeRoutes";
import { SuperOfficeRoutes } from "./SuperOfficeRoutes";

export function AppRouter() {
  return IS_BACKOFFICE ? <BackOfficeRoutes /> : <SuperOfficeRoutes />;
}
