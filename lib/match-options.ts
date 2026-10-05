import { LEVELS } from "@/lib/profile";

export const FORMATS = [5, 6, 7, 8, 9, 10, 11] as const;

export const FORMAT_OPTIONS = FORMATS.map((n) => ({ value: String(n), label: `${n}-a-side` }));

export const SURFACES = ["grass", "artificial", "indoor", "futsal"] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_OPTIONS = [
  { value: "grass", label: "Grass" },
  { value: "artificial", label: "Artificial turf" },
  { value: "indoor", label: "Indoor" },
  { value: "futsal", label: "Futsal court" },
];

export const NOTES_MAX = 500;

export function isLevel(value: string): value is (typeof LEVELS)[number] {
  return (LEVELS as readonly string[]).includes(value);
}
