# MatchKeeper — Platform Design System ("Floodlight")

Source of truth for platform design and release readiness. Product-version scope lives in
[PRODUCT_PLAN.md](../../PRODUCT_PLAN.md); payment behavior lives in
[PAYMENTS_SPEC.md](../../PAYMENTS_SPEC.md). Implemented in [app/globals.css](../../app/globals.css)
and [components/platform/](../../components/platform/).

## Status board (current)

Last verification and release-status reconciliation: **2026-10-23**. Work paused by owner after post-match staging acceptance. This board supersedes the dated historical snapshot below.

| Version | State | Release rule |
|---|---|---|
| Free Beta | Current target: public signup for adults 18+, London; keepers approved manually; no MatchKeeper payments | `payments_enabled=false`; a missing row defaults to free. A query error/invalid value blocks booking. |
| Protected booking | Built and sandbox-tested; inactive | Requires explicit `payments_enabled=true` plus the paid-release gates in `PAYMENTS_SPEC.md`. Not part of the Beta release. |
| Subscriptions | Not designed or built | No pricing or user-facing claims. Requires separate product approval after Beta evidence. |

The 20–50 beta figure is an acquisition target, not an invitation gate. The team chooses among keepers who apply. Direct payment between the team and keeper is outside MatchKeeper and is not collected or guaranteed by the platform.

### Staging-to-production policy

- Work and verify on the existing `staging` branch and `staging.matchkeeperuk.com`.
- `main` is production. Do not merge or deploy it until the staging checklist below is green and the owner separately confirms the final merge.
- Only committed/pushed changes reach hosted staging. Unrelated local maintenance/screenshots remain outside the release commits. Apply any future SQL separately in the appropriate Supabase project; the lifecycle fixes below require no SQL migration.
- Supabase SQL changes are applied by hand in SQL Editor because the development VPN blocks direct Postgres connections. Apply/test the mode SQL in Preview first; Production uses its separate project and stays on the Beta flag `false`.
- Latest local verification on 2026-10-23: Next and `eslint-config-next` are 16.4.2; 168 tests, full lint and production build/TypeScript pass. The production dependency audit earlier today reported 0 vulnerabilities. Dependency, chat, auth and lifecycle fixes have been deployed to staging; `main` remains unchanged.
- Full development audit on 2026-10-23 reports 9 affected packages (5 high, 4 moderate), from advisories in `braces` under `eslint-config-next` and `esbuild` under `drizzle-kit`'s legacy loader. `npm audit fix --force` would downgrade the toolchains; do not use it. These do not appear in the production-only audit.

### Beta release gates

- Owner launch direction (2026-10-26): intends to open and promote the public free beta without waiting for professional legal sign-off or buying more subscriptions. Record this as a business decision, NOT evidence that unresolved contact/provider/transfer obligations are satisfied or waived. Do not claim legal verification. Data-rights deadlines, monitored support, monthly retention review and incident handling apply from the first user; do not wait for traction/claims to address obligations. Keep adult public signup and manual keeper approval. This direction does not execute a merge/deployment; separate final promotion confirmation and Production acceptance remain, as does unresolved Mapbox permission/billing. See the privacy/support runbook section 8.

