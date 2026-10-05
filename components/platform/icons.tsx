/**
 * Set de iconos monolínea a juego con `LogoMark` (stroke 1.6, extremos
 * redondeados, caja 24×24). Hechos a mano en vez de instalar una librería:
 * mantiene el lenguaje gráfico de la marca y no añade peso al bundle.
 *
 * Todos son decorativos (`aria-hidden`): el significado siempre lo aporta el
 * texto contiguo o un `aria-label` en el control que los envuelve.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.8 20 5.2v6c0 5-3.4 7.8-8 9.2-4.6-1.4-8-4.2-8-9.2v-6Z" />
      <path d="m8.6 11.8 2.3 2.4 4.5-4.7" />
    </svg>
  );
}

export function LockIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="10.2" width="16" height="11" rx="3" />
      <path d="M8 10.2V7.6a4 4 0 0 1 8 0v2.6" />
      <path d="M12 14.6v2.2" />
    </svg>
  );
}

export function StarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m12 3.2 2.6 5.6 6 .8-4.4 4.3 1.1 6.1-5.3-2.9-5.3 2.9 1.1-6.1L3.4 9.6l6-.8Z" />
    </svg>
  );
}

export function ChatIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.7-.37L4 21l1.2-3.6A6.9 6.9 0 0 1 3.5 12.2C3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2Z" />
    </svg>
  );
}

export function BoltIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13.2 2.5 4.8 13.1h5.6l-.6 8.4 8.4-10.6h-5.6Z" />
    </svg>
  );
}

export function PinIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </svg>
  );
}

export function ClockIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.2 2" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m4.5 12.6 4.8 4.8L19.5 7.2" />
    </svg>
  );
}

export function GloveIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.5 21v-5.4L4.6 12A2 2 0 0 1 8.1 10l.9 1.5V4.6a1.8 1.8 0 0 1 3.6 0v4.6m0 0V3.8a1.8 1.8 0 0 1 3.6 0v5.4m0 0V5.6a1.8 1.8 0 0 1 3.6 0v9.2c0 3.4-1.4 6.2-2.6 6.2" />
      <path d="M6.5 21h11.1" />
    </svg>
  );
}

export function NoFeeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.6 8.6a2.7 2.7 0 0 0-5.1 1.2v2.4m0 0H8.2m1.3 0v2.4c0 1-.5 1.9-1.4 2.4h7m-6.6-4.8h3.4" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  );
}

export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function HomeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.2H5.5A1.5 1.5 0 0 1 4 19Z" />
    </svg>
  );
}

export function ListIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4.5" width="16" height="15" rx="3.2" />
      <path d="M8 9.5h8M8 13h8M8 16.5h4.4" />
    </svg>
  );
}

export function CalendarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.8" y="5.4" width="16.4" height="14.8" rx="3.2" />
      <path d="M3.8 10h16.4M8.4 3.4v3.6M15.6 3.4v3.6" />
    </svg>
  );
}

export function MapIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m3.8 6.4 5.1-2 6.2 2.2 5.1-2v13l-5.1 2-6.2-2.2-5.1 2Z" />
      <path d="M8.9 4.4v13M15.1 6.6v13" />
    </svg>
  );
}

export function PlusIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function UserIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8.6" r="3.6" />
      <path d="M4.8 20c.6-3.6 3.5-5.6 7.2-5.6s6.6 2 7.2 5.6" />
    </svg>
  );
}

export function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9.2" cy="8.8" r="3.2" />
      <path d="M3.2 19.4c.5-3.2 3-5 6-5s5.5 1.8 6 5" />
      <path d="M15.6 5.8a3.1 3.1 0 0 1 0 6M17.6 14.6c1.8.6 3 2.2 3.3 4.4" />
    </svg>
  );
}

export function FlagIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 21V4M6 4.6h11.4l-2 4 2 4H6" />
    </svg>
  );
}

export function GridIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.8" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.8" />
    </svg>
  );
}

export function WalletIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8.2A2.2 2.2 0 0 1 6.2 6H18v3.2M4 8.2V17a2.2 2.2 0 0 0 2.2 2.2H19a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6.2A2.2 2.2 0 0 1 4 8.2Z" />
      <circle cx="15.8" cy="14" r="1.1" />
    </svg>
  );
}

export function LogOutIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9.5 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v11.6a1.7 1.7 0 0 0 1.7 1.7h3.3M15 8l4 4-4 4M19 12H9.5" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function SendIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20.6 3.4 3.8 10.2c-.8.3-.8 1.4 0 1.7l6.2 2.2 2.2 6.2c.3.8 1.4.8 1.7 0Z" />
      <path d="m10 14.1 10.6-10.7" />
    </svg>
  );
}

export function MoreIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="5.5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18.5" cy="12" r="1.2" />
    </svg>
  );
}

export function BlockIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m6.2 6.2 11.6 11.6" />
    </svg>
  );
}

export function InfoIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5M12 7.8v.1" />
    </svg>
  );
}

/** Logotipo de Stripe (marca registrada de Stripe, Inc.) para la fila de
 *  confianza. Se renderiza en `currentColor` para adaptarse a ambos temas. */
export function StripeWordmark({ className = "h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 60 25" fill="currentColor" aria-hidden className={className}>
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.9v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.43Zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58ZM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.34c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.65-5.65 7.65Zm-.95-11.36c-.95 0-1.54.34-1.97.81l.02 5.8c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.71 0-2-1.04-3.68-2.54-3.68ZM28.24 5.57h4.13v14.44h-4.13V5.57Zm0-4.7L32.37 0v3.36l-4.13.88V.88ZM23.98 9.83v10.18h-4.12V5.57h3.6l.12 1.28c.98-1.72 2.94-1.49 3.5-1.28v3.8c-.53-.17-2.2-.42-3.1.46ZM15.44 15.14c0 2.43 2.6 1.67 3.13 1.46v3.36c-.55.3-1.54.54-2.89.54a4.1 4.1 0 0 1-4.37-4.42V1.98l4.02-.86.01 3.1h3.23v3.52h-3.13v7.4ZM4.24 9.72c0 .64.53.92 1.4 1.23 1.57.5 3.83 1.23 3.83 4.13 0 3.1-2.47 4.87-6.07 4.87-1.5 0-3.13-.29-4.73-.98v-3.93c1.45.79 3.29 1.38 4.73 1.38.97 0 1.67-.26 1.67-1.06 0-.7-.6-1-1.5-1.32C2 13.53 0 12.76 0 10.11 0 7.04 2.34 5.2 5.86 5.2c1.44 0 2.87.22 4.31.8v3.88a9.72 9.72 0 0 0-4.31-1.12c-.91 0-1.62.26-1.62.96Z" />
    </svg>
  );
}
