# Beta privacy and support operations

Owner: Lorenzo Meola, acting as an individual in Belgium.
Public contact: `hello@matchkeeperuk.com`.
Policy decision approved on 2026-10-26: purpose-based retention, manual data-rights requests,
no additional paid services, no guaranteed response time for ordinary support.

This is an operator procedure, not legal approval or an automated deletion tool.
Do not commit request contents, email addresses, exports, credentials or identity documents.

## 1. Intake and response

1. Monitor the public inbox regularly. Prioritise safety reports and requests to exercise data
   rights. Do not treat the absence of a support SLA as permission to ignore legal deadlines.
2. Record each request in a restricted operator register: case ID, received date, request type,
   verified account ID, scope, applicable deadline, actions, any retention reason, next review
   date and completion date. Keep only the minimum needed to demonstrate handling.
3. For data-rights requests, respond without undue delay, normally within one calendar month.
   Check the applicable deadline and any extension rules; tell the requester the reason for a
   lawful extension within the initial period. Do not automatically extend every request.
4. Verify proportionately, preferably through the existing account email. Do not request
   passwords. Ask for identity documents only when necessary and with a suitable secure channel.
   A request from a different address is not grounds for silently rejecting it.
5. For safety reports collect the relevant match/booking link, date and a short description.
   Explain that the inbox is not continuously monitored; immediate danger belongs with emergency
   services. Record review/appeal outcomes and reasons rather than promising a particular outcome.

## 2. Access, correction, objection and export

- Inventory the account's Auth details and profile; teams/memberships; matches; applications;
  bookings and booking events; messages/read markers; reviews; blocks; reports; strikes;
  private photo paths and avatar files; goalkeeper clips (`keeper-videos/<uuid>/`); mobile and
  Instagram (`profile_contacts`); email outbox entries; support correspondence.
- Include payment/account/dispute/debt records only if the account actually has them. The free
  beta must not be described as using Stripe payments.
- Search both structured IDs and relevant free-text/payload fields; email outbox payloads,
  event data and report details can contain personal data even when a foreign key is absent.
- Redact other people's personal data where appropriate. Do not export the whole database,
  service credentials, session tokens, password hashes or another user's private messages.
- Deliver through a verified, suitably protected channel and remove temporary exports after
  delivery is confirmed. Explain corrections, restrictions, refusals and appeal/complaint routes.

## 3. Erasure and account closure

Users can start a request themselves with "Request account deletion" in their profile (table
`deletion_requests`, db/deletion-requests.sql), or by email. The in-app request only records the
intent and emails the admin; it never deletes anything. The admin sees a "Deletion requested" badge
in Users and a banner on the user's page. The one-month deadline starts at `requested_at`. Remove the
`deletion_requests` row only as part of finishing the erasure (it cascades with the profile).

### Scope and authorisation

1. Confirm the project and account UUID explicitly: Preview is not Production. Obtain explicit
   approval for the case-specific deletion/anonymisation scope before changing live data.
2. Check pending applications, upcoming matches/bookings, active reports, appeals, disputes and
   any payment obligations. Arrange cancellation/resolution through the normal app operations.
   Account closure is not a substitute for cancelling a booking.
3. Decide separately for each retained category whether a concrete lawful need remains, why,
   who can access it and when it will be reviewed. Do not retain an entire account indefinitely
   just because one record needs to remain. Explain any partial erasure to the requester.
4. Produce a read-only inventory and dependency counts first. Save the exact Storage object paths
   before removing database references. Never run the broad test-data reset against a real request.

### Execution

- Stop unnecessary future service emails. Reconcile scheduled/cancelling/failed-cancellation
  outbox entries with Resend before removing their provider IDs. A DB row deletion does not
  cancel an email scheduled with the provider. Do not discard failed cancellation evidence.
- Remove in-scope avatar, check-in and goalkeeper clip files through the Storage API or dashboard,
  not by deleting `storage.objects` metadata with SQL. Review the user's whole avatar and
  `keeper-videos/<uuid>/` folders, not just the current URL: previous uploads can remain there.
  Delete the `profile_contacts` row (mobile, Instagram); it cascades with the profile but must
  not be left behind by a partial erasure.
