# RidePod Stripe Test Mode PaymentIntent POC

## Scope

PAY-2 adds a test-mode-only PaymentIntent proof of concept for Taxi Partner Quote guest acceptance.

This is not production payment. It does not enable live payments, Stripe Connect, taxi partner payout, wallet balances, or live capture.

## Safety Guard

The POC is disabled unless all conditions are true:

```text
RIDEPOD_ENABLE_STRIPE_TEST_MODE=true
STRIPE_SECRET_KEY starts with sk_test_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with pk_test_
```

If the flag is missing, the API returns:

“Stripe test mode is not enabled.”

If keys are missing or live keys are detected, the API returns:

“Stripe test keys are not configured.”

The server never returns `STRIPE_SECRET_KEY` to the browser.

## API

Endpoint:

```text
POST /api/payments/create-test-payment-intent
```

Input:
- rideInstanceId
- quoteRequestId optional
- amountCents
- currency: hkd
- purpose: TAXI_PARTNER_QUOTE_ACCEPTANCE
- userId optional
- captureMode: manual or automatic

Output:
- paymentIntentId
- clientSecret
- amountCents
- currency
- status
- captureMethod
- livemode: false

If Stripe ever returns `livemode: true`, the request is rejected.

## Taxi Partner Quote Example

Taxi partner quote:

HK$240

Guests:

4

Fare share:

HK$60

Platform fee:

HK$6

Guest total:

HK$66

PaymentIntent amount:

6600 cents, currency `hkd`

Metadata:
- rideInstanceId
- quoteRequestId
- userId
- purpose = TAXI_PARTNER_QUOTE_ACCEPTANCE
- rideOption = TAXI_PARTNER_QUOTE
- paymentPurpose = TAXI_PARTNER_QUOTE_ACCEPTANCE
- demoMode = true
- captureMode = manual

## UI Behavior

The Taxi Partner Quote guest acceptance card shows a Stripe test mode POC panel.

Button:

“Create test payment”

Expected PAY-2 behavior:
- calls the test-mode API route
- creates a PaymentIntent if test mode is configured
- displays PaymentIntent id, status, and amount
- updates local/mock payment state
- does not collect card details
- does not confirm the card
- does not capture payment
- does not create payout

If test mode is disabled, the existing mock quote acceptance still works.

## Limitations

- Card confirmation / Stripe Elements is PAY-3.
- No Stripe Connect.
- No real payout.
- No production keys.
- No payment persistence table yet.
- PaymentIntent state is shown in the demo UI and can be stored in mock/local state only.
- Manual capture is requested, but PAY-2 does not implement capture.

TODO:

Add a `payment_intents` table or equivalent persistence in PAY-3 or PAY-4 after payment state shape is finalized.

## Next Step

PAY-3 should add Stripe Elements / test card confirmation so a guest can confirm the test PaymentIntent using Stripe test cards.
