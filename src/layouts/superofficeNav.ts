import { Building2, LayoutDashboard, Plug, UserCircle } from "lucide-react";
import type { NavSection } from "./Sidebar";

export function buildSuperOfficeNav(): NavSection[] {
  return [
    { items: [{ to: "/", label: "Businesses", icon: LayoutDashboard, end: true }] },
    {
      label: "Account",
      items: [
        { to: "/tenant", label: "Tenant Profile", icon: Building2 },
        { to: "/integrations", label: "Integrations", icon: Plug },
        { to: "/profile", label: "My Profile", icon: UserCircle },
      ],
    },
  ];
}