- Cross-browser auth email links: deploy the callback token-verification code before copying [confirm-signup.html](../../db/auth-email-templates/confirm-signup.html) and [reset-password.html](../../db/auth-email-templates/reset-password.html) into each Supabase project's corresponding email template. The signup template appends `?token_hash=...&type=email` to the app's `/auth/callback` RedirectTo; recovery appends `&token_hash=...&type=recovery` to `/auth/callback?next=/reset-password`. Preserve those redirect shapes and the exact allowlisted URLs. Do not use dashboard-generated invites as a substitute for the app signup/reset tests. Old PKCE links remain supported but still require the originating browser. Verify new signup and recovery emails from a different browser/device, expired/reused links, and login with the changed password. See hosted acceptance below for environment-specific evidence; templates must not be switched on a hosted environment before its updated callback is deployed.
- Auth regression verification (2026-10-23): 9 new tests exercise a fresh Supabase client with mocked HTTP responses, token verification, fixed recovery destinations, legacy PKCE, expired/reused/malformed links, external redirect rejection and template URL construction for local/Preview/Production. All 142 unit tests pass; focused ESLint, production build/TypeScript and local invalid-link HTTP redirect checks pass.
- Hosted auth acceptance (2026-10-23): commit `d0d7443` deployed successfully to staging; invalid-link HTTP redirects and recovery page verified there. Owner reports updating both Supabase Preview templates and successfully completing new recovery and signup-confirmation email flows across browsers. Exact receiving device was not recorded, so physical-phone acceptance is not independently verified. Production callback deployment, template installation and production email retest remain pending. Do not update Production templates before deploying the compatible callback.
- App email acceptance (2026-10-23): with owner approval, provisioned three non-admin QA accounts in Preview and exercised hosted staging UI match `cc28dae6-b763-4bfc-95d6-8a2089d5cdb7`: two applications, chat, free booking, keeper cancellation/reopening, replacement booking and team cancellation. Resend confirms 12 immediate emails delivered to the configured test inbox; application, booking (both parties), not-selected, cancellation (both parties) and reopening notices verified. All inspected action links target staging, no localhost/unresolved placeholders, and chat notification omits message text. Nine reminders were scheduled; reading chat cancelled its notice. All 35 focused email unit tests pass. Provider delivery is not proof of primary-inbox placement or mobile rendering; automatic cron/retry execution, actual timed reminder delivery, photo/review/admin notices were not exercised by this run.
- Email cancellation regression (2026-10-23): the hosted run exposed [cancelEmails](../../lib/email/outbox.ts) marking any provider cancellation error as `sent`. Four reminders still showed `scheduled` in Resend. Those four QA schedules were manually cancelled/reconciled; the original error was not retained, so its trigger is unconfirmed. The fix, now deployed to staging, persists cancellation intent separately from sending (`cancel_pending`, `cancelling`, `cancel_after_send`, `cancel_failed`), verifies provider state before marking an email sent, and retains failed attempts with explicit error logs. Transient failures back off for 2/10/30/120 minutes; after 5 attempts or a permanent error, `cancel_failed` requires operator reconciliation in Resend. A sender that dies before saving its provider id is also flagged for manual reconciliation, never replayed as a new send. Status is a text column, so no SQL migration is needed. Previously misclassified rows cannot be recovered automatically; reconcile them against Resend, not by replaying sends.
- Email operations: `/api/cron/emails` retries due cancellations before dispatching pending sends and reports `cancelled`, `cancellationRetry`, and `cancellationFailed` alongside the existing counters. Monitor these counters and `email_outbox` rows with `cancel_failed`/stale `cancel_pending`, not HTTP 200 alone. The owner approved changing this production-only cron from daily to every 5 minutes and confirmed **Vercel Pro enabled** on 2026-10-23 after Hobby rejected the first deployment. Preview does not run Vercel crons automatically. Backoff times are earliest retry times, not a delivery/cancellation SLA. A reminder may still send if Resend is unavailable until its scheduled time. Automatic production cron execution remains unverified.
- Local cancellation acceptance (2026-10-23): ran the new cancellation module against Preview's real outbox and four real Resend QA schedules. Injected one 429 response: three cancellations succeeded, one remained durably `cancel_pending` while the provider still showed a queued/scheduled email. Advanced only that QA row's retry time and invoked the retry worker; all four finished `cancelled` in the DB and `canceled` in Resend. No QA emails were delivered. Added 14 cancellation regression tests; all 156 unit tests, focused ESLint and production build/TypeScript pass. This verifies the module with real services, not hosted cron execution or a new staging deployment.
- Hosted staging cancellation acceptance (2026-10-23): fix `63e6ea4` deployed through `1376323`; Vercel reported success, including the subsequent Preview-only secret configuration redeploy. Seeded an isolated QA match/application, then confirmed and cancelled the free booking through the published staging UI. Resend initially rejected all four cancellations with `Email is not scheduled` while their provider state was `queued` with future schedule dates; all four correctly remained `cancel_pending`, never falsely `sent`. Once Resend exposed them as `scheduled`, manually invoked the protected staging cron after the real backoff elapsed (no QA timestamp edits). It reported 4 cancellations, 0 cancellation retries/failures; all four DB rows finished `cancelled`, attempt 2, no error, and all four provider records were `canceled`. A second cron invocation reported all-zero counters. The two booking confirmation and two cancellation notices were delivered; no scheduled reminders were delivered or left active. Preview's `CRON_SECRET` was aligned with the local Preview value by the owner; Production was not changed. No merge or production deployment performed.
- Chat regression (2026-10-23): personal inboxes now use the same participant check as thread pages. Admin moderation visibility must not list other users' conversations in the personal inbox; moderation remains in admin reports. Three regression tests added; all 133 unit tests, lint and production build pass locally.
- Staging acceptance (2026-10-23): created the clearly labelled QA match `8bfb6778-4158-4ecc-ad26-3d52920d0aa2` through the player UI, applied through the keeper UI, exchanged persistent chat messages in both directions, confirmed a free booking and checked in through the keeper UI using simulated pitch coordinates. Check-in persisted after reload and appeared to the player. This does not verify real-device GPS, inbox delivery, post-match completion or the automatic cron.

