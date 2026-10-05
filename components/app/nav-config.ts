import type { ComponentType } from "react";
import {
  CalendarIcon,
  ChatIcon,
  FlagIcon,
  GridIcon,
  HomeIcon,
  ListIcon,
  MapIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/platform/icons";

export type NavVariant = "player" | "goalkeeper" | "admin";

export type NavItem = {
  href: string;
  label: string;
  /** Etiqueta corta para la barra inferior móvil. */
  short?: string;
  icon: ComponentType<{ className?: string }>;
  /** Aparece en la barra inferior móvil (máximo 5). El resto solo en la lateral. */
  tab?: boolean;
  /** Botón central destacado de la barra móvil. */
  primary?: boolean;
  /** Rutas hijas que no deben marcar este elemento como activo. */
  excludes?: string[];
  badge?: "unread" | "pending" | "reports";
};

const PLAYER: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, tab: true },
  { href: "/matches", label: "Matches", icon: ListIcon, tab: true, excludes: ["/matches/new"] },
  { href: "/matches/new", label: "Post a match", short: "Post", icon: PlusIcon, tab: true, primary: true },
  { href: "/messages", label: "Messages", icon: ChatIcon, tab: true, badge: "unread" },
  { href: "/map", label: "Map", icon: MapIcon, tab: true },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const GOALKEEPER: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, tab: true },
  { href: "/map", label: "Explore", icon: MapIcon, tab: true },
  { href: "/matches", label: "My games", icon: ListIcon, tab: true },
  { href: "/messages", label: "Messages", icon: ChatIcon, tab: true, badge: "unread" },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, tab: true },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const ADMIN: NavItem[] = [
  { href: "/admin", label: "Overview", icon: GridIcon, tab: true },
  { href: "/admin/goalkeepers", label: "Keepers", icon: ShieldCheckIcon, tab: true, badge: "pending" },
  { href: "/admin/users", label: "Users", icon: UsersIcon, tab: true },
  { href: "/admin/matches", label: "Matches", icon: ListIcon, tab: true },
  { href: "/admin/reports", label: "Reports", icon: FlagIcon, tab: true, badge: "reports" },
  { href: "/admin/payments", label: "Payments", icon: WalletIcon },
];

export const NAV: Record<NavVariant, NavItem[]> = {
  player: PLAYER,
  goalkeeper: GOALKEEPER,
  admin: ADMIN,
};

export function isActive(pathname: string, item: NavItem) {
  if (item.excludes?.some((e) => pathname === e || pathname.startsWith(`${e}/`))) return false;
  if (item.href === "/dashboard" || item.href === "/admin") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
