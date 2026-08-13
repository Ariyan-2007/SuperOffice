import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { superOfficeBusinessApi, tenantApi } from "../../api/endpoints";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState, InfoBanner } from "../../components/Feedback";
import { BusinessStatusBadge } from "../../components/Badge";
import { formatDate } from "../../lib/format";
import { formatCurrencyLabel, formatCurrencyShort } from "../../lib/currencies";
import type { BusinessResponse } from "../../types/api";

// No aggregate revenue/order stats endpoint exists yet (SUPEROFFICE_FRONTEND_BLUEPRINT.md §7)
// — a plain list of Businesses is the honest MVP dashboard here.
export function SuperOfficeDashboardPage() {
  const navigate = useNavigate();
  const { data: businesses, isLoading } = useQuery({ queryKey: ["so-businesses"], queryFn: () => superOfficeBusinessApi.list() });
  const { data: tenant } = useQuery({ queryKey: ["tenant-me"], queryFn: () => tenantApi.me() });

  const atLimit = tenant?.type === "SingleBusiness" && (businesses?.length ?? 0) >= 1;

  const columns: Column<BusinessResponse>[] = [
    { key: "name", header: "Business", render: (b) => <span style={{ fontWeight: 600 }}>{b.name}</span> },
    { key: "slug", header: "Slug", render: (b) => <span className="cell-mono cell-muted">{b.slug}</span> },
    {
      key: "currency",
      header: "Currency",
      render: (b) => <span title={formatCurrencyLabel(b.currency)}>{formatCurrencyShort(b.currency)}</span>,
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
            title={atLimit ? "Your plan supports a single Business — contact support to upgrade." : undefined}
          >
            <Plus size={14} /> New business
          </Button>
        }
      />

      {atLimit && <InfoBanner>Your Tenant is on a Single-business plan. Contact support to upgrade to Multi-business.</InfoBanner>}

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
    </div>
  );
}
