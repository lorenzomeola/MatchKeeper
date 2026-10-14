# MatchKeeper Staging Readiness Implementation Plan

> **For agentic workers:** Execute inline in the existing `staging` checkout. Do not use subagents. Keep `main` untouched. Steps use checkbox syntax for tracking.

**Goal:** Make the current staging branch a safe, documented release candidate for the public 18+ free beta, with paid bookings explicitly activatable later and subscriptions clearly marked as a future product decision.

**Architecture:** Preserve the database-backed `payments_enabled` switch and the existing Stripe implementation. An absent setting row defaults to the free beta; query errors and invalid values resolve to `unavailable`, never to paid. Block booking actions and avoid payment-specific claims/emails until the state is known. Reconcile product, technical, marketing and legal copy around three named versions, then verify the active beta on staging.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase/Postgres RPC and RLS, Stripe Connect code retained behind the mode switch, Node test runner, npm, Vercel staging.

**Spec:** `design-system/matchkeeper/release-readiness-design.md`

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