- If access must be withdrawn before erasure finishes, use supported Supabase Auth administrative
  controls for sign-in/session restriction and verify their effect; existing JWTs may remain
  usable until expiry. Do not claim immediate revocation without testing it.
- Plan database deletion/anonymisation around actual live foreign keys and RLS. `bookings`
  restricts profile/application deletion; other relations cascade or set references to null.
  A cascade can erase another participant's booking/chat/review history. Do not delete the
  Auth user or profile first and assume this safely erases all data.
- Use reviewed, case-specific operations for shared history; anonymise/remove personal text
  where appropriate without destroying records that have a documented retention reason.
  Check report details, booking-event JSON, disputes and email payloads as well as direct links.
- For accounts without retained dependencies, remove remaining approved dependencies before
  deleting the Auth user through supported Auth administration. If an error or unexpected
  dependency appears, stop, log the case error and resolve it; do not report successful erasure.
- Review Resend records and Cloudflare/Gmail support correspondence under their available
  deletion/retention controls. Do not promise deletion from provider systems you cannot verify.

### Verification and closure

- Re-query the approved scope and verify Storage downloads no longer work as expected.
  Already downloaded copies or still-valid cached/signed responses cannot be recalled.
- Verify no new scheduled emails remain for the erased account and that sign-in/access is
  restricted as intended. Recheck retained shared history using an unaffected participant.
- Record counts, outcome, failures, retained categories/reasons and next review date in the
  restricted register. Notify the requester; never send a success message on partial failure.
- Preview rehearsal completed on 2026-10-26 with three new synthetic accounts, as detailed below.
  This validates the exercised manual operations, not an automated erasure feature or every
  possible production dependency. Inventory and approve each real case separately.

## 4. Purpose-based retention review

In addition to reviewing requests, perform a monthly manual necessity review during the beta.
This is an operator task, not a new cron or a promise of fixed record lifetimes.

| Category | Retention criterion and review action |
| --- | --- |
| Auth/profile/team and avatars | Needed for the active account and service. At closure/request, erase or minimise unless a specific exception is documented. Include previous avatar uploads. |
| Mobile, Instagram (`profile_contacts`) and goalkeeper clips (`keeper-videos`) | Needed while the account is active; users can edit or remove them in their profile. At closure/request, delete the row and every object in the user's clip folder. Clips removed after a report are deleted, not kept as evidence, unless a documented case needs them. |
| Matches/applications/bookings/chat/reviews | Needed for coordination, account history or an identified unresolved issue. Review unnecessary older records, inactive accounts and closure requests; minimise shared history rather than applying destructive cascades blindly. |
| Check-in exact coordinates/private photos | Existing SQL and daily release cron target records older than 120 days after match end, except specified open payment-dispute statuses. Ordinary `under_review` bookings/reports are not an automatic purge hold. Check overdue records and cron errors; do not promise that every complaint suspends deletion. |
| Check-in time/distance | Not removed by the coordinate purge. Review with the booking, and remove/minimise when attendance history or a documented issue no longer needs them. |
| Reports/strikes/appeals | Needed for safety, appeal handling and proportionate prevention of repeated abuse. Expiry of strike points is not deletion. Record why continued retention is necessary and the next review. |
| Email outbox/provider schedules/support | Needed for delivery, cancellations, request handling or a concrete dispute. Reconcile pending sends/cancellations before deleting evidence, then minimise old recipient addresses, payloads and correspondence. |
| Technical logs/analytics | Check actual provider retention/access settings; do not assume the database policy covers provider-held logs. Remove unnecessary copies and avoid putting personal data or secrets in logs. |

Daily Pro database backups retain a seven-day recovery window. They contain database records,
not Storage image files. Beta explicitly accepts no independent image backup and no PITR add-on.
After erasure, keep a minimal protected erasure register outside the restored database's failure
scope until the relevant backup window has expired. Before reopening a restored service,
reapply erasure decisions and reconcile outbox/provider schedules to prevent restored data or
old reminders from becoming active again. Never store this register in the public repository.

## 5. External launch gates (not satisfied by editing public wording)

- Confirm with a qualified adviser the operator/trading status, required public contact/address
  disclosures, UK/EU territorial obligations, any UK representative/ICO obligations and applicable
  consumer terms. No address or legal exemption has been invented or published.
