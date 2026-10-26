# MatchKeeper Staging Readiness Implementation Plan

> **For agentic workers:** Execute inline in the existing `staging` checkout. Do not use subagents. Keep `main` untouched. Steps use checkbox syntax for tracking.

**Goal:** Make the current staging branch a safe, documented release candidate for the public 18+ free beta, with paid bookings explicitly activatable later and subscriptions clearly marked as a future product decision.

**Architecture:** Preserve the database-backed `payments_enabled` switch and the existing Stripe implementation. An absent setting row defaults to the free beta; query errors and invalid values resolve to `unavailable`, never to paid. Block booking actions and avoid payment-specific claims/emails until the state is known. Reconcile product, technical, marketing and legal copy around three named versions, then verify the active beta on staging.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase/Postgres RPC and RLS, Stripe Connect code retained behind the mode switch, Node test runner, npm, Vercel staging.

**Spec:** `design-system/matchkeeper/release-readiness-design.md`

## Tracking update (2026-10-26)

This is the original implementation plan, not the current acceptance ledger. Its
unchecked procedural steps are historical and must not trigger a replay of work,
dependency downgrades or database changes. Current evidence and remaining gates:
[MASTER.md](../../../design-system/matchkeeper/MASTER.md#end-of-day-handoff-and-remaining-order-2026-10-23).

- [x] Next and ESLint updated to **16.4.2** (supersedes the 16.4.0 target below); production dependency audit reported zero vulnerabilities. Development-only advisories remain documented.
- [x] Hosted staging chat, cross-browser auth and scheduled-email cancellation fixes deployed and verified.
- [x] Post-match functional block accepted: 11 controlled scenarios, 35 delivered notices, two cancelled reminders; photo/privacy, review/history, cancellations, no-show/strikes/suspension, admin resolutions and manual release cron covered.
- [x] 168 tests, lint and production build pass; staging fixes committed/pushed/deployed. Temporary privileges/photo/helper removed and browser signed out. Terminal QA evidence remains in Preview intentionally.
- [x] Partial real-device QA on iPhone/Safari: Gmail recovery link, map GPS, actual check-in, camera/photo upload, denied-permission feedback and text input without automatic zoom succeeded. Private Preview fixture, exact check-in coordinates and uploaded photo were removed and verified absent.
- [x] Real-phone QA accepted for the beta: Gmail recovery, map GPS, check-in, camera/photo upload, denied-permission feedback, no-zoom text input and short-landscape navigation were verified on the user's iPhone. Real-pitch GPS distance accuracy is deferred to post-launch feedback because no London tester is available.
- [ ] Decide whether to enable Vercel Pro Observability Plus for alert delivery. Per owner direction (2026-10-26), defer automatic Production cron verification until all other release gates are complete and the owner authorizes the merge to `main`; after deployment, verify cron before opening the beta to the public. Progress (2026-10-26): both timed Preview QA emails (unread chat and keeper check-in) were delivered to the QA redirect. Cancelling the temporary booking through the staging UI canceled its two remaining future emails in both `email_outbox` and Resend. Two older Preview rows marked `scheduled` were confirmed delivered in Resend. Created the project-scoped `MatchKeeper function 5xx errors` rule (5xx, medium/high, web/email, team owners subscribed); the owner declined enabling usage-billed Observability Plus, so alerts are configured but will not deliver until Plus is explicitly enabled. Defer Sentry unless richer client-side diagnostics become necessary. Vercel alert rules have a 24-hour activation period and minimum-activity thresholds, so low beta traffic may not trigger them.
- [x] Supabase Production check and beta decision (2026-10-26): Pro confirmed; daily physical database backups are present through 26 Oct. Auth email is enabled, secure email change is on, minimum password length is 8, and leaked-password protection was enabled and reloaded to verify persistence. "Secure password change" and "Require current password when updating" are off; review these against the app's reset/change-password flows before changing them. `avatars` matches the app's public/5 MB/image MIME configuration and has own-folder authenticated write/update/delete policies (3 objects); `checkin-photos` matches the private/1 MB/JPEG configuration and has no Storage RLS policies, consistent with server-side service-role access (0 objects). Owner accepts for the low-traffic free beta that Storage objects are not covered by database backups and may need to be re-uploaded if lost; no external backup service or paid add-on will be enabled now. Revisit if usage grows or the photos become operationally critical. PITR is an optional add-on and was not enabled.
- [ ] Resolve Mapbox Search Box production terms, permission to persist result coordinates, and endpoint billing; the lack of a reply is not approval.
- [x] Code-level legal/privacy/support review (2026-10-26): the Terms and Privacy pages explicitly label themselves as drafts pending solicitor/privacy-adviser review; Privacy also says operator/controller details, territorial scope, legal bases, transfer safeguards, general retention schedule and deletion workflow need confirmation. The published policy describes Mapbox maps and saved match locations, but should also disclose Search Box queries sent from the browser and the selected result coordinates stored with a match. Account, booking and chat retention remains undefined; exact check-in coordinates and photos have a 120-day purge in SQL/cron, while check-in time/distance remain without a stated end period. No self-service or user-facing account deletion workflow was found; rights requests are routed manually to `hello@matchkeeperuk.com`. `CONTACT_EMAIL` is used consistently across legal pages, footer, FAQ, safety reports and email templates, but inbox receipt/monitoring is not verifiable from code. Safety copy says reports are reviewed personally and requests no-show reports within three days, but gives no general response window or support hours. Do not treat this code review as legal approval.
- [x] Owner confirmations (2026-10-26): MatchKeeper is operated by the owner as an individual, with no address approved for public listing; the owner has tested and regularly monitors `hello@matchkeeperuk.com`; no response-time commitment will be promised during beta; self-service account deletion is a later improvement, while rights requests remain email-based for now. A qualified adviser must determine required operator/contact disclosures and the appropriate treatment of manual deletion requests before public launch.
- [x] Local implementation (2026-10-26, supersedes the draft-copy findings above): owner approved purpose-based retention. Updated Terms/Privacy/Safety with the individual operator in Belgium, Mapbox search queries and saved place coordinates, public avatars versus private chat/check-in photos, technical/provider data and support-mail routing, manual retention criteria including check-in metadata, seven-day DB backup limitations, data-rights identity verification/legal deadlines, manual account closure and human appeal of standing restrictions. Ordinary support has no promised response time and is not an emergency service. Added [privacy/support operations](../../privacy-support-operations.md) with a monthly necessity review, request intake, access/export, Storage/provider-email reconciliation, foreign-key/shared-history precautions, case-specific erasure verification and restored-backup erasure handling. No data deleted, paid services added, or production deployment performed. Six new rendered-copy tests cover free/paid modes; all 174 tests, focused ESLint and production build/TypeScript pass locally.
- [x] Preview manual access/erasure rehearsal (2026-10-26): with explicit authorisation created three new synthetic non-admin accounts, a shared booking/chat and avatar/private-photo files. Verified scoped export without credentials/counterparty private data; full no-history account/file erasure; shared-profile FK protection (`23503`); partial erasure/pseudonymisation for a simulated open issue while preserving counterparty RLS access; rejection of old sign-in and refresh. All run-owned Auth/DB/Storage fixtures removed and verified absent. No Production changes or email sends. Real requester identity/delivery, provider-held correspondence, existing access-token immediate invalidation and backup restoration were not tested. See the runbook for exact scope and case-specific requirements.
- [ ] Provider/contact launch gate: research confirmed published DPA incorporation for Supabase, Vercel Pro and Resend (including Resend US/SCC/UK provisions); no Enterprise upgrade or separate signature is inferred. Owner confirms consumer Gmail, not Workspace, and no separately accepted DPAs. Unresolved: legal geographic-contact/UK-representative assessment, actual consumer Gmail contractual role/processor terms, Cloudflare/Mapbox applicable agreement evidence and documented transfer/cookie assessments. See the provider matrix in the runbook. No paid changes, contracts accepted, address invented or mailbox migration. Removing internal draft reminders from public text is not legal approval; Mapbox result-storage licence remains separate.
- [x] Explicitly approved Production promotion (2026-10-26): tested candidate `01c447c` merged as `db46d98` and deployed successfully. Compatible Auth code preceded saved/reloaded signup/recovery templates; localhost redirects removed. Real signup, profile save, recovery, old/new password and reused-link checks passed; owner confirmed recovery in the inbox. Transactional free-booking/RLS acceptance passed and rolled back. QA account/profile/sessions removed, absence and rejected login verified; no active QA outbox or Storage fixtures. See [Production acceptance](../../privacy-support-operations.md#9-controlled-production-promotion-2026-10-26).
- [ ] Observe the next automatic daily Production release cron at 06:00 UTC on 27 October. The five-minute email cron already ran automatically with HTTP 200 on the new deployment; daily release returned 200 through Vercel's manual Run. Do not equate that manual result with automatic daily scheduling, or empty-inventory success with a live financial/120-day-retention exercise.

Owner launch direction (2026-10-26): intends to open and promote the free public beta without
waiting for professional legal sign-off or adding subscriptions. This is a business risk decision,
not legal verification or completion of the unchecked provider/contact gate. Keep those issues
visible; support, statutory data-rights deadlines, retention review and incident handling apply
from day one, regardless of traction or complaints. Public adult signup/manual keeper approval
remain unchanged. No merge/deployment was executed by this decision; separate final promotion
confirmation and checks were subsequently completed as recorded above; the unresolved
Mapbox permission/billing review and other legal/provider questions remain open.

`main` and Production application deployment remain untouched. Do not mark the
overall release green; continue with the remaining infrastructure, legal/privacy,
support and promotion gates. Automatic Production cron verification is deferred
until the owner's approved merge to `main`.

## Global Constraints

- Work only on the existing `staging` branch; never modify, push to, or merge into `main` during implementation.
- Keep public signup open to adults aged 18+; goalkeeper approval remains manual. Do not add invite-only restrictions.
- Free beta is the default intended release. No app path may create a free booking or start paid checkout while payment mode is unavailable.
- An absent `payments_enabled` row means free beta; an explicit `true` is the only paid mode. Query failure or an invalid value is unavailable.
- Keep paid Stripe code intact and make reactivation explicit with the existing database flag after the paid launch gates pass.
- Subscriptions remain an unbuilt, unpriced future possibility; do not promise them in UI, terms or marketing.
- Do not run `npm audit fix --force`, downgrade Next/ESLint/Drizzle Kit, expose `.env.local`, or print secret values.
- Code review can establish factual consistency, not legal sufficiency. Flag jurisdiction-specific legal/accounting actions for qualified professionals.
- No commit, push or merge without explicit confirmation under repository instructions.

---

### Task 1: Fail-closed payment mode

**Files:**
- Modify: `lib/payments/mode.ts`
- Create: `lib/payments/mode.test.ts`
- Modify: `lib/actions/applications.ts`, `lib/actions/bookings.ts`
- Modify: mode-aware server pages/components found by `paymentsEnabled(`, including `app/home/page.tsx`, `app/(legal)` pages via `components/platform/legal-shell.tsx`, `app/(app)/layout.tsx`, dashboards, booking pages, match detail, auth shell, navigation and `lib/email/marketplace-emails.ts` / `lib/email/marketplace-templates.ts`.
- Modify: `db/booking-payments.sql`, `db/free-beta.sql` and the RLS policy source that owns `applications_insert_own_goalkeeper`.

**Interfaces:**
- `getPaymentMode(): Promise<"free" | "paid" | "unavailable">` returns `free` for a missing row, `paid` only for the exact string `"true"`, and `unavailable` for query errors, invalid values, or an absent table.
- A pure resolver accepts the queried row/error and is unit-tested. Boolean rendering is never used to collapse `unavailable` into `free`.
- Free and paid RPCs explicitly reject the opposite mode and reject `NULL`/unknown; application RLS admits only an explicitly valid mode.

- [ ] **Step 1: Add failing mode-resolution tests** for `false -> free`, `true -> paid`, missing row -> `free`, and query error/invalid value -> `unavailable`.
- [ ] **Step 2: Run the focused test** with `node --test lib/payments/mode.test.ts`; verify the new tests fail for the current implementation.
- [ ] **Step 3: Implement the typed mode result** and update all mode-aware server callers. User actions return a clear temporary-unavailable message before creating a booking or application; no checkout is constructed in that state. Rendering uses a neutral unavailable state rather than claiming either release version. Approval emails use payment-neutral wording if mode cannot be read.
- [ ] **Step 4: Gate both database booking RPCs and application RLS** so only `false` permits free booking and only `true` permits paid acceptance; invalid `NULL` permits neither. Make `public.payments_enabled()` default a missing row to `false`, matching free beta. Keep payment confirmation webhooks valid for already-paid bookings if the flag is later switched off.
- [ ] **Step 5: Run focused mode tests and the full suite** with `npm test`; add regression coverage for the paid/free RPC guards using the repository's existing SQL/session test approach where available.

### Task 2: Versioned product, marketing and legal truth

**Files:**
- Modify: `PRODUCT_PLAN.md`, `README.md`, `TECH_STACK.md`, `PAYMENTS_SPEC.md`, `design-system/matchkeeper/MASTER.md`.
- Modify user-facing copy: `components/platform/product-home.tsx`, `components/platform/faq.tsx`, `components/platform/stat-band.tsx`, and relevant Auth/dashboard copy discovered during review.
- Review/update: `app/(legal)/terms/page.tsx`, `app/(legal)/privacy/page.tsx`, `app/(legal)/safety/page.tsx`.

- [ ] **Step 1: Reconcile all version statements**: current public free beta; protected booking as built but inactive, with 15% fee and Stripe gates; subscriptions as unbuilt/unpriced and requiring a separate decision. Label which text is current and which describes a future mode.
- [ ] **Step 2: Remove stale claims** that contradict the current app, including pre-launch validation-only status, Resend-not-installed claims, unresolved webhook status, paid services described as current, and automatic identity confirmation in beta. Preserve historical implementation notes only when clearly dated.
- [ ] **Step 3: Audit marketing copy in both modes**: no payment, fee, refund or Stripe promise in beta; protected-booking claims only in the paid mode. Match current functionality, including manual goalkeeper review, rating/profile limitations and check-in behavior.
- [ ] **Step 4: Review Terms, Privacy and Safety in both modes** against `db/free-beta.sql`, the booking lifecycle, `db/retention.sql`, analytics, auth/email, Mapbox and Stripe. Clarify direct private payment during beta, strikes/cancellation, check-in data and retention, controller/contact, data subject requests, vendors/transfers, cookies/local storage, and paid cancellation/dispute language. Do not invent an address, legal basis, retention period, regulatory status or company identity. Mark unresolved legal conclusions for solicitor/privacy-professional review.
- [ ] **Step 5: Update `MASTER.md`** with a current release status board, verified results, known gaps, manual-only gates, and the exact staging-to-main rule. Keep payment-only launch requirements separate from free-beta requirements.

### Task 3: Patch safe dependency advisories

**Files:**
- Modify: `package.json`, `package-lock.json` only as required by compatible upgrades.

- [ ] **Step 1: Update compatible affected packages** to `next@16.4.0`, `eslint-config-next@16.4.0`, `sharp@0.35.5`, and `source-map-js@1.2.2`; preserve React/React DOM compatibility and exact lockfile reproducibility.
- [ ] **Step 2: Re-run `npm audit --omit=dev --audit-level=high`** and require zero production High advisories.
- [ ] **Step 3: Re-run full `npm audit --audit-level=high`**. If `braces` or `esbuild` remains due to incompatible/unpatched transitive dependencies, do not force a downgrade; document package path, runtime/build exposure and safest follow-up in `MASTER.md`.
- [ ] **Step 4: Run tests, lint and production build** after dependency changes; resolve any Next 16.4 compatibility issue before proceeding.

### Task 4: Staging acceptance and release handoff

**Files:**
- Tests/checks against staging; update `design-system/matchkeeper/MASTER.md` with evidence and open gates.

- [ ] **Step 1: Run local gates**: `npm test`, `npm run lint`, `npm run build`, production and full dependency audits, plus `git diff --check`.
- [ ] **Step 2: Smoke-test staging**: root redirect/home, login/signup paths, required 18+ checkbox, Terms/Privacy/Safety, paid copy absent while `payments_enabled=false`, no browser-console errors, authenticated cron endpoints reject requests without Bearer secret.
- [ ] **Step 3: E2E-test on staging** with controlled QA accounts: sign-up/confirmation/profile creation, password reset, player post -> keeper apply -> player accept without payment -> chat/calendar/check-in -> completion/review, keeper cancellation/no-show, and beta email delivery. Remove QA users and records afterward. Do not toggle the shared staging payment flag without an isolated test window and confirmed rollback.
- [ ] **Step 4: Verify external configuration without printing secrets**: Preview points only to the preview Supabase project; Production points only to the production Supabase project; beta flag is explicitly `false`; Auth SMTP/templates, Resend sender/redirect, cron secret and preview-only redirect are correct; production has no Stripe-live activation for beta.
- [ ] **Step 5: Record what is not testable from this workspace**: physical-device geolocation, real provider inbox behavior if no suitable test recipient, legal/accounting judgments, and DNS/domain reachability from networks outside the corporate VPN.
- [ ] **Step 6: Stop before commit/push/merge.** Present the verified staging report and any required manual tasks. Request confirmation before pushing a staging deployment if needed; request a separate explicit confirmation for the final merge into `main`.

## Manual gates

- Supabase/Vercel/Resend dashboard changes, verification of production-vs-preview environment values, and rotation/revocation of any exposed credentials require the account owner.
- A real mobile device is required for GPS permission and check-in validation; a real inbox is required for end-to-end delivery/link verification.
- A solicitor/privacy professional and Belgian accountant must decide legal sufficiency, regulatory obligations, ICO/UK representative questions, and any legal-entity/tax questions. Do not represent these as code-verified.
- The final deployment/merge is an explicit owner approval, not an automatic task step.
