# RidePod Current UI Review

## 1. Executive Summary

Overall rating: **Needs cleanup before broader beta**.

RidePod is now pointed in the right product direction. The main Create Pod flow is Taxi-first, Ride app is framed as Coming soon, and the Taxi Partner Quote flow now consistently uses shared taxi pod, licensed taxi partner, mock payment state, payout pending, dispute window, and manual review language.

The biggest clarity risk is that older education, homepage, join, and money-protection surfaces still teach the previous RidePod model: money lock, protected payments, payment-authorized participants, Ride app / fixed quote, Taxi meter, and host reimbursement. Those legacy concepts are still valid fallback/internal modes, but they should not feel like the primary beta path now that Taxi is the main flow.

The biggest trust risk is live-sounding money language. Most Taxi Partner Quote screens say no real dispatch/payment/payout, but global pages still use phrases such as money lock, protected payments, payment-authorized, and keep payment inside RidePod. Those may imply live payments before the legal/payment readiness gate is complete.

No P0 blocker was found in this static review. The main P1 issues are legacy money wording, old mode education competing with Taxi-first positioning, dense Create Pod/settlement/admin screens, and a mobile nav hierarchy where Create is available but not always the dominant next action.

Screens that should be simplified first:
- Homepage / beta landing
- How RidePod Works
- Create Pod Review Pod
- Guest quote acceptance
- Settlement / dispute window
- Admin Review

Recommended next implementation slice: **UI-FIX-1 - Taxi-first copy and navigation cleanup**. Focus on replacing live-sounding payment language, making Taxi the single mental model on public/education surfaces, and keeping legacy Ride app / Taxi meter language behind demo/internal contexts.

## 2. Screen-by-screen Review

### Homepage / Beta Landing

Purpose:
Introduce RidePod and move users into the app.

What works:
- Clearly states RidePod does not provide drivers.
- Scheduled pods, not instant ride-hailing is helpful.
- Create and find actions are visible.

What is confusing:
- The headline `Planned ride pods with money lock` does not match the current Taxi-first beta positioning.
- The preview card says `Money lock ready` and `No booking until each seat is authorized`, which can imply live payment authorization.
- Taxi-first is not the first-viewport story.

Wording to shorten:
- Current: `Planned ride pods with money lock.`
- Suggested: `Shared taxi pods for planned rides.`

CTA issues:
- `Find a Ride Pod` is fine, but `Create Pod` should become the primary Taxi-first CTA for founder-led beta.

Trust / safety issues:
- Needs a short beta line: `Taxi-first beta. No real dispatch or payment yet.`

Visual hierarchy issues:
- The old money-lock concept gets more visual weight than Taxi-first.

Priority:
P1

Recommended fix:
Make the hero Taxi-first and replace money-lock wording with mock/max-charge language.

### How RidePod Works

Purpose:
Explain roles, ride flow, money rules, safety modes, and beta limits.

What works:
- Says RidePod does not provide drivers.
- FAQ covers max charge, proof, disputes, refunds, and Taxi Partner Quote limits.
- Taxi Partner Quote is described as beta and not live taxi dispatch.

What is confusing:
- The page still presents Ride app / fixed quote, Taxi meter, and Taxi partner quote as equal options.
- `Protected payments` and `payment-authorized` sound more live than current beta.
- Legal/risk content is mixed with basic product education.

Wording to shorten:
- Current: `RidePod helps users organize planned ride pods and manage the protected payment, coordination, and settlement flow.`
- Suggested: `RidePod helps groups coordinate shared taxi pods and review quote/payment states in beta.`

CTA issues:
- Needs one clear end CTA: `Create taxi pod`.

Trust / safety issues:
- Strong enforcement wording around false proof should be softened for public education.

Visual hierarchy issues:
- FAQ is dense on mobile and the Taxi-first path is not visually dominant.

Priority:
P1

Recommended fix:
Rewrite this page around the Taxi-first flow, with legacy modes moved to a future/internal modes section.

