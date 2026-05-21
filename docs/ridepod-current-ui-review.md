# RidePod Current UI Review

## 1. Executive Summary

Overall rating: **Mostly ready** for guided closed beta, **needs cleanup** before unguided beta testing.

RidePod's current UI is strong on intent: the core product positioning is visible, Taxi Partner Quote is consistently framed as future beta/demo in most places, and safety/payment caveats are much better than earlier versions. The app now has enough surface area to run moderated tester sessions across Create Pod, join/lock, Taxi Partner Quote, settlement, admin review, and taxi partner dashboard flows.

The biggest clarity risk is cognitive load. Many screens explain several concepts at once: max charge, fare cap, mock payment state, Stripe test mode, quote proof, receipt proof, payout pending, dispute window, and admin review. This is workable in a founder-led demo, but ordinary beta users may not know which action matters next.

The biggest trust risk is money wording that can sound more live than intended. Most high-risk wording has been removed, but phrases like "money lock", "protected payments", "payment-authorized", "payout is released", and "payout marked complete" still need careful treatment before a broader beta.

No P0 beta blocker was found in this static review. The main P1 issues are navigation clarity, money terminology, dense create/settlement/admin screens, and making mock/test/live boundaries unmistakable on every money-related screen.

Screens that should be simplified first:

1. Mobile app shell / navigation
2. Create Pod
3. Guest quote acceptance
4. Settlement / dispute window
5. Admin Review

Recommended next implementation slice: **UI-FIX-1 — Navigation and money-copy cleanup**. It should address the duplicate sidebar/menu affordance, make Create the primary mobile action, and replace live-sounding payment/payout copy without changing business logic.

## 2. Screen-by-screen Review

### Homepage / Beta Landing

Purpose: Explain RidePod quickly and route users into create/join/demo paths.

What works:
- Clear first-position signal that RidePod is for planned shared rides, not instant ride-hailing.
- "RidePod does not provide drivers" is present on info/beta pages.
- Primary CTAs are visible and short.

What is confusing:
- "Planned ride pods with money lock" is memorable, but may sound like RidePod already holds money or provides escrow-like protection.
- "Protected payments" and "payment-authorized" may imply live payment readiness.

Wording to shorten:
- Replace repeated money-protection phrasing with a shorter beta-safe line: "Guests approve a max before the ride proceeds."

CTA issues:
- "Find a Ride Pod" and "Create Pod" are clear, but the mobile app shell later makes "Updates" more prominent than "Create".

Trust / safety issues:
- Payment protection copy needs tighter distinction between current mock/test state and future live payment.

Visual hierarchy issues:
- Hero is readable, but money-protection claims compete with the core concept.

Priority: P1

Recommended fix:
- Rename "money lock" language to "seat commitment" or "max-charge approval" until live payment terms are final.

### How RidePod Works

Purpose: Explain RidePod roles, ride options, max charge, proof, and safety modes.

What works:
- Strong explanation that RidePod does not provide drivers.
- Ride app / fixed quote, Taxi meter, and Taxi partner quote are separated.
- FAQ answers many likely beta questions.

What is confusing:
- The page is long and mixes product education with legal/risk disclaimers.
- "What happens if proof is false or altered?" includes strong enforcement language that may feel legal-heavy for general users.

Wording to shorten:
- "RidePod helps users coordinate planned shared rides and manage the protected payment and settlement flow" can become "RidePod helps groups coordinate planned rides, approve max charges, and settle fairly."

CTA issues:
- Education page likely needs one clear next CTA at the end: Create, Join, or Try demo.

Trust / safety issues:
- Good caveats overall. Avoid making verification sound like safety assurance.

Visual hierarchy issues:
- FAQ density is high on mobile.

Priority: P2

Recommended fix:
- Split founder/legal FAQ content from beta-user quick education later. For now, keep but add a short "Start here" summary.

### Login / Register

Purpose: Let users access protected RidePod actions.

What works:
- Simple forms with clear error states.
- Supabase fallback messaging is safe for local/demo mode.

What is confusing:
- "Protected RidePod actions" is accurate but abstract.
- Register does not explain whether this is beta/demo or whether email confirmation is required.

Wording to shorten:
- "Create a RidePod account before joining protected ride pods" can become "Create an account to join or create pods."

CTA issues:
- CTAs are clear.

Trust / safety issues:
- No major issue found.

