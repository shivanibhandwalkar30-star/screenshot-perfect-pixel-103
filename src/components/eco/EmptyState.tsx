import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="eco-card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-3xl">♻️</span>
      <p className="font-display text-lg font-semibold text-primary-deep">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
