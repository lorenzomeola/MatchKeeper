import { ThemeScope } from "@/components/platform/theme";

/** Login, registro y onboarding comparten el tema de plataforma, igual que /home. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ThemeScope>{children}</ThemeScope>;
}
