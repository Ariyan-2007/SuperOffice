import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, PackageSearch, Ticket } from "lucide-react";
import { productApi, categoryApi, couponApi, orderApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader, StatCard } from "../../components/StatCard";
import { PageLoader } from "../../components/Feedback";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { OrderStatusBadge } from "../../components/Badge";
import { formatDateTime, formatMoney } from "../../lib/format";
import { Link } from "react-router-dom";

// No aggregate stats endpoint exists on the backend (BACKOFFICE_FRONTEND_BLUEPRINT.md §8) —
// every number here is computed client-side from list responses the other pages already fetch.
export function DashboardPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { user } = useAuth();

  const products = useQuery({ queryKey: ["products", businessId], queryFn: () => productApi.list(businessId) });
  const categories = useQuery({ queryKey: ["categories", businessId], queryFn: () => categoryApi.list(businessId) });
  const coupons = useQuery({ queryKey: ["coupons", businessId], queryFn: () => couponApi.list(businessId) });
  const orders = useQuery({ queryKey: ["orders", businessId], queryFn: () => orderApi.list(businessId) });

  if (products.isLoading || categories.isLoading || coupons.isLoading || orders.isLoading) return <PageLoader />;

  const lowStock = (products.data ?? []).filter((p) => p.trackInventory && p.stockQuantity <= 5);
  const activeProducts = (products.data ?? []).filter((p) => p.status === "Active");
  const activeCoupons = (coupons.data ?? []).filter((c) => c.isActive);
  const openOrders = (orders.data ?? []).filter((o) => !["Delivered", "Cancelled", "Refunded"].includes(o.status));
  const recentOrders = [...(orders.data ?? [])].sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt)).slice(0, 6);

  return (
    <div className="section-stack">
      <PageHeader title={`Welcome back, ${user?.fullName?.split(" ")[0] ?? ""}`} subtitle={business?.name ?? "Dashboard"} />

      <div className="stat-grid">
        <StatCard label="Open orders" value={openOrders.length} meta={`${orders.data?.length ?? 0} total`} />
        <StatCard label="Active products" value={activeProducts.length} meta={`${products.data?.length ?? 0} total`} />
        <StatCard
          label="Low stock"
          value={lowStock.length}
          meta={lowStock.length ? "≤ 5 units remaining" : "All stocked"}
        />
        <StatCard label="Active coupons" value={activeCoupons.length} meta={`${categories.data?.length ?? 0} categories`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <Card>
          <CardHeader title="Recent orders" actions={<Link to="/orders" className="btn btn-ghost btn-sm">View all</Link>} />
          <CardBody style={{ padding: 0 }}>
            {recentOrders.length === 0 ? (
              <div className="empty-state">
                <ClipboardList className="empty-state-icon" strokeWidth={1.4} />
                <div className="empty-state-title">No orders yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    to={`/orders/${o.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "13px 20px",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text)",
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.orderNumber}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{formatDateTime(o.placedAt)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{formatMoney(o.total, business?.currency ?? "USD")}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card padded>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 620, fontSize: 13.5 }}>
              <AlertTriangle size={15} color="var(--warning)" /> Needs attention
            </div>
            {lowStock.length === 0 && activeCoupons.some((c) => new Date(c.expiresAt) > new Date()) === false && (
              <div className="text-muted" style={{ fontSize: 13 }}>Nothing urgent right now.</div>
            )}
            {lowStock.slice(0, 4).map((p) => (
              <Link key={p.id} to="/products" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)" }}>
                <PackageSearch size={14} color="var(--text-faint)" />
                <span style={{ flex: 1 }}>{p.name}</span>
                <span className="text-muted">{p.stockQuantity} left</span>
              </Link>
            ))}
            {activeCoupons.length > 0 && (
              <Link to="/coupons" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)" }}>
                <Ticket size={14} color="var(--text-faint)" />
                <span>{activeCoupons.length} active coupon{activeCoupons.length === 1 ? "" : "s"}</span>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