### Login / Register

Purpose:
Allow beta users to enter the app.

What works:
- Forms are short.
- Register copy frames account creation before joining protected pods.

What is confusing:
- `Protected ride pods` may imply payment protection is live.

Wording to shorten:
- Suggested: `Create a RidePod account before joining beta ride pods.`

CTA issues:
- CTAs are clear.

Trust / safety issues:
- No major issue found.

Visual hierarchy issues:
- Simple enough for beta.

Priority:
P2

Recommended fix:
Swap protected for beta or shared taxi until live payment policy is ready.

### Profile / Verification / Safety Fields

Purpose:
Let users manage profile, eligibility, and public preview.

What works:
- Private details are clearly marked as not public.
- ID verification review says RidePod is not collecting ID documents yet.
- Public preview is separated from private profile data.

What is confusing:
- Gender identity is used for eligibility but may need more explanation for Women-only mode.
- Verification language should avoid feeling like a safety guarantee.

Wording to shorten:
- Current: `Verification helps RidePod support safer matching. ID verification is not required for most pods. It may be used later for higher-trust pods.`
- Suggested: `Manual verification is optional and may support future higher-trust pods.`

CTA issues:
- `Request manual review` is clear.

Trust / safety issues:
- Good: no upload HKID/passport/selfie copy found.

Visual hierarchy issues:
- Profile, trust, public preview, and debug source compete slightly.

Priority:
P2

Recommended fix:
Keep private/public distinction, but add one concise line explaining Women-only eligibility is about riders joining the pod.

### Create Pod

Purpose:
Create a planned shared ride pod.

What works:
- Taxi-first flow is now present.
- Route, schedule, people, taxi type, safety mode, money/review steps are organized.
- Review tabs help chunk a long flow.

What is confusing:
- Legacy internal ride option constants and confirmation copy remain in the file; they are preserved, but future reviewers may mistake them for active primary flow.
- The flow still contains many concepts: schedule, seats, taxi type, luggage, accessibility, safety, quote, payment status, and review.

Wording to shorten:
- Current Review Pod supporting copy is good but repeated beta/payment notes could be reduced.
- Suggested: one persistent beta note per screen rather than several repeated notes.

CTA issues:
- `Continue` is generic across multiple steps.
- Final `Create taxi pod` is strong.

Trust / safety issues:
- Good: Taxi Partner Quote review says no real dispatch/payout.

Visual hierarchy issues:
- Review Pod is still dense on mobile, especially money and safety sections.

Priority:
P1

Recommended fix:
Keep the flow, but simplify Review Pod into a one-screen Taxi summary with quote process, taxi needs, who can join, and create CTA.

### Ride Category Selection

Purpose:
Choose the main ride category.

What works:
- Main flow shows only Taxi and Ride app.
- Taxi is selectable.
- Ride app is disabled/Coming soon.
- Copy says RidePod groups riders first, then helps request the right ride.

What is confusing:
- No major issue found.

Wording to shorten:
- Current copy is already short.

CTA issues:
- Taxi card is clear; disabled Ride app state is understandable.

Trust / safety issues:
- Good: Ride app does not appear live.

Visual hierarchy issues:
- Good: two-card choice is simple.

Priority:
P3

Recommended fix:
No immediate fix. Consider adding `Taxi-first beta` as a tiny page badge.

### Taxi Type Selection

Purpose:
Collect taxi type, luggage, and accessibility needs.

What works:
- Six taxi types are clear: Standard, Electric, Luggage-friendly, Large / van, Comfort, Accessible taxi.
- Helper says taxi type requests depend on taxi partner availability.
- Luggage/accessibility controls are practical and compact.
- Women-only note avoids female driver guarantee.

What is confusing:
- `Accessible taxi` can still be interpreted as guaranteed unless the availability note stays visible.

Wording to shorten:
- Current helper is good.

CTA issues:
- Continue is acceptable.

Trust / safety issues:
- Good: no exact vehicle or female driver guarantee.