- Confirm legal bases/legitimate-interest assessments, analytics/cookie obligations and whether a
  DPIA is needed for location, reports and automated standing restrictions. Keep human appeal
  handling available. Browser permission is not by itself the GDPR legal basis for storing data.
- Check the agreements actually applicable to the subscribed Supabase/Vercel/Resend plans,
  Mapbox, Cloudflare Email Routing and Google Gmail account. Document processing locations,
  subprocessors, roles, transfer mechanism and any required assessment. A link to a provider's
  privacy policy or DPA does not prove the required terms apply to this account.
- Apply the Permanent Geocoding migration and review historical Search Box-derived records
  separately, following the 27 October provider clarification below.
- The synthetic Preview rehearsal below is complete. Real identity verification, secure delivery
  and provider-held correspondence must still be handled case by case; do not treat synthetic
  acceptance as proof that those external processes have been exercised.
- After authorised Production promotion, verify automatic release/email crons and the public
  policy pages. Do not activate paid booking mode as part of this work.

## References

- [ICO: responding to subject access requests](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/what-should-we-consider-when-responding-to-a-request/)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase DPA](https://supabase.com/legal/dpa)
- [Vercel DPA](https://vercel.com/legal/dpa)
- [Resend DPA](https://resend.com/legal/dpa)
- [Current Privacy page](../app/(legal)/privacy/page.tsx)
- [Current Terms page](../app/(legal)/terms/page.tsx)
- [Current Safety page](../app/(legal)/safety/page.tsx)

## 6. Verified Preview rehearsal (2026-10-26)

Owner explicitly authorised three new synthetic QA accounts and cleanup of only their fixtures.
The helper hard-checked Preview host `mzliunqgszmxhwtgnbgy.supabase.co` before mutations;
Production was not used. Fixture setup used administrative APIs, not the public signup flow.
No email was sent or scheduled, no Mapbox search was made, and no new service was enabled.

| Check | Result and scope |
| --- | --- |
| Access export | Allowlisted Auth identity fields, profile, subject booking/check-in, authored chat and avatar inventory collected. Assertions excluded credentials/tokens and the other participant's email/message content. No real requester delivery or identity verification was simulated. A full real response must additionally evaluate all requested categories and provide in-scope file contents, not just filenames. |
| Account without history | Both current and previous avatar uploads removed with Storage API; profile and Auth account deleted. Queries confirmed absence, downloads failed and old credentials were rejected. |
| Shared history dependency | Attempted deletion of the QA subject's profile was rejected with foreign-key error `23503`, confirming that the shared booking prevents unsafe deletion. No shared record disappeared. |
| Partial erasure with simulated open issue | Kept the minimum pseudonymous profile/booking dependency for a simulated unresolved review. Removed the subject's profile details, avatar, authored chat, application text, exact coordinates and private photo; replaced Auth email/password and applied an Auth ban. This is partial erasure/pseudonymisation, NOT full anonymisation. For a real case the retention reason and review date require a separate documented decision. |
| Counterparty access | The other participant's authenticated Supabase client could still read its booking and its own remaining message through real RLS. Removed subject coordinates and photo paths were null. |
| Access restriction | Old credentials and refresh token were rejected after restriction. Immediate invalidation of previously issued access JWTs was not verified and must not be promised. |
| Cleanup | Exact run-owned matches, applications, bookings, messages, all three profiles/Auth accounts and four Storage paths were removed and re-queried/download-tested. No run-owned outbox entries existed. |

Residual limits: this was a manual synthetic request, not an end-to-end user deletion UI.
Provider-held email/log erasure, active Resend-schedule cancellation and backup restoration were
not executed in this run. Earlier email QA covers scheduled cancellation separately; a real
erasure must still reconcile its own provider schedules. Do not infer deletion of provider logs
from removal of Auth/database records.

## 7. Provider and contact review (2026-10-26)

The owner confirmed support forwards to free consumer Gmail and has not accepted separate
DPAs beyond account terms. Separate signatures are not always required: incorporation into
accepted service terms can form an agreement. No contracts were accepted or altered by this
review. The table records published terms, not a blanket legal-compliance certification.

| Provider / data | Published evidence | Status and remaining action |
| --- | --- | --- |
| Supabase Pro: Auth, database, Storage | [DPA](https://supabase.com/legal/dpa) says it forms part of the service agreement, effective with it; sections 12.1-12.2 incorporate SCCs where applicable and treat acceptance of the agreement as signing them. Production DB region verified as London. | Published contractual route confirmed; no extra Pro tier or standalone signature inferred. Retain evidence of the account agreement/version and review onward processing/subprocessors and transfer applicability; London DB hosting does not establish all processing locations. |
| Vercel Pro: hosting, request logs, Web Analytics | [DPA introduction](https://vercel.com/legal/dpa) expressly covers Pro and Enterprise and becomes binding through the agreement or execution; its international schedules address EEA/UK transfers. | Pro is within the stated DPA scope; do not suggest an Enterprise upgrade is needed for this reason. Preserve agreement evidence and review configured regions, subprocessors and analytics settings. |
| Resend: SMTP, app recipient/content and schedules | [DPA](https://resend.com/legal/dpa) is incorporated into accepted terms. Section 6 states primary processing in the US and provides EU SCCs / a UK Addendum. [Subprocessors](https://resend.com/legal/subprocessors) identifies US processing vendors. | Published contractual/transfer route confirmed. Retain agreement evidence and document the actual transfer assessment, data minimisation and deletion settings; this is not UK-only email hosting. |
| Cloudflare Email Routing: support messages in transit | [Self-serve terms](https://www.cloudflare.com/terms/), [DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) and [routing documentation](https://developers.cloudflare.com/email-service/reference/postmaster/). DPA covers self-serve agreements and processor data, effective when signed or otherwise agreed. | Available DPA identified; evidence that it applies/has been agreed for this account and Email Routing still needs confirmation. Forwarding is a processing step, not the final mailbox or its retention policy. |
| Google consumer Gmail: support/request correspondence | [Consumer terms](https://policies.google.com/terms) apply to ordinary Gmail. The [Cloud DPA](https://cloud.google.com/terms/data-processing-addendum/) identifies Cloud/Workspace/Cloud Identity agreements; no equivalent processor agreement for this free consumer mailbox was established here. | Open contractual-role/Article 28 assessment. Do not claim the Workspace DPA covers this personal account, or automatically declare all Gmail use unlawful. Obtain confirmation for the actual support use, or select a suitable mailbox with appropriate terms before claiming this gate complete. No subscription or mailbox migration authorised. |
| Mapbox: browser requests/search terms and selected places | [Privacy policy](https://www.mapbox.com/legal/privacy) distinguishes processor and controller uses and links its DPA. The DPA URL did not expose usable contractual text through the retrieval tool. | Account-specific DPA/product scope and transfer terms not verified. Request readable applicable terms; result-storage licence and billing remain separate unresolved issues. |

### Operator contact and territorial questions

- Public identity/email and Belgium-based individual status are confirmed. No geographic address
  has been approved for publication. No placeholder or home address has been added.
- [UK Electronic Commerce Regulations, regulation 6](https://www.legislation.gov.uk/uksi/2002/2013/regulation/6)
  includes a geographic establishment address where it applies. This source does not alone decide
  how UK and Belgian rules apply to this Belgium-established operator. Confirm that scope and
  a lawful publishable contact arrangement; an email address alone must not be assumed sufficient.
- [UK GDPR article 27](https://www.legislation.gov.uk/eur/2016/679/article/27) requires a UK
  representative where article 3(2) applies unless an exemption is met. The occasional-processing
  exception has additional conditions: a free beta or small user count is not by itself an
  exemption. No UK representative or exemption has been verified.
- [Vercel Web Analytics privacy documentation](https://vercel.com/docs/analytics/privacy-policy)
  describes cookie-free aggregated collection and a daily visitor hash; it also warns that URLs
  can contain personal data. This is not a blanket exemption from all privacy/cookie obligations.
  Assess actual configuration and any sensitive URL/query exposure before final sign-off.

**Conclusion:** the synthetic manual-operation rehearsal is accepted within its documented scope.
The contact/provider review is completed as research but remains OPEN as a launch gate for the
address/territorial questions, consumer Gmail terms and unresolved Cloudflare/Mapbox agreement
evidence and transfer assessments. No additional paid subscription is a conclusion of this review.

## 8. Owner launch direction (2026-10-26)

The owner intends to open and promote the free beta publicly without waiting for professional
legal sign-off or adding subscriptions. Public adult signup and manual goalkeeper approval
remain unchanged. This records a business decision, not a finding that the unresolved legal
requirements are optional, satisfied or waived. Do not advertise the service as legally verified.

The owner would prefer to revisit the legal review after traction or claims. Applicable duties
cannot be deferred on that basis: monitor support, handle rights requests within legal deadlines,
perform the monthly necessity review and assess incidents from the first user. Keep unresolved
contact/provider/transfer questions visible and address them proactively, not only after a complaint.
No new contract, exemption, address or legal status has been inferred.

This direction does not execute or by itself authorise a merge/deployment operation. Obtain the
separate final promotion confirmation and perform Production Auth/template, email and automatic
cron checks before opening publicly. Mapbox storage permission and billing remain unresolved
and are not validated by the owner's willingness to launch.

## 9. Controlled Production promotion (2026-10-26)

The owner subsequently gave separate deployment and scoped Production-QA authorisation.
Candidate `01c447c` passed 174 tests, full lint, build/TypeScript and the production dependency
audit (zero vulnerabilities). Merge `db46d98` had the same tree as that candidate and deployed
as `dpl_CbNiQPHXrwG8d7yaFXajEisRZmx6` on `https://matchkeeperuk.com`.
Documentation-only follow-up `1f04ad6` then deployed READY as
`dpl_6UebekXvrU49YB98noYePSfzb5JH`; enabled cron definitions were associated with it.
Final public/legal and unauthorised-cron smoke checks passed without changing application code.

Acceptance evidence:

- Production Supabase was distinct from Preview, mode was `free`, all 20 public tables had
  RLS, and the required booking/photo/purge functions and bucket settings were present.
- Public/legal/auth routes passed smoke checks. Anonymous cron requests returned 401;
  a real non-admin QA account saw `No access` in admin, payment-page redirect to dashboard
  and export rejection in free mode, and working dashboard/messages/calendar/match-form pages.
- Signup and recovery templates were changed only after compatible code was live and were
  checked after reload. Site URL is `https://matchkeeperuk.com`; the redirect allowlist now
  contains only the two Production HTTPS Auth callbacks, with no localhost entries.
- Real signup/confirmation, saved profile and password recovery succeeded. The old password
  was rejected and the new password logged in. Reused signup/recovery links were rejected.
  Resend reported confirmation delivered. The owner confirmed recovery in the actual inbox;
  Resend's API still reported `queued` at the final check, so provider metadata was not used
  as proof of inbox placement or non-delivery. No real user's credentials were changed.
- A rolled-back DB transaction exercised authenticated application RLS, free booking acceptance,
  confirmed/`none` payment state, zero platform fee, paid-path rejection, duplicate rejection
  and unrelated-user booking isolation. Independent queries found no transactional fixtures.
  This does not repeat the full browser post-match lifecycle already accepted in Preview.
- Production's five-minute email cron ran automatically at `2026-10-26T13:55:46.095Z`, HTTP 200,
  `vercel-cron/1.0`, on the new deployment. Daily release cron returned 200 when invoked manually
  through Vercel after checking the empty active-booking/outbox/due-photo inventory. Verify the
  next automatic daily run separately, at 06:00 UTC on 27 October. No live 120-day-expiry
  deletion, financial release or backup restoration was claimed by these empty-inventory runs.
- The new QA Auth account, profile and sessions were deleted and verified absent; its login
  then failed. No QA Storage files or active outbox schedules remained. The local link helper
  was stopped/deleted and browser-held QA credentials removed. Delivered emails/provider
  logs remain subject to provider retention; deleting Auth does not delete those messages.

### Rollback boundary

Previous Production deployment `dpl_9767j7ETDwEnvjEnbP8PpWvNkwpS`, commit
`46ff4f5764aaa1d0465e47fa94179896ebeeb486`, remains the pre-promotion reference.
Rollback was not exercised. A rollback to pre-token-hash callback code must coordinate restoring
the legacy `{{ .ConfirmationURL }}` signup/recovery templates and checking the old cron definitions;
do not assume a deployment rollback also reverses Supabase dashboard configuration. Prefer a
tested forward fix or a rollback that retains the compatible callback.

This acceptance does not resolve the legal/provider matrix above, Mapbox storage rights/billing,
real-pitch GPS accuracy, general credential rotation or untested restore/Storage-backup limits.
No paid service or Stripe-live mode was enabled.

### Current handoff after acceptance

- Next scheduled observation: daily release on **27 October 2026, 06:00 UTC**. No helper,
  background watcher or future verification is running; an operator must inspect that run.
  Check HTTP status, function errors and failed work/counters, not status alone.
- Continue monitoring support/rights requests, manual keeper approval, reports/review bookings,
  Vercel errors, failed/stale outbox cancellation states and provider use/costs. The saved 5xx
  rule is not delivering alerts because the owner declined paid Observability Plus.
- Perform the next monthly necessity/retention review by **26 November 2026**; ongoing
  requests and incidents cannot wait for that review. Daily photo/coordinate expiry does not
  replace case-specific retention decisions.
- Legal/contact/provider/transfer/cookie and Mapbox storage/billing questions in section 7
  remain open after public launch. No general credential rotation, restore rehearsal or
  actual London-pitch GPS accuracy test was completed by this release.
- Terminal Preview lifecycle records were retained until the separately authorised staging reset
  below. Written QA evidence remains; provider-retained emails/logs were not erased.

The consolidated daily record and ordered follow-up are maintained in
[MASTER.md](../design-system/matchkeeper/MASTER.md#daily-handoff-and-remaining-order-2026-10-26).
This later tracking refresh is documentation only, not a further deployment authorisation.

### Personal account setup (2026-10-26, after promotion)

The owner authorised two personal Production accounts and a separate staging administrator,
keeping existing staging player/keeper accounts and passwords unchanged.

- Production administrator: existing `matchkeeperuk@gmail.com`, confirmed Auth identity;
  `profiles.is_admin` enabled for its exact existing UUID. Its previous profile display name
  is `Production Email Test`; retained rather than silently rewriting the owner's profile.
- Production player: `lorenzomeolav32@gmail.com`, registered through the app, player profile
  without administrator privileges. Signup confirmation and password-setup recovery requested.
- Staging administrator: new `matchkeeperuk+staging@gmail.com`, registered through the app;
  player-role profile with `is_admin=true`. The plus alias reaches the existing Gmail inbox,
  but its Supabase account/password is independent of Production. Confirmation and recovery
  requested; the owner subsequently confirmed access.
- The owner confirmed both Production accounts were ready, then confirmed the new staging
  administrator and explicitly authorised retiring all other staging accounts/history.
  Old staging `matchkeeperuk@gmail.com` was deleted in the reset below. The existing staging
  player/keeper profiles, passwords and avatar objects were preserved.

The app accepted all three recovery requests. Provider metadata lists the five signup/recovery
messages as `queued` at the bounded check; that alone was not inbox-delivery proof. Subsequent
owner confirmation supplies the account-access acceptance; password uniqueness was not inspected.
No email token was opened or extracted for these personal accounts, and no chosen password
is requested in chat. New signup bootstrap passwords were random and not kept for future use;
replace them through recovery before using the accounts. No deploy, payment or mailbox change.

### Authorised staging reset (2026-10-26)

Only Preview project `mzliunqgszmxhwtgnbgy` was changed. The owner explicitly approved deleting
all staging history and extra accounts after confirming new administrator access.

| Preserved account | Verified role |
| --- | --- |
| `matchkeeperuk+staging@gmail.com` | Sole administrator, player-role profile |
| `lorenzomeolav32@gmail.com` | Player, not administrator |
| `lorenzomeolav@hotmail.com` | Approved goalkeeper, not administrator |

- All three Auth identities are confirmed. The reset compared their complete profiles and
  password hashes internally before/after; equality was required for the transaction to commit.
  No hash or chosen password was exposed.
- Removed 16 other Auth accounts/profiles, 35 matches, 46 applications, 32 bookings, 10 messages,
  one review and four strikes. All 15 explicitly listed usage/history tables are empty, including
  outbox, booking events, reports, debts and disputes. Teams/members are also empty and no
  orphan Auth sessions remain.
- Nine outbox rows labelled scheduled were individually checked against Resend: all had already
  been delivered, so no provider cancellation was needed. After reconciliation, the reset
  cleared all 127 terminal/failed outbox rows; no future provider sends were left by this cleanup.
- Deleted exactly three obsolete avatar objects through Storage UI, not direct metadata SQL.
  Exactly three objects belonging to the retained player/keeper remain; current avatar URLs
  return HTTP 200. Deleted object URLs return HTTP 400 and are absent from Storage inventory.
  The private check-in bucket is empty.
- [Reset SQL](../db/maintenance/reset-test-data.sql) passed a database dry-run before execution.
  Its local default setting remains `v_dry_run := true`; exact Preview identities,
  outbox/Storage gates, explicit non-CASCADE truncation and transactional invariants guard reuse.
  Preview remains in free mode. No Production changes, commit, push or deployment were made
  for this maintenance; prior local tracking edits remain local.
- Historical Preview QA rows were intentionally removed under this later authorisation;
  the written reports/session evidence are retained. External Stripe sandbox objects and
  provider-held messages/logs were not deleted.
- Separate follow-up: the local Preview service-role credential returned HTTP 401 during
  maintenance; authenticated dashboard access was used instead. Check the local credential
  configuration separately before relying on maintenance scripts. No secret was printed or
  rotated, and this does not establish a Production credential problem.

### Mapbox clarification and Permanent Geocoding migration (2026-10-27)

**Superseded operational state, 28 October:** owner requested returning staging to Search Box
to avoid further Permanent Geocoding test requests. Scoped revert `114cd04` restores the
pre-trial search/form/privacy baseline and removes Permanent-only tests; mobile layout fix
preserved. Production and database rows untouched. Build/TypeScript, six legal-page tests and
focused lint passed. Reload old tabs before testing: previously loaded Permanent client code
can still make requests until refreshed. Past charges are not undone; Search Box usage can
also be billable. This decision does not permit storing Search Box responses. Await Mapbox's
venue-name/storage reply; do not treat the historical migration/hold instructions below as
the current implementation or authorisation to promote Permanent Geocoding.

The owner shared Mapbox's reply from William Davies: Search Box is for real-time search/map
display, not permanent storage of responses or venue POI data in Supabase. Geocoding with
`permanent=true` permits retained addresses/coordinates on the existing Pay-As-You-Go account
with a valid card; no Enterprise agreement, minimum spend or sales agreement is required for
the described workflow. This is product/storage guidance, not closure of DPA/transfer questions.

- Replace Search Box forward search with Geocoding v6 forward, always `permanent=true`,
  `autocomplete=false`, GB/London bounds and no POI type. No temporary/Search Box fallback.
  Searches are explicit button/Enter actions; Continue must not incur a search request.
- Published initial rate checked on 27 October: US$5/1,000 requests, no Permanent free
  allowance. Every search, including one abandoned before posting, can be billable.
  Map display has separate usage pricing; no fixed-price subscription or spend cap is implied.
- Geocoding v6 does not search venue POIs. The form explains address/postcode searches and
  manual pin placement for a user-entered pitch name. Device check-in GPS does not make
  a Mapbox forward/reverse-geocoding call; that flow is unchanged.
- The new API does not retroactively license historical Search Box results. Do not blanket
  delete records or reclassify them as permanently licensed: identify provenance and ask Mapbox
  about appropriate replacement/removal. No database rows were changed by this migration.
- During staging acceptance, the owner found that Permanent Geocoding does not return the POIs
  “Warren Sports Pitch” and “Haggerston Park Football Pitches.” This is a known search-quality
  limitation: address/postcode search plus a manually placed pin remains possible, but is not
  equivalent to venue-name discovery.
- The owner emailed Mapbox asking whether a licensed workflow can support venue-name discovery
  and permanently retain selected venue name/coordinates, including whether Search Box discovery
  followed by a separate Permanent Geocoding request is allowed and what fields may be retained.
  **Await the provider's written answer before changing the search design or evaluating whether
  any historical Search Box data may be retained.**
- Owner decision on 27 October: keep the current Permanent Geocoding implementation on staging
  while waiting; do not revert staging or touch Production. No Production code/config/database
  change or historical-row cleanup is authorised by that decision.
- Sources: [Geocoding docs](https://docs.mapbox.com/api/search/geocoding/) and
  [published pricing](https://www.mapbox.com/pricing#search), plus the owner's shared email.
  Staging validation/deployment status is maintained in MASTER; Production promotion requires
  separate approval after staging acceptance.
