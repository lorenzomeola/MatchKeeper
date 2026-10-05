import type { ComponentType, ReactNode } from "react";

/** Estado vacío con una acción clara; nunca una pantalla en blanco. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-[var(--r-xl)] border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-[var(--r-md)] bg-accent-soft text-accent">
        <Icon className="h-6 w-6" />
      </span>
      <p className="pl-display mt-5 text-fg [font-size:var(--t-xl)]">{title}</p>
      <p className="pl-prose mt-2 max-w-[26rem] text-[15px]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
