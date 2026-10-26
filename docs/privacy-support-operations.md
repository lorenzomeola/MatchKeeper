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
  private photo paths and avatar files; email outbox entries; support correspondence.
- Include payment/account/dispute/debt records only if the account actually has them. The free
  beta must not be described as using Stripe payments.
- Search both structured IDs and relevant free-text/payload fields; email outbox payloads,
  event data and report details can contain personal data even when a foreign key is absent.
- Redact other people's personal data where appropriate. Do not export the whole database,
  service credentials, session tokens, password hashes or another user's private messages.
- Deliver through a verified, suitably protected channel and remove temporary exports after
  delivery is confirmed. Explain corrections, restrictions, refusals and appeal/complaint routes.

## 3. Erasure and account closure

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
- Remove in-scope avatar and check-in files through the Storage API or dashboard, not by
  deleting `storage.objects` metadata with SQL. Review the user's whole avatar folder, not
  just the current URL: previous uploads can remain there.
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
- Resolve Mapbox Search Box result-storage permission and `/forward` billing separately.
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
