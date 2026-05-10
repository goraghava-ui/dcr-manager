import { Fragment, type ReactNode } from "react";
import { Icon } from "./shared";

interface PageHeaderProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
}

export function PageHeader({ title, sub, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
      {breadcrumb && (
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          {breadcrumb.map((b, i) => (
            <Fragment key={i}>
              <span>{b}</span>
              {i < breadcrumb.length - 1 && <Icon name="chevron" size={11} color="var(--ink-4)" />}
            </Fragment>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
          {sub && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
      </div>
    </div>
  );
}
