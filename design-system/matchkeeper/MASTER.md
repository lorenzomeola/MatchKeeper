# MatchKeeper — Platform Design System ("Floodlight")

Source of truth for the **authenticated platform** (`/home`, the legal pages
`/terms`, `/privacy` and `/safety` and, from phase 2, `/login`, `/signup`,
`/dashboard`, `/matches`, `/admin`).

**Out of scope:** the public validation landing at `/` ([components/landing.tsx](../../components/landing.tsx)).
It keeps the old `:root` tokens and must not be touched, apart from the Privacy and Terms links added to its footer.

Implemented in [app/globals.css](../../app/globals.css) (section "PLATFORM DESIGN SYSTEM")
and [components/platform/](../../components/platform/).

---

## Status board (read this first)

Last audited: **2026-10-06**. Section A3 below (payments) was built and tested that
day. Section A2 was built the week before; the rest of the board was reconciled on
2026-10-02 with this file, [PAYMENTS_SPEC.md](../../PAYMENTS_SPEC.md),
[PRODUCT_PLAN.md](../../PRODUCT_PLAN.md) and [TECH_STACK.md](../../TECH_STACK.md).

Naming: "phase 1" and "phase 2" in this file are the **visual redesign** phases.
The Fase 1, 2 and 3 in PRODUCT_PLAN.md are **product roadmap** phases.

**2026-10-13, change of plan:** the first public launch is a **free beta with no
payments** (closed group in London, 18+ only, to measure whether teams and keepers use
it). Payments stay built but switched off behind `payments_enabled`, and come back as an
opt-in "protected booking" once the beta validates. Status: built and tested end to end
on 2026-10-13 (switch off and on). See
PRODUCT_PLAN.md section 13. Section D below (Stripe live, solicitor, company) applies to
the paid launch, not to the beta.

### A. Done (phase 1)

- Design system: tokens, motion, components, dark and light themes.
- `/home`: hero with photo, trust marquee, mechanism stats, how it works, trust
  grid, pricing, FAQ with cancellation table, final CTA, footer.
- Legal pages `/terms`, `/privacy`, `/safety`, as draft copy.
- Copy rewritten without dashes. The 15% fee is in the site, the schema default,
  TECH_STACK.md and the Supabase database (applied by hand on 2026-10-02).
- Payments, cancellations, check-in and disputes fully specified in PAYMENTS_SPEC.md.

### A2. Done (phase 2, redesign of the logged-in app)

All in the Floodlight theme, mobile first, checked at 390px.

- App shell: bottom tab bar on mobile, sidebar on desktop, one nav per role.
- Home dashboards for players, teams and keepers.
- Login, signup and profile: London-only city, required and optional fields with a
  completeness rating, level info, two player kinds (individual and team).
- Matches: two-step post form (format, surface, level, budget, notes, map pin),
  list with tabs, detail with applicants compared by rate, experience and date.
- Pre-acceptance chat: one thread per application, contact details blocked until a
  keeper is booked, rate limit, report and block, seen marks, unread badge.
- Map (keeper filters, near me) and a real month calendar.
- Admin: overview, keeper approval, users, matches, reports with the conversation,
  payments placeholder. Column-level grants stop users editing `approved`,
  `is_admin` or application and match status (`db/admin.sql`).
- Public keeper profile at `/keepers/[id]` with games played, average rate and
  reviews (`db/keeper-profile.sql`).
- Reviews: the player rates the keeper once the match has ended
  (`db/reviews.sql`). The policy accepts a held or released booking, since Stripe
  does not exist yet. Tighten it to released when payments are built.
- SQL to run by hand, in this order: `policies.sql`, `dashboards.sql`,
  `messaging.sql`, `admin.sql`, `keeper-profile.sql`, `reviews.sql`,
  `surface-futsal.sql`. Do not re-run
  `policies.sql` alone, it restores broad grants.

### A3. Done (payments, 2026-10-06)

Built and tested in the **Stripe sandbox** (test cards, local webhooks through the
Stripe CLI). Nothing was tested with real money or on Vercel. Full detail, test
results and limits in [PAYMENTS_SPEC.md](../../PAYMENTS_SPEC.md) sections 0, 8, 15
and 18. 56 unit tests (`npm test`).