Visual hierarchy issues:
- Forms are clean and mobile readable.

Priority: P3

Recommended fix:
- Add beta-safe auth helper copy later, if auth becomes part of tester onboarding.

### Profile / Verification / Safety Fields

Purpose: Let users manage public identity, eligibility, verification, and trust settings.

What works:
- Private/public split is explained.
- Phone, gender identity, community, ID review, and safety notes are contextualized.
- Public preview says private details are not shown publicly.

What is confusing:
- "Gender identity" as a field may raise trust concerns unless users understand exactly how it affects Women-only eligibility.
- "Request manual review" may sound like ID collection even though no ID document is collected in this slice.

Wording to shorten:
- "Used only for safety eligibility, such as Women-only pods" is good but should be repeated near Women-only join gates.

CTA issues:
- "Request manual review" is clear to internal testers, less clear to normal users.

Trust / safety issues:
- Good privacy note. Keep emphasizing that private details are not public.

Visual hierarchy issues:
- Profile has many panels but is understandable.

Priority: P1

Recommended fix:
- Add a short "What others can see" summary above sensitive fields in a future cleanup.

### Create Pod

Purpose: Create one-time or recurring shared ride pods.

What works:
- Ride option cards are clear.
- Taxi Partner Quote card correctly says future beta and no real taxi dispatch or payout yet.
- Confirmation modal for Taxi Partner Quote is safety-aware.

What is confusing:
- The flow asks users to understand pod type, route, time, ride option, max fare, safety mode, recurring setup, and payment/proof model in one creation path.
- Some labels are product-internal: "booking fare cap", "protected booking", "host replacement", "minimum locked guests".

Wording to shorten:
- "Payout is released after ride completion and dispute window review" should be future/demo phrased.

CTA issues:
- Next-step CTA is generally clear, but the amount of setup before value is visible may cause drop-off.

Trust / safety issues:
- Avoid live-sounding payout/payment phrases in review cards.

Visual hierarchy issues:
- Dense forms and explanatory cards may be heavy on mobile.

Priority: P1

Recommended fix:
- Create a simplified beta Create Pod path that highlights one primary next action per step and moves deeper explanations into collapsible help.

### Ride Option Selection

Purpose: Let organizers choose ride app / fixed quote, taxi meter, or taxi partner quote.

What works:
- Three modes are distinct.
- Taxi Partner Quote says licensed taxi partner and future beta.

What is confusing:
- Users may not understand why "Ride app / fixed quote" needs quote screenshot while Taxi Partner Quote uses partner quote.
- Taxi meter's "no upfront quote" needs a stronger explanation of fare cap/max charge.

Wording to shorten:
- "Ride app / fixed quote" may become "Ride app quote" for user-facing surfaces, with fixed quote as helper text.

CTA issues:
- Selection CTA is clear.

Trust / safety issues:
- Good driver/provider separation.

Visual hierarchy issues:
- Strong enough.

Priority: P2

Recommended fix:
- Add a compact comparison row: who quotes, who books, what proof is needed.

### Ride App / Fixed Quote Flow

Purpose: Host uploads quote before booking and receipt after ride.

What works:
- The app consistently frames external booking by host.
- Receipt verification and fare-cap language are present.

What is confusing:
- Quote screenshot vs final receipt proof may blur for users.
- "Protected booking unlocks" is product-heavy.

Wording to shorten:
- Use "Upload quote before booking" and "Upload receipt after ride" wherever possible.

CTA issues:
- "Upload quote" and "Upload receipt" are clear.

Trust / safety issues:
- Proof certification copy is strong; keep it but avoid terms like "fake" in user-facing enforcement copy.

Visual hierarchy issues:
- Settlement/proof screens are dense.

Priority: P2

Recommended fix:
- Add one-line proof lifecycle on quote/receipt screens.

### Taxi Meter Flow

Purpose: Support rides without upfront quote, using meter proof after ride.

What works:
- "No upfront quote. Meter proof after ride" is crisp.
- Meter proof status labels are readable.

What is confusing:
- How fare cap is chosen may not be obvious.
- Users may not know what happens if meter fare exceeds cap.

Wording to shorten:
- "Meter proof submitted. RidePod will review it before settlement" is clear enough.

CTA issues:
- "Upload meter proof" is clear.

Trust / safety issues:
- Needs explicit "no automatic above-cap charge" wherever cap is shown.

Visual hierarchy issues:
- Similar density risk as fixed quote.

