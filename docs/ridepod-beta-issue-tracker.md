# RidePod Closed Beta Issue Tracker

Track bugs, trust blockers, wording issues, and manual ops problems from beta testing.

This tracker is for founder, support/operator, admin reviewer, and developer/Codex workflow use during closed beta.

## 1. Issue Categories

Use one primary category per issue:

- Bug
- UX confusion
- Wording/copy
- Trust concern
- Money protection issue
- Proof / receipt issue
- Taxi meter issue
- Ride app / fixed quote issue
- Recurring pod issue
- Settlement / dispute issue
- Admin review issue
- Auth/profile issue
- Safety/report concern
- Supabase/data issue
- RLS/security issue
- Storage/proof preview issue
- Performance/build issue
- Feature request

## 2. Severity Levels

| Severity | Name | Definition |
| --- | --- | --- |
| P0 | Blocking | App cannot run, user cannot complete core flow, private data is exposed, or money/protection behavior is wrong. |
| P1 | High | Major flow is broken, user sees wrong status/action, proof/settlement/admin review is broken, or serious trust confusion appears. |
| P2 | Medium | Wording is confusing, a non-blocking UI bug appears, helper text is missing, or status copy is unclear. |
| P3 | Low | Polish issue, minor visual issue, or nice-to-have improvement. |

## 3. Status Values

Use these status values:

- New
- Triaged
- In progress
- Waiting for decision
- Waiting for tester
- Fixed
- Verified
- Won't fix for beta
- Backlog

## 4. Issue Fields

Track these fields for each issue:

- Issue ID
- Date reported
- Reporter
- Tester role
- Scenario
- Page / route
- Category
- Severity
- Status
- Summary
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshot / reference
- Related flow
- Owner
- Fix notes
- Verification notes
- Linked commit
- Next action

## 5. Related Flows

Use these standard flow names:

- Scheduled Ride App / Fixed Quote
- Scheduled Taxi Meter
- Recurring Setup
- Recurring Ride Instance
- My Pods / Host Dashboard
- Updates / Notifications
- Quote Upload
- Receipt Upload
- Meter Proof Upload
- Settlement Timeline
- Settlement Details / Dispute
- Admin Review
- Profile / Eligibility
- Public Member Preview
- Report Concern
- Supabase / RLS / Storage

## 6. Triage Rules

| Severity | Triage rule |
| --- | --- |
| P0 | Fix before next tester session. |
| P1 | Fix before wider beta. |
| P2 | Fix if repeated by multiple testers or causes trust confusion. |
| P3 | Defer unless easy. |

Trust blocker rule:

If a tester misunderstands any of the following, classify as "Trust concern" or "UX confusion" and mark severity at least P1 or P2:

- RidePod does not provide drivers.
- Max charge.
- Quote vs receipt.
- Taxi meter proof.
- Dispute window.
- Recurring ride settles separately.

## 7. Money / Protection Issue Rules

Mark P0 or P1 if:

- User can bypass eligibility and authorize payment.
- Ride app flow allows booking without quote.
- Taxi meter flow asks for quote before booking.
- Final settlement ignores verified receipt/meter proof.
- User can be charged above max without approval.
- Guest silence blocks host forever.
- Wrong user sees proof/admin data.
- Service role key leaks to client.
- Proof bucket becomes public.

## 8. Admin Review Issue Rules

Mark P1 if:

- Above-cap case is not created.
- Suspicious proof cannot be reviewed.
- Admin approve/reject does not update statuses.
- Payout held status is not visible.
- Proof preview is unavailable to admin.
- Report concern is not private.

## 9. Wording Issue Rules

Track and fix if UI says:

- RidePod driver.
- Guaranteed refund.
- Guaranteed reimbursement.
- 100% safe.
- 100% verified.
- Official Uber/DiDi/Lyft integration.
- Escrow.
- Fake / AI fake accusation.
- Crime / forever banned.
- Gal only / boy and gal.
- Wait at.
- Min seats to book.
- Target seats.

Preferred wording should stay concrete, calm, and beta-accurate.

## 10. Example Issues

| Issue ID | Category | Severity | Status | Summary | Related flow | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| BETA-001 | UX confusion | P1 | New | Tester thought RidePod provides drivers. | How RidePod Works / Join flow | Review onboarding copy and first-run explanation. |
| BETA-002 | Money protection issue | P2 | New | Tester did not understand max charge wording. | Join / Lock seat | Add clearer beta script explanation; consider copy fix if repeated. |
| BETA-003 | Proof / receipt issue | P1 | New | Taxi meter flow still says upload quote. | Scheduled Taxi Meter | Verify flow copy and remove ride-app quote language if present. |
| BETA-004 | Admin review issue | P1 | New | Above-cap proof not appearing in review queue. | Admin Review | Check seed/admin review case creation and proof status update path. |
| BETA-005 | Safety/report concern | P1 | New | Member report submitted but not visible to admin. | Report Concern / Admin Review | Confirm mock vs Supabase submission path and admin review display. |

## 11. Weekly Beta Review Template

```text
Week:
Top 3 bugs:
Top 3 confusion points:
Top 3 trust blockers:
What testers liked:
What testers disliked:
Should we continue / pause / pivot?
Founder decision:
Next sprint focus:
```

## 12. Issue Row Template

```text
Issue ID:
Date reported:
Reporter:
Tester role:
Scenario:
Page / route:
Category:
Severity:
Status:
Summary:
Steps to reproduce:
Expected behavior:
Actual behavior:
Screenshot / reference:
Related flow:
Owner:
Fix notes:
Verification notes:
Linked commit:
Next action:
```

