import clsx from "clsx";

export function StatCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string | number;
  meta?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={clsx("stat-value", tone === "positive" && "stat-value-positive", tone === "negative" && "stat-value-negative")}>{value}</div>
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
