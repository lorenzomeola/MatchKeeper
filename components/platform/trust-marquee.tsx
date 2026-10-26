/**
 * Banner naranja de pruebas de confianza. Se mueve solo y se detiene al pasar
 * el ratón por encima. El contenido se duplica para que el bucle no tenga
 * costura; la copia lleva `aria-hidden` para no leerse dos veces con lector de
 * pantalla.
 */
import {
  ChatIcon,
  GloveIcon,
  LockIcon,
  NoFeeIcon,
  PinIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@/components/platform/icons";

type Proof = { icon: (props: { className?: string }) => React.ReactNode; text: string };

const PROOFS: Proof[] = [
  { icon: LockIcon, text: "Keeper paid after the match" },
  { icon: ShieldCheckIcon, text: "Every keeper manually reviewed" },
  { icon: StarIcon, text: "Public rating & match history" },
  { icon: ChatIcon, text: "In-app chat with your keeper" },
  { icon: NoFeeIcon, text: "No subscription, no listing fee" },
  { icon: GloveIcon, text: "Free for goalkeepers to join" },
  { icon: PinIcon, text: "London pilot" },
];

export function TrustMarquee({ items = PROOFS }: { items?: Proof[] }) {
  return (
    <div className="pl-marquee-wrap overflow-hidden bg-accent text-accent-ink">
      {/* El padding derecho iguala el gap para que el desplazamiento del -50% cuadre sin salto. */}
      <ul className="pl-marquee items-stretch gap-6 pr-6 sm:gap-10 sm:pr-10">
        {[0, 1].map((copy) =>
          items.flatMap((p) => [
            <li
              key={`${copy}-${p.text}`}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-3 py-5 text-lg font-bold uppercase tracking-wide sm:gap-4 sm:py-7 sm:text-2xl"
            >
              <p.icon className="h-7 w-7 shrink-0 stroke-[2] sm:h-8 sm:w-8" />
              {p.text}
            </li>,
            <li key={`${copy}-${p.text}-sep`} aria-hidden className="flex shrink-0 gap-1.5">
              <span className="w-[3px] -skew-x-[28deg] bg-accent-ink" />
              <span className="w-[3px] -skew-x-[28deg] bg-accent-ink" />
            </li>,
          ]),
        )}
      </ul>
    </div>
  );
}