- Keeper payment setup: Stripe Connect Express through Accounts v2. A keeper cannot
  apply or be chosen until payouts are enabled ("Identity confirmed" is now true).
- Booking and checkout: the team picks a keeper, accepts the Terms and the
  cancellation table, and pays through Stripe Checkout with 3D Secure. The booking is
  confirmed by webhook (or when the team returns to the site).
- Check-in (200 m, 30 minutes either side of kick-off), team confirmation or report,
  and release to the keeper by the daily cron after three days if the keeper checked
  in. Anything else goes to an admin review queue (`/admin/payments`).
- Cancellations and refunds with the 24 h and 2 h rules, a reopened match when the
  keeper cancels with more than 2 h left, and automatic refund plus strike when there
  is no check-in and the team reports a no-show.
- Strikes by points: no-show 3 points for 12 months, late cancellation 1 point for
  90 days. 3 points suspends the keeper from applying, 2 puts them in the admin review
  list, two no-shows flag them for removal (a person decides). Admins can cancel a
  strike (`/admin/strikes`). Keepers see their standing on their home page.
- Disputes: webhook, evidence prepared automatically and sent by an admin with one
  click, who bears the loss, recovery from the keeper (payout reversal, or a debt
  deducted from later payouts), funds returned if the dispute is won, dispute ratio
  (`/admin/disputes`). Keepers see any amount they owe.
- Keeper calendar overlap check when a team picks a keeper, and deletion of check-in
  coordinates 120 days after the match (as the Privacy Policy says).
- Terms, Safety and FAQ updated with the real strike rule and the dispute recovery.
- Reviews, the keeper dashboard and the calendar no longer show cancelled bookings as
  booked.
- SQL to run by hand on a fresh database, after everything in A2: migrations `0007`
  to `0011` in `db/migrations/`, then `strikes.sql`, `payments.sql`,
  `booking-payments.sql`, `cancellations.sql`, `disputes.sql` and `retention.sql`. All
  idempotent. Do not run `payments.sql` or `booking-payments.sql` before `strikes.sql`.

### B. Still to build

Items 1 to 6 of the old list (onboarding, auth, shell and dashboards, UI primitives,
structured match fields, reviews and public keeper profile) are done, see A2.

1. Approval email through Resend (9). Needs a verified domain. **Resend is also needed
   for all payment emails and reminders** (PAYMENTS_SPEC.md section 11). None exist.
2. Payments (item 10): built, see A3. Still missing: the Stripe webhooks for account
   status, refunds, reversed transfers, failed payouts and failed payments; emails and
   reminders; admin partial refund, manual check-in and team bans; Stripe Radar; and
   the launch checklist in D.
3. Distance on applicants, which needs a keeper base location (not built, undecided).
4. Tighten the review policy (`db/reviews.sql`) to released bookings now that payments
   exist (see A2).
5. **Payment history for keepers and for teams** (built 2026-10-08; still missing the
   downloadable Stripe receipt for teams, deferred on purpose, and a link to the keeper's
   Stripe dashboard). One `/payments` page with a view per role, plus a link on each dashboard.
   Keepers see what they have earned, what is reserved, held or in review, and every
   booking with the amount paid, cancellations (who cancelled and what the keeper still
   got), debt deductions and disputes, with a monthly filter and a CSV export for tax.
   Teams see what they paid (rate plus fee), what was held, refunded or charged on
   cancellation, and a downloadable Stripe receipt. The data is served from the server
   because keepers cannot read the booking events or debt deductions. Design, open
   questions and the test plan are in PAYMENTS_SPEC.md section 12.1.

### C. Decisions pending

**You need to decide for phase 2:**

