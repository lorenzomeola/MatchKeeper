export function PaymentModeNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      role="status"
      className={`rounded-[var(--r-md)] border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] px-4 py-3 text-sm text-fg-2 ${className}`}
    >
      <p className="font-semibold text-fg">Bookings are temporarily unavailable</p>
      <p className="mt-1 leading-relaxed">
        We could not confirm the current booking mode. Please try again shortly, and do not confirm a booking until it is available.
      </p>
    </aside>
  );
}