- Local: focused payment-mode and legal-copy tests, full `npm test`, lint, production build, dependency audit, and `git diff --check`.
- Staging: signup and email confirmation, password reset, player-to-keeper match lifecycle without platform payment, chat/calendar/check-in/review, no-show/cancellation, app email, legal pages, mobile layout and browser console.
- Operations: verify Preview and Production point to separate Supabase projects; Production uses the Beta flag `false`; no `EMAIL_REDIRECT_TO` or Stripe-live activation in Production; confirm backups, support mailbox, cron secrets and credential rotation without exposing secret values.
- Supabase Production check and beta decision (2026-10-26): Pro is active. Daily physical database backups are present through 26 Oct. Auth email is enabled, secure email change is on, minimum password length is 8, and leaked-password protection was enabled and verified after reload. "Secure password change" and "Require current password when updating" are off; review these against the app's reset/change-password flows before changing them. Storage matches the app: public `avatars` (5 MB, JPEG/PNG/WebP) has authenticated own-folder write/update/delete policies and 3 objects; private `checkin-photos` (1 MB, JPEG) has 0 objects and no Storage RLS policies, consistent with server-side service-role access. Owner accepts for the low-traffic free beta that Storage objects are not covered by database backups and may need to be re-uploaded if lost; do not add external backup services or paid add-ons now. Revisit if usage grows or the photos become operationally critical. PITR is an optional add-on and was not enabled.
- Mapbox Search Box Production authorization remains unresolved: the app persists coordinates from `/forward`; neither a sales non-response nor staging use confirms production permission, storage rights, or endpoint billing.
- Legal/privacy/support code review (2026-10-26): Terms and Privacy pages label themselves as drafts pending professional review. Remaining facts/decisions include the operator's legal identity and contact details, territorial scope and any representative requirement, legal bases, vendor/data-transfer disclosures, cookie/analytics assessment, complete retention/deletion schedule, user-rights workflow and beta support response expectations. Privacy should disclose Search Box query data sent to Mapbox and selected result coordinates saved with matches. Code/SQL schedules check-in coordinates and photos for purge after 120 days, but not check-in time/distance; account, booking and chat retention is undefined. No self-service/user-facing account deletion was found; requests route to the single public inbox `hello@matchkeeperuk.com`. The code references this address consistently, but cannot verify inbox delivery or monitoring. Production's automatic cron verification remains separately deferred until authorized merge to `main`. This review is not legal approval; see the release-readiness plan for gates.
- Owner confirmations (2026-10-26): operated as an individual, no address approved for public disclosure; `hello@matchkeeperuk.com` has been tested and is regularly monitored; owner does not want to promise a support response time during beta; self-service account deletion is deferred, with data-rights requests handled by email for now. Get professional advice on what operator/contact details must be published and document the manual requests process before opening publicly.
- Legal/privacy/support implementation (2026-10-26, supersedes the initial copy findings above): owner approved purpose-based retention. Terms/Privacy/Safety updated locally to describe the actual beta, Mapbox queries/saved coordinates, public avatars and private records, email support providers, technical data, manual retention/rights handling, backup limits, human standing appeals and non-live support without a promised turnaround. Internal draft reminders were removed from public copy, not treated as proof of legal approval. Added [privacy/support operations](../../docs/privacy-support-operations.md) for manual intake, monthly necessity review, export, case-specific erasure and backup-restoration safeguards. All 174 tests (including six new free/paid rendered legal-page tests), focused ESLint and production build/TypeScript pass. No deployment, live deletion or paid add-on. Remaining gates: required operator/address disclosures and UK/EU advice, actual provider agreements/transfer/cookie assessment, and a Preview manual access/erasure rehearsal; Mapbox permission remains separate.
- Privacy follow-up acceptance (2026-10-26): the Preview rehearsal is now complete for three new synthetic accounts: scoped access export; full erasure without history; safe rejection of shared-profile deletion; partial erasure/pseudonymisation with a simulated open-review retention reason and preserved counterparty RLS access; old sign-in/refresh rejected. All run-owned Auth/DB/Storage fixtures cleaned and absence checked, no emails or Production mutations. See the runbook for limitations, including no real identity/delivery exercise, provider correspondence or backup restore. Provider/contact research found DPA incorporation for Supabase, Vercel Pro and Resend, but consumer Gmail is not established as covered by Workspace terms; legal geographic contact/territorial scope, Cloudflare/Mapbox agreement evidence and transfer/cookie assessment remain open. Low beta traffic is not by itself a legal exemption; no extra subscription or contract was authorised.
- Manual gates: apply SQL in Supabase; verify dashboard-only configuration and credential rotation; test GPS on a real phone and email links in a real inbox; obtain qualified legal/privacy and accounting advice. Record evidence and unresolved items instead of assuming success.

