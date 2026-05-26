# RidePod Founder Tester Session Dashboard

## 1. Purpose

This dashboard helps the founder run the first RidePod Taxi-first tester sessions, track what was tested, decide whether to continue or pause, and choose the next fix slice.

This is not an analytics product dashboard. It is a manual session dashboard/checklist.

## 2. Session Status Board

| Session | Tester role | Scenario | Status | P0 count | P1 count | Continue / pause decision | Next action |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Session 1 | Organizer | Create shared taxi pod | Not started | 0 | 0 | Continue | Schedule tester |
| Session 2 | Guest | Accept taxi quote | Not started | 0 | 0 | Continue | Schedule tester |
| Session 3 | Taxi partner | Submit quote / accept job | Not started | 0 | 0 | Continue | Schedule tester |
| Session 4 | Admin | Dispute / payout review | Optional | 0 | 0 | Continue | Run if time allows |

Status values:

- Not started
- Scheduled
- Completed
- Needs follow-up
- Paused

Decision values:

- Continue
- Continue with caution
- Pause

## 3. First Tester Runbook

### Before tester

- [ ] App opens
- [ ] Homepage opens
- [ ] How RidePod Works opens
- [ ] Create Pod opens
- [ ] Taxi flow works
- [ ] Ride app is clearly Coming soon
- [ ] Taxi type selection works
- [ ] Review Pod works
- [ ] My Pods / Dashboard works
- [ ] Guest quote acceptance works
- [ ] Taxi Partner Dashboard works, if testing partner role
- [ ] Admin Review works, if testing dispute role
- [ ] No live payment / payout copy appears
- [ ] Feedback form ready
- [ ] Issue triage template ready
- [ ] Notes template ready

### During tester

- [ ] Explain RidePod does not provide drivers
- [ ] Explain Taxi is main flow
- [ ] Explain Ride app is Coming soon
- [ ] Explain no real taxi dispatch
- [ ] Explain no live payment
- [ ] Explain no real payout
- [ ] Ask tester to think out loud
- [ ] Record confusion points
- [ ] Record direct tester quotes
- [ ] Capture screenshots for bugs

### After tester

- [ ] Fill session notes
- [ ] Fill triage template
- [ ] Count P0/P1 issues
- [ ] Decide continue/pause
- [ ] Choose next fix slice
- [ ] Commit/session notes if needed

## 4. Role-Based Session Tracks

### Track A - Organizer

Goal:
Can tester create a shared taxi pod?

Flow:

1. Homepage
2. How RidePod Works
3. Create Pod
4. Choose Taxi
5. Choose taxi type
6. Add luggage/accessibility
7. Choose who can join
8. Review Pod
9. Create taxi pod
10. Request taxi quote

Success:

- understands Taxi-first
- understands no RidePod drivers
- understands guests join before quote
- understands no live dispatch/payment

### Track B - Guest

Goal:
Can tester review and accept a taxi quote?

Flow:

1. Open quote acceptance
2. Review quote amount
3. Explain fare share/platform fee/guest total
4. Accept quote in demo or Stripe test mode
5. Understand no live money
6. Understand group acceptance

Success:

- understands quote
- understands their total
- understands no live money
- understands guests accept before ride proceeds

### Track C - Taxi partner

Goal:
Can taxi partner understand request, quote, accept, pickup, complete, payout pending?

Flow:

1. Open Taxi Partner Dashboard
2. Review incoming request
3. Submit quote
4. Accept job
5. Mark arrived
6. Start ride
7. Mark completed
8. View payout pending

Success:

- understands this is demo only
- understands no real dispatch/payout
- knows what info is needed before quoting

### Track D - Admin

Goal:
Can admin review dispute/payout issue?

Flow:

1. Open dispute / payout pending
2. Report taxi partner issue
3. Open Admin Review
4. Read decision header
5. Review evidence timeline
6. Hold payout / mark ready in demo
7. Understand no real money moves

Success:

- understands decision needed
- evidence hierarchy is clear
- actions are safe and not scary

## 5. Go / Pause Decision Card

Continue if:

- no P0
- tester understands RidePod does not provide drivers
- tester understands Taxi-first
- tester understands no live payment/payout
- Create Taxi Pod works
- main CTAs work

Continue with caution if:

- one P1 confusion issue
- no private data exposure
- no live money/dispatch misunderstanding
- issue is easy to explain/fix

Pause if:

- any P0
- tester thinks real taxi dispatch happened
- tester thinks live money was charged
- tester thinks payout was sent
- tester cannot complete Create Taxi Pod
- private data appears publicly
- multiple P1 trust issues appear

## 6. Session Scorecard

| Category | Rating 1-5 | Notes |
| --- | ---: | --- |
| Product clarity |  |  |
| Taxi-first understanding |  |  |
| Quote process understanding |  |  |
| No-live-payment understanding |  |  |
| Trust in quote breakdown |  |  |
| Next action clarity |  |  |
| UI simplicity |  |  |
| Willingness to use |  |  |
| Would recommend |  |  |

## 7. Common Issue to Fix Slice Map

Issue:
Tester thinks RidePod provides drivers.

Fix:
UI-COPY public positioning.

Issue:
Tester thinks Ride app is live.

Fix:
Ride category / How It Works Coming soon cleanup.

Issue:
Tester cannot explain taxi partner quote.

Fix:
Quote process copy / Review Pod cleanup.

Issue:
Tester confused by mock vs Stripe test mode.

Fix:
Guest payment-mode visibility.

Issue:
Tester thinks payout is sent.

Fix:
Payout wording cleanup.

Issue:
Tester cannot find next action.

Fix:
Dashboard / Updates CTA hierarchy.

Issue:
Tester overwhelmed by notifications.

Fix:
Updates scenario/role filter.

Issue:
Taxi partner dashboard too large.

Fix:
Partner dashboard section collapse.

Issue:
Women-only misunderstood.

Fix:
Safety copy cleanup.

## 8. Tester Quote Capture

Best positive quote:
""

Most concerning quote:
""

Most confusing phrase/screen:
""

Trust blocker:
""

Feature request:
""

Would use? yes / maybe / no

Why:
""

## 9. Manual Metrics to Track

Use event-tracking plan concepts, but keep manual.

Track manually:

- Create Pod completed yes/no
- Taxi type selected yes/no
- Quote process understood yes/no
- Quote accepted yes/no
- Payout pending understood yes/no
- Dispute window understood yes/no
- P0 count
- P1 count
- Trust rating
- Clarity rating
- Would use again

Do not add analytics code.

## 10. Next Action After 3 Testers

After 3 testers:

- summarize repeated confusion
- group issues by P0/P1/P2/P3
- choose one UI cleanup sprint
- do not add new features until P0/P1 are resolved

Possible next sprints:

- UI cleanup sprint
- Quote board prototype
- Airport mode prototype
- Taxi partner discovery calls
- Payment/legal review
- Analytics implementation