Visual hierarchy issues:
- Taxi type cards plus luggage controls may feel long but acceptable.

Priority:
P2

Recommended fix:
Keep availability helper near selected taxi type on mobile.

### Luggage / Accessibility

Purpose:
Capture operational needs for the taxi quote.

What works:
- Luggage count, large luggage, extra space, wheelchair-accessible taxi, and step-free support are understandable.
- Values feed later summaries.

What is confusing:
- `Wheelchair-accessible taxi requested` may need a when-supported suffix.

Wording to shorten:
- Suggested: `Wheelchair-accessible taxi, if supported.`

CTA issues:
- No separate CTA issue.

Trust / safety issues:
- Needs consistent `depends on taxi partner availability` wherever accessible taxi is displayed.

Visual hierarchy issues:
- Fields are clear enough.

Priority:
P2

Recommended fix:
Add availability wording to accessibility rows in every summary surface.

### Safety / Access Mode

Purpose:
Control who can join the shared pod.

What works:
- Safety/access chips include Women-only, Mixed pod, Verified-only, Community-only, High-trust-only, and Invite-only.
- Taxi-first screens avoid gender identity exposure.
- Women-only copy correctly says it controls who can join the pod and does not guarantee a female taxi driver.

What is confusing:
- How Verified-only differs from ID verification/manual review may not be obvious.

Wording to shorten:
- Suggested: `Trust modes control rider eligibility only.`

CTA issues:
- No major issue.

Trust / safety issues:
- Avoid safer-matching wording becoming a safety guarantee on public pages.

Visual hierarchy issues:
- Too many chips can become noisy.

Priority:
P2

Recommended fix:
Use one Who can join row with chips and one short note.

### Review Pod

Purpose:
Confirm the pod before creation.

What works:
- Taxi-first wording appears: Shared taxi pod, Taxi partner quote, Taxi needs, How quote works, Payment status.
- Copy says no real taxi dispatch/payout.
- CTA uses `Create taxi pod`.

What is confusing:
- Payment status may feel early before quote request/payment acceptance.
- Legacy Money Protection copy remains for fallback modes, which is fine but should stay hidden in Taxi-first.

Wording to shorten:
- Current: `RidePod groups riders first, then requests one shared quote from a licensed taxi partner.`
- Suggested: `RidePod requests one shared quote after guests join.`

CTA issues:
- Final CTA is good.

Trust / safety issues:
- Good: mock payment/no live payout language is present.

Visual hierarchy issues:
- Cards are useful but could be shorter.

Priority:
P1

Recommended fix:
Make Payment status a smaller beta note until quote exists.

### Taxi Partner Quote Flow

Purpose:
Let organizer request quote, receive quote, send guests to accept, and proceed to pickup.

What works:
- `Taxi quote needed`, `Waiting for quote`, `Taxi quote received`, `Guests accepting`, and `Ready for pickup` labels are clear.
- Quote breakdown shows fare share, platform fee, guest charge, and taxi partner payout.
- Demo/no real dispatch/payout language appears.

What is confusing:
- `Simulate quote` is useful for demo but should be hidden from non-demo users.
- The organizer may need clearer separation between request quote and send quote to guests.

Wording to shorten:
- Suggested: `Request quote` can stay `Request taxi quote` in main CTA.

CTA issues:
- Good overall. `Simulate quote` should remain demo-only.

Trust / safety issues:
- Good: no real payout/payment promises.

Visual hierarchy issues:
- Quote card is fairly dense but scannable.

Priority:
P2

Recommended fix:
Add a demo badge next to any simulation action.

### Guest Quote Acceptance

Purpose:
Let guests review and accept/decline a taxi partner quote.

What works:
- Shows quote, fare share, platform fee, guest charge, and accepted guest count.
- Stripe test mode copy clearly says no live money.
- Mock fallback says beta mock payment state.

What is confusing:
- Stripe test mode and mock payment state are developer/demo concepts; real beta testers may not understand why both exist.
- `Accept higher quote` requires careful explanation.

