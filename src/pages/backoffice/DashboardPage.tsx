import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, PackageSearch, RotateCcw, TrendingUp } from "lucide-react";
import { dashboardApi, inventoryApi, orderApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { PageHeader, StatCard } from "../../components/StatCard";
import { PageLoader } from "../../components/Feedback";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { formatMoney } from "../../lib/format";

// Replaced 2026-08-16 (BACKOFFICE_FRONTEND_BLUEPRINT.md §7.16/§8) — the dashboard is now one
// request (`GET .../analytics/dashboard`) instead of assembling itself from six parallel
// queries. It's Admin-tier only (financial data), so Staff sessions fall back to a
// low-stock/order-count widget built from endpoints they can actually call.
export function DashboardPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { user } = useAuth();
  const canSeeDashboard = ADMIN_LEVEL.includes(user!.role);

  const dashboard = useQuery({
    queryKey: ["dashboard", businessId],
    queryFn: () => dashboardApi.get(businessId),
    enabled: canSeeDashboard,
  });
  const lowStock = useQuery({ queryKey: ["inventory-low-stock", businessId], queryFn: () => inventoryApi.lowStock(businessId) });
  const orderCount = useQuery({
    queryKey: ["order-count", businessId],
    queryFn: () => orderApi.list(businessId, { pageSize: 1 }).then((r) => r.totalCount),
    enabled: !canSeeDashboard,
  });

  if ((canSeeDashboard && dashboard.isLoading) || lowStock.isLoading) return <PageLoader />;

  const currency = business?.currency ?? dashboard.data?.currency ?? "USD";

  return (
    <div className="section-stack">
      <PageHeader title={`Welcome back, ${user?.fullName?.split(" ")[0] ?? ""}`} subtitle={business?.name ?? "Dashboard"} />

      {!canSeeDashboard || !dashboard.data ? (
        <div className="stat-grid">
          <StatCard label="Total Orders" value={orderCount.data ?? "—"} />
          <StatCard label="Low Stock" value={lowStock.data?.length ?? 0} meta={lowStock.data?.length ? "At or below reorder threshold" : "All stocked"} />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Revenue (30d)" value={formatMoney(dashboard.data.revenue, currency)} meta="Delivered orders only" />
            <StatCard label="Gross Profit" value={formatMoney(dashboard.data.grossProfit, currency)} />
            <StatCard label="Avg Order Value" value={formatMoney(dashboard.data.averageOrderValue, currency)} />
            <StatCard label="Repeat Customer Rate" value={`${dashboard.data.repeatCustomerRate}%`} meta={`${dashboard.data.uniqueCustomers} unique customers`} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
            <Card>
              <CardHeader title="Daily Sales" actions={<TrendingUp size={15} color="var(--text-faint)" />} />
              <CardBody>
                <DailySalesChart points={dashboard.data.dailySales} currency={currency} />
              </CardBody>
            </Card>

            <Card padded>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 620, fontSize: 13.5 }}>
                  <AlertTriangle size={15} color="var(--warning)" /> Needs attention
                </div>
                {dashboard.data.lowStockCount === 0 && dashboard.data.pendingReturns === 0 && (
                  <div className="text-muted" style={{ fontSize: 13 }}>Nothing urgent right now.</div>
                )}
                {dashboard.data.lowStockCount > 0 && (
                  <Link to="/inventory" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)" }}>
                    <PackageSearch size={14} color="var(--text-faint)" />
                    <span style={{ flex: 1 }}>{dashboard.data.lowStockCount} product{dashboard.data.lowStockCount === 1 ? "" : "s"} low on stock</span>
                  </Link>
                )}
                {dashboard.data.pendingReturns > 0 && (
                  <Link to="/returns" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)" }}>
                    <RotateCcw size={14} color="var(--text-faint)" />
                    <span style={{ flex: 1 }}>{dashboard.data.pendingReturns} return{dashboard.data.pendingReturns === 1 ? "" : "s"} awaiting decision</span>
                  </Link>
                )}
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Card>
              <CardHeader title="Top Products" />
              <CardBody style={{ padding: dashboard.data.topProducts.length ? 0 : undefined }}>
                {dashboard.data.topProducts.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 13, padding: 20 }}>No sales in this window yet.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.data.topProducts.map((p) => (
                        <tr key={p.productId}>
                          <td style={{ fontWeight: 600 }}>{p.productName}</td>
                          <td>{p.quantitySold}</td>
                          <td>{formatMoney(p.revenue, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Status Breakdown" />
              <CardBody>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {dashboard.data.statusBreakdown.map((s) => (
                    <div key={s.status} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span className="text-muted">{s.status}</span>
                      <span style={{ fontWeight: 600 }}>{s.count}</span>
                    </div>
                  ))}
                  {dashboard.data.statusBreakdown.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>No orders in this window yet.</p>}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function DailySalesChart({ points, currency }: { points: { date: string; revenue: number; orderCount: number }[]; currency: string }) {
  if (points.length === 0) return <p className="text-muted" style={{ fontSize: 13 }}>No sales in this window yet.</p>;
  const max = Math.max(...points.map((p) => p.revenue), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140 }}>
      {points.map((p) => (
        <div
          key={p.date}
          title={`${p.date}: ${formatMoney(p.revenue, currency)} · ${p.orderCount} order${p.orderCount === 1 ? "" : "s"}`}
          style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}
        >
          <div
            style={{
              background: "var(--brand-500)",
              borderRadius: "3px 3px 0 0",
              height: `${Math.max(2, (p.revenue / max) * 100)}%`,
              minHeight: 2,
            }}
          />
        </div>
      ))}
    </div>
  );
}
