import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "../../api/endpoints";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { PageLoader, InfoBanner, WarningBanner } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { formatDate } from "../../lib/format";

const STATUS_TONE = { PendingSetup: "warning", Active: "success", Suspended: "danger", Cancelled: "neutral" } as const;

export function TenantProfilePage() {
  const { data: tenant, isLoading } = useQuery({ queryKey: ["tenant-me"], queryFn: () => tenantApi.me() });
  const { data: usage } = useQuery({ queryKey: ["tenant-usage"], queryFn: () => tenantApi.usage() });

  if (isLoading || !tenant) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Tenant Profile" subtitle="Your subscription details." />

      <InfoBanner>
        There's no self-service editing for Tenant profile yet — this is read-only. Contact Vastora support for changes.
      </InfoBanner>

      {!tenant.superOfficeDomain && (
        <WarningBanner>
          No SuperOffice domain is set for your Tenant yet — password-reset links sent from this app will fall back
          to Vastora's platform-wide default address instead of this one. Contact Vastora support to have it set.
        </WarningBanner>
      )}

      <Card>
        <CardHeader title={tenant.name} actions={<Badge tone={STATUS_TONE[tenant.status]}>{tenant.status}</Badge>} />
        <CardBody>
          <dl className="kv-grid">
            <dt>Slug</dt>
            <dd className="mono">{tenant.slug}</dd>
            <dt>Type</dt>
            <dd>{tenant.type}</dd>
            <dt>Plan</dt>
            <dd>{tenant.plan}</dd>
            <dt>Contact Email</dt>
            <dd>{tenant.contactEmail}</dd>
            <dt>Contact Phone</dt>
            <dd>{tenant.contactPhone}</dd>
            <dt>SuperOffice Domain</dt>
            <dd className="mono">{tenant.superOfficeDomain ?? "Not set"}</dd>
            <dt>Member Since</dt>
            <dd>{formatDate(tenant.createdAt)}</dd>
          </dl>
        </CardBody>
      </Card>

      {usage && (
        <Card>
          <CardHeader title="Plan Usage" />
          <CardBody style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Staff</th>
                  <th>Products</th>
                </tr>
              </thead>
              <tbody>
                {usage.businesses.map((b) => (
                  <tr key={b.businessId}>
                    <td style={{ fontWeight: 600 }}>{b.businessName}</td>
                    <td>{b.staffCount}{b.maxStaffPerBusiness != null ? ` / ${b.maxStaffPerBusiness}` : " (unlimited)"}</td>
                    <td>{b.productCount}{b.maxProductsPerBusiness != null ? ` / ${b.maxProductsPerBusiness}` : " (unlimited)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
          <CardBody style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-muted" style={{ fontSize: 12.5 }}>
              Businesses: {usage.businessCount}{usage.maxBusinesses != null ? ` / ${usage.maxBusinesses}` : " (unlimited)"} on the {usage.plan} plan.
            </span>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
