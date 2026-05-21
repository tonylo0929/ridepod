# RidePod Stripe Test Mode PaymentIntent POC

## Scope

PAY-2 added a test-mode-only PaymentIntent creation proof of concept for Taxi Partner Quote guest acceptance.

PAY-3 adds Stripe Elements / Payment Element test card confirmation for that PaymentIntent.

This is not production payment. It does not enable live payments, Stripe Connect, taxi partner payout, wallet balances, or live capture.

## Safety Guard

The server-side POC is disabled unless all conditions are true:

```text
RIDEPOD_ENABLE_STRIPE_TEST_MODE=true
STRIPE_SECRET_KEY starts with sk_test_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with pk_test_
```

If the flag is missing, the API returns:

"Stripe test mode is not enabled."

If keys are missing or live keys are detected, the API returns:

"Stripe test keys are not configured."

The browser never receives `STRIPE_SECRET_KEY`.

## Client Gate

The Taxi Partner Quote guest acceptance screen renders Stripe Elements only when the server-rendered page confirms:

```text
RIDEPOD_ENABLE_STRIPE_TEST_MODE=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with pk_test_
```

If Stripe test mode is not configured, the UI keeps the existing mock payment state path.

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

Do not log, persist, or place the PaymentIntent `clientSecret` in a URL.

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

The Taxi Partner Quote guest acceptance card shows a Stripe test mode panel.

Button:

"Accept quote with test card"

Expected behavior:
- calls the test-mode API route
- creates a PaymentIntent if test mode is configured
- renders Stripe Payment Element with the returned client secret
- lets the guest confirm with Stripe test card details
- updates local/mock payment state after confirmation
- marks the guest acceptance as accepted after successful test confirmation
- does not create payout
- does not use live money

If test mode is disabled, the existing mock quote acceptance still works.

## Payment Element

PAY-3 renders Stripe Payment Element inside the guest acceptance card.

Copy:

"Use Stripe test mode to confirm this quote acceptance. No live money is charged."

CTA:

"Confirm test payment"

Loading:

"Confirming..."

Error:

"Couldn’t confirm test payment. Try again."

Success:

"Test payment confirmed"

Subcopy:

"No live money was charged."

## Test Card

The demo may show:

"Test card: 4242 4242 4242 4242"

Use Stripe test card details only.

## Manual Capture Status

PAY-2 creates PaymentIntents with `capture_method: manual` by default.

After confirmation, Stripe may return:

`requires_capture`

RidePod should show:

"Test authorization complete"

Subcopy:

"Capture is not implemented in this slice."

Payment state:

`TEST_REQUIRES_CAPTURE`

If Stripe returns:

`succeeded`

RidePod should show:

"Test payment confirmed"

Payment state:

`TEST_SUCCEEDED`

Capture/release is PAY-4.

## Limitations

- Test mode only.
- No live payment.
- No Stripe Connect.
- No real payout.
- No production keys.
- No production card storage.
- No payment persistence table yet.
- PaymentIntent state is shown in the demo UI and can be stored in mock/local state only.
- Manual capture is requested, but PAY-3 does not implement capture.

TODO:

Persist PaymentIntent state in PAY-4 or later after payment state shape is finalized.

## Next Step

PAY-4 should add admin capture/cancel/refund simulation and decide where PaymentIntent state should persist.

