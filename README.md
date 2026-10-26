# MatchKeeper — Goalkeeper marketplace for amateur football

> **Current release: Free Beta.** Public 18+ signup, London only, goalkeeper profiles approved manually. No money moves through MatchKeeper. Keepers and teams agree payment directly.

## Release versions

| Version | Status | What it includes |
|---|---|---|
| Free Beta | Current | Matches, applications, team choice, chat, calendar, map, check-in, reviews and strikes. MatchKeeper does not collect or guarantee payment. |
| Protected booking | Built, inactive | Stripe Connect, 15% team fee, checkout, post-match transfers, refunds, cancellations, payouts and disputes. Requires an explicit database switch and separate legal/operational launch approval. |
| Subscriptions | Future possibility | Not designed, priced, built or offered. Requires a separate product decision after beta evidence. |

The beta is open to adults; 20–50 users is a recruitment target, not an invite gate. The code flag defaults to free when its row is missing. If the flag cannot be read or is invalid, bookings are temporarily blocked rather than guessed.

## Current status

The logged-in product is deployed to the `staging` branch at `staging.matchkeeperuk.com`. `main` is production and must not be updated until staging passes its release checklist. See [design-system/matchkeeper/MASTER.md](design-system/matchkeeper/MASTER.md) for verified gates and manual actions.

The public site is the product homepage at `/home`; `/` redirects there. The old Google Forms validation landing is retained as historical material in `components/landing.tsx` and [README.landing.md](README.landing.md).

## The problem

Amateur football matches (friends, amateur teams, corporate teams,
tournaments) regularly get disrupted when the goalkeeper cancels last-minute
or none was arranged. Teams currently cope by asking friends, posting in
WhatsApp/Facebook groups, playing without a keeper, or cancelling the match.

## Current product

Players post matches and nearby goalkeepers apply. The player chooses a keeper, then both sides coordinate in chat. Profiles, match history, check-in, reviews, calendar, map and admin approval are part of the web app. The public release is currently a free beta; see the version table above for what is and is not active.

## Market validation history

Validation in Ghent and responses to the UK Google Forms informed the pivot to London and the decision to build the web product. The forms, survey drafts and Belgium version are historical research, not the current onboarding flow. The current market is amateur football in London; expansion is not part of the Beta.

## Release readiness

The free-beta and paid-booking flows are implemented. Paid bookings were tested in the Stripe sandbox, not with real money. The payment-mode safety changes, documentation and legal-copy review are being prepared locally on `staging`; they are not yet deployed or applied to Supabase Preview. The latest test count and release gates are recorded in [design-system/matchkeeper/MASTER.md](design-system/matchkeeper/MASTER.md).

The Beta is publicly registerable for adults 18+; 20–50 users is a recruitment target. The production project must be separate from Preview, use `payments_enabled=false`, and keep Stripe live disabled. The operator must verify these dashboard settings before opening signup.

`/terms`, `/privacy` and `/safety` are operational drafts, not legal approval. Their data-retention schedule, provider locations/transfers, jurisdictional scope and business/tax obligations need owner and qualified-adviser confirmation before inviting beta users.

## Repo structure

- `app/`, `components/`, `lib/` — the Next.js public product pages and logged-in
  application. [README.landing.md](README.landing.md) is historical validation-landing
  documentation. Payment logic is in `lib/payments/` and `lib/actions/`; webhook and
  cron routes are under `app/api/`.
- `db/` — Drizzle schema, migrations and the SQL files that are pasted by hand into
  the Supabase SQL Editor (order in PAYMENTS_SPEC.md section 0).
- `archive/belgium-ghent/` — full frozen copy of the Belgium/Ghent version
  (content, forms, domain) from before the UK pivot.
- `archive/brand-uk-orange-src/` — HTML sources used to render the UK
  orange social assets (profile photo, Facebook cover, style exploration).
- `research/` — survey content for both markets and notes from manual
  outreach.
- `public/brand/` — brand assets: logo variants, Belgium's Facebook cover,
  and the UK orange social assets.