Wording to shorten:
- Suggested: `Accept quote in demo` for mock mode.

CTA issues:
- `Accept quote` is clear; test-card CTA should only appear when test mode is deliberately enabled.

Trust / safety issues:
- Good: no real money charged in test mode copy.

Visual hierarchy issues:
- Money rows are strong; payment-state explanation could be shorter.

Priority:
P1

Recommended fix:
Use one of two modes per session: mock accept or Stripe test accept, not both visibly.

### My Pods / Host Dashboard

Purpose:
Show pod state and next action.

What works:
- Taxi-first cards show Shared taxi pod, Taxi partner quote, Taxi type, Taxi needs, and beta note.
- Next action cards use specific CTA labels such as Request taxi quote, Review quote, View pickup, View settlement.
- Status labels are human-friendly.

What is confusing:
- Host Dashboard still includes broader payment/proof/reconciliation concepts that can distract from Taxi-first.
- Old fallback modes are visible in mock data and admin fixtures.

Wording to shorten:
- Suggested: keep each card to one status line and one next action.

CTA issues:
- Good: CTAs are action-specific.

Trust / safety issues:
- Good: no RidePod driver or real payout wording found.

Visual hierarchy issues:
- Host Dashboard is information-rich; key next action should stay at top.

Priority:
P2

Recommended fix:
Create a Taxi-first dashboard filter or default grouping.

### Taxi Partner Dashboard

Purpose:
Show mock partner profile, incoming requests, quote form, accepted jobs, pickup, completion, and payout status.

What works:
- Very clear demo framing: Future beta prototype, RidePod does not provide drivers, taxi partners are external licensed providers, no real dispatch/payout.
- Mock profile avoids license, plate, ID, and bank collection.
- Incoming requests are scannable.
- Quote form and pickup checklist are clear.
- Live GPS copy says it is not enabled.

What is confusing:
- The page is large and acts like several flows at once: queue, quote, active rides, pickup, payout, review.
- `Payout releases after the dispute window` appears in a demo payout card and may sound automatic.

Wording to shorten:
- Current: `Payout releases after the dispute window if no issue is reported.`
- Suggested: `Payout stays pending until review clears.`

CTA issues:
- CTAs are clear: Quote this pod, View details, Mark arrived, Start ride, Mark completed, View payout.

Trust / safety issues:
- Good: no phone/email/private profile exposure found.

Visual hierarchy issues:
- Active ride cards are crowded but demo-friendly.

Priority:
P1

Recommended fix:
Replace release wording with stays pending / can be marked ready in demo, and split dashboard sections with stronger headings.

### Pickup Coordination Placeholder

Purpose:
Coordinate pickup without GPS.

What works:
- Shows pickup/dropoff, time, guest count, taxi type, luggage/accessibility.
- Status chips and actions are clear.
- Helper says live GPS is not enabled.
- Contact organizer is a placeholder with no phone number exposure.

What is confusing:
- `Contact organizer placeholder` is clearly demo but may feel unfinished to testers.

Wording to shorten:
- Suggested: `Contact organizer - placeholder.`

CTA issues:
- Mark arrived and Start ride are clear.

Trust / safety issues:
- Good: no GPS permission or live tracking promise.

Visual hierarchy issues:
- Good enough.

Priority:
P2

Recommended fix:
Add a short demo label to the contact placeholder button.

### Completion / Payout Pending

Purpose:
Let taxi partner mark ride completed and see payout status.

What works:
- Complete ride card says demo mode and no real payout.
- Confirmation modal requires checkbox.
- Payout pending, held, ready, denied, closed states exist.

What is confusing:
- Some payout copy uses releases, which sounds automated/live.
- Closed and released in demo mode need careful distinction from real payout.

Wording to shorten:
- Suggested: `Payout pending until dispute window/manual review clears.`

CTA issues:
- `Mark completed` is clear.

Trust / safety issues:
- Must avoid implying clicking complete sends payout.