Priority: P2

Recommended fix:
- Add a short max-charge helper to Taxi Meter cards.

### Taxi Partner Quote Flow

Purpose: Organizer requests one shared pod quote from a licensed taxi partner.

What works:
- Copy repeatedly says Taxi Partner Quote is demo only.
- Quote received, guest acceptance, above-cap, and payout math are visible.
- "No real taxi dispatch or payout yet" appears in the organizer quote card.

What is confusing:
- "Mock payment" badge may be too technical for guests.
- Organizer may not know whether "Request quote" sends anything real.

Wording to shorten:
- "Display/mock only. No real charge or payout is created" is good. Repeat similar phrasing wherever quote action appears.

CTA issues:
- "Simulate quote" is good in demo mode, but should stay hidden outside founder/tester sessions.

Trust / safety issues:
- Strong overall. Watch "Taxi partner payout" amount labels because they can imply money movement.

Visual hierarchy issues:
- Money breakdown is useful but visually dense.

Priority: P1

Recommended fix:
- Add a compact beta banner above every Taxi Partner Quote action: "Demo action. No provider is contacted."

### Guest Quote Acceptance

Purpose: Let guests review and accept/decline a taxi partner quote.

What works:
- Money breakdown is clear.
- Above-cap warning is visible.
- Stripe test mode says no live money.
- Mock fallback remains available.

What is confusing:
- Guests can see both "Accept quote with test card" and "Accept quote" mock path. That is useful for development but confusing for testers.
- "Mock payment state: Authorized" can sound like money was actually authorized.

Wording to shorten:
- Replace "Mock payment state: Authorized" with "Demo acceptance recorded" for user-facing mode.

CTA issues:
- Two acceptance paths create uncertainty.

Trust / safety issues:
- Ensure testers know Stripe test mode uses test cards only and no live money.

Visual hierarchy issues:
- Test payment section is detailed; good for PAY testing, too much for regular guest beta.

Priority: P1

Recommended fix:
- Gate Stripe test payment UI behind a payment-test scenario and show only one primary accept path to normal beta testers.

### My Pods / Host Dashboard

Purpose: Show active pods, recurring instances, and next actions.

What works:
- Status overview and next action cards are useful.
- Recurring rides show each instance separately.
- Taxi Partner Quote statuses avoid raw enum names.

What is confusing:
- Status overview can show many abstract states at once.
- "Payout after dispute window in this future beta prototype" is close but should say no real payout.

Wording to shorten:
- "Settlement complete. Payout marked complete" should be changed to demo-safe closed wording.

CTA issues:
- "View ride", "Upload quote", "View settlement", and "Open chat" are understandable.

Trust / safety issues:
- Payout status copy must avoid implying real transfer.

Visual hierarchy issues:
- Status cards may be visually busy for recurring pods.

Priority: P1

Recommended fix:
- Normalize recurring status helper text and make "next action" visually dominant.

### Taxi Partner Dashboard

Purpose: Demo how a licensed taxi partner could quote, accept, coordinate, complete, and view payout state.

What works:
- Route `/taxi-partner` has clear title and subtitle.
- Demo mode guard is present.
- Partner profile is clearly mock and does not collect license, plate, ID, or bank details.
- Incoming requests and active rides expose safe operational fields only.
- Accept, decline, mark arrived, start ride, and completion flows include demo/no-payout copy.

What is confusing:
- Dashboard shows many states at once; first-time taxi partner testers may not know which scenario to inspect.
- "Release payout" action label in admin/mock contexts can sound live unless always paired with demo mode.

Wording to shorten:
- Keep partner tester copy focused: "Review request", "Submit quote", "Accept job", "Mark arrived", "Start ride", "Complete ride".

CTA issues:
- Partner dashboard CTAs are clear but numerous.

Trust / safety issues:
- Good external licensed provider framing.

Visual hierarchy issues:
- Desktop/tablet layout is fine; mobile may be long.

Priority: P2

Recommended fix:
- For demos, add a moderator sequence in docs or scenario cards rather than changing UI immediately.

### Pickup Coordination Placeholder

Purpose: Show post-acceptance pickup status without GPS.

What works:
- "No live GPS is shared" is explicit.
- Pickup status, pickup point, taxi type, guest count, and "I'm here" are simple.

What is confusing:
- "Contact organizer" placeholder on partner side should not imply phone or real messaging if not wired.

