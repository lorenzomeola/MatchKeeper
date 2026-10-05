const SIZES = {
  sm: "h-9 w-9 text-xs rounded-[var(--r-sm)]",
  md: "h-11 w-11 text-sm rounded-[var(--r-md)]",
  lg: "h-16 w-16 text-lg rounded-[var(--r-lg)]",
  xl: "h-24 w-24 text-2xl rounded-[var(--r-xl)]",
} as const;

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "MK"
  );
}

/** Avatar cuadrado con esquinas suaves; sin foto muestra las iniciales. */
export function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-line-strong bg-surface-2 font-semibold text-fg-2 ${SIZES[size]} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL pública de Supabase Storage, sin optimizador
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden className="pl-display leading-none">
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
