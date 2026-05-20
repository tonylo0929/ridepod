# RidePod Taxi Partner Quote Mode Strategy

This document outlines a future Taxi Partner Quote Mode for RidePod. It is strategy only. It does not implement taxi APIs, driver onboarding, payments, payouts, OCR, AI detection, or dispatch.

## 1. Product Positioning

RidePod groups compatible riders first, then helps them request a quote from licensed taxi partners and split the ride fairly.

RidePod does not provide drivers. Taxi partners are external licensed providers.

Positioning principles:

- Use "licensed taxi partner", "taxi partner", "taxi driver", or "external taxi provider".
- Do not call taxi partners "RidePod drivers".
- RidePod groups compatible riders and coordinates payment/protection.
- RidePod should not promise guaranteed safety, guaranteed refund, guaranteed payout, or official taxi dispatch unless partnerships and legal review confirm it.

## 2. Why This Mode Matters

Taxi Partner Quote Mode can reduce the weak points in the current host-proof model:

- Host fake screenshot risk: a licensed taxi partner submits the quote instead of the host uploading a screenshot.
- Host paying first: the organizer does not need to front the full fare.
- Rider refusing final payment: guests accept or authorize the quote before final assignment.
- Messy proof review: the quote and completion signal come from the taxi partner path, with manual review for exceptions.
- Off-app leakage: riders and organizer have a safer in-app path for quote, acceptance, and settlement state.
- Difficulty coordinating shared taxi rides: RidePod can collect schedule, route, safety mode, luggage, accessibility, and taxi type before quote.

## 3. Core User Roles

| Role | Definition | Responsibilities |
| --- | --- | --- |
| Organizer | Person who starts the shared taxi pod. | Chooses route, time, safety mode, taxi type, luggage needs, and accessibility needs. |
| Guest | Rider who joins the pod. | Joins pod, reviews quote/max, accepts or authorizes before assignment. |
| Taxi partner / driver | Licensed external provider or fleet participant. | Views eligible pod requests, submits fixed quote, completes ride, receives payout after clear window. |
| Admin reviewer | RidePod operator handling exceptions. | Reviews disputes, abnormal quotes, completion issues, safety concerns, and payout holds. |
| RidePod | Coordination and protection layer. | Groups compatible riders, compares quote against baseline/cap, manages acceptance state, dispute window, and payout status. |

## 4. Taxi Partner Quote Flow

1. Organizer creates shared taxi pod.
2. Guests join.
3. Organizer selects taxi type.
4. Organizer sets luggage/accessibility needs.
5. Organizer sets safety/access mode.
6. Pod reaches minimum guests.
7. Taxi partner submits quote.
8. RidePod compares quote with taxi baseline / fare cap.
9. Guests accept or are charged/authorized based on quote.
10. Driver accepts final assignment.
11. Ride happens.
12. Driver marks complete.
13. Guests get short dispute window.
14. No issue = payout released.
15. Dispute = manual review.

## 5. Taxi Type Options

MVP options:

- Standard taxi.
- Electric taxi.
- Luggage-friendly taxi.
- Large taxi / van.
- Comfort taxi.
- Accessible taxi.

Accessibility options:

- Wheelchair-accessible if partner supports it.
- Step-free support if partner supports it.
- Extra space needed.

These should be treated as request/matching fields unless the taxi partner has confirmed availability.

## 6. Safety / Rider Selection

Supported pod access modes:

- Women-only.
- Mixed pod.
- Verified-only.
- Community-only.
- High-trust-only.
- Invite-only.

Women-only controls who joins the pod. Do not promise a female taxi driver unless the taxi partner supports it.

Recommended copy:

"Women-only pod means only eligible women can join this shared pod."

Optional future copy:

"Female driver requested - available only if supported by taxi partner."

## 7. Luggage And Accessibility

Required fields:

- Luggage count per guest.
- Large luggage yes/no.
- Wheelchair / accessibility request.
- Extra space needed.
- Child seat future optional.

These fields help match the correct taxi type and reduce failed pickups. They should also be included in the quote request visible to taxi partners.

## 8. Money Flow

Definitions:

- `driverQuoteCents`: fixed quote from taxi partner.
- `guestCount`: number of paying guests/riders for the quote.
- `fareShareCents = driverQuoteCents / guestCount`.
- `platformFee = max(10% of fareShare, HK$6)`.
- `guestCharge = fareShare + platformFee`.
- `driverPayout = driverQuoteCents`.

Payout timing:

1. Driver completes ride.
2. Short dispute window starts.
3. If no issue or admin clears the ride, payout is released.
4. If dispute is opened, payout is held for manual review.

Driver payout should not release immediately after driver clicks complete.

## 9. Quote Rules

If taxi quote is within RidePod fare cap:

- Guests can accept/authorize.
- Ride can proceed.

If taxi quote is above fare cap:

- Guests must approve higher max.
- Or organizer requests another quote.

If quote is abnormal:

- Show warning.
- Route to manual review if needed.
- Do not silently proceed.

## 10. Completion And Dispute Rules

Driver complete:

- Marks ride completed.
- Starts dispute window.

Guest dispute reasons:

- Wrong pickup.
- No ride happened.
- Wrong route.
- Unsafe behavior.
- Fare mismatch.
- Driver no-show.

Admin can:

- Hold payout.
- Request more info.
- Release payout.
- Deny payout.
- Refund/release guest in future payment mode.

Do not implement real payment/refund in this strategy doc.

## 11. Regulatory / Legal Caution

- Use licensed taxi partners/fleets first.
- Avoid random private drivers.
- Do not call taxi partners RidePod drivers.
- Legal/compliance review is required before live taxi partner operations.
- Payment/payout compliance review is required before real driver payout.
- Accessibility and female-driver requests must be framed as partner-supported availability, not guaranteed service.

## 12. Relationship To Current Modes

| Mode | Description | Status |
| --- | --- | --- |
| A. Ride app / fixed quote | Host/organizer books externally; proof-based settlement. | Current MVP/beta. |
| B. Street taxi meter | Group takes real street taxi; meter proof after ride. | Current MVP/beta. |
| C. Taxi Partner Quote | Licensed taxi partner quotes and completes ride; RidePod handles split/payout status. | Future main strategy / phase 2. |

## 13. What Not To Build Yet

Do not build yet:

- Real taxi partner onboarding.
- Real driver app.
- Real payouts.
- Real Stripe Connect.
- Official taxi dispatch integration.
- Ride-hailing API integrations.
- Live GPS.
- Real accessibility guarantee.
- Real female-driver guarantee.
- Automated fraud decisioning.

## 14. Phase Roadmap

| Phase | Focus |
| --- | --- |
| Phase 1 | Closed beta current model. |
| Phase 2 | Taxi Partner Quote mock flow. |
| Phase 3 | Taxi partner/fleet pilot with manual ops. |
| Phase 4 | Real payment/payout in test mode. |
| Phase 5 | Partner integrations and live pickup/GPS. |

## 15. Open Questions

- Do we partner with fleet first or individual licensed taxi drivers?
- Do guests pay before quote or after quote?
- How long is dispute window?
- How do we handle driver cancellation?
- What is platform fee?
- What legal permissions are needed?
- What insurance/terms are needed?
- Which taxi types are actually available?
- Can partner support female driver request?
- Can partner support wheelchair-accessible taxi?

## 16. Founder Decision

Recommendation: keep current MVP for closed beta, but make Taxi Partner Quote Mode the future main product direction.