Wording to shorten:
- "Future: show taxi partner location and pickup progress here" is clear.

CTA issues:
- "I'm here" is understandable, but users may wonder who sees it.

Trust / safety issues:
- No GPS permission is requested.

Visual hierarchy issues:
- Good.

Priority: P2

Recommended fix:
- Add "local demo only" helper near "I'm here" if testers misunderstand it.

### Completion / Payout Pending

Purpose: Mark taxi partner ride completed in demo and show payout pending/dispute window.

What works:
- Completion modal requires a checkbox.
- "No real payout is sent" appears in the modal and payout card.
- Dispute window is explained.

What is confusing:
- "Driver payout amount" appears in one modal even though product copy prefers Taxi partner, not driver.
- Organizer/guest screens may not always distinguish payout status from actual payout.

Wording to shorten:
- Use "Taxi partner payout amount" instead of "Driver payout amount".

CTA issues:
- "Simulate ride completed" is clear for demo but less natural for a partner tester. "Mark completed" is better on partner dashboard.

Trust / safety issues:
- One "Driver payout amount" label conflicts with copy rules.

Visual hierarchy issues:
- Money rows are useful but many.

Priority: P1

Recommended fix:
- Replace remaining "Driver payout" user-facing labels with "Taxi partner payout" in a future copy cleanup.

### Settlement / Dispute Window

Purpose: Upload final receipt/meter proof, view split, and understand dispute window.

What works:
- Receipt and meter proof verification are separated.
- Final share and fare breakdown are visible.
- Dispute window exists as a concept across settlement states.

What is confusing:
- Settlement combines proof upload, fare editing, split math, dispute, and payout/reimbursement concepts.
- "Host reimbursement" may need a short beta note that live reimbursement is not enabled unless stated.

Wording to shorten:
- Keep "Upload final receipt" and "Review final split" as primary language.

CTA issues:
- CTAs are mostly clear.

Trust / safety issues:
- Any payout/reimbursement wording should be reviewed for live-money implication.

Visual hierarchy issues:
- Dense on mobile due to editable money fields plus split cards.

Priority: P1

Recommended fix:
- Make dispute window and "no live money" status visibly attached to settlement summary.

### Admin Review

Purpose: Let internal/admin users review proof, disputes, above-cap cases, ID review, taxi partner payouts, payment simulation, and evidence packages.

What works:
- "Internal queue" framing is good.
- Filters and case cards are practical.
- Manual review and payout hold language is mostly safe.
- Evidence package integration is visible.

What is confusing:
- Admin Review has many powerful actions in one modal: proof decisions, taxi partner actions, payment simulation, evidence package.
- Some status values are still close to internal model language.

Wording to shorten:
- Use "Demo payout ready" instead of "Release payout" or "Payout ready" where no real payout exists.

CTA issues:
- Multiple admin actions need grouping by outcome: proof, payment, payout, dispute.

Trust / safety issues:
- Admin route must be protected before real ops. For closed demo, keep "Internal/demo only" framing.

Visual hierarchy issues:
- High density; acceptable for internal tool but not for untrained users.

Priority: P1

Recommended fix:
- Add a small admin mode banner and group actions by category in a later UI cleanup.

### Updates / Notifications

Purpose: Show ride-instance notifications and next actions.

What works:
- Notification cards are compact and actionable.
- Unread/all tabs are clear.
- Derived taxi partner notifications have human labels.

What is confusing:
- In the current mobile screenshots, the page appears to show both the global menu button and an extra page/menu control, creating a double-sidebar impression.
- User feedback says "Updates shall be Create", suggesting the bottom nav priority is wrong for beta.
- The page title "Updates" may not be as central as "Create" in the main tab bar.

Wording to shorten:
- "Supabase updates are unavailable; using mock ride notifications" is accurate but developer-like.

CTA issues:
- Notification CTAs are good; navigation CTA hierarchy needs review.

Trust / safety issues:
- Mock fallback note should be demo-only and less alarming to testers.

Visual hierarchy issues:
- Double menu affordance is the clearest visual issue found from screenshot review.

Priority: P1

Recommended fix:
- Make Create the primary mobile nav action if that is the product direction, and remove duplicate sidebar/menu affordance on Updates.

### Public Member Preview

Purpose: Show safe public member information and allow concern reporting.

What works:
- Private fields are explicitly hidden.
- Report concern is available.
- No phone/email/gender identity is exposed in the preview.

