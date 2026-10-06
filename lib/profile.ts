export type Role = "player" | "goalkeeper";

export const LEVELS = ["Casual", "Intermediate", "Competitive", "Semi-pro"] as const;

export const LEVEL_INFO: Record<(typeof LEVELS)[number], string> = {
  Casual: "Friendly, social games. Mixed ability and nothing at stake.",
  Intermediate: "Regular organised games or a social league. A decent standard, most players turn up every week.",
  Competitive: "League or cup matches where the result matters. Players train and take it seriously.",
  "Semi-pro": "Top amateur or non-league standard. Structured training and a fast pace.",
};

// Tramos de edad (solo mayores de 18). Orden ascendente: se compara por posición.
export const AGE_RANGES = [
  { value: "18-24", from: 18, to: 24 },
  { value: "25-34", from: 25, to: 34 },
  { value: "35-44", from: 35, to: 44 },
  { value: "45-54", from: 45, to: 54 },
  { value: "55+", from: 55, to: null },
] as const;

export const AGE_RANGE_OPTIONS = AGE_RANGES.map((a) => ({ value: a.value as string, label: a.value as string }));

// Preferencia de un partido: "desde" y "hasta" usan el mismo valor de tramo; la etiqueta muestra la edad.
export const AGE_FROM_OPTIONS = [
  { value: "", label: "No minimum" },
  ...AGE_RANGES.map((a) => ({ value: a.value as string, label: `${a.from}+` })),
];
export const AGE_TO_OPTIONS = [
  { value: "", label: "No maximum" },
  ...AGE_RANGES.filter((a) => a.to != null).map((a) => ({ value: a.value as string, label: `Up to ${a.to}` })),
];

export function isAgeRange(value: string | null | undefined): value is (typeof AGE_RANGES)[number]["value"] {
  return AGE_RANGES.some((a) => a.value === value);
}

/** Texto de la preferencia de edad de un partido; null si no hay ninguna. */
export function ageRangeText(min: string | null | undefined, max: string | null | undefined): string | null {
  const lo = AGE_RANGES.find((a) => a.value === min);
  const hi = AGE_RANGES.find((a) => a.value === max);
  if (!lo && !hi) return null;
  if (lo && hi) {
    if (hi.to == null) return `${lo.from}+`;
    return lo.value === hi.value ? lo.value : `${lo.from}-${hi.to}`;
  }
  if (lo) return `${lo.from}+`;
  return hi!.to == null ? null : `up to ${hi!.to}`;
}

export const PLAYER_KINDS = ["individual", "team"] as const;
export type PlayerKind = (typeof PLAYER_KINDS)[number];

export const PLAYER_KIND_COPY: Record<PlayerKind, { title: string; body: string }> = {
  individual: {
    title: "Me and my friends",
    body: "I play in a group and I am posting matches to find a keeper.",
  },
  team: {
    title: "A team or club",
    body: "We play together under a team name and set up our matches here.",
  },
};

// Lista cerrada: evita erratas y deja a todos los perfiles con la misma ciudad escrita igual.
export const CITIES = [
  { value: "London", available: true },
  { value: "Manchester", available: false },
  { value: "Birmingham", available: false },
  { value: "Leeds", available: false },
  { value: "Bristol", available: false },
] as const;

export const DEFAULT_CITY = "London";

export const CITY_OPTIONS = CITIES.map((c) => ({
  value: c.value as string,
  label: c.available ? c.value : `${c.value} (coming soon)`,
  disabled: !c.available,
}));

export function isAvailableCity(city: string) {
  return CITIES.some((c) => c.available && c.value === city);
}

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const BIO_MAX = 500;
export const KEEPER_BIO_MIN = 40;
export const DETAILED_BIO_MIN = 150;

export type ProfileValues = {
  displayName: string;
  city: string;
  bio: string;
  level: string;
  experienceYears: string;
  ageRange: string;
  avatarUrl: string;
  teamName: string;
  playerKind: PlayerKind;
};

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  /** Obligatorio para que el admin pueda aprobar al portero. */
  required: boolean;
  /** Puntos que suma al rating (los pesos de un rol suman 100). */
  weight: number;
  /** Qué gana el usuario al completarlo; se muestra en los recomendados. */
  tip?: string;
};

/**
 * Qué cuenta como perfil completo, por rol. Se usa igual en el formulario
 * (en vivo) y en el dashboard (servidor), así el porcentaje nunca se desdobla.
 * Criterio de MASTER.md: foto, ciudad y bio son obligatorias para el portero;
 * el resto suma al rating pero no bloquea.
 */
