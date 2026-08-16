import {
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  FolderTree,
  Gift,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Package,
  Receipt,
  RotateCcw,
  ScrollText,
  Ticket,
  Truck,
  UserCircle,
  UserCog,
  Users,
} from "lucide-react";
import type { NavSection } from "./Sidebar";
import { ADMIN_LEVEL } from "../routes/backofficeRoles";
import type { UserRole } from "../types/api";

export interface BackOfficeNavCounts {
  pendingReturns?: number;
  pendingReviews?: number;
}

export function buildBackOfficeNav(role: UserRole, counts: BackOfficeNavCounts = {}): NavSection[] {
  const sections: NavSection[] = [
    { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
    {
      label: "Catalog",
      items: [
        { to: "/business", label: "Business Profile", icon: Building2 },
        { to: "/categories", label: "Categories", icon: FolderTree },
        { to: "/products", label: "Products", icon: Package },
        { to: "/coupons", label: "Coupons", icon: Ticket },
        { to: "/inventory", label: "Inventory", icon: Boxes },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/orders", label: "Orders", icon: ClipboardList },
        { to: "/returns", label: "Returns", icon: RotateCcw, count: counts.pendingReturns },
        { to: "/reviews", label: "Reviews", icon: MessageSquareText, count: counts.pendingReviews },
        { to: "/delivery-agents", label: "Delivery Agents", icon: Truck },
      ],
    },
  ];

  if (ADMIN_LEVEL.includes(role)) {
    sections.push({
      label: "Merchandising",
      items: [
        { to: "/promotions", label: "Promotions & Groups", icon: Megaphone },
        { to: "/gift-cards", label: "Gift Cards & Credit", icon: Gift },
        { to: "/shipping-zones", label: "Shipping Zones", icon: Truck },
      ],
    });
    sections.push({
      label: "Content",
      items: [{ to: "/content", label: "Storefront Content", icon: FileText }],
    });
    sections.push({
      label: "Team",
      items: [
        { to: "/staff", label: "Staff", icon: UserCog },
        { to: "/customers", label: "Customers", icon: Users },
        { to: "/audit-log", label: "Audit Log", icon: ScrollText },
      ],
    });
    sections.push({
      label: "Finance",
      items: [{ to: "/accounting", label: "Accounting", icon: Receipt }],
    });
  }

  sections.push({ items: [{ to: "/profile", label: "My Profile", icon: UserCircle }] });

  return sections;
}