What is confusing:
- "Verified badges help RidePod support safer matching" is safe but may still be over-trusted by users.

Wording to shorten:
- Good as-is.

CTA issues:
- "Report concern" is clear.

Trust / safety issues:
- Good privacy stance.

Visual hierarchy issues:
- Good.

Priority: P2

Recommended fix:
- Keep current privacy copy; test whether users understand what public badges mean.

### Report Concern Flow

Purpose: Let users submit private safety/member concerns for manual review.

What works:
- Reports are private and manually reviewed.
- Emergency disclaimer is present.
- The form avoids criminal/fraud wording.

What is confusing:
- "Evidence upload coming later" may be fine for beta but could frustrate users after an actual concern.

Wording to shorten:
- "Tell RidePod what happened" is good.

CTA issues:
- "Submit report" is clear.

Trust / safety issues:
- Good emergency disclaimer.

Visual hierarchy issues:
- Good modal structure.

Priority: P2

Recommended fix:
- For beta, make sure moderators explain that report flow is not emergency support.

### Beta Scenario Switcher

Purpose: Let founder/testers jump into prepared flows.

What works:
- Demo mode guard is clear.
- Scenario cards show route, role, primary status, and notes.
- "Closed beta only" says mock states and no live payments/payouts.

What is confusing:
- Route paths are shown in developer style, which is okay for founder/moderator but not general testers.

Wording to shorten:
- "Recommended route" could be "Demo route" for non-technical users.

CTA issues:
- Scenario actions are likely clear.

Trust / safety issues:
- Good demo-only framing.

Visual hierarchy issues:
- Good for internal/demo use.

Priority: P3

Recommended fix:
- Keep as internal demo tooling.

## 3. Key UX Questions

1. Does user understand RidePod does not provide drivers?
   - Mostly yes. This is clear on info, beta, Taxi Partner Dashboard, and Taxi Partner Quote copy. It should also be visible near create/join decision points.

2. Does user understand organizer vs taxi partner?
   - Partly. Taxi Partner Dashboard is clear. Organizer/guest flows may still need a compact role explainer: organizer forms pod, taxi partner quotes/accepts job, RidePod coordinates state.

3. Does user understand ride app / fixed quote vs taxi meter vs taxi partner quote?
   - Mostly yes in the ride option cards. The proof difference needs more reinforcement.

4. Does user understand quote vs receipt/meter proof?
   - Partly. The terms are present, but first-time users may not understand the sequence without a one-line lifecycle.

5. Does user understand max charge / fare cap?
   - Partly. Max charge and fare cap appear often, but the distinction between approved max, quote amount, final fare, and above-cap approval is heavy.

6. Does user understand Taxi Partner Quote is demo-only?
   - Yes in most Taxi Partner Quote and Taxi Partner Dashboard surfaces.

7. Does user understand no real payout/payment yet where relevant?
   - Mostly. Stripe test mode and taxi partner cards are explicit. Some generic settlement/host dashboard phrasing should be tightened.

8. Does user understand dispute window?
   - Partly. The concept is present, but needs a clearer "what can happen during this window" summary on settlement and payout screens.

9. Does user know next action on each screen?
   - Usually yes, but Create Pod, Admin Review, and Guest Quote Acceptance have too many competing actions/states.

10. Does admin understand what to review and why?
    - Moderated/admin users likely can. Untrained admins need clearer grouping by proof, dispute, payment, and payout action.

11. Does taxi partner dashboard feel clearly mock/demo?
    - Yes. It says Future beta prototype, Demo mode, no real dispatch, and no real payout.

12. Does profile/member preview hide private data?
    - Yes. Public preview hides phone, email, gender identity, ID review, and private safety notes.

## 4. Priority Fix Table

