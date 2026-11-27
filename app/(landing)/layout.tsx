import { MetaPixel } from "@/components/platform/meta-pixel";
import { ThemeScope } from "@/components/platform/theme";

// Landings de búsqueda (equipos / porteros): mismo tema de plataforma que /home.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope>
      {children}
      <MetaPixel />
    </ThemeScope>
  );
}