Visual hierarchy issues:
- Money rows are clear.

Priority:
P1

Recommended fix:
Replace payout-release language with pending/demo-ready language.

### Settlement / Dispute Window

Purpose:
Show final split, proof status, dispute window, and issue reporting.

What works:
- Dispute window is explained.
- Guests can report issues.
- Money rows are detailed.

What is confusing:
- Legacy settlement surfaces focus on host reimbursement/receipt proof rather than Taxi-first quote acceptance.
- `Settlement final. Payout can be processed.` is better than payout completed, but still sounds near-live.

Wording to shorten:
- Suggested: `Case closed in app state` for demo states.

CTA issues:
- `Report an issue` and `View settlement details` are clear.

Trust / safety issues:
- Needs a visible no-live-payment note in Taxi-first settlement views.

Visual hierarchy issues:
- Settlement details are dense on mobile.

Priority:
P1

Recommended fix:
Create a Taxi Partner Quote settlement variant with quote, accepted guests, dispute window, and mock payment only.

### Admin Review

Purpose:
Let admin review proof/disputes/payment simulation/evidence.

What works:
- Queue and case detail are robust.
- Payment simulation says Stripe test mode and no real money.
- Evidence package, payment event history, and manual review controls are clear.
- Admin actions avoid harsh language.

What is confusing:
- The case detail has many sections and can be hard to scan.
- Admin review mixes proof review, ID verification, payout review, payment simulation, and evidence package.

Wording to shorten:
- Suggested: `Demo-only action. No money moves.`

CTA issues:
- Actions are clear but numerous.

Trust / safety issues:
- Good: no raw card/clientSecret display found in UI scan.

Visual hierarchy issues:
- Needs stronger order: case summary, risk, evidence, payment state, actions.

Priority:
P2

Recommended fix:
Add a compact case header with what admin must decide.

### Updates / Notifications

Purpose:
Show derived/mock ride notifications and next actions.

What works:
- Taxi-first notification copy is aligned: Taxi quote needed/requested/received, Guests accepting quote, Payout pending, Payout held, Payout ready.
- CTAs are specific.

What is confusing:
- Page may show many mock notifications at once, which can overwhelm testers.
- Earlier UI screenshots showed duplicate menu affordances and many unread updates; that could distract from the flow.

Wording to shorten:
- Current notification copy is short enough.

CTA issues:
- Good, assuming targets are valid/placeholders.

Trust / safety issues:
- Good: no private details in notification copy found.

Visual hierarchy issues:
- Unread count can dominate the screen.

Priority:
P2

Recommended fix:
For beta sessions, filter notifications by selected scenario/current role.

### Public Member Preview

Purpose:
Show what other pod members can see.

What works:
- Explicitly states private details like phone, email, gender identity, and ID review are not public.
- Report concern action is present.

What is confusing:
- Public/private distinction is good; no major issue.

Wording to shorten:
- Current privacy line is good.

CTA issues:
- `Report concern` is clear.

Trust / safety issues:
- Good privacy posture.

Visual hierarchy issues:
- Public preview is readable.

Priority:
P3

Recommended fix:
No urgent fix.

### Report Concern Flow

Purpose:
Let members report safety/member concerns privately.

What works:
- Says reports are private and reviewed manually.
- Emergency disclaimer is present.
- The copy avoids crime/fraud conclusions.

What is confusing:
- Users may not know what happens after submission.

Wording to shorten:
- Suggested: `RidePod reviews reports manually. Use emergency services for emergencies.`

CTA issues:
- Submit issue / report action is understandable.

Trust / safety issues:
- Good: no emergency-service overpromise.

Visual hierarchy issues:
- Form is direct.

Priority:
P2

Recommended fix:
Add a simple post-submit state expectation: `We may ask for more info.`

### Beta Scenario Switcher

Purpose:
Let founder/demo moderator jump through demo routes.

What works:
- Demo mode guard exists.
- Lists useful routes for beta testing.

What is confusing:
- It is operator-facing, so not a major user concern.