export function profileChecklist(role: Role, v: ProfileValues): ChecklistItem[] {
  if (role === "goalkeeper") {
    return [
      { key: "avatar", label: "Profile photo", done: !!v.avatarUrl, required: true, weight: 25 },
      { key: "city", label: "City", done: isAvailableCity(v.city), required: true, weight: 5 },
      { key: "age", label: "Age range", done: isAgeRange(v.ageRange), required: true, weight: 5 },
      {
        key: "bio",
        label: `Bio (${KEEPER_BIO_MIN}+ characters)`,
        done: v.bio.trim().length >= KEEPER_BIO_MIN,
        required: true,
        weight: 20,
      },
      {
        key: "bio-detailed",
        label: `Detailed bio (${DETAILED_BIO_MIN}+ characters)`,
        done: v.bio.trim().length >= DETAILED_BIO_MIN,
        required: false,
        weight: 20,
        tip: "Clubs you have played for, your strengths, how you like to work.",
      },
      {
        key: "experience",
        label: "Years of experience",
        done: v.experienceYears.trim() !== "",
        required: false,
        weight: 15,
        tip: "Teams use it to compare keepers at a glance.",
      },
      {
        key: "level",
        label: "Level you play at",
        done: !!v.level,
        required: false,
        weight: 10,
        tip: "Helps teams match you to the right games.",
      },
    ];
  }
  if (v.playerKind === "individual") {
    return [
      { key: "city", label: "City", done: isAvailableCity(v.city), required: true, weight: 10 },
      {
        key: "level",
        label: "Usual level",
        done: !!v.level,
        required: false,
        weight: 35,
        tip: "Keepers know what standard to expect.",
      },
      {
        key: "bio",
        label: "About your group",
        done: !!v.bio.trim(),
        required: false,
        weight: 30,
        tip: "Pitch details, kit colour, how the group likes to play.",
      },
      {
        key: "avatar",
        label: "Group photo",
        done: !!v.avatarUrl,
        required: false,
        weight: 25,
        tip: "Makes your matches easier to recognise.",
      },
    ];
  }
  return [
    { key: "team", label: "Team name", done: !!v.teamName.trim(), required: true, weight: 35 },
    { key: "city", label: "City", done: isAvailableCity(v.city), required: true, weight: 5 },
    {
      key: "level",
      label: "Usual level",
      done: !!v.level,
      required: false,
      weight: 15,
      tip: "Keepers know what standard to expect.",
    },
    {
      key: "avatar",
      label: "Team photo or crest",
      done: !!v.avatarUrl,
      required: false,
      weight: 20,
      tip: "Makes your match listings easier to recognise.",
    },
    {
      key: "bio",
      label: "About your team",
      done: !!v.bio.trim(),
      required: false,
      weight: 25,
      tip: "Pitch details, kit colour, how the group likes to play.",
    },
  ];
}

export const RATING_TIERS = [
  { min: 100, label: "Complete" },
  { min: 80, label: "Strong" },
  { min: 50, label: "Good" },
  { min: 0, label: "Basic" },
] as const;

export function completeness(items: ChecklistItem[]) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const earned = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  const missing = items.filter((i) => !i.done);
  return {
    percent,
    tier: RATING_TIERS.find((t) => percent >= t.min)!.label,
    requiredMissing: missing.filter((i) => i.required),
    // Lo recomendado que más sube el rating, para sugerirlo primero.
    nextStep: missing.filter((i) => !i.required).sort((a, b) => b.weight - a.weight)[0] ?? null,
  };
}

type ProfileRow = {
  display_name?: string | null;
  city?: string | null;
  bio?: string | null;
  level?: string | null;
  experience_years?: number | null;
  age_range?: string | null;
  avatar_url?: string | null;
  player_kind?: string | null;
};

export function valuesFromRow(row: ProfileRow | null, teamName = ""): ProfileValues {
  // Perfiles anteriores a esta columna: con equipo guardado cuentan como equipo.
  const stored = row?.player_kind;
  const playerKind: PlayerKind = (PLAYER_KINDS as readonly string[]).includes(stored ?? "")
    ? (stored as PlayerKind)
    : teamName
      ? "team"
      : "individual";
  return {
    displayName: row?.display_name ?? "",
    city: row?.city ?? "",
    bio: row?.bio ?? "",
    level: row?.level ?? "",
    experienceYears: row?.experience_years == null ? "" : String(row.experience_years),
    ageRange: row?.age_range ?? "",
    avatarUrl: row?.avatar_url ?? "",
    teamName,
    playerKind,
  };
}