| Priority | Screen | Issue | Why it matters | Suggested fix | Estimated effort |
| --- | --- | --- | --- | --- | --- |
| P1 | Mobile navigation / Updates | User feedback indicates Updates should be Create; screenshots show duplicate menu/sidebar affordance. | Main beta action may be hidden, and duplicate menu controls reduce trust. | Make Create the primary mobile nav action if confirmed; remove duplicate menu control on Updates. | Medium |
| P1 | Homepage / beta landing | "Money lock", "protected payments", and "payment-authorized" sound live/payment-heavy. | Can imply payment custody before legal/payment readiness. | Replace with "seat commitment", "max-charge approval", or "mock/test payment state" where relevant. | Small |
| P1 | Create Pod | Too many concepts in one path. | Testers may abandon before understanding value. | Reduce visible helper text per step; make one primary next action dominant. | Medium |
| P1 | Guest quote acceptance | Test card and mock accept paths appear together. | Users may not know which acceptance path to use. | Show one acceptance path per scenario: mock beta or Stripe test mode. | Medium |
| P1 | Settlement / Host Dashboard | "Payout marked complete" and similar copy can imply real payout. | Live-money confusion is a trust/legal risk. | Replace with "Settlement closed in demo state" or "Payout status closed". | Small |
| P1 | Taxi Partner completion | "Driver payout amount" appears in a taxi partner flow. | Conflicts with "Do not call taxi partners RidePod drivers" positioning. | Rename to "Taxi partner payout amount". | Small |
| P1 | Admin Review | Too many admin/payment/payout actions in one modal. | Increases risk of wrong demo action and reviewer confusion. | Group actions by Proof, Dispute, Payment simulation, Payout demo. | Medium |
| P2 | How RidePod Works | Long FAQ mixes user education and legal-risk content. | Mobile users may not find the key answer. | Add a short "Start here" summary or split advanced FAQ later. | Medium |
| P2 | Taxi meter | Fare cap / above-cap result is not instantly obvious. | Users need to trust meter mode before joining. | Add "You cannot be charged above approved max unless you approve more." | Small |
| P2 | Public profile | Verified badges could be over-trusted. | Verification should not imply safety guarantee. | Test comprehension; add "badges do not guarantee safety" only if needed. | Small |

## 5. Risky Wording Table

Static search covered `src` and `docs` for high-risk terms. Most exact risky phrases now appear only in docs as "avoid" lists or QA checklists, not active app copy.

| File / screen | Current wording | Risk | Suggested replacement | Priority |
| --- | --- | --- | --- | --- |
| `src/components/landing-page.tsx` / Homepage | "money lock" | Can sound like escrow or live payment custody. | "seat commitment" or "max-charge approval" | P1 |
| `src/components/ridepod-info-pages.tsx` / How it works | "Protected payments" | Can imply live money protection. | "Max-charge approval" for beta copy | P1 |
| `src/components/ridepod-info-pages.tsx` / FAQ | "payment-authorized" | Can imply real authorization in closed beta. | "accepted in mock/test payment state" where beta-specific | P2 |
| `src/components/create-pod-choose-type.tsx` / Create review | "Payout is released after ride completion and dispute window review." | Sounds like live payout behavior. | "In a future live version, payout would be reviewed after completion and the dispute window." | P1 |
| `src/components/ui.tsx` / Host Dashboard status | "Settlement complete. Payout marked complete." | Can imply real payout completed. | "Settlement closed in app state." | P1 |
| `src/components/ui.tsx` / recurring overview | "Payout after dispute window in this future beta prototype." | Missing "no real payout" caveat. | "No real payout yet; payout status follows dispute window in demo." | P1 |
| `src/components/taxi-partner-completion-card.tsx` / Completion modal | "Driver payout amount" | Uses driver wording in Taxi Partner flow. | "Taxi partner payout amount" | P1 |
| `src/components/settlement-page.tsx` / Settlement | "Host reimbursement is based on verified..." | Accurate, but may imply real reimbursement is enabled. | "Future host reimbursement is based on verified..." or add beta no-live-money note. | P2 |
| `src/components/money-safety-ui.tsx` / Proof certification | "quote screenshot is real, accurate, unaltered" | "Real" is okay but legal-heavy; could invite adversarial proof framing. | "accurate, unaltered, and belongs to this ride" | P2 |
| `src/app/(app)/notifications/notifications-client.tsx` / Updates fallback | "Supabase updates are unavailable; using mock ride notifications." | Developer-like copy for testers. | "Demo notifications are being shown." | P2 |
| Docs avoid lists | "RidePod driver", "guaranteed payout", "escrow", "fraud confirmed", etc. | Present as forbidden examples, not active UI risk. | Keep in docs as avoid-list context. | P3 |
| `docs/ridepod-taxi-partner-quote-go-no-go-roadmap.md` | "host fake screenshot problem" | Internal doc wording is blunt. | "unverified host screenshot risk" | P3 |