| # | Decision | My recommendation | Blocks |
|---|---|---|---|
| 1 | Which profile fields a keeper must fill to be approved | Photo, city and a short bio required. Experience and level optional | Onboarding |
| 2 | When a keeper does the Stripe onboarding | Before applying, as part of approval. Then teams only see keepers who can be paid, and "Identity confirmed" is true | Onboarding. **Decided and built 2026-10-06** |
| 3 | UI primitives for modals, dropdowns and toasts. TECH_STACK.md says shadcn/ui, but nothing is installed and the design system is custom | Keep custom components on the platform tokens. Use a headless library such as Radix only for dialog, dropdown and toast accessibility | Phase 2 components |
| 4 | Google login besides email and password. TECH_STACK.md says it is supported, the app only has email | Not now. Email and password first | Auth |
| 5 | What `/` and `/home` become. `/home` is noindex and not linked, `/` is the validation landing | Keep `/` until launch, then promote `/home` to `/` | Launch |
| 6 | Does the first public launch include payments. The site copy assumes yes, PRODUCT_PLAN.md puts payments in its Fase 2 | Launch with payments, since the copy depends on it. If not, hide the Stripe wording until they exist | Launch scope. Payments are now built (sandbox), so launching with them is possible once D is done |
| 7 | Photo upload rules (Supabase Storage) | 5 MB, JPEG, PNG or WebP, shown to the admin at approval | Onboarding |
| 8 | When to show a keeper's rating | Only after 3 reviews | Profiles |
| 9 | The real support mailbox and the response time promised | Choose the mailbox. Safety says reports are reviewed personally | Launch |

**You can decide later, when payments are built:** the payment decisions in
PAYMENTS_SPEC.md section 16. As of 2026-10-06 they are closed, except the new-account
limits (7), VAT (9) and moving the cron to hourly with Vercel Pro (5).
Decision 2 above (Stripe onboarding before applying) is built.

### D. External blockers before a public launch

- Solicitor review of Terms, Privacy and Safety. The questions to take are in
  PAYMENTS_SPEC.md section 14.
- Company registered. Name, registration number and registered office must appear
  on the site, and the footer has none yet.
- Stripe account verified and Connect enabled. The connected-account setup is
  permanent per account, so decide it before creating the first one. The sandbox
  account is already configured (Accounts v2, Express dashboard, platform responsible
  for losses and fees); repeat the same setup in live mode. Also turn on Radar and set
  the descriptor `MATCHKEEPER`.
