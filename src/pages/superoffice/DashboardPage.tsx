import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, TrendingUp } from "lucide-react";
import { analyticsApi, superOfficeBusinessApi, tenantApi } from "../../api/endpoints";
import { PageHeader, StatCard } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState, InfoBanner } from "../../components/Feedback";
import { BusinessStatusBadge } from "../../components/Badge";
import { formatDate, formatMoney } from "../../lib/format";
import { formatCurrencyLabel, formatCurrencyShort } from "../../lib/currencies";
import type { BusinessResponse } from "../../types/api";

// Dashboard now backed by real endpoints (SUPEROFFICE_FRONTEND_BLUEPRINT.md §6.4/§6.2, added
// 2026-08-15) — analytics.businesses annotates each row with revenue/orders in one call, and
// tenants/me/usage supplies the plan-aware "Add Business" gate the type check alone can't.
export function SuperOfficeDashboardPage() {
  const navigate = useNavigate();
  const { data: businesses, isLoading } = useQuery({ queryKey: ["so-businesses"], queryFn: () => superOfficeBusinessApi.list() });
  const { data: tenant } = useQuery({ queryKey: ["tenant-me"], queryFn: () => tenantApi.me() });
  const { data: usage } = useQuery({ queryKey: ["tenant-usage"], queryFn: () => tenantApi.usage() });
  const { data: analytics } = useQuery({ queryKey: ["so-analytics"], queryFn: () => analyticsApi.get() });

  const businessCount = businesses?.length ?? 0;
  const singleBusinessCapped = tenant?.type === "SingleBusiness" && businessCount >= 1;
  const planCapped = usage?.maxBusinesses != null && businessCount >= usage.maxBusinesses;
  const atLimit = singleBusinessCapped || planCapped;
  const limitReason = singleBusinessCapped
    ? "Your Tenant is on a Single-business plan. Contact support to upgrade to Multi-business."
    : planCapped
      ? `Your '${usage?.plan}' plan allows up to ${usage?.maxBusinesses} Business(es). Contact support to upgrade your plan.`
      : null;

  const revenueByBusiness = new Map((analytics?.businesses ?? []).map((b) => [b.businessId, b]));

  const columns: Column<BusinessResponse>[] = [
    { key: "name", header: "Business", render: (b) => <span style={{ fontWeight: 600 }}>{b.name}</span> },
    { key: "slug", header: "Slug", render: (b) => <span className="cell-mono cell-muted">{b.slug}</span> },
    {
      key: "currency",
      header: "Currency",
      render: (b) => <span title={formatCurrencyLabel(b.currency)}>{formatCurrencyShort(b.currency)}</span>,
    },
    {
      key: "orders",
      header: "Orders",
      render: (b) => revenueByBusiness.get(b.id)?.orderCount ?? "—",
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (b) => (revenueByBusiness.has(b.id) ? formatMoney(revenueByBusiness.get(b.id)!.revenue, b.currency) : "—"),
    },
    { key: "status", header: "Status", render: (b) => <BusinessStatusBadge status={b.status} /> },
    { key: "created", header: "Created", render: (b) => formatDate(b.createdAt) },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Businesses"
        subtitle="Every Business under your Tenant."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/businesses/new")}
            disabled={atLimit}
            title={atLimit ? (limitReason ?? undefined) : undefined}
          >
            <Plus size={14} /> New business
          </Button>
        }
      />

      {atLimit && <InfoBanner>{limitReason}</InfoBanner>}

      {analytics && (
        <div className="stat-grid">
          <StatCard label="Total Revenue" value={formatMoney(analytics.totalRevenue, "USD")} meta="Delivered orders, all-time, across Businesses" />
          <StatCard label="Total Orders" value={analytics.totalOrders} meta="Every non-cancelled order" />
          <StatCard label="Businesses" value={businessCount} meta={usage?.maxBusinesses != null ? `of ${usage.maxBusinesses} on your plan` : "Unlimited on your plan"} />
        </div>
      )}

      {businesses && businesses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Businesses Yet"
          description="Create your first Business to get started."
          action={
            <Button variant="primary" onClick={() => navigate("/businesses/new")} style={{ marginTop: 8 }}>
              <Plus size={14} /> New business
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={businesses ?? []} rowKey={(b) => b.id} onRowClick={(b) => navigate(`/businesses/${b.id}`)} />
      )}

      {analytics && analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader title="Top Products" actions={<TrendingUp size={15} color="var(--text-faint)" />} />
          <CardBody style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topProducts.map((p) => (
                  <tr key={p.productId}>
                    <td style={{ fontWeight: 600 }}>{p.productName}</td>
                    <td>{p.quantitySold}</td>
                    <td>{formatMoney(p.revenue, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
