import Link from "next/link";
import { ArrowRightIcon, WalletIcon } from "@/components/platform/icons";

/** Acceso al historial de pagos desde el inicio; en móvil no hay otra entrada. */
export function PaymentsLink({ role }: { role: "team" | "keeper" }) {
  return (
    <Link
      href="/payments"
      className="pl-surface pl-lift group flex min-h-16 items-center gap-3 rounded-[var(--r-lg)] px-4 py-3"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] bg-accent-soft text-accent">
        <WalletIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-fg">Payments</span>
        <span className="block text-[13px] text-muted">
          {role === "keeper" ? "What you have earned, game by game" : "What you paid for each booking, with the breakdown"}
        </span>
      </span>
      <ArrowRightIcon className="h-4 w-4 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