- Vercel configuration for payments: `STRIPE_SECRET_KEY`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET` and
  `SUPABASE_SERVICE_ROLE_KEY` (see `.env.local.example`); a webhook endpoint for
  `checkout.session.completed`, `expired`, `async_payment_succeeded` and the five
  `charge.dispute.*` events; and Vercel Pro so the release cron can run every hour
  (it runs once a day on Hobby). As of 2026-10-06 the deployed staging site has none of
  this, so payments do not work there.
- Run the SQL in A3 on the production Supabase project.
- Test the check-in with real phone geolocation. Only a simulated position was tried.
- Real domain and mailbox. `SITE_URL` and `CONTACT_EMAIL` in `lib/site.ts` are
  placeholders (`matchkeeper.app`, `hello@matchkeeper.app`).
- Accounts and keys: Resend with a verified sending domain, Sentry, a Mapbox token,
  Supabase Pro (the free project paused on 2026-10-02) and Vercel Pro (commercial use).
- Confirm the right to use the hero photo (`/hero-keeper.jpg`). It came from the
  public landing and I could not verify its source or licence.
- Check Stripe's brand guidelines for showing its wordmark. I did not verify them.
- The public landing `/` collects data through forms. Its footer now links to the
  Privacy Policy and Terms. Decide when `/home` replaces it.
- VAT on the platform fee. Ask an accountant.

### E. Claims on the site that need a feature behind them

The copy describes the finished product. Until the feature exists, the claim is
not true, so none of this should go public before it is built.

| Claim (where it appears) | Needs | Status |
|---|---|---|
| "Every keeper is reviewed by a human" (marquee, trust card, Safety) | Admin approval | Built (`/admin/goalkeepers`) |
| "In-app chat" | Chat on the match page | Built, but only after a keeper is accepted |
| "Message them before you accept" (FAQ) | One thread per application, started by the team | Built |
| "Free to join as a keeper" | Nothing to charge | True today |
| "Identity confirmed" (trust chip, Safety) | Stripe Connect identity check before a keeper can be chosen | Built (sandbox) |
| "Experience checked" (trust chip) | Experience field and admin review | Field built, admin sees it at approval |
| "Removed after no-shows" and strikes | Strike logic and removal | Strikes and automatic suspension built. Removal is a manual admin decision, flagged after two no-shows |
| Ratings, "matches played", "Public rating and match history" | Reviews UI, counter, keeper profile page | Built (`/keepers/[id]`, review form on a played match) |
| "Compare by rating, matches played, distance and price" | Applicant list with those fields | Rate, experience and level built. Rating and distance not on the list yet |
| "Read their bio", keeper photo | Profile page and upload | Built |
| "Date, pitch, format and level" | Format and surface fields | Built |
| "You see the full price, rate plus fee, before you book" | Checkout summary | Built (`/matches/[id]/book`) |
| "Goalkeepers receive 100% of their rate" | Transfer logic | Built (sandbox). A keeper with a debt from a lost dispute is paid less until it is repaid |
| Payments held by Stripe, cancellations, check-in, 3-day release, refunds | PAYMENTS_SPEC.md | Built (sandbox). Emails about them are not |
| "Under 2 minutes to post a match" | Measure it | Unverified |

### F. Clean-up and technical debt

- Lint is clean (`npx eslint app components lib`). The 4 older errors are fixed.
- UI audit 2026-10-05 (390, 768 and 1280px, dark and light): no horizontal overflow,
  one `h1` per page, labelled inputs, text contrast at least 4.5:1 except text over
  photos. Orange text on light backgrounds uses `--accent-strong`, never `--accent`.
  Single-column `grid` lists need `grid-cols-1`, or a long address widens the page.
- Dead code removed (`audience-hero.tsx`, `goal-frame.tsx`).
- Login, signup, dashboard, matches, calendar, map and admin now use the Floodlight
  theme.
- Migration `0002` was applied by hand in the Supabase SQL Editor, so Drizzle's own
  history does not list it. That is the normal route here (TECH_STACK.md 1.1).
- `next build` failed once while the dev server was running (prerender error on
  `/admin/goalkeepers`) and passed on clean runs. Run a clean build before deploying.
- Payments, strikes and disputes are built, so `accept_application` and the default
  `bookings.payment_status` were changed as PAYMENTS_SPEC.md section 4 asked (done
  2026-10-06).
- `npm run db:generate` only writes the SQL; the files in `db/*.sql` and the
  migrations are pasted by hand into the Supabase SQL Editor (the VPN blocks Postgres).
  Stripe code runs through the Stripe CLI listener locally: `stripe listen` with the
  events from A3, forwarding to `/api/stripe/webhook`.
- A cancelled booking leaves its application as `accepted`; the keeper-facing lists,
  calendar and map filter on the match status instead.

### G. Not verified, so treat as unconfirmed

- Whether Stripe live reverses a transfer when the keeper's account has no balance, and
  whether it then debits their bank. The sandbox reverses even with zero balance, so
  the debt path was tested by forcing the failure.
- Stripe's descriptor rules, what Radar includes at no cost, the exact 3D Secure
  liability shift, real dispute evidence deadlines, and Vercel Cron limits.
- The event names for connected-account status in Accounts v2.
- Phone geolocation for the check-in, the cron on Vercel, a transfer to a restricted
  keeper account, and inquiry-type disputes.
- Legal points (Consumer Rights Act 2015, unfair terms, payment-services
  regulation), including whether recovering a lost dispute from a keeper's payouts is
  acceptable. General orientation only, not legal advice.
- ~~That the Stripe CLI and API work from the corporate laptop~~ They do (checked
  2026-10-06).

---

## 1. Positioning

| Keyword | How the UI expresses it |
|---|---|
| Premium | Layered elevation, fluid type scale, generous whitespace, no flat 1px-only surfaces |
| Trusted | Stripe wordmark, verification chips, honest mechanism numbers, no fake social proof |
| Fast | 120–320ms micro-interactions, skeletons instead of spinners |
| Professional | One accent colour, one display face, no gradients-as-decoration |
| Sports-tech | Goal-net grid backdrop, slow floodlight beam, tabular numerals |

**Never:** club-website photography, betting-app gradients, fantasy-league badges,
WordPress section dividers, emoji icons.

---

## 2. Theming

Two themes, both first-class. Dark (`Floodlight`) is the default.

- Activated by `data-theme="dark" | "light"` on `<html>`.
- Mounted by [app/home/layout.tsx](../../app/home/layout.tsx) and
  [app/(legal)/layout.tsx](../../app/(legal)/layout.tsx) via `ThemeScope`, removed on
  unmount so `/` keeps its own `:root` tokens.
- No-flash inline script in [components/platform/theme-config.ts](../../components/platform/theme-config.ts).
- Source of truth is the DOM attribute; React subscribes via `useSyncExternalStore`
  (avoids hydration mismatch **and** `setState`-in-effect).

**To extend to a new route group:** render `<ThemeScope>` + the init script in that
segment's `layout.tsx`. Nothing else is needed.

---

## 3. Colour tokens

Semantic only. Never write a raw hex in a component.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0a0c0b` | `#faf7f3` | Page base |
| `--bg-2` | `#111512` | `#ffffff` | Card |
| `--bg-3` | `#171c19` | `#f2ece4` | Raised / hover surface |
| `--surface` | `rgba(255,255,255,.04)` | `rgba(20,17,13,.025)` | Subtle fill, chips |
| `--surface-2` | `rgba(255,255,255,.07)` | `rgba(20,17,13,.05)` | Skeleton base |
| `--line` | `rgba(255,255,255,.08)` | `rgba(20,17,13,.10)` | Default border |
| `--line-strong` | `rgba(255,255,255,.16)` | `rgba(20,17,13,.20)` | Emphasised border |
| `--fg` | `#f2f5f2` | `#14110d` | Primary text |
| `--fg-2` | `#c6cdc7` | `#3a342c` | Secondary text |
| `--muted` | `#8e9891` | `#5f594f` | Tertiary text (min 6:1) |
| `--accent` | `#ff7a1a` | `#ff7a1a` | Brand, single accent |
| `--accent-strong` | `#ff9647` | `#c2410c` | Accent **text** + hover. Dark lightens, light darkens |
| `--accent-soft` | `rgba(255,122,26,.13)` | `rgba(255,122,26,.12)` | Accent fills, icon tiles |
| `--accent-ink` | `#1a1005` | `#1a1005` | Text **on** accent |
| `--success` | `#3dd68c` | `#12794a` | Confirmed, live, paid |
| `--warning` | `#ffc24b` | `#9a5b00` | Pending approval |
| `--danger` | `#ff6b6b` | `#be2c2c` | Cancelled, destructive |

### Contrast rules (non-negotiable)

- **White on `#ff7a1a` is 2.6:1 and fails WCAG AA.** Text on accent is always
  `--accent-ink`. This was a live bug in the previous design.
- `--accent-strong` is the *text* orange; `--accent` is the *surface* orange.
  Never use `--accent` for body text on `--bg-2` in light mode.
- All three text levels are >= 6:1 against `--bg` in both themes.

---

## 4. Scales

```
Radius   --r-xs 6  --r-sm 10  --r-md 14  --r-lg 20  --r-xl 28  --r-2xl 36  --r-full
Space    --s-1 4  --s-2 8  --s-3 12  --s-4 16  --s-5 24  --s-6 32  --s-7 48  --s-8 64  --s-9 96  --s-10 128
```

**Component radius convention:** chips/buttons `--r-full`; inputs and list rows
`--r-md`; cards `--r-xl`; hero / full-bleed blocks `--r-2xl`.

### Type (fluid, `clamp()` — never a fixed px headline)

| Token | Range | Use |
|---|---|---|
| `--t-xs` … `--t-lg` | 12 → 18px | Body, captions, eyebrows |
| `--t-xl` | 20 → 22px | Card title |
| `--t-2xl` | 24 → 28px | Sub-section |
| `--t-3xl` | 26 → 32px | Stat number |
| `--t-4xl` | 30 → 40px | Section H2 |
| `--t-5xl` | 36 → 52px | Block H2 (final CTA) |
| `--t-6xl` | 44 → 68px | Page H1 |

Faces: **Chakra Petch** display (`.pl-display`), **Geist** body, **JetBrains Mono**
eyebrows/metadata. Unchanged from before — they were already right.

`.pl-display` bundles `letter-spacing: -0.025em`, `line-height: 0.96`,
`text-wrap: balance`. `.pl-prose` bundles `line-height: 1.65` + `text-wrap: pretty`.
`.pl-tnum` gives tabular numerals so animated counters do not jitter.

### Elevation

`--shadow-1` … `--shadow-4` plus `--shadow-glow` (accent) and `--ring-inset`
(top highlight). Dark theme combines shadow **and** inset highlight, because a
pure shadow is invisible on a dark base — this was the single biggest "MVP tell"
in the old design.

---

## 5. Motion language

Five durations, three curves. **Nothing outside this table.**

| Token | Value | Used for |
|---|---|---|
| `--d-1` | 120ms | Colour change, press |
| `--d-2` | 200ms | Hover, focus, micro-state |
| `--d-3` | 320ms | Component transform, theme switch |
| `--d-4` | 520ms | Element entrance |
| `--d-5` | 760ms | Section entrance, sheen, underline |
| `--e-out` | `cubic-bezier(.22,1,.36,1)` | Default (entrances, hover) |
| `--e-in-out` | `cubic-bezier(.65,0,.35,1)` | Symmetric loops (beam) |
| `--e-spring` | `cubic-bezier(.34,1.4,.64,1)` | Press, confirmation |

**Stagger:** 80–140ms per item. Never more — beyond ~150ms it reads as lag.

Only `opacity` and `transform` are animated (GPU-composited). Never `width`,
`height`, `top`, or `margin`.

### Named behaviours

| Class | Behaviour |
|---|---|
| `.pl-reveal` (+`--soft`, `--pop`) | Scroll entrance. 3 variants so cards, text and sections do not all move identically |
| `.pl-lift` | Hover: `translateY(-3px)` + shadow step-up + accent border. Press returns to -1px |
| `.pl-spotlight` | Border glows toward the cursor (`--mx`/`--my`) |
| `.pl-btn::after` | Diagonal sheen sweep on hover |
| `.pl-btn__arrow` | Arrow advances 3px on hover |
| `.pl-underline` | Section H2 underline draws to 4rem on reveal |
| `.pl-skeleton` | Shimmer loader |
| `.pl-pulse` | Slow expanding ring for "live"/"open" dots |
| `.pl-marquee` | 42s linear loop, pauses on hover |
| `.pl-backdrop__beam` | 22s floodlight drift |
| `.pl-faq` | Native `<details>` accordion. Chevron rotates and the answer slides in |
| `.legal-copy` | Minimal prose styles for the legal pages (no typography plugin) |

Every one of these is disabled under `prefers-reduced-motion: reduce`, and
`usePrefersReducedMotion()` mirrors that in JS for the staged loaders.

---

## 6. Components (`components/platform/`)

| File | Exports | Notes |
|---|---|---|
| `theme-config.ts` | `themeInitScript`, `THEME_STORAGE_KEY` | Server-safe, no React |
| `theme.tsx` | `ThemeScope`, `ThemeToggle`, `useTheme` | DOM-attribute store |
| `button.tsx` | `Button` | 5 variants x 3 sizes, 44px min height, `withArrow` |
| `reveal.tsx` | `Reveal`, `useInView`, `usePrefersReducedMotion` | One-shot IntersectionObserver |
| `icons.tsx` | 13 monoline icons + `StripeWordmark` | Hand-drawn to match `LogoMark`, zero deps |
| `nav.tsx` | `PlatformNav` | Sticky, materialises on scroll, Esc-closable mobile sheet |
| `floodlight-backdrop.tsx` | `FloodlightBackdrop` | Fixed, `aria-hidden`, no reflow |
| `hero-match-card.tsx` | `HeroMatchCard` | Product mock, skeleton -> staggered rows |
| `stat-band.tsx` | `StatBand` | rAF count-up |
| `trust-marquee.tsx` | `TrustMarquee` | Duplicate copy is `aria-hidden` |
| `product-home.tsx` | `ProductHome` | The `/home` page: hero, numbers, how it works, trust, pricing, FAQ, final CTA |
| `faq.tsx` | `Faq` | Cancellation tables plus native `<details>` questions for teams and keepers |
| `site-footer.tsx` | `SiteFooter` | Shared by `/home` and the legal pages. Platform and Legal columns |
| `legal-shell.tsx` | `LegalShell` | Nav, backdrop, article and footer for Terms, Privacy and Safety |

### Button variants

| Variant | Use |
|---|---|
| `primary` | The one main action on screen |
| `secondary` | Equal-weight alternative (the "other lane") |
| `ghost` | Tertiary / navigation |
| `onAccent` | Primary **on** an accent-filled block |
| `quiet` | Secondary on an accent-filled block |

---

## 7. Layout

- Container: `max-w-[1240px]`, padding `px-5` mobile / `px-8` from `sm`.
- Section rhythm: `py-16` mobile, `py-24` desktop. Varied deliberately —
  the old uniform `py-20` everywhere is what made the page read as a template.
- Breakpoints verified: **390 / 768 / 1024 / 1440**.
- Ultrawide: content caps at 1240px; the fixed backdrop fills the rest, so the
  page never dead-stops on a blank field.

### Hero photography

The hero photo (`/hero-keeper.jpg`) is **not darkened**. The goalkeeper wears an
all-black kit, so darkening the image erases him and leaves only the white net
visible. Four dark treatments were prototyped (full bleed, right panel, top band,
diagonal) and all failed for this reason; the diagonal also cut through the
headline on mobile.

The shipped treatment keeps the photo luminous inside a bordered panel, so it
reads as a bright window in a dark page and the black silhouette separates from
the white net. Grade: `saturate(0.72) contrast(1.06)`, a 16% accent tint in
`mix-blend-overlay`, and a bottom fade into `--bg`. The match card overlaps the
panel's lower-left corner.

`next.config.ts` sets `images.formats = ["image/avif", "image/webp"]`. The hero
drops from a 603 KB JPEG source to about 36 KB of AVIF at mobile width.

**Rule for future photography:** on this dark theme use bright subjects on dark,
or dark subjects on bright. Never darken a photo whose subject is already dark.

### Fictional product data

`HeroMatchCard` shows an invented listing. It carries an `Example` chip in the
header and a footnote stating that the goalkeepers, ratings and prices are
illustrative. **Any mock data shown publicly must be labelled this way.** An
unlabelled fake listing undermines the exact trust the page is selling.

---

## 8. Accessibility checklist (applied on `/home`)

- [x] All text >= 4.5:1; muted tiers are >= 6:1
- [x] Text on accent uses `--accent-ink` (~6.5:1), never white
- [x] `.pl-focus` -> 2px accent outline, 3px offset, on every link and button
- [x] Touch targets >= 44px (`.pl-btn` min-height, 40px icon buttons with padding)
- [x] Decorative SVGs `aria-hidden`; icon-only buttons have `aria-label`
- [x] Mobile menu: `aria-expanded`, `aria-controls`, Escape to close, scroll lock
- [x] Loading list has `aria-busy`; marquee duplicate is `aria-hidden`
- [x] `prefers-reduced-motion` honoured in CSS **and** JS
- [x] No horizontal scroll at 390px

---

## 9. Implementation gotchas (learned the hard way)

1. **Wrap platform CSS in `@layer components`.** Unlayered CSS beats layered
   Tailwind utilities, so `.pl-btn { display:inline-flex }` silently defeated
   `hidden sm:inline-flex` and caused mobile overflow.
2. **Do not duplicate a display utility in the base class string.** Keep `display`
   in the layered CSS so consumer utilities can override it.
3. **`suppressHydrationWarning` on `<html>`** is required because the anti-flash
   script writes `data-theme` before hydration.
4. **React Compiler lint forbids sync `setState` in an effect.** Use
   `useSyncExternalStore` (theme, reduced-motion) or derive the value during render.

---

## 10. Phase 2 backlog

Ordered by impact.

1. **Auth (`/login`, `/signup`)** — split layout: form left, floodlight panel right
   with the trust chips. Inline validation, loading button state, role pre-select
   from `?role=`.
2. **Dashboard (`/dashboard`)** — replace the 2 flat link cards with: status banner
   (keeper approval state), next-match card reusing `HeroMatchCard`'s row design,
   and a real empty state.
3. **App shell (`app/(app)/layout.tsx`)** — adopt `PlatformNav` patterns: sticky
   glass header, avatar menu instead of a bare "Log out" underline, bottom tab bar
   on mobile (max 5 items).
4. **Matches list / detail** — `pl-surface` rows, applicant rows identical to the
   hero mock, `pl-skeleton` while loading, status chips using `--success` /
   `--warning` / `--danger`.
5. **Toasts** — the only motion primitive not yet built. Slide + fade, `--d-3`,
   `--e-spring`, `role="status"`, auto-dismiss 5s with hover pause.
6. **Modals / dropdowns** — scale `0.96 -> 1` + fade over `--d-3`, focus trap,
   Escape, `inert` on background.
7. **Real social proof** — once the pilot has keepers, swap the mechanism stat band
   for keeper cards (Porteroya's strongest pattern) and real testimonials.

### Product gaps found while writing `/home` copy

The `/home` copy describes behaviour the app does not have yet. Build these, or
soften the copy before anything goes public.

8. **Goalkeeper onboarding and profile (do first in phase 2).** Signup collects
   only name, email and password. There is no form for photo, bio, experience or
   level, although `profiles.avatarUrl` and `profiles.bio` already exist and the
   Home page and FAQ promise a "complete keeper profile". Design the onboarding
   with: photo upload, bio, experience, level, city. Required fields stay minimal,
   but show a profile-completeness indicator (for example "60% complete") that
   tells the keeper a fuller profile gets verified faster and earns more trust
   from teams. Experience and level need new columns, which means a migration.
9. **Approval notification email.** When an admin approves a goalkeeper, send them
   an email. Nothing is sent today, so the FAQ deliberately does not promise it.
   Once built, restore a line such as "You will get an email once yours is
   approved" to the "How does verification work?" answer in
   `components/platform/faq.tsx`. Consider the same for rejection, with a reason.
10. **Payments, cancellations, check-in and disputes (built and tested in the Stripe
    sandbox on 2026-10-06; emails, some webhooks and launch steps still missing).**
    The full specification lives in
    [PAYMENTS_SPEC.md](../../PAYMENTS_SPEC.md) and is the single source of truth.
    It covers the fee model, Stripe Connect setup, booking states, cancellation
    rules, the keeper check-in, release logic, dispute policy and prevention,
    schema changes, webhooks, emails, admin tools, acceptance tests, open
    decisions and the order of implementation. It was built after the rest of the
    product (pages, auth, onboarding, user and admin dashboards), as decided on
    2026-10-02. Launching with real money still needs a solicitor to review the Terms.
    The FAQ,
    Terms and Safety already describe these rules, so keep them in sync with the
    spec if anything changes.
11. **Match form needs structured fields.** The post-a-match form only has a free
    text "Level" field. Add format (5, 7, 9, 11-a-side, futsal) and surface (grass,
    artificial, indoor) as proper fields so keepers can filter, and so the
    "Date, pitch, format and level" copy on `/home` is true.
12. **Pre-acceptance chat (decided 2026-10-02, option B).** One 1-to-1 thread per
    application, started by the team, so a team can ask a keeper questions before
    choosing. Build it with the matches detail page (item 4).
    - Schema: add `messages.application_id` (foreign key to `applications`) and keep
      `match_id`. Today the chat hangs off the match, so with several applicants they
      would share one thread. Backfill existing messages to the accepted application.
    - Access (`db/policies.sql`, idempotent, re-apply by hand): the match owner and
      that application's keeper can read and write that thread. Other applicants
      cannot see it. This replaces the current match-wide message policies.
    - Who writes first: the team. The keeper can reply only after the team's first
      message, because the keeper already has the application note and this avoids
      unsolicited messages.
    - On accepting a keeper, that thread continues. The other applicants' threads
      become read-only with a notice.
    - Safeguards: detect phone numbers and email addresses in a message before
      payment and warn or block, explaining that payment, ratings and protection only
      work inside MatchKeeper. Rate limits on messages and on new threads per match.
      Block and report buttons that feed an admin queue, with admin access to
      reported threads. Contact detection reduces leakage but cannot stop it.
    - Notifications: email on a new message through Resend, so the other side sees it.
    - Privacy: update the Privacy Policy for chat retention and its use as dispute
      evidence, and take it to the solicitor.
    - Evidence: threads feed the dispute evidence package (PAYMENTS_SPEC.md section 8).
    - Copy: the FAQ line "message them before you accept" becomes true once built.