Wording to shorten:
- No urgent issue.

CTA issues:
- Route buttons are fine.

Trust / safety issues:
- Should stay hidden unless demo mode is enabled.

Visual hierarchy issues:
- Good enough for internal tool.

Priority:
P3

Recommended fix:
Keep demo-mode gate.

## 3. Key UX Questions

1. Does user understand RidePod does not provide drivers?
   - Mostly yes. It is clear on landing/info/taxi partner pages, but should be repeated once in Taxi-first create/review for new users.

2. Does user understand organizer vs taxi partner?
   - Mostly. Host/organizer and taxi partner roles are visible, but older host-books-externally language competes with Taxi Partner Quote.

3. Does user understand Taxi is the main flow?
   - Yes in Create Pod. Not yet across homepage/how-it-works.

4. Does user understand Ride app is coming soon?
   - Yes in the ride category screen. It is less clear in older info/demo pages where Ride app / fixed quote still appears as a peer mode.

5. Does user understand taxi type selection?
   - Yes. The options are concrete and the availability caveat is present.

6. Does user understand taxi partner quote?
   - Mostly. The quote process is clear in Review Pod and Dashboard; How RidePod Works should be updated to match.

7. Does user understand guests must accept the quote?
   - Yes in Review Pod, notifications, and quote acceptance surfaces.

8. Does user understand max charge / fare cap?
   - Partly. Legacy money screens explain it, but the concept is still dense and may distract from Taxi Partner Quote.

9. Does user understand no real payment / payout yet?
   - Yes on Taxi Partner Quote screens. Less clear on older money-lock/protected-payment surfaces.

10. Does user understand dispute window?
    - Mostly. It appears in completion/settlement/payout screens, but first-time users may need one shorter explanation.

11. Does user know next action on each screen?
    - Mostly. Create/quote/dashboard CTAs are now specific; notifications may overwhelm when too many mock updates exist.

12. Does admin understand what to review and why?
    - Mostly. Admin Review has the evidence, but needs a stronger case-decision hierarchy.

13. Does taxi partner dashboard feel clearly mock/demo?
    - Yes. It repeatedly says future beta, demo, no real dispatch, no real payout, and no GPS.

14. Does profile/member preview hide private data?
    - Yes. Public preview explicitly excludes phone, email, gender identity, and ID review.

## 4. Priority Fix Table

| Priority | Screen | Issue | Why it matters | Suggested fix | Estimated effort |
|---|---|---|---|---|---|
| P1 | Homepage / beta landing | Money lock is still the headline. | It implies live money custody and does not reflect Taxi-first. | Change hero to shared taxi pod / Taxi-first beta language. | Small |
| P1 | How RidePod Works | Old three-mode model still reads like the main product. | Users may think Ride app and Taxi meter are current primary flows. | Make Taxi-first the main story; move old modes to future/internal section. | Medium |
| P1 | Guest quote acceptance | Mock payment and Stripe test mode can both appear conceptually. | Testers may confuse mock/test/live payment. | Pick one session mode and label it clearly. | Medium |
| P1 | Taxi Partner Dashboard payout | Payout releases copy sounds automatic/live. | Could imply real payout or payout guarantee. | Use `Payout stays pending until review clears.` | Small |
| P1 | Settlement / dispute | Legacy host reimbursement/proof flow dominates settlement language. | Taxi-first users may not understand quote/dispute/payout path. | Add Taxi Partner Quote settlement variant. | Medium |
| P2 | Create Pod Review | Too much explanatory copy. | Mobile users may miss the final action. | Reduce to one Taxi summary, one quote rule card, one beta note. | Medium |
| P2 | Admin Review | Case detail has many dense sections. | Admin may not know the decision needed first. | Add compact decision-needed header. | Medium |
| P2 | Updates | Many mock updates and unread count can dominate. | Testers may be pulled away from the main flow. | Filter by scenario/role during beta sessions. | Small |
| P2 | Profile / safety | Verification and Women-only eligibility need careful distinction. | Avoid implying verification guarantees safety. | Add concise rider-eligibility language. | Small |
| P3 | Beta scenario switcher | Internal route list is operator-facing but broad. | Low risk. | Keep demo-mode gated. | Small |

