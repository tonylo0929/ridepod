# RidePod Stripe Test Mode PaymentIntent POC

## Scope

PAY-2 added a test-mode-only PaymentIntent creation proof of concept for Taxi Partner Quote guest acceptance.

PAY-3 adds Stripe Elements / Payment Element test card confirmation for that PaymentIntent.

PAY-4 adds admin-side capture, cancel, refund, hold, and payout-ready simulation for test/demo state.

PAY-5 adds payment event persistence and a lightweight audit trail for test/demo payment actions.

PAY-6 adds a structured evidence package generator for payment dispute review, chargeback review, and internal admin review.

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

## PAY-4 Admin Payment Simulation

PAY-4 adds a `Payment simulation` card to Admin Review for Taxi Partner Quote cases.

The card can show:

- ride instance
- payment purpose
- guest payment amount
- optional PaymentIntent ID
- Stripe test status
- RidePod payment state
- dispute window status
- payout status
- admin review state

Admin warning copy:

"Admin payment simulation is demo-only. Test mode only. No live money moves."

## PAY-4 API

Endpoints:

```text
POST /api/payments/capture-test-payment-intent
POST /api/payments/cancel-test-payment-intent
```

Input:

- paymentIntentId
- rideInstanceId optional
- reason optional

Both endpoints require:

- `RIDEPOD_ENABLE_STRIPE_TEST_MODE=true`
- `STRIPE_SECRET_KEY` starts with `sk_test_`
- a PaymentIntent ID beginning with `pi_`

Both endpoints retrieve the PaymentIntent server-side and reject it if Stripe reports `livemode: true`.

The browser does not receive `STRIPE_SECRET_KEY`.

## PAY-4 Admin Actions

Capture test payment:

- calls the test capture endpoint when a test PaymentIntent ID is available and Stripe test mode is enabled
- otherwise updates mock state to `TEST_CAPTURED`
- success copy: "Test payment captured."

Cancel test authorization:

- calls the test cancel endpoint when a test PaymentIntent ID is available and Stripe test mode is enabled
- otherwise updates mock state to `TEST_CANCELED`
- success copy: "Test authorization canceled."

Simulate refund:

- mock/local state only in PAY-4
- state: `TEST_REFUND_SIMULATED`
- success copy: "Refund simulated."

Hold payment:

- state: `HELD_FOR_REVIEW`
- taxi partner payout state can also move to held in demo review
- success copy: "Payment held for review."

Mark payout ready:

- state: `CLEARED_FOR_PAYOUT`
- taxi partner payout state can move to ready in demo review
- success copy: "Payout marked ready in demo mode."

No action sends payout or creates Stripe Connect transfers.

## PAY-4 Limitations

- Automatic capture is not implemented.
- Refund is simulated only; no Stripe refund API call is made in this slice.
- Payment events are not persisted to a ledger yet.
- A real admin permission model is still required before production.
- Payout release remains demo state only.

TODO:

Persist payment events in PAY-5.

## PAY-5 Payment Event Audit Trail

PAY-5 adds a lightweight `payment_events` table and server helper for test/demo payment history.

Purpose:

- show what payment action happened
- show when it happened
- show who triggered it
- link the event to a ride instance, pod, user, and test PaymentIntent when available
- show amount and status changes

This is not a production ledger, wallet, Stripe Connect payout system, or accounting source of truth.

## PAY-5 payment_events Table

Fields include:

- ride_instance_id
- pod_id
- user_id
- actor_role
- event_type
- payment_provider
- stripe_payment_intent_id
- amount_cents
- currency
- previous_status
- new_status
- event_payload
- created_at

RLS:

- admin can read payment events
- host can read events for hosted pods or ride instances
- guest can read own payment events
- inserts are admin-only

Writes should happen through server-side helpers or safe API routes. Normal users should not insert arbitrary payment events from the browser.

## PAY-5 Sanitization

`sanitizePaymentEventPayload` removes unsafe fields before storage:

- client_secret
- clientSecret
- secret
- stripeSecretKey
- STRIPE_SECRET_KEY
- cardNumber
- cvc
- cvv

Do not store raw Stripe objects, card data, secret keys, or PaymentIntent client secrets.

## PAY-5 Event Types

Supported event types:

- TEST_PAYMENT_INTENT_CREATED
- TEST_PAYMENT_CONFIRMED
- TEST_REQUIRES_CAPTURE
- TEST_CAPTURED
- TEST_CANCELED
- TEST_REFUND_SIMULATED
- PAYMENT_HELD_FOR_REVIEW
- PAYOUT_MARKED_READY_DEMO
- PAYOUT_DENIED_DEMO
- PAYMENT_ACTION_FAILED
- PAYMENT_ACTION_SKIPPED
- MOCK_PAYMENT_ACCEPTED

Admin UI labels convert these into readable copy such as "Test payment captured" and "Refund simulated."

## PAY-5 Integration

Recorded events:

- PaymentIntent creation records `TEST_PAYMENT_INTENT_CREATED`
- test card confirmation records `TEST_PAYMENT_CONFIRMED` or `TEST_REQUIRES_CAPTURE`
- admin capture records `TEST_CAPTURED`
- admin cancel records `TEST_CANCELED`
- refund simulation records `TEST_REFUND_SIMULATED`
- hold payment records `PAYMENT_HELD_FOR_REVIEW`
- mark payout ready records `PAYOUT_MARKED_READY_DEMO`
- failures record `PAYMENT_ACTION_FAILED`

Audit writes should never break the payment flow. If Supabase is missing or the table is unavailable, the helper returns a mock event with a warning.

## PAY-5 Admin Display

Admin Review shows a compact "Payment event history" inside the Payment simulation card.

Rows show:

- timestamp
- event label
- amount
- status change
- actor

The UI does not show client secrets, secret keys, raw Stripe objects, or card data.

## PAY-6 Evidence Package

PAY-6 adds an internal evidence package generator for:

- Taxi Partner Quote disputes
- Ride app / fixed quote receipt disputes
- Taxi meter proof disputes
- future payment chargeback review
- admin payout review

The package is for manual review and future Stripe dispute evidence mapping. It does not submit anything to Stripe.

The evidence package includes:

- ride instance summary
- pod summary
- user acceptance summary
- money summary
- proof summary
- payment event summary
- dispute summary
- admin review summary
- chronological timeline
- evidence checklist
- missing evidence list
- recommended admin notes

The package helps answer:

- who accepted what
- what amount was shown
- what quote or max charge was approved
- what ride/proof/completion events exist
- what issue was reported
- what admin action was taken
- what test payment events happened

PAY-6 does not add:

- real Stripe dispute submission
- PDF export
- live payment handling
- payout handling
- card data storage

Sensitive fields are sanitized before display. Do not include client secrets, secret keys, raw Stripe objects, card numbers, CVC/CVV, private phone/email, gender identity, risk score, or private safety notes.

Future PAY-7 can map the evidence package to Stripe dispute evidence fields after legal/payment review.

## Limitations

- Test mode only.
- No live payment.
- No Stripe Connect.
- No real payout.
- No production keys.
- No production card storage.
- No payment persistence table yet.
- Payment event history is lightweight and test/demo oriented.
- Manual capture is requested; PAY-4 can capture a Stripe test-mode PaymentIntent from Admin Review when a test ID is provided.
- A production ledger is still required before live payment.

TODO:

Add production-grade payment ledger, reconciliation, and audit retention rules before live payment.

## Next Step

PAY-6 should cover dispute/chargeback evidence package and richer payment event review.
