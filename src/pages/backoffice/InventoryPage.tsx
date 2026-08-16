import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PackageSearch } from "lucide-react";
import { inventoryApi, categoryApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader, StatCard } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader } from "../../components/Feedback";
import { InfoBanner } from "../../components/Feedback";
import { formatMoney } from "../../lib/format";
import type { LowStockProductResponse } from "../../types/api";

// Low-stock alerts are pull, not push (BACKOFFICE_FRONTEND_BLUEPRINT.md §7.9, added
// 2026-08-15) — this is a snapshot query, checked on page load, not a subscription.
export function InventoryPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ["inventory-low-stock", businessId],
    queryFn: () => inventoryApi.lowStock(businessId),
  });
  const { data: valuation, isLoading: valuationLoading } = useQuery({
    queryKey: ["inventory-valuation", businessId],
    queryFn: () => inventoryApi.valuation(businessId),
  });
  const { data: categories } = useQuery({ queryKey: ["categories", businessId], queryFn: () => categoryApi.list(businessId) });

  const categoryName = (id: string) => (categories ?? []).find((c) => c.id === id)?.name ?? id.slice(0, 8) + "…";
  const currency = business?.currency ?? "USD";

  const columns: Column<LowStockProductResponse>[] = [
    { key: "product", header: "Product", render: (p) => <span style={{ fontWeight: 600 }}>{p.productName}</span> },
    { key: "sku", header: "SKU", render: (p) => <span className="cell-mono cell-muted">{p.sku}</span> },
    { key: "stock", header: "In Stock", render: (p) => <span style={{ color: "var(--warning)", fontWeight: 600 }}>{p.stockQuantity}</span> },
    { key: "threshold", header: "Reorder Threshold", render: (p) => p.reorderThreshold },
    { key: "reorderQty", header: "Reorder Quantity", render: (p) => p.reorderQuantity ?? "—" },
  ];

  if (lowStockLoading || valuationLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Inventory" subtitle="Stock health across your catalog. Adjust individual products from the Products page." />

      <div className="stat-grid">
        <StatCard label="Low Stock Products" value={lowStock?.length ?? 0} meta="At or below reorder threshold" />
        <StatCard label="Inventory Value (Cost)" value={formatMoney(valuation?.totalValueAtCost ?? 0, currency)} meta="What the balance sheet uses" />
        <StatCard label="Inventory Value (Retail)" value={formatMoney(valuation?.totalValueAtRetail ?? 0, currency)} />
        <StatCard label="Potential Margin" value={formatMoney(valuation?.potentialMargin ?? 0, currency)} />
      </div>

      {!!valuation?.unvaluedProductCount && (
        <InfoBanner>
          {valuation.unvaluedProductCount} product{valuation.unvaluedProductCount === 1 ? "" : "s"} in stock have no cost price recorded — the cost
          figures above understate reality. Add a cost price on each product to fix this.
        </InfoBanner>
      )}

      <Card>
        <CardHeader title="Low Stock" actions={<AlertTriangle size={15} color="var(--warning)" />} />
        <CardBody style={{ padding: lowStock?.length ? 0 : undefined }}>
          {!lowStock?.length ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              Nothing is low right now. Only products with a reorder threshold set (edit the product to add one) show up here.
            </p>
          ) : (
            <DataTable columns={columns} rows={lowStock} rowKey={(p) => p.productId} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Valuation by Category" />
        <CardBody style={{ padding: 0 }}>
          {!valuation?.byCategory.length ? (
            <div className="empty-state">
              <PackageSearch className="empty-state-icon" strokeWidth={1.4} />
              <div className="empty-state-title">No Valuation Data</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Value at Cost</th>
                  <th>Value at Retail</th>
                </tr>
              </thead>
              <tbody>
                {valuation.byCategory.map((entry) => (
                  <tr key={entry.categoryId}>
                    <td>{categoryName(entry.categoryId)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(entry.valueAtCost, currency)}</td>
                    <td className="cell-muted">{formatMoney(entry.valueAtRetail, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
