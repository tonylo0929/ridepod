# FareEnough V2.3 — synthetic-persona retest after A1–A3 repairs

Retested **23 October 2026, Hong Kong time**. Actual rendered-browser automation with synthetic data; no real participants, interviews or human completion-time claims. The original [923e8b8 report](https://github.com/tonylo0929/ridepod/blob/923e8b8/docs/ux-review/SYNTHETIC-PERSONA-TEST.md) remains the historical before-fix review. The airport direction refinement from `5bf3847` is preserved.

**Final diagnostic result: 21 PASS / 0 FAIL / 2 WORKAROUND / 0 NOT TESTED across 23 checks.** All seven persona executions completed. A1, A2 and A3 now have hard regression assertions in addition to diagnostic observations; a recurrence fails the suite. The additional publication-expiry check increases the original 22 checks to 23.

The two workarounds remain UX hypotheses about family-count interpretation and describing recurring frequency. They were not repaired or relabelled as successes. Zero failed planned checks does not establish human comprehension or eliminate the untested assumptions below.

## Reviewed version and reproducibility

- Reviewed UI/check-out commit: [`8d98f34072c70b6700751f4d92447aa2e6bc915b`](https://github.com/tonylo0929/ridepod/commit/8d98f34072c70b6700751f4d92447aa2e6bc915b). Evidence/package commit follows the tested checkout.
- Source hash of the Windows preview/runtime/styles/avatar working files: `bb383f62a13d23aa38d205e8ba658dc09fa3732243a971e5d184489d06523a17`; UI source clean at capture. Other platforms may have different raw-byte hashes from line endings; the Git UI commit identifies the version.
- Node v24.14.0, Playwright 1.64.1, Chromium 156.0.8078.4; `zh-HK`, `Asia/Hong_Kong`, reduced motion, device scale 1 except native zoom tests described separately.
- Persona P1–P3/P5: 390 × 844; P4: 1440 × 1000; P6: separate 320 × 844 and 390 × 844 contexts. Each starts on the normal local `/v2-preview` homepage without a deep link or imported session.
- Browser clocks are fixed to **00:06 HKT**, anchored to the server's Hong Kong demo date. P3 explicitly derives the date from the visible form and advances the clock for expiry. No test depends on execution near midnight. Automation timestamps/durations are recorded by the test process; injected application clocks are labelled separately.
- Only synthetic fixtures and posts created through the demonstration interface. Network guard permits approved loopback GET/HEAD resources only. **Zero browser errors and zero blocked requests** in all seven executions. No production records, account sessions, authentication, database, bookings or payment services were exercised.

Detailed action responses, accessible snapshots, measurements and paths: [PERSONA-EVIDENCE.json](PERSONA-EVIDENCE.json). Broader deterministic/zoom tests: [REPAIR-REGRESSIONS.json](REPAIR-REGRESSIONS.json). Before/after explanation: [POST-PERSONA-REPAIRS.md](POST-PERSONA-REPAIRS.md). Current screen inventory and 20 captures: [UX-REPORT.md](UX-REPORT.md).

## Persona results

Durations are measured automation time from fixture navigation through screenshots/observations; they are **not human task times**. Entire final persona run including build/launch/teardown: 28.8 seconds.

| Persona | Actual browser actions and responses | Diagnostic outcome | Automation duration |
| --- | --- | --- | --- |
| P1 First-time airport traveller | `Tuen Mun` search → empty; clear; incorrect `CX9999` → empty; `cx 734` → one result; open visible Tuen Mun card; observe arrival 20:50 / exit 21:30 / car 21:50, 3 companion places and max 4; express interest; close and open 我的 → journey found with 1 interested person. | 2 PASS. English-place matching remains a Low-priority UX hypothesis, not a promised-language defect. | 704 ms |
| P2 Family and two large cases | Filters: at least 2 companion places, other poster at most 2 bags; apply. Create with identical airport endpoints → Cantonese error. Correct destination, select 1 advertised place, add 2 bags and two-existing-adult/one-new-companion intent in free text; preview and publish. Body retained the intent, structured summary said host 1 + companion 1 = max 2. | 1 PASS / 1 WORKAROUND. Medium hypothesis about interpreting existing companions versus newly sought places. Actual vehicle/luggage fit NOT TESTED. | 829 ms |
| P3 Late-night traveller | 準備飛啦！ → Sha Tin airport card; observe independent 21:50 departure / next-day 00:17 takeoff. Create outbound post; yesterday rejected with required Cantonese past-time message. Same-day 00:17 takeoff before 21:50 car rejected; changing only flight date to tomorrow works. Return, choose 00:00 under fixed 00:06 clock, clear flight → Step 1 rejects and retains 00:00. Correct to 00:07 → preview; edit title, advance clock to 00:07:00.001 → publication rejects and retains title. | 5 PASS, including hard A1 assertions at both stages. | 1,143 ms |
| P4 Daily commuter | 熱門路線 → 屯門 → 中環 → 定期同路 → one result. Incorrect `屯門去中環xyz` → empty; clear only search → result returns. Create recurring 08:00 post; weekday intent entered in optional body; publish. One structured date/time remains. | 1 PASS / 1 WORKAROUND. Medium hypothesis about recurring-frequency expectations. | 1,035 ms |
| P5 Trust-conscious passenger | Open Mandy's journey; organizer name click opens no profile. Interest 0 → 1 → 0, planned maximum stays 4. Meeting point, bags, wait and non-booking disclaimer shown. Express interest again; 訊息 opens shortlist with future-chat notice. | 2 PASS for observed UI status/explanation. Human trust/contact/safety expectations remain untested. | 691 ms |
| P6 Keyboard and 320px enlarged text | Tab to first card; Enter; six Tab/six Shift+Tab stay in dialog; Escape restores exact opener. Tab through interest to next DOM card. Empty required destination rejected; correct and reach preview. Home baseline has no overflow; 200% text reflows to one column, no horizontal overflow or author/control collision. Open filters, separately enlarge new content, scroll to Apply, Escape. | 5 PASS, with hard A2/A3 assertions. | 1,455 ms |
| P6 Keyboard and 390px enlarged text | Same independent sequence at 390px. Normal display retains two columns; enlarged text reflows to one column. No overflow or author/control intersection. | 5 PASS, with hard A2/A3 assertions. | 2,534 ms |

## A. Confirmed defects — repaired

| Finding | Before | Verified after |
| --- | --- | --- |
| A1 — Medium | 00:00 journey published at fixed 00:06 HKT. | Step 1 and final publication both compare the complete Hong Kong departure instant with a freshly read clock. Exact equality accepted; 1 ms past rejected. Date/time and custom content retained. |
| A2 — High | At 200% simulated text: document scroll/client width 397/320 and 432/390. Header version badge overflowed. | 320/320 and 390/390; no document/dialog horizontal overflow across normal text, simulated 200% text and native 200% Chromium zoom. Tabs, controls and headings reflow. |
| A3 — Medium | First author intersected the absolutely positioned interest control at enlarged 320px. | Author and interest control occupy separate normal-flow footer items. All sampled cards have no intersection in all six layout runs. |

See [before/after screenshots and exact regression matrix](POST-PERSONA-REPAIRS.md). Normal two-column masonry and all nine cover illustrations remain covered by existing tests. Enlarged-text reflow does not hide journey information.

## B. UX hypotheses — deliberately unchanged

- **Family/group interpretation, Medium:** observed free-text party intent and selected structured count differ. Test accompanying-person/new-place interpretation with people before changing the model. Suitcase/car fit is unknown.
- **Recurring expectations, Medium:** recurring type exposes one date/time; frequency can be written in text. No generated schedule or fixed service was created or assumed.
- **Contact, confirmation, trust and safety expectations, Medium:** organizer click has no profile action; interest is not booking; messages are a shortlist. No live chat, verification, seat confirmation or cancellation system was added. Whether the explanations are sufficient requires real participants.
- **English/Cantonese search, Low:** `Tuen Mun` does not match the Cantonese fixture while the flight filter works. No bilingual-search promise was established; expectations require human testing.

## C. Untested assumptions and remaining limits

- No human usability outcomes, emotions, interviews, satisfaction, conversion rates, representative task times or market validation. The [five-person test package](USABILITY-TEST.md) still needs real participants, including people with accessibility needs where relevant.
- No real vehicle fit, passenger allocation, flight reliability, live records, verification, booking, fares/payments, messaging, cancellation or dispatch was validated. Prototype state still clears on refresh.
- Technical Chromium tests are not screen-reader, OS text-setting, Safari/Firefox, real-device or disabled-participant testing. Native zoom runs use explicit unzoomed 640/780px viewports, resulting in effective CSS widths 320/390px at 200%; no physical-device claim is made.
- Axe reports **zero automatic violations**, with `color-contrast` review items for illustration/image backgrounds and paint/scroll overlaps. The incomplete/manual-review list remains visible in the automated report; it is not suppressed or described as an accessibility certification.
- Validation is client-side in the isolated demo and uses the browser clock. It establishes neither a server-authoritative booking deadline nor production behavior.

## Reproduce and inspect

```sh
npm run build
npx tsc --noEmit
npx eslint src/app/v2-preview scripts/ux-review tests/ux-review scripts/test-v2-departure-time.mjs playwright.ux.config.mjs playwright.personas.config.mjs --max-warnings 0
npm run ux:review
npm run ux:personas
```

`ux:review` now includes the fixed-clock logic and eight repair browser regressions, while retaining the 20-image capture budget and contrast/name gates. `ux:personas` exports seven scenario records and nine curated persona PNGs; it preserves the distinction between diagnostic outcomes and execution completion. A1–A3 now fail the run if their hard assertions regress.

Full screenshots, exact records, HTML reports and traces remain in ignored `test-results/` / `playwright-report/` and the draft PR's seven-day **FareEnough UX review** Actions artifact. Open downloaded traces using `npx playwright show-trace <path-to-trace.zip>`. Traces/browser profiles are not committed.

## Curated current evidence

| Scenario | Screenshot |
| --- | --- |
| P1 interested journey found | [My Journeys](persona-screenshots/01-interested-journey-found.png) |
| P2 family count/luggage | [Selected structured summary](persona-screenshots/02-family-count-and-luggage.png) |
| P3 past departure rejected | [Cantonese error and retained time](persona-screenshots/03-same-day-past-departure.png) |
| P4 recurring form | [One date/time](persona-screenshots/04-recurring-single-date-form.png) |
| P5 messaging limitation | [Shortlist and explanation](persona-screenshots/05-message-shortlist-not-chat.png) |
| P6 320px normal | [Two-column baseline](persona-screenshots/06-320-baseline.png) |
| P6 320px enlarged | [Reflowed header](persona-screenshots/06-320-text-200.png), [separated author/interest](persona-screenshots/06-320-author-overlap.png) |
| P6 390px enlarged | [Reflowed header](persona-screenshots/06-390-text-200.png) |

Repairs end here. The next phase is the prepared study with real people; no hypothesis-driven features were implemented.