### Controlled Production promotion (2026-10-26)

The owner separately authorised the promotion, new scoped Production QA fixtures, their cleanup,
emails to the owner's QA inbox and the two Auth-template changes after compatible code deployed.
Release candidate `01c447c` passed 174 tests, full lint, build/TypeScript and the production
dependency audit (zero vulnerabilities). It was merged into `main` as `db46d98`, with an identical
tree to the tested candidate, and deployed successfully as `dpl_CbNiQPHXrwG8d7yaFXajEisRZmx6`.
Production now serves the public free beta at `https://matchkeeperuk.com`, not just the old landing.
Unrelated local product-plan, maintenance and screenshot changes were excluded.

- Production project separation, `payment_mode() = 'free'`, all 20 public tables under RLS,
  required free-booking/photo/purge RPCs and public/private bucket configuration checked.
- Public/legal/auth pages, unauthenticated cron 401s, authenticated non-admin denial, free-mode
  payment-page redirect/export rejection, dashboard, messages, calendar and match form checked.
- Compatible signup/recovery templates saved and reloaded; Production Site URL and only the two
  HTTPS callback redirects verified after removing temporary localhost entries.
- Real signup, confirmation, profile save, recovery, changed-password login, rejection of the old
  password and rejection of reused signup/recovery links passed. Confirmation was reported delivered
  by Resend; the owner confirmed recovery arrived in the inbox even though Resend's API still
  reported `queued`. Do not use that stale provider status as proof of non-delivery.
- Transactional Production DB/RLS acceptance verified keeper application, free confirmation,
  no platform fee/payment, paid-path and duplicate rejection, and hidden booking for an unrelated
  identity. All fixture writes were rolled back and absence checked; this was not a second full
  Production browser lifecycle or a real-pitch test.
- Automatic email cron observed at `2026-10-26T13:55:46.095Z`, HTTP 200, `vercel-cron/1.0`, on
  the new Production deployment. Daily release cron manually invoked through Vercel returned 200.
  Its next automatic 06:00 UTC execution is still to be checked on 27 October; manual success
  does not close that automatic-scheduling check.
- The real QA account/profile/Auth sessions were deleted and verified absent; its login was
  rejected afterward. No QA Storage files or active outbox schedules remained. Temporary helper
  and browser-held QA credentials were removed.

