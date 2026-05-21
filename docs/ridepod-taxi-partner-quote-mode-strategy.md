# RidePod Taxi Partner Quote Mode Strategy

This document defines Taxi Partner Quote Mode as a future beta prototype direction for RidePod. It is strategy and beta planning only. It does not enable live taxi dispatch, live payment collection, live payout sending, taxi APIs, GPS, OCR, AI receipt detection, or partner onboarding.

## 1. Positioning

RidePod has three ride modes:

| Mode | Meaning | Proof | Status |
| --- | --- | --- | --- |
| Ride app / fixed quote | Host/organizer books through an app or provider that shows fare before booking. | Fresh quote before booking. Final receipt after ride. | Current beta / proof-based mode. |
| Taxi meter | Host/organizer takes a real street taxi with a meter. | No upfront quote. Meter proof or taxi receipt after ride. | Current beta / meter-proof mode. |
| Taxi partner quote | Licensed taxi partner quotes one shared pod price. | Partner quote before guests accept. Completion plus dispute window before payout. | Future beta prototype / no real dispatch or payout yet. |

RidePod does not provide drivers. Taxi partners are external licensed providers. Do not describe taxi partners as RidePod-operated drivers or imply that RidePod is already operating a live taxi dispatch network.

## 2. Taxi Partner Quote Flow

1. Organizer creates shared taxi pod.
2. Guests join and lock.
3. Organizer selects taxi type.
4. Organizer adds luggage/accessibility needs.
5. Taxi partner submits quote.
6. Guests accept quote.
7. Mock payment state is recorded.
8. Taxi partner ride is marked completed.
9. Dispute window opens.
10. Payout becomes pending.
11. Admin review handles issues.
12. No issue means payout ready in a future/live version.

Beta limitation: Taxi Partner Quote Mode is demo/mock only for now. It does not dispatch real taxis, charge real payments, or send real payouts.

## 3. Money Model

Definitions:

```text
driverQuoteCents = quote amount
guestCount = locked/accepted guest count
fareShareCents = ceil(driverQuoteCents / guestCount)
platformFeeCents = max(ceil(fareShareCents * 10%), HK$6)
guestChargeCents = fareShareCents + platformFeeCents
driverPayoutCents = driverQuoteCents
```

Example:

| Item | Amount |
| --- | ---: |
| Quote | HK$240 |
| Guests | 4 |
| Fare share | HK$60 |
| Platform fee | HK$6 |
| Guest pays | HK$66 |
| RidePod earns | HK$24 |
| Taxi partner payout | HK$240 |

No real payment or payout is enabled in beta unless explicitly stated.

## 4. Taxi Type Options

- Standard taxi.
- Electric taxi.
- Luggage-friendly taxi.
- Large taxi / van.
- Comfort taxi.
- Accessible taxi.

Accessibility or special vehicle requests are available only if supported by the taxi partner.

## 5. Safety And Access Modes

Supported pod access modes:

- Women-only.
- Verified-only.
- Community-only.
- High-trust-only.
- Invite-only.

Women-only controls who can join the shared pod. It does not guarantee a female taxi driver unless supported by the taxi partner.

## 6. Regulatory And Legal Caution

Taxi Partner Quote Mode should use licensed taxi partners/fleets first. Legal, licensing, insurance, safety, privacy, and payment/payout review are required before live operation. This strategy does not assert that any jurisdiction is already approved for live operation.

## 7. Operational Risks

- Taxi partner quotes too high.
- Guests decline quote.
- Taxi partner no-show.
- Pickup issue.
- Guest dispute after completion.
- Payout held during review.
- Accessibility request not supported.
- Safety report.
- Regulatory/licensing review needed.

Manual review should stay available for above-cap quotes, completion disputes, pickup issues, safety concerns, payout holds, and guest disputes.

## 8. What Not To Promise

Avoid promising:

- RidePod-operated drivers.
- Driver availability guarantees.
- Payout guarantees.
- Live taxi dispatch claims.
- Female taxi driver availability.
- Live taxi dispatch before partnerships are ready.
- Live payout before payment/payout review is complete.
- Absolute safety.
- Custodial funds handling unless reviewed and approved.

Use safer language:

- Taxi partner quote.
- Licensed taxi partner.
- External taxi provider.
- Shared pod quote.
- Guests accept the quote.
- Mock payment state.
- Payout pending.
- Dispute window.
- Manual review.
- Future beta prototype.
- No real dispatch yet.
- No real payout yet.

## 9. Founder Recommendation

Recommendation: keep current closed beta flows, but treat Taxi Partner Quote Mode as the future main business direction to test with licensed taxi partners.
