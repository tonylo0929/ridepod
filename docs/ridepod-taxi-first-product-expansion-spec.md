# RidePod Taxi-First Product Expansion Spec

## 1. Product Direction

RidePod is a Taxi-first shared ride grouping app. Riders form a compatible shared taxi pod first, then licensed taxi partners submit quotes for the group.

RidePod does not provide drivers. Taxi partners are external licensed providers.

The current product direction is:

- Taxi as the main beta flow
- Ride app support coming soon
- Shared taxi pod grouping before quote request
- Licensed taxi partner quote before guest acceptance
- Mock/test payment states until live payment readiness is approved

## 2. Quote Board / Negotiation Model

Recommended MVP: do not build chat-style negotiation first. Use a quote board.

MVP flow:

1. RidePod shows a recommended baseline / target price.
2. Taxi partners submit fixed quotes.
3. Organizer sees quote board.
4. Organizer selects one quote.
5. Guests accept selected quote.
6. Taxi partner accepts final job.

Recommended baseline example:

- Baseline: HK$200
- Partner A quote: HK$190
- Partner B quote: HK$205
- Partner C quote: HK$180

MVP rules:

- Taxi partners see route, time, taxi type, luggage, guest count, and baseline/target.
- Taxi partners do not see competitor quotes in MVP.
- Organizer sees all submitted quotes.
- Guests see the selected quote.
- Guests accept the selected quote before the ride proceeds.
- Quote expires after a fixed time.
- If quote is above cap, guests must approve the higher amount.
- If a guest declines, organizer can request another quote.

Do not implement free-form negotiation chat in MVP.

Optional later:

- Organizer target price
- One-click counteroffer
- Request new quote
- Auto-accept if quote is below rider max

## 3. Estimated Savings Display

Use the label:

“Estimated saving”

Do not use:

“guaranteed discount”

Savings types:

| Type | Example | Suggested copy |
| --- | --- | --- |
| Quote vs baseline | Baseline HK$200, quote HK$190 | “5% below estimate” |
| Rider share vs solo taxi | Solo estimate HK$200, shared total HK$66 | “Estimated saving about 67% vs solo ride” |

Rules:

- Always use “estimated”.
- Show an info tooltip explaining the comparison.
- Hide savings if baseline is unavailable.
- Do not promise exact savings.

## 4. Luggage Capacity Matching

Each rider should report:

- Small bags
- Large suitcases
- Oversized items
- Wheelchair / accessibility needs
- Extra space needed

System summary should include:

- Total riders
- Total small bags
- Total large bags
- Oversized items
- Accessibility needs

Taxi type capacity should be configurable.

Example behavior:

- Standard taxi may fit 4 riders plus limited luggage.
- Luggage-friendly taxi should be suggested for airport bags.
- Large / van should be suggested when luggage is too high.
- Accessible taxi should be requested when wheelchair/accessibility need exists.

If luggage exceeds selected taxi type, show:

“This taxi type may not fit your group and luggage.”

CTA options:

- “Choose larger taxi”
- “Split pod”

Do not guarantee exact vehicle fit.

## 5. Taxi Partner Calendar / Expected Payout

Future partner dashboard calendar should show:

- Today’s jobs
- Upcoming jobs
- Quote requests
- Accepted jobs
- Completed rides
- Payout pending
- Payout held
- Payout ready

Use:

- “Expected payout”
- “Estimated earnings”

Do not use:

- “salary”

Calendar views:

- Today
- Week
- Upcoming
- Completed

Taxi partner availability settings:

- Available hours
- Service areas
- Taxi types supported
- Airport ride preference
- Luggage-friendly availability
- Accessibility support if available

## 6. Private Taxi Request

Future main choices:

1. Shared taxi pod
2. Private taxi request

Private taxi request:

- One rider
- No cost-sharing
- Full quote paid by rider
- Platform fee still applies
- Useful when matching fails or the user wants their own taxi

Copy:

- “Private taxi request”
- “Ride alone with one taxi partner quote.”

Do not call a solo ride a pod unless the app internally supports minimum guest = 1.

## 7. Airport Mode

Airport mode should support:

Trip type:

- To airport
- From airport
- Round trip

Fields:

- Flight number optional
- Airline optional
- Terminal
- Departure time
- Landing time
- Arrive by time
- Pickup after landing
- Luggage count per rider
- Large luggage
- Buffer time
- Pickup zone / meeting point

MVP:

- Flight number is manual metadata only.
- No flight API yet.

Future:

- Flight status API
- Landing delay detection
- Pickup time adjustment
- Notify riders and taxi partner
- Airport-specific pickup zones
- Terminal guidance

Copy:

“Flight status sync coming later.”

Do not imply live flight tracking in MVP.

## 8. Recommended New Create Flow

Recommended future Create flow:

1. Create taxi ride
2. Shared or private
3. Trip type:
   - Normal route
   - Airport trip
4. Route / time
5. Taxi type
6. Luggage / accessibility
7. Who can join
8. Price target / fare cap
9. Review pod
10. Request taxi quotes
11. Quote board
12. Select quote
13. Guests accept
14. Taxi partner accepts job

## 9. MVP vs Later

MVP / near-term:

- Quote board
- Selected quote acceptance
- Luggage declaration
- Capacity warning
- Airport mode manual fields

Later:

- Free-form negotiation
- Competitor quote visibility options
- Driver calendar
- Partner availability
- Private taxi request
- Flight API
- GPS pickup sharing
- Automatic quote matching

## 10. Risks

- Quote board too complex
- Too many guest approvals
- Luggage capacity inaccurate
- Airport flight data unreliable
- Partner overquotes
- Guests decline selected quote
- Private taxi request competes with taxi apps
- Driver calendar creates employment/salary confusion
- Legal/regulatory review needed
- Payment/payout ops needed

## 11. Recommended Build Order

Recommended next slices:

1. TAXI-15 — Quote board UI
2. TAXI-16 — Luggage capacity model
3. TAXI-17 — Airport mode UI
4. TAXI-18 — Partner calendar mock
5. TAXI-19 — Private taxi request mode

Do not build free-form negotiation before quote board works.