See [Production acceptance and rollback notes](../../docs/privacy-support-operations.md#9-controlled-production-promotion-2026-10-26).
No Stripe activation, paid add-on, backup restore, general credential rotation, legal certification
or Mapbox storage permission was performed or inferred.

### Post-match staging acceptance (2026-10-23)

Owner authorized controlled QA fixtures, time adjustments, test strikes/reviews, a temporary QA admin, app emails and staging-only fixes. Eleven isolated booking scenarios were exercised against the published app and Preview DB:

- **Photo and played flow:** hosted check-in with simulated browser coordinates; uploaded a generated image without people, removed it and uploaded again. Team and admin could load the signed photo. Anonymous and unrelated authenticated users could not download the private object; unrelated users could not read its booking. Downloaded JPEG had no EXIF. Confirming played completed both booking and match; a 5-star review persisted on the keeper profile. Early and duplicate reviews were rejected by the real DB policies/constraint.
- **Late cancellation:** keeper cancellation inside 24 hours issued one `late_cancel` strike; more than 2 hours before kick-off reopened the match, less than 2 hours cancelled it. Team cancellation inside 2 hours cancelled without a keeper strike or platform charge.
- **No-show and review:** no check-in plus team no-show report cancelled with a `no_show` strike. The QA keeper reached 5 points (two late cancellations plus one no-show), displayed suspended status and was denied a new application by RLS. With recorded check-in, a no-show report went to admin review without an automatic strike. Another-problem reports also went to review.
- **Admin resolutions:** all three published decisions worked: mark played, cancel without strike, and cancel with a no-show strike. Only QA keepers received the test penalties.
- **Automatic closure logic:** manually invoked the protected hosted release cron against controlled overdue bookings, without waiting three actual days. Check-in plus no response completed; no check-in/no response went to review without an automatic strike. The owner separately authorized the one pre-existing staging test booking picked up by the same global cron; it moved to review. Subsequent invocations returned all-zero counters and no failures. Unauthenticated invocation returned 401. This is not evidence of automatic Vercel scheduling.
- **Reminders and notifications:** seeded two real future Resend schedules/outbox entries for a separate completion fixture; confirming played through the app cancelled both in the DB and provider. Verified **35 scoped immediate notices delivered** in Resend, including photo, review, cancellation, strikes, review requests and admin standing alerts. All inspected recipients were the QA redirect inbox; links had no localhost/unresolved placeholders. Replaying cancellation created no extra strikes. Delivery does not verify Gmail Primary placement or mobile rendering.
- **Fixes deployed:** `7c45d59` delays Stripe initialization until after the free-booking guard and makes admin decisions/success messages/review email copy distinguish free-beta outcomes from payments. A real free cancellation no longer requires a Stripe key; regression tests also retain the paid key requirement. `fc9b722` makes player/keeper match history show actual completed/cancelled/reviewed booking outcomes and keeps terminal keeper bookings out of the upcoming tab. Rechecked published player and keeper history labels after deployment.
- **Validation and cleanup:** 168 tests, full lint and production build/TypeScript pass. QA assertions verified 11 terminal booking outcomes, no Stripe payment/refund/transfer IDs, the 35 deliveries and two cancelled reminders. Temporary QA admin privileges revoked; open QA fixtures closed; test photo removed; no active QA reminders remain. Test reviews/strikes and terminal records remain in Preview as evidence. Production and `main` were not modified; no SQL migration required.

The agreed post-match functional block is accepted in staging. Real-phone GPS/camera, production auth/templates and scheduler, actual timed reminder arrival, 120-day retention execution, backups, legal/support and Mapbox licensing remain separate release gates, not implied by this acceptance.

### End-of-day handoff and remaining order (2026-10-23)

**Historical handoff, superseded by the 26 October Production record above.** Do not automatically repeat completed QA. Functional acceptance is not a claim of a bug-free app or legal certification.

| Priority | State | Next action / evidence required |
|---|---|---|
| 1. Complete post-match lifecycle | Accepted in staging | Eleven scenarios, 35 delivered notices, two cancelled reminders; details above. Fixes `7c45d59` and `fc9b722` deployed; acceptance documentation `d38d8f5` also deployed successfully. No need to repeat the whole block without a relevant change. |
| 2. Real-phone acceptance | Mobile UX checks accepted for beta; real-pitch accuracy deferred until production feedback | User confirmed that the mobile checks work well for now, including landscape navigation and Explore. Gmail-to-Safari recovery link, GPS map centering, check-in, camera/photo upload, denied-location feedback and no-zoom-on-input also worked on the user's phone. The private Preview fixture, precise check-in coordinates and uploaded photo were deleted and verified absent afterward. The user lives in Ghent and has no London contact available to validate GPS/check-in at a real pitch before launch. The fixture used the user's location as a simulated QA pitch outside London, so real-pitch distance accuracy remains unverified; this is not a beta launch blocker and should be monitored through production user feedback and complaints. |
| 3. Email timing and operations | Production email cron observed; automatic daily release check pending | Staging timing/cancellation acceptance remains valid. Production signup/recovery passed and automatic five-minute email cron returned 200 on the new deployment. Daily release cron returned 200 when run manually; observe its 27 October 06:00 UTC automatic execution separately. Paid Observability Plus remains declined, so configured anomaly alerts are not delivering. |
| 4. Infrastructure and providers | Production configuration reviewed; known recovery/licensing limits accepted or open | Vercel/Supabase Pro, leaked-password protection, daily DB backups, RLS and Storage configuration checked. No backup restore or external Storage backup; owner accepts possible photo loss for beta. Mapbox Search Box storage permission, agreement scope and endpoint billing remain unresolved; a sales non-response is not approval. |
| 5. Legal, privacy and support | Technical/privacy-operation work accepted; legal/provider questions remain open | Updated notices and manual operations runbook deployed; Preview erasure rehearsal complete and support monitored by owner. Geographic contact/territorial questions, consumer Gmail terms, Cloudflare/Mapbox agreement evidence and transfer/cookie assessment are not legally signed off. Production cron success on an empty due inventory does not test an actual 120-day expiry. |
| 6. Controlled Production promotion | Authorised and deployed; scoped Production acceptance passed | `db46d98` published the tested candidate. Production-only Auth redirects/templates, real signup/recovery, free-booking transactional RLS checks and QA cleanup passed. Remaining operational follow-up: automatic daily release execution at its next scheduled time. |

The earlier staging work includes Next/ESLint 16.4.2, personal-chat participant filtering, cross-browser signup/recovery and durable scheduled-email cancellation with hosted retry acceptance. The old landing-only Production status is superseded by the 26 October promotion above. Stripe live stays disabled for the free beta.

Cleanup is complete for today's post-match run: temporary admin revoked, photo/helper removed, browser signed out, QA matches closed and no active QA reminder schedules remain. Terminal QA records, reviews and strikes intentionally remain in Preview as evidence. The one separately authorized older test booking remains under review; it was not resolved as part of cleanup. Unrelated local maintenance/screenshots are not part of these release commits.

### Real-phone QA progress (2026-10-26)

- On an iPhone using Safari and Gmail, the short Preview QA keeper account `matchkeeperuk+qa1@gmail.com` completed password recovery from Gmail into Safari and signed in. No password was retained by the assistant.
- The user reported that Explore requested/used device location successfully and centered the map. The location remained a browser-side map setting; no server write was used for that map check.
- With explicit user authorization, created a private, clearly QA-labelled Preview match/booking around the coordinates the user supplied (outside the London pilot) so a genuine nearby pitch was not required. This tests the phone's geolocation API/check-in flow, but **does not validate distance accuracy at a real football ground**.
- User confirmed the phone's check-in and photo flow worked. The booking, application and match were deleted immediately afterward; the exact check-in coordinates and private uploaded photo were removed with them. Cleanup was checked against Preview DB and Storage. The QA account remains unapproved for matchmaking.
- With Safari location denied, Explore displayed a browser-permission/location error and remained usable; the user confirmed expected behavior. Focusing a profile text field opened the keyboard without Safari zooming the page, consistent with the 16px input rule. The user later confirmed landscape navigation and Explore also work. A real-pitch GPS/check-in validation in London is not feasible before launch because the user lives in Ghent and has no local tester; rely on post-launch reports and investigate promptly if users report incorrect distances or check-in failures.
- Compact-navigation implementation: a short-landscape-only media query reduces header/nav/main vertical spacing while preserving readable labels, 44px navigation targets and safe-area insets; portrait and desktop styles are unchanged. User feedback on the initial spacing-only change: little improvement. Follow-up `5271011` was deployed to staging; browser verification found that the overrides were inside `@layer components`, so Tailwind utilities kept the nav in the flex flow and left a blank strip. Commit `e33ec54` moves the landscape overrides to `@layer utilities`; local production-build and staging browser checks confirmed a fixed 49px nav, no reserved bottom padding while hidden, a full map area without the former strip, and unchanged portrait layout. Lint/build passed and the user confirmed the iPhone behavior works. Further design/functional improvements are deferred until after launch; landscape usage is not a beta priority or release blocker.

### Timed-email QA progress (2026-10-26)

- The 10-minute unread-chat notification for the temporary Preview QA conversation changed from `scheduled` to `delivered` in Resend at 09:24 UTC. Its recipient matched the configured QA redirect; no production recipient was used.
- The keeper's 30-minute check-in reminder changed from `scheduled` to `delivered` at its scheduled 10:25 UTC time, also to the QA redirect.
- After both deliveries, the team cancelled the temporary booking through the staging UI. Its two remaining future team-played emails changed to `cancelled` in `email_outbox` and `canceled` in Resend. No QA reminder schedules remain active; the terminal, clearly labelled QA record remains in Preview as evidence.
- Two older Preview rows still labelled `scheduled` in `email_outbox` were checked separately; Resend confirms both were delivered on their original 2026-10-23/24 schedule, so they are not active provider sends.
- Preview cron is manual; the hosted protected cron has been exercised. Per the owner's direction on 2026-10-26, automatic Production cron verification is deferred until all other release gates are complete and the owner authorizes the merge to `main`; verify after deployment and before opening the beta to the public. Vercel Analytics is installed; Sentry/error alerting is not configured.
- Monitoring configuration (2026-10-26): confirmed the Vercel team is on Pro. Added alert rule `MatchKeeper function 5xx errors`, scoped to project `matchkeeper`, matching 5xx errors on any route, medium/high severity, Vercel notification inbox and email, with team owners subscribed. Observability Plus is not enabled; the owner declined its usage-based event billing ($1.20 per million events). The rule is saved but alert delivery requires Observability Plus; enabling it remains an explicit owner decision. Do not add Sentry for the Beta unless richer client-side diagnostics become necessary. Vercel alerts use minimum-activity thresholds and need 24 hours of active Plus data before error-anomaly alerts start, so they are not guaranteed to catch every issue in a low-traffic beta. See [Vercel Observability](https://vercel.com/docs/observability), [Observability Plus and pricing](https://vercel.com/docs/observability/observability-plus), and [Vercel Alerts](https://vercel.com/docs/alerts).

### Paid-release gates (not Beta gates)

Solicitor/privacy and tax review, legal entity/Stripe verification, Live-mode Connect setup and webhooks, Radar/descriptor review, paid E2E with Stripe live-safe test strategy, payout/reversal edge cases, cron plan and fee confirmation. Details remain in `PAYMENTS_SPEC.md`.

### Historical snapshot

The sections below preserve the 2026-10-06 implementation/design audit. Treat dated "still to build", "decision pending" and paid-launch notes as historical unless the current board above repeats them.

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
- Historical SQL snapshot, superseded by the current checklist above and `PAYMENTS_SPEC.md`: after `strikes.sql` and `payments.sql`, run `payment-mode.sql` before `booking-payments.sql`, then `cancellations.sql`, `disputes.sql`, `retention.sql` and finally `free-beta.sql`. All are idempotent. Do not run `payments.sql` or `booking-payments.sql` before `strikes.sql`.

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
| 9 | The real support mailbox and the response time promised | Decided 2026-10-26: `hello@matchkeeperuk.com` is tested/monitored; ordinary beta support has no promised turnaround and is not continuously monitored. Data-rights legal deadlines still apply. See the privacy/support runbook. | Closed for beta support wording; erasure rehearsal remains a separate gate |

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
