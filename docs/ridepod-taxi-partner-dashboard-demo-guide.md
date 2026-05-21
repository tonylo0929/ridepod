# Taxi Partner Dashboard Demo Guide

## 1. What This Dashboard Is

The Taxi Partner Dashboard is a demo view showing how a licensed taxi partner could receive shared pod quote requests, submit a quote, accept an assigned job, coordinate pickup, mark the ride completed, and view payout status.

This is not live taxi dispatch. It does not contact real taxis, charge riders, or send payouts.

Audience:
- founder
- demo moderator
- taxi partner tester
- admin reviewer
- future operator

The purpose of the demo is to test whether the partner quote, accept job, pickup coordination, completion, and payout pending workflow makes sense before RidePod invests in live partner operations.

## 2. What This Dashboard Is Not

- not real taxi dispatch
- not a real driver app
- not real taxi partner onboarding
- not real payment collection
- not real payout transfer
- not GPS tracking
- not legal/compliance approval
- not proof that a taxi partner is verified
- not official taxi fleet integration

RidePod does not provide drivers. Taxi partners are external licensed providers.

## 3. Demo Flow Overview

1. Organizer creates shared taxi pod.
2. Guests join and lock.
3. Organizer selects Taxi partner quote.
4. Organizer requests taxi partner quote.
5. Taxi partner dashboard shows incoming request.
6. Taxi partner submits quote.
7. Organizer and guests see quote.
8. Guests accept quote in mock payment state.
9. Taxi partner sees job ready.
10. Taxi partner accepts job.
11. Pickup coordination placeholder appears.
12. Taxi partner marks arrived.
13. Taxi partner starts ride.
14. Taxi partner marks ride completed.
15. Dispute window opens.
16. Payout becomes pending.
17. Admin can review disputes / payout holds in demo.

## 4. Page / Route

Preferred route:

`/taxi-partner`

If demo mode is disabled, the page may show:

“Taxi Partner Dashboard is not enabled.”

## 5. Partner Profile Mock

Partner name:

“Demo Taxi Partner”

Partner type:

“Licensed taxi partner”

Vehicle options:
- Standard
- Electric
- Luggage-friendly
- Large
- Accessible

This profile is mock data. Do not collect real license, plate, ID, bank, or personal driver details in this demo.

## 6. Incoming Pod Requests

Each incoming request card should show:
- route
- date/time
- guest count
- luggage count
- taxi type requested
- accessibility request if any
- safety mode badges
- fare cap / estimate if available
- request status

Demo request examples:
- USC Village → LAX Terminal 3
- Tsim Sha Tsui → Causeway Bay
- Central → Airport

Demo talking point:

“Taxi partners can quickly understand the group request without seeing unnecessary private rider data.”

## 7. Submit Quote Demo

Quote form fields:
- Quote amount
- Taxi type
- Quote expires in
- Partner note optional

Validation:
- quote amount required
- amount must be greater than 0
- taxi type required
- expiry required

Demo talking point:

“The partner quotes one shared pod price. Riders then accept the quote before the ride proceeds.”

No real taxi dispatch, API call, payment, or assignment happens when the demo quote is submitted.

## 8. Money Breakdown

Demo formula:

```text
driverQuoteCents = taxi partner quote

guestCount = accepted guest count

fareShareCents = ceil(driverQuoteCents / guestCount)

platformFeeCents = max(
  ceil(fareShareCents * 10%),
  HK$6
)

guestChargeCents = fareShareCents + platformFeeCents

platformFeeTotalCents = platformFeeCents * guestCount

taxiPartnerPayoutCents = driverQuoteCents
```

Example:
- Taxi partner quote: HK$240
- Guests: 4
- Fare share: HK$60
- Platform fee: HK$6 per guest
- Guest total: HK$66
- RidePod platform fee total: HK$24
- Taxi partner payout: HK$240

No real payment or payout happens in this demo.

## 9. Accept Job Demo

After all guests accept quote, the partner sees:

“Job ready”

CTA:

“Accept job”

The accept job modal explains demo assignment, requires a checkbox, and does not trigger real taxi dispatch.

After accept:
- status becomes Ready for pickup
- pickup coordination appears

Demo talking point:

“The partner accepts the shared taxi job only after guests accept the quote.”

## 10. Pickup Coordination Demo

The pickup placeholder can show:
- pickup point
- dropoff point
- pickup time
- guest count
- taxi type
- luggage/accessibility notes

Actions:
- Mark arrived
- Start ride
- Contact organizer placeholder

Important:

No live GPS is enabled. No live location permission is requested.

Future plan:
- taxi partner location
- rider pickup progress
- multi-stop pickup visibility
- live ETA

## 11. Complete Ride + Payout Pending Demo

Taxi partner can mark ride completed in demo mode.

Completion modal:
- requires checkbox
- starts dispute window
- no real payout is sent

After complete:
- status becomes Payout pending
- dispute window opens
- admin review can hold payout if issue is reported

Demo talking point:

“Taxi partner does not instantly get money just by clicking complete. Payout waits for dispute window/manual review.”

## 12. Payout Status States

Payout pending:

“Payout releases after the dispute window if no issue is reported.”

Payout held:

“Payout is held while RidePod reviews the case.”

Payout ready:

“Review is complete. Payout can be processed in demo mode.”

Payout denied:

“Payout was denied during demo review.”

Closed:

“Payout was marked released in demo mode.”

These are demo status labels only. No real money moves.

## 13. Privacy / Safety Rules

Partner dashboard must not show:
- guest phone numbers
- guest emails
- gender identity
- private profile data
- full safety report text
- admin-only notes
- payment/card details

Allowed:
- route summary
- ride time
- guest count
- accepted count
- luggage/accessibility summary
- issue status
- payout status

## 14. What To Say During Demo

“This dashboard shows how a licensed taxi partner could quote and manage a shared RidePod request. It is not live dispatch. The goal is to test whether the partner workflow makes sense: quote, accept job, coordinate pickup, complete ride, and wait for payout review.”

“RidePod is grouping riders and managing the shared quote/payment logic. Taxi partners remain external providers.”

## 15. Questions To Ask Taxi Partner Testers

- Is the incoming request clear enough to quote?
- What information do you need before quoting?
- Is luggage/accessibility information enough?
- Would you prefer fixed quote or meter-based fare?
- Is the guest acceptance step clear?
- Is the payout pending / dispute window fair?
- What would make this operationally easier?
- Would you accept recurring ride requests?
- What taxi types can you actually support?
- What information should RidePod hide from partners?

## 16. Open Product Questions

- fleet partner vs individual licensed taxi driver
- quote expiry length
- driver cancellation rule
- guest no-show rule
- dispute window length
- payout release timing
- whether guests can see taxi partner profile
- whether taxi partner can see rider names
- how to support accessibility requests
- how to handle luggage mismatch
- whether female driver request can ever be supported
- legal/regulatory requirements
- payment/payout provider choice

## 17. What Not To Promise

- real taxi dispatch
- guaranteed driver
- guaranteed payout
- official taxi integration
- female driver guarantee
- live GPS
- real payment capture
- real payout
- full legal approval
- 100% safety