No active app copy found for these exact high-risk phrases in the static scan: "RidePod driver", "guaranteed driver", "guaranteed payout", "official taxi dispatch", "real payout sent", "real payment captured", "escrow", "100% safe", "100% verified", "female driver guaranteed", "forever banned", "upload HKID", "upload passport", "selfie verification", "face scan".

## 6. CTA Audit Table

| Screen | Current CTA | Issue | Suggested CTA | Priority |
| --- | --- | --- | --- | --- |
| Homepage | Find a Ride Pod | Clear, but create may be more important in beta. | Keep, pair with Create as equal primary. | P3 |
| Mobile navigation | Updates | User expects Create; Updates is less central. | Create | P1 |
| Create Pod | Create Pod / Continue style actions | Too many helper concepts around CTA. | Keep CTA but reduce surrounding copy. | P1 |
| Ride option selection | Select Taxi Partner Quote | Clear, but demo action must stay framed. | Select Taxi Partner Quote beta | P2 |
| Taxi Partner Quote organizer | Request quote | May imply real partner contact. | Request demo quote or Request quote in demo | P1 |
| Taxi Partner Quote organizer | Simulate quote | Clear for demo mode. | Keep hidden outside demo mode. | P2 |
| Guest quote acceptance | Accept quote with test card | Good for PAY test, too technical for regular beta. | Confirm test payment in payment test scenario only. | P1 |
| Guest quote acceptance | Accept quote | Competes with test-card CTA. | Show only one acceptance path per scenario. | P1 |
| Taxi Partner Dashboard | Quote this pod | Clear. | Keep. | P3 |
| Taxi Partner Dashboard | Accept job | Clear and demo guarded. | Keep. | P3 |
| Taxi Partner Dashboard | Mark arrived / Start ride | Clear. | Keep. | P3 |
| Taxi Partner Dashboard | Mark completed | Clear. | Keep. | P3 |
| Settlement | Upload final receipt | Clear. | Keep. | P3 |
| Settlement | Edit | Could be risky if users can alter fare freely in demo. | Edit demo fare or Adjust amount | P2 |
| Admin Review | Release payout | Can sound live depending context. | Mark payout ready in demo | P1 |
| Admin Review | Capture test payment | Clear test-mode language. | Keep. | P3 |
| Updates | Notification CTAs | Generally clear. | Keep; fix nav priority. | P2 |
| Public member preview | Report concern | Clear. | Keep. | P3 |

## 7. Mock vs Real Clarity Table

| Screen | Is mock/demo clear? | Risk | Suggested improvement |
| --- | --- | --- | --- |
| Homepage / landing | Partly | Money protection copy can sound live. | Add beta-safe payment line or reduce payment claims. |
| Beta page | Yes | None major. | Keep footer: real payments/payouts not enabled unless stated. |
| Beta scenarios | Yes | Route names are technical. | Keep internal. |
| Create Pod | Mostly | Taxi Partner Quote is clear; general payment/booking terms can sound live. | Review money copy in final step. |
| Ride app / fixed quote | Partly | Host reimbursement can sound live. | Add no-live-payment note in beta/demo mode. |
| Taxi meter | Partly | Fare cap/max charge needs more clarity. | Add short cap rule. |
| Taxi Partner Quote organizer | Yes | "Request quote" may imply real provider. | Label demo request if no integration exists. |
| Guest quote acceptance | Mostly | Mock/test payment states are technical. | Show one payment mode at a time. |
| Host Dashboard / My Pods | Partly | Payout complete wording can sound live. | Replace "payout marked complete." |
| Taxi Partner Dashboard | Yes | Many demo actions can overwhelm. | Keep demo banner sticky or repeated per section if needed. |
| Pickup coordination | Yes | "I'm here" visibility not clear. | Add local/demo helper. |
| Completion / payout pending | Mostly | One driver/payout label conflict. | Use Taxi partner payout and no-real-payout wording. |
| Settlement | Partly | Reimbursement/payout/settlement can sound real. | Add beta no-live-money callout. |
| Admin Review | Mostly | Internal actions can look production-like. | Add internal/demo-only banner to modal sections. |
| Updates | Partly | Mock fallback note is developer-like. | Use tester-friendly demo copy. |
| Public member preview | Yes | Verification may be over-trusted. | Keep privacy copy; test comprehension. |
| Report concern | Yes | Evidence upload coming later means limited live support. | For beta, keep emergency disclaimer prominent. |

