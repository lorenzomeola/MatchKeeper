import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/platform/auth-shell";
import { ArrowRightIcon, GloveIcon, PinIcon } from "@/components/platform/icons";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false },
};

const LANES = [
  {
    href: "/signup/player",
    icon: PinIcon,
    title: "I need a goalkeeper",
    body: "Post a match and compare the keepers who apply.",
  },
  {
    href: "/signup/goalkeeper",
    icon: GloveIcon,
    title: "I'm a goalkeeper",
    body: "Apply to matches near you at your own rate.",
  },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  // Los enlaces de /home y del footer apuntan a /signup?role=...
  const { role } = await searchParams;
  if (role === "player" || role === "goalkeeper") redirect(`/signup/${role}`);

  return (
    <AuthShell aside="join">
      <p className="pl-eyebrow">Sign up</p>
      <h1 className="pl-display mt-3 text-fg [font-size:var(--t-4xl)]">How do you want to join?</h1>
      <p className="pl-prose mt-3 [font-size:var(--t-base)]">
        You can tell us the rest after you have an account.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-3">
        {LANES.map(({ href, icon: Icon, title, body }) => (
          <li key={href}>
            <Link
              href={href}
              className="pl-focus pl-lift group flex items-center gap-4 rounded-[var(--r-xl)] border border-line bg-surface p-5 shadow-[var(--shadow-2),var(--ring-inset)]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r-md)] bg-accent-soft text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="pl-display block text-fg [font-size:var(--t-xl)]">{title}</span>
                <span className="mt-1 block text-sm text-muted">{body}</span>
              </span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="pl-focus font-semibold text-accent-strong underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
