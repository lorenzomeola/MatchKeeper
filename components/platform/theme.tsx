"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/components/platform/theme-config";

/* ── Store externo ─────────────────────────────────────────────────────────
   La fuente de verdad del tema es el atributo `data-theme` de <html>, porque
   es lo que el script anti-flash escribe antes de que React exista. React se
   suscribe a ese estado en vez de duplicarlo, lo que evita tanto el desajuste
   de hidratación como un `setState` dentro de un efecto.
   ─────────────────────────────────────────────────────────────────────────── */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Activa el sistema de tema de la PLATAFORMA en `<html>` y lo retira al salir
 * de la ruta, de modo que la landing pública de "/" conserve sus propios
 * tokens de `:root` incluso navegando por el cliente.
 */
export function ThemeScope({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_THEME);

  useEffect(() => {
    const el = document.documentElement;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    el.dataset.theme = stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
    emit();

    return () => {
      delete el.dataset.theme;
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* modo privado: el tema simplemente no persiste */
    }
    emit();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeScope>");
  return ctx;
}

/**
 * Interruptor de tema. Un solo icono que rota y se transforma —
 * más barato de leer que dos iconos que aparecen y desaparecen.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Light theme" : "Dark theme"}
      className={`pl-focus group relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition-colors duration-200 hover:border-line-strong hover:text-fg ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="h-[18px] w-[18px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Sol en claro, luna en oscuro; cada uno se desvanece, sin máscaras que dependan del fondo */}
        <circle
          cx="12"
          cy="12"
          r="5"
          stroke="currentColor"
          strokeWidth="1.6"
          className="transition-opacity duration-300"
          style={{ opacity: isDark ? 0 : 1 }}
        />
        <path
          d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          className="transition-opacity duration-300"
          style={{ opacity: isDark ? 1 : 0 }}
        />
        {/* Rayos: solo en claro */}
        <g
          stroke="currentColor"
          strokeWidth="1.6"
          className="transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: isDark ? 0 : 1,
            transformOrigin: "center",
            transform: isDark ? "scale(0.6) rotate(-45deg)" : "none",
          }}
        >
          <path d="M12 1.6v2.2M12 20.2v2.2M22.4 12h-2.2M3.8 12H1.6M19.35 4.65l-1.55 1.55M6.2 17.8l-1.55 1.55M19.35 19.35l-1.55-1.55M6.2 6.2 4.65 4.65" />
        </g>
      </svg>
    </button>
  );
}
