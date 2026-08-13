import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "../../api/endpoints";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { PageLoader, InfoBanner } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { formatDate } from "../../lib/format";

const STATUS_TONE = { PendingSetup: "warning", Active: "success", Suspended: "danger", Cancelled: "neutral" } as const;

export function TenantProfilePage() {
  const { data: tenant, isLoading } = useQuery({ queryKey: ["tenant-me"], queryFn: () => tenantApi.me() });

  if (isLoading || !tenant) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Tenant profile" subtitle="Your subscription details." />

      <InfoBanner>
        There's no self-service editing for Tenant profile yet — this is read-only. Contact Vastora support for changes.
      </InfoBanner>

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
            <dt>Contact email</dt>
            <dd>{tenant.contactEmail}</dd>
            <dt>Contact phone</dt>
            <dd>{tenant.contactPhone}</dd>
            <dt>Member since</dt>
            <dd>{formatDate(tenant.createdAt)}</dd>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
