# MatchKeeper release readiness design

## Goal

Make the current staging branch a truthful, safe release candidate for the free beta. Keep `main` untouched until staging passes the agreed gates, so the final code promotion is a merge rather than a second implementation.

## Product versions

| Version | Status | User-facing behavior | Activation gate |
|---|---|---|---|
| Free beta | Current | Public 18+ registration; goalkeeper profiles require manual approval; match fees are agreed and settled directly by the players; MatchKeeper does not collect money. | Default state. Database payment flag is off. |
| Protected booking | Built, not production-ready | Optional paid booking through Stripe Connect, 15% fee on top of the goalkeeper's rate, payment/refund/cancellation/dispute lifecycle. | Explicit database flag plus production Stripe, legal, operational and E2E readiness gates. Never activate from missing configuration or an error. |
| Subscriptions | Future possibility only | Potential paid extras after beta validation. No confirmed features, price, terms, code or marketing claims. | Separate product decision and implementation; not implied by the paid-booking release. |

The beta is public registration, not invite-only. The 20-50 figure is a recruitment target, not an access-control limit. Goalkeeper approval remains manual. All accounts and matches are for adults aged 18+.

## Source of truth and documentation

- `PRODUCT_PLAN.md`: product versions, scope, lifecycle and decisions.
- `design-system/matchkeeper/MASTER.md`: current delivery status, staging checklist, external/manual gates and verified/unverified results.
- `PAYMENTS_SPEC.md`: only the protected-booking/payment behavior, activation requirements and acceptance criteria. It must not describe payments as part of the current beta.
- `TECH_STACK.md`: actual runtime architecture, current integrations, environment separation and operating cost by release version.
- `README.md`: concise current state and links to the version plan; remove superseded validation-only and pre-Resend claims.
- `/terms`, `/privacy`, `/safety`: accurate beta copy when payments are disabled and accurate paid-mode copy when enabled. State clearly that these are drafts pending qualified legal review; do not treat them as legal advice.

## Payment-mode safety

- The free beta is the default when the setting row is absent.
- Runtime errors reading the setting must not silently select either a free booking or a paid checkout. User actions that depend on the mode fail with a clear temporary-unavailable result; the UI does not offer checkout. Email generation must not send contradictory payment instructions during an unknown state.
- Database RPCs and RLS remain authoritative: free-booking RPCs reject when payments are enabled; paid RPCs and RLS retain their payment prerequisites.
- Switching to protected booking requires a deliberate `payments_enabled=true` update by an authorized operator after the paid-release checklist is complete. Switching off returns to the free beta without deleting Stripe code or payment history.
- Add focused tests for missing setting, explicit `false`, explicit `true`, read error, blocked free-booking when paid, and blocked checkout when free/unavailable.

## Legal-content review

Review the rendered content and source for both payment states:

- Terms: operator/contact identity, adult-only rules, independent keeper relationship, match selection, direct off-platform settlement in beta, cancellation/strike rules, check-in, complaint handling, liability and statutory-rights caveats. In paid mode, ensure Stripe, the 15% fee, charge/refund thresholds, payouts and dispute recovery match the implementation and `PAYMENTS_SPEC.md`.
- Privacy: controller and contact details; data collected (including chat, profile/photo, match location, check-in coordinates, analytics and payment data only in paid mode); purposes/legal bases; processors; international transfers; cookies/local storage; rights and complaint routes; concrete retention/deletion practices. Avoid claiming deletion or retention guarantees the implementation cannot meet.
- Safety: manual goalkeeper review, no identity verification in beta, no platform-handled payments in beta, actual check-in/no-show/report rules, support contact and emergency guidance. Paid-mode claims must match the Stripe flow.
- Keep the 18+ registration checkbox and the Terms acceptance in the flows. A code review can check factual consistency, but a solicitor or privacy professional must approve legal sufficiency and jurisdiction-specific obligations.

## Dependencies and security

Resolve the current production dependency advisories with compatible patched versions. Preserve lockfile reproducibility; do not use `npm audit fix --force` or accept major downgrades. Re-run unit tests, lint, production build and `npm audit --omit=dev --audit-level=high` after the update.

## Verification gates

1. Inspect the current branch and protect unrelated work; do not merge into or push to `main` during implementation.
2. Run focused tests for payment-mode safety and legal mode rendering, then the full unit suite, lint, production build, dependency audit and `git diff --check`.
3. Verify staging HTTPS routes, redirects, legal copy, registration paths, no browser console errors, cron authentication, and the free-beta state.
4. Verify signup/confirmation, password reset, app email delivery, and the full player/keeper match lifecycle on staging without leaving test data behind. Use controlled QA accounts and clean them up.
5. Check Vercel Preview and Supabase Preview/Production settings without exposing secret values. Do not change Production settings while preparing the beta.
6. Confirm all legal, operational and external gates; report any item that cannot be verified rather than marking it done.
7. Only after all gates pass, prepare the final staging commit(s). Ask before pushing/committing as required by repository policy. Merge `staging` into `main` only as the final release action, after explicit confirmation.

## Manual actions that cannot be delegated safely

- In Supabase/Vercel/Resend dashboards: inspect or change protected environment settings, rotate exposed credentials, and confirm the production project is isolated from preview.
- A real inbox and a real mobile device are needed to verify Auth email links and GPS check-in; browser/terminal smoke tests cannot prove those hardware/provider behaviors.
- A qualified legal/accounting professional must approve the legal and entity/tax decisions. This review is not a substitute.
- Any staging commit/push and the final merge require the explicit approval prescribed by repository instructions.
