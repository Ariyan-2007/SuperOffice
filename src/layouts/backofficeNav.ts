import { Building2, ClipboardList, FolderTree, LayoutDashboard, Package, Ticket, Truck, UserCircle, UserCog, Users } from "lucide-react";
import type { NavSection } from "./Sidebar";
import { ADMIN_LEVEL } from "../routes/backofficeRoles";
import type { UserRole } from "../types/api";

export function buildBackOfficeNav(role: UserRole): NavSection[] {
  const sections: NavSection[] = [
    { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
    {
      label: "Catalog",
      items: [
        { to: "/business", label: "Business Profile", icon: Building2 },
        { to: "/categories", label: "Categories", icon: FolderTree },
        { to: "/products", label: "Products", icon: Package },
        { to: "/coupons", label: "Coupons", icon: Ticket },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/orders", label: "Orders", icon: ClipboardList },
        { to: "/delivery-agents", label: "Delivery Agents", icon: Truck },
      ],
    },
  ];

  if (ADMIN_LEVEL.includes(role)) {
    sections.push({
      label: "Team",
      items: [
        { to: "/staff", label: "Staff", icon: UserCog },
        { to: "/customers", label: "Customers", icon: Users },
      ],
    });
  }

  sections.push({ items: [{ to: "/profile", label: "My Profile", icon: UserCircle }] });

  return sections;
}
