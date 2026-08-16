import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { auditLogApi } from "../../api/endpoints";
import { useBusinessId } from "../../context/useBusinessId";
import { usePagedQuery } from "../../lib/usePagedQuery";
import { PageHeader } from "../../components/StatCard";
import { Card, CardBody } from "../../components/Card";
import { Pagination } from "../../components/Pagination";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Field, Input } from "../../components/Field";
import { formatDate, formatDateTime } from "../../lib/format";
import type { AuditLogResponse } from "../../types/api";

export function AuditLogPage() {
  const businessId = useBusinessId();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { items: entries, isLoading, paginationProps } = usePagedQuery(
    ["audit-log", businessId, from, to],
    (page, pageSize) =>
      auditLogApi.list(businessId, {
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        page,
        pageSize,
      }),
    { initialPageSize: 50 },
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, AuditLogResponse[]>();
    for (const entry of entries) {
      const day = formatDate(entry.createdAt);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(entry);
    }
    return [...groups.entries()];
  }, [entries]);

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Audit Log" subtitle="Every mutating request, who made it and what happened — an activity feed, not a field-level change history." />

      <div className="filter-bar">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No Activity" description="Mutating requests (create/update/delete) will show up here." />
      ) : (
        <Card>
          <CardBody style={{ padding: 0 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {grouped.map(([day, dayEntries]) => (
                <div key={day}>
                  <div style={{ padding: "10px 20px", background: "var(--surface-sunken)", fontSize: 11.5, fontWeight: 650, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {day}
                  </div>
                  {dayEntries.map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.userEmail} <span className="text-muted" style={{ fontWeight: 500 }}>({e.role})</span></div>
                        <div className="cell-mono cell-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {e.method} {e.routeTemplate}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span className="text-muted" style={{ fontSize: 11.5 }}>{formatDateTime(e.createdAt)}</span>
                        <Badge tone={e.statusCode < 300 ? "success" : e.statusCode < 500 ? "warning" : "danger"}>{e.statusCode}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {paginationProps && <Pagination {...paginationProps} />}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