## 5. Risky Wording Table

| File / screen | Current wording | Risk | Suggested replacement | Priority |
|---|---|---|---|---|
| `src/components/landing-page.tsx` / Homepage | `Planned ride pods with money lock.` | Sounds like live payment custody. | `Shared taxi pods for planned rides.` | P1 |
| `src/components/landing-page.tsx` / Homepage | `Money lock ready` | Sounds like payment/escrow is live. | `Seat commitment ready` or `Mock payment state ready` | P1 |
| `src/app/layout.tsx` / metadata | `money lock and verified receipt settlement` | Public metadata may overstate live payment readiness. | `shared taxi pod coordination and beta settlement review` | P1 |
| `src/components/ridepod-info-pages.tsx` / How it works | `Protected payments` | Can imply live money protection. | `Max charge preview` or `Mock payment state` | P1 |
| `src/components/ridepod-info-pages.tsx` / How it works | `payment-authorized` | Sounds like real payment authorization. | `accepted in beta` or `mock-authorized` | P1 |
| `src/components/money-safety-ui.tsx` / Join/payment UI | `participants payment-authorized` | Sounds live. | `participants accepted / mock-authorized` | P1 |
| `src/components/premium-join-pod-flow.tsx` / Join | `RidePod money lock` | Sounds like escrow/custody. | `RidePod seat commitment` | P1 |
| `src/components/payment-reconciliation-dashboard.tsx` / Admin/reconciliation | `Money lock` / `payment-authorized` | Admin/internal but still live-sounding. | `Mock authorization state` | P2 |
| `src/app/(app)/taxi-partner/page.tsx` / Payout status | `Payout releases after the dispute window if no issue is reported.` | Sounds automatic or guaranteed. | `Payout stays pending until review clears.` | P1 |
| `src/components/ridepod-info-pages.tsx` / FAQ | `false, altered, AI-generated...` | Public copy feels accusatory/legal-heavy. | `misleading or unsupported proof may go to manual review.` | P2 |
| Docs avoid-list files | forbidden-risk phrases | Present as forbidden examples, not active UI risk. | Keep only in docs/avoid-list context. | P3 |

No active app-source matches were found for these exact high-risk phrases as affirmative user-facing copy: `RidePod driver`, `guaranteed driver`, `guaranteed payout`, `official taxi dispatch`, `real payout sent`, `real payment captured`, `escrow`, `100% safe`, `100% verified`, `female driver guaranteed`, `forever banned`, `upload HKID`, `upload passport`, `selfie verification`, `face scan`, `gal only`, `boy and gal`, `Wait at`, `Min seats to book`, `Target seats`, or `Host is riding?`.

## 6. CTA Audit Table

| Screen | Current CTA | Issue | Suggested CTA | Priority |
|---|---|---|---|---|
| Homepage | Find a Ride Pod | Fine, but Taxi-first beta should lead with creation/demo. | Create taxi pod | P2 |
| Homepage | Create Pod | Good but secondary visual weight. | Make primary CTA | P2 |
| Ride category | Continue after Taxi selection | Clear enough. | Continue | P3 |
| Taxi type | Continue | Generic but acceptable. | Continue to pod details | P3 |
| Review Pod | Create taxi pod | Good. | Keep | P3 |
| Taxi quote request | Request taxi quote | Good. | Keep | P3 |
| Taxi quote request demo | Simulate quote | Demo-only; risky if visible to testers. | Simulate quote (demo) | P2 |
| Guest quote acceptance | Accept quote | Good. | Keep; use `Accept quote in demo` if mock-only. | P2 |
| Guest quote acceptance | Accept quote with test card | Clear for internal test mode only. | Keep only in Stripe test sessions. | P2 |
| Taxi Partner Dashboard | Quote this pod | Good. | Keep | P3 |
| Taxi Partner Dashboard | Contact organizer placeholder | Clearly unfinished. | Contact organizer (demo) | P2 |
| Completion | Mark completed | Good. | Keep | P3 |
| Payout status | View dispute window | Good, but depends on route/placeholder. | Keep | P3 |
| Admin Review | Mark payout ready | Clear, but must remain demo. | Mark payout ready in demo | P2 |
| Admin Review | Generate evidence package | Good. | Keep | P3 |
| Public member preview | Report concern | Good. | Keep | P3 |

