import Link from "next/link";

/** Pestañas como enlaces con `?tab=`: sin JS, compartibles y con el botón atrás funcionando. */
export function Tabs<T extends string>({
  tabs,
  active,
  base,
}: {
  tabs: { value: T; label: string; count: number }[];
  active: T;
  base: string;
}) {
  return (
    <nav aria-label="Filter" className="-mx-5 mb-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto">
        {tabs.map((t) => {
          const on = t.value === active;
          return (
            <li key={t.value}>
              <Link
                href={`${base}?tab=${t.value}`}
                replace
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
                  on
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-line-strong bg-surface text-fg-2 hover:border-accent/50 hover:text-fg"
                }`}
              >
                {t.label}
                <span className={`pl-tnum text-xs ${on ? "text-accent-strong" : "text-muted"}`}>{t.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
