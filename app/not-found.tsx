import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/platform/button";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { ThemeScope } from "@/components/platform/theme";

export default function NotFound() {
  return (
    <>
      <ThemeScope>
        <div className="relative grid min-h-dvh place-items-center bg-bg px-5 text-fg">
          <FloodlightBackdrop />
          <main className="relative w-full max-w-md py-16">
            <Link href="/" aria-label="MatchKeeper home" className="pl-focus mb-10 inline-flex min-h-11 items-center rounded-[var(--r-sm)]">
              <Logo iconClassName="h-8 w-9" wordmarkClassName="text-lg" />
            </Link>
            <p className="pl-eyebrow">Error 404</p>
            <h1 className="pl-display mt-3 text-fg [font-size:var(--t-4xl)]">That page is out of play.</h1>
            <p className="pl-prose mt-4 text-[17px]">
              The link may be old, or the page has moved. Head back and pick up from there.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/dashboard" variant="primary" size="md" withArrow>
                Go to your matches
              </Button>
              <Link
                href="/"
                className="pl-focus inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-4 text-[15px] font-medium text-fg-2 underline underline-offset-4 transition-colors duration-200 hover:text-fg"
              >
                Back to the home page
              </Link>
            </div>
          </main>
        </div>
      </ThemeScope>
    </>
  );
}
