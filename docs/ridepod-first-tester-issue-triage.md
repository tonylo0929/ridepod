# RidePod First Tester Issue Triage

## 1. Purpose

This triage guide helps convert first tester feedback into clear priorities, fix decisions, and next actions for the Taxi-first RidePod beta.

The first tester sessions should focus on product understanding, trust, next-action clarity, and mock/live boundary clarity.

## 2. Current beta boundaries

- Taxi is the main flow.
- Ride app is Coming soon.
- Taxi Partner Quote is demo/beta.
- No real taxi dispatch.
- No live payment.
- No real payout.
- Stripe is test mode only if enabled.
- Taxi partners are external licensed providers.
- RidePod does not provide drivers.

## 3. Priority definitions

### P0 - Beta blocker

Examples:

- App route crashes.
- Tester cannot complete Create Taxi Pod.
- Tester thinks a real taxi was dispatched.
- Tester thinks live money was charged.
- Tester thinks real payout was sent.
- Private data is exposed publicly.
- Service/payment secret appears in UI or client.
- Admin/payment route is exposed unsafely.
- Main CTA is broken.

Decision:
Pause tester sessions until fixed.

### P1 - Major trust / confusion issue

Examples:

- Tester thinks RidePod provides drivers.
- Tester thinks Ride app is live.
- Tester cannot explain Taxi Partner Quote.
- Tester cannot explain guests accepting the quote.
- Tester cannot explain no live payment/payout.
- Tester misunderstands payout pending.
- Tester cannot find next action.
- Tester distrusts quote/payment wording.
- Women-only is interpreted as female driver guarantee.

Decision:
Fix before wider beta. May continue with 1 controlled tester if issue is understood and not dangerous.

### P2 - Usability cleanup

Examples:

- Screen is too wordy.
- Status labels are inconsistent.
- CTA wording is not ideal but usable.
- Section hierarchy is weak.
- Dashboard has too much information.
- Notification list feels noisy.
- Review Pod is understandable but dense.

Decision:
Track and batch into UI cleanup.

### P3 - Polish

Examples:

- Spacing issue.
- Minor icon/color issue.
- Minor wording preference.
- Non-blocking visual polish.

Decision:
Defer unless easy.

## 4. Issue categories

- Product positioning
- Taxi-first flow
- Ride app Coming soon confusion
- Taxi type / luggage / accessibility
- Safety / who-can-join
- Taxi Partner Quote
- Guest quote acceptance
- Mock payment / Stripe test mode
- Payout pending / dispute window
- Taxi Partner Dashboard
- Admin Review
- Updates / notifications
- Profile / privacy
- Report concern
- Visual hierarchy
- Mobile usability
- Bug / crash
- Copy / wording
- Privacy / security
- Payment / legal readiness

## 5. Triage questions

For every issue, answer:

1. Did the tester misunderstand what RidePod is?
2. Did the tester think RidePod provides drivers?
3. Did the tester think Ride app is live?
4. Did the tester understand Taxi is the main flow?
5. Did the tester understand taxi partner quote?
6. Did the tester understand guests accept quote?
7. Did the tester understand no live payment?
8. Did the tester understand no real payout?
9. Did the tester know what to click next?
10. Was private data exposed?
11. Was risky wording shown?
12. Did a route / CTA fail?
13. Is this one tester's preference or a repeated pattern?

## 6. Continue / pause rule

Continue to next tester if:

- no P0 issue
- tester understands RidePod does not provide drivers
- tester understands Taxi-first flow
- tester understands no live payment/payout
- tester can complete Create Taxi Pod
- main CTAs work

Pause tester sessions if:

- any P0 exists
- tester thinks real taxi dispatch happened
- tester thinks live money moved
- tester thinks payout was sent
- private data appeared publicly
- Create Taxi Pod flow is blocked
- multiple P1 trust issues appear in one session

## 7. Fast fix mapping

Issue:
Tester thinks RidePod provides drivers.

Fix slice:
UI-COPY - Public positioning / hero / How It Works.

Issue:
Tester thinks Ride app is live.

Fix slice:
UI-COPY - Ride category / How It Works Coming soon cleanup.

Issue:
Tester does not understand Taxi Partner Quote.

Fix slice:
UI-FLOW - Quote explanation / Review Pod / dashboard card cleanup.

Issue:
Tester confused by mock payment vs Stripe test mode.

Fix slice:
UI-FIX-4 follow-up - payment-mode visibility.

Issue:
Tester thinks payout is sent.

Fix slice:
UI-FIX-2 follow-up - payout wording cleanup.

Issue:
Tester cannot find next action.

Fix slice:
UI-NEXT-ACTION - Dashboard / Updates CTA hierarchy.

Issue:
Tester is overwhelmed by notifications.

Fix slice:
UI-NOTIFICATIONS - filter by role/scenario.

Issue:
Taxi Partner Dashboard feels too large.

Fix slice:
PARTNER-UI - dashboard section collapse / role-based demo.

Issue:
Women-only sounds like female driver guarantee.

Fix slice:
SAFETY-COPY - Women-only / taxi partner caveat.

## 8. First tester issue report format

For each issue, record:

- Issue ID
- Session ID
- Date
- Tester role
- Scenario
- Screen / route
- Category
- Priority
- Summary
- Tester quote
- What happened
- Expected behavior
- Actual behavior
- Why it matters
- Suggested fix
- Owner
- Status
- Next action
- Linked screenshot / recording
- Linked commit after fix

## 9. Recommended first-session decision template

Session:
Tester:
Role:
Scenario:
Decision:
Continue / Pause / Continue with caution

Reason:

- 

P0 issues:

- none / list

P1 issues:

- none / list

Top 3 fixes:

1. 
2. 
3. 

Next action:

- Continue to next tester
- Fix P0 first
- Fix P1 first
- Schedule follow-up tester

## 10. What to ignore for now

Do not prioritize these unless repeated:

- tiny spacing polish
- color preference
- personal wording preference
- feature requests outside current Taxi-first flow
- requests for live payment
- requests for live taxi dispatch
- flight API
- GPS tracking
- full driver marketplace
- private taxi request
- quote negotiation chat

These can go to backlog.

## 11. What to escalate immediately

Escalate if tester reports:

- safety concern
- private data exposure
- payment/live money confusion
- legal/regulatory concern
- route/flow blocker
- admin route visible to wrong user
- "RidePod driver" / dispatch misunderstanding
- offensive or risky wording
- security secret exposure

## 12. After-session triage checklist

Checklist:

- [ ] Tester notes completed
- [ ] Bugs entered into tracker
- [ ] P0/P1 flagged
- [ ] Screenshots saved
- [ ] Tester quote captured
- [ ] Continue/pause decision made
- [ ] Next fix slice chosen
- [ ] Follow-up owner assigned
- [ ] Session summary sent to founder notes
