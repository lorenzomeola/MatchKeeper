import { StatusBadge } from "@/components/app/status-badge";
import { clockTime } from "@/lib/format";
import { CHECKIN_WINDOW_MIN } from "@/lib/payments/config";

type Props = {
  status: string;
  startsAt: string;
  checkedInAt: string | null;
  distanceM: number | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
};

function relation(checkedInAt: string, startsAt: string) {
  const min = Math.round((Date.parse(checkedInAt) - Date.parse(startsAt)) / 60_000);
  if (min === 0) return "at kick-off";
  return min < 0 ? `${-min} min before kick-off` : `${min} min after kick-off`;
}

/** Qué pasó con el check-in de una reserva: hora, distancia, posición y foto. Los admin ven la posición exacta mientras exista. */
export function AdminCheckIn({ status, startsAt, checkedInAt, distanceM, lat, lng, photoUrl }: Props) {
  if (status === "cancelled") return null;

  if (!checkedInAt) {
    const start = Date.parse(startsAt);
    const now = new Date().getTime();
    if (now > start + CHECKIN_WINDOW_MIN * 60_000) return <StatusBadge tone="danger">No check-in</StatusBadge>;
    if (now >= start - CHECKIN_WINDOW_MIN * 60_000) return <StatusBadge tone="neutral">Not checked in yet</StatusBadge>;
    return <StatusBadge tone="neutral">Check-in not open yet</StatusBadge>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-2">
      <StatusBadge tone="success">Checked in</StatusBadge>
      <span>
        {clockTime(checkedInAt)} UK time · {relation(checkedInAt, startsAt)}
        {distanceM != null && ` · ${distanceM} m from the pitch`}
      </span>
      {lat != null && lng != null ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent-strong underline-offset-4 hover:underline"
        >
          Keeper&apos;s position in Maps
        </a>
      ) : (
        <span className="text-muted">Exact position no longer stored</span>
      )}
      {photoUrl && (
        <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada y temporal de Supabase Storage */}
          <img src={photoUrl} alt="Photo the keeper sent from the pitch" className="h-16 w-16 rounded-[var(--r-sm)] border border-line object-cover" loading="lazy" />
        </a>
      )}
    </div>
  );
}
