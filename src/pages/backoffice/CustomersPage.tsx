import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { customerApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { PageHeader } from "../../components/StatCard";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { UserStatusBadge } from "../../components/Badge";
import type { UserSummaryResponse } from "../../types/api";

export function CustomersPage() {
  const businessId = useBusinessId();
  const { data: customers, isLoading } = useQuery({ queryKey: ["customers", businessId], queryFn: () => customerApi.list(businessId) });

  const columns: Column<UserSummaryResponse>[] = [
    { key: "name", header: "Name", render: (u) => <span style={{ fontWeight: 600 }}>{u.fullName}</span> },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "status", header: "Status", render: (u) => <UserStatusBadge status={u.status} /> },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Customers" subtitle="Read-only — customers manage their own accounts through the Shop." />
      {customers && customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers will appear here once they sign up on the Shop." />
      ) : (
        <DataTable columns={columns} rows={customers ?? []} rowKey={(u) => u.id} />
      )}
    </div>
  );
}