## 7. Mock vs Real Clarity Table

| Screen | Is mock/demo clear? | Risk | Suggested improvement |
|---|---|---|---|
| Homepage / beta landing | Partly | Money-lock language sounds live. | Add `Closed beta uses mock payment state.` |
| How RidePod Works | Partly | Protected/payment-authorized language sounds live. | Rewrite around mock/test mode and future live payments. |
| Create ride category | Yes | Low. | Keep Ride app disabled. |
| Taxi type selection | Mostly | Accessible taxi may feel guaranteed. | Keep availability note near selected taxi type. |
| Review Pod | Yes | Low, but dense. | One beta note instead of repeated notes. |
| Taxi Partner Quote request | Yes | Simulation action can feel productized. | Add demo label to simulation CTA. |
| Guest quote acceptance | Mostly | Stripe test mode vs mock fallback may confuse. | Show only one payment path per beta session. |
| My Pods / Host Dashboard | Mostly | Legacy proof/payment widgets compete with Taxi-first. | Default to Taxi-first status/action card. |
| Taxi Partner Dashboard | Yes | Payout releases sounds live. | Use pending until review clears. |
| Pickup coordination | Yes | Placeholder contact action may feel incomplete. | Label as demo placeholder. |
| Completion / payout | Mostly | Ready/released states can sound real. | Use demo-only ready/closed labels. |
| Settlement / dispute | Partly | Legacy host reimbursement language dominates. | Add Taxi Partner Quote settlement variant. |
| Admin Review | Yes | Many admin actions can overwhelm. | Add decision summary. |
| Updates / Notifications | Mostly | Many mock items can overwhelm. | Filter by scenario/current role. |
| Profile / public preview | Yes | Low. | Keep private/public copy. |
| Report concern | Yes | Low. | Add post-submit expectation. |
| Beta scenario switcher | Yes | Low if gated. | Keep demo guard. |

## 8. Recommended Next Slice

Recommended next slice: **UI-FIX-1 - Taxi-first public copy and money-language cleanup**.

Scope:
- Update homepage headline and preview card to Taxi-first.
- Update How RidePod Works so Taxi is primary and Ride app is clearly coming soon.
- Replace money lock / protected payments / payment-authorized wording in user-facing surfaces with mock-safe language.
- Replace payout releases with payout pending / marked ready in demo.
- Keep legacy Ride app / Taxi meter modes available only where explicitly demo/internal/fallback.

Do not change business logic in this slice.

UI-FIX-1 completed: homepage Taxi-first copy, How RidePod Works Taxi-first positioning, confirmation modal wording, money-lock wording cleanup, and payout-release wording cleanup.

UI-FIX-2 completed: Taxi Partner Quote settlement / payout screens now use selected quote, guest acceptance, mock/test payment state, payout pending, and dispute window language instead of legacy host reimbursement/proof wording.

UI-FIX-3 completed: Admin Review case detail now has a decision header, clearer case summary, improved evidence hierarchy, safer payment/payout copy, and grouped admin actions.

UI-FIX-4 completed: Guest quote acceptance now shows one payment mode at a time. Mock sessions show demo acceptance only; Stripe test sessions show Stripe test payment only.

UI-FIX-5 completed: Create Pod Review was simplified into a Taxi summary, quote process, taxi needs, who-can-join summary, concise beta/payment note, and clearer Taxi-first CTA.
