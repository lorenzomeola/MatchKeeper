import { ThemeScope } from "@/components/platform/theme";

/**
 * Layout de la PLATAFORMA. Monta el sistema de tema (oscuro "Floodlight" por
 * defecto, claro "Daylight" opcional) solo dentro de esta rama de rutas, de
 * forma que la landing pública de "/" siga usando los tokens de `:root`.
 *
 * El script anti-flash vive en el <head> del layout raíz (app/layout.tsx).
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <ThemeScope>{children}</ThemeScope>;
}
