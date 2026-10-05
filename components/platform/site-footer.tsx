import Link from "next/link";
import { FacebookIcon, InstagramIcon, Logo } from "@/components/logo";
import { CONTACT_EMAIL, SITE_TAGLINE, SOCIALS } from "@/lib/site";

/**
 * Footer compartido por toda la plataforma (home + páginas legales), para que
 * los enlaces de Legal/Contacto vivan en un único sitio.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[22rem]">
            <Logo iconClassName="h-8 w-9" wordmarkClassName="text-lg" />
            <p className="mt-3 text-sm text-muted">{SITE_TAGLINE}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3 sm:gap-x-16">
            <FooterColumn title="Platform">
              <FooterLink href="/signup?role=player">Find a keeper</FooterLink>
              <FooterLink href="/signup?role=goalkeeper">Become a keeper</FooterLink>
              <FooterLink href="/home#how-it-works">How it works</FooterLink>
              <FooterLink href="/home#pricing">Pricing</FooterLink>
              <FooterLink href="/home#faq">FAQ</FooterLink>
              <FooterLink href="/login">Log in</FooterLink>
            </FooterColumn>

            <FooterColumn title="Legal">
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/safety">Safety</FooterLink>
              <FooterLink href={`mailto:${CONTACT_EMAIL}`}>Contact</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 flex flex-col-reverse items-center gap-5 border-t border-line pt-7 sm:flex-row sm:justify-between">
          <p className="font-mono text-xs text-muted">&copy; 2026 MatchKeeper &middot; Made in London</p>
          <div className="flex items-center gap-1">
            <SocialLink href={SOCIALS.instagram} label="MatchKeeper on Instagram">
              <InstagramIcon />
            </SocialLink>
            <SocialLink href={SOCIALS.facebook} label="MatchKeeper on Facebook">
              <FacebookIcon />
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-2">{title}</p>
      <nav aria-label={title} className="mt-3 flex flex-col gap-1 text-sm">
        {children}
      </nav>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="pl-focus inline-flex min-h-10 w-fit items-center rounded-[var(--r-xs)] text-muted transition-colors duration-200 hover:text-accent-strong"
    >
      {children}
    </Link>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="pl-focus grid h-10 w-10 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-surface hover:text-accent-strong"
    >
      {children}
    </a>
  );
}
