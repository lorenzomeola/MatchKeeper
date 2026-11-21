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

As of **2026-10-26**, the free beta is live at **https://matchkeeperuk.com** from `main`.
The owner authorised the controlled promotion after staging verification. `staging.matchkeeperuk.com`
remains the Preview environment with a separate Supabase project. Future application promotions
require separate approval. See the [current handoff and pending work](design-system/matchkeeper/MASTER.md#daily-handoff-and-remaining-order-2026-10-26).

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

The release candidate passed **174 tests**, full lint, build/TypeScript and a production dependency
audit with zero vulnerabilities. Application promotion `db46d98` was followed by documentation-only
merge `1f04ad6`, deployed READY. Paid booking remains inactive and was tested only with Stripe sandbox.

Completed acceptance includes 11 Preview post-match scenarios, 35 delivered notices and two
cancelled reminders; real timed-email/cancellation checks; and owner-accepted iPhone/Safari
recovery, GPS, check-in/camera, denied-location, no-input-zoom and corrected landscape navigation.
Production checks covered real signup/confirmation/profile/recovery, old/new passwords and reused
links, non-admin denial, free-payment guards, and rolled-back free-booking/RLS acceptance.
Auth templates were saved after compatible code deployed and localhost redirects removed.
The owner confirmed recovery in the inbox. All newly created Production QA accounts/sessions
and transactional fixtures were cleaned; no QA Storage files or active outbox schedules remained.

Production is separate from Preview, uses `payments_enabled=false`, and keeps Stripe live off.
Vercel Pro and Supabase Pro are active. Daily DB backups are present, but do not include Storage;
no restore was tested, and the owner accepted no external photo backup or PITR for the beta.
No additional paid services were enabled.

**Accounts and staging reset (26 October):** the owner confirmed the personal Production
admin/player accounts and the new staging administrator. Preview now contains only admin
`matchkeeperuk+staging@gmail.com`, player `lorenzomeolav32@gmail.com` and approved keeper
`lorenzomeolav@hotmail.com`. The authorised reset removed 16 extra accounts and all test
history, preserving the three profiles/passwords and three avatar objects. Outbox is empty;
previous QA acceptance remains documented, not stored as staging fixtures. Production was
untouched by this reset. See the [reset record](docs/privacy-support-operations.md#authorised-staging-reset-2026-10-26).

**Next / ongoing:**
- Observe the daily release cron's automatic run on **27 October, 06:00 UTC**. Manual Run returned
  200; the separate five-minute email cron has already been observed running automatically with 200.
- Monitor support, keeper approvals/reports, errors, outbox cancellation failures and provider usage.
  The saved Vercel alert rule does not deliver without declined Observability Plus; Sentry is absent.
- Await Mapbox's venue-name search/storage answer. The owner requested reverting the Permanent
  Geocoding trial on 28 October: Search Box is restored on staging, Production unchanged.
  Reload existing tabs before testing to avoid old Permanent client requests. Search Box storage
  is not authorised by this rollback and usage is not necessarily free. Review historical records separately.
  Resolve open operator/contact, territorial,
  Gmail/Cloudflare/Mapbox agreement and transfer/cookie questions. Launch is not legal certification.
- Perform manual retention/rights operations from day one; next monthly review by **26 November**.
  Real-pitch London GPS accuracy, a backup restore exercise and general credential rotation remain
  unverified. Self-service deletion and paid features are separate future decisions.
- Check the local Preview service-role configuration after its maintenance request returned 401.
  Dashboard-based cleanup succeeded; no credential was rotated and no Production issue was established.

Updated Privacy/Terms/Safety and the [privacy/support runbook](docs/privacy-support-operations.md)
are deployed. The runbook records the Preview erasure rehearsal, Production acceptance and rollback
precautions. The owner chose public launch without professional legal sign-off; this does not waive
applicable duties. The complete daily ledger and pending order are maintained in
[MASTER.md](design-system/matchkeeper/MASTER.md#daily-handoff-and-remaining-order-2026-10-26).

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
