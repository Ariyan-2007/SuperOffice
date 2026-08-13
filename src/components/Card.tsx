import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  padded,
  style,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={clsx("card", padded && "card-padded", className)} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card-header">
      <div className="card-title">{title}</div>
      {actions}
    </div>
  );
}

export function CardBody({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={clsx("card-body", className)} style={style}>
      {children}
    </div>
  );
}
