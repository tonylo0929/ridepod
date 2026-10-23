# FareEnough V2.3 — five-person usability test

**Status: prepared, not conducted. No participant results are recorded.** Run this test after V2.3 and before adding features. Automated checks and AI reviews do not count as participants. The owner will recruit five consenting people; this package does not authorize contacting anyone.

## Setup and recruitment

- Recruit five adults who can use a Cantonese interface: a mix of frequent and occasional Hong Kong airport travellers, including people unfamiliar with FareEnough. Seek one keyboard user and one screen-reader user where possible; document any missing coverage.
- Use participant codes P01–P05. Keep names and contact information out of the repository, screenshots and notes. Do not collect passwords, payment information, flight confirmations or real travel plans.
- Use the committed V2.3 preview locally with synthetic data. Follow the [README](README.md) setup; `npm run build` then `npm run start -- --hostname 127.0.0.1 --port 3044`. Open `/v2-preview`. Each session starts in a fresh browser context. The server uses the current Hong Kong date for “今日/聽日”.
- Default mobile viewport: 390px; use the participant's preferred input method. Offer 1440px desktop for keyboard or screen-reader tasks. Record browser, viewport and assistive technology/version, without account details. Never use production or ask a participant to sign into Vercel.
- Allow 35–45 minutes per participant: 5 minutes introduction, 25–30 minutes tasks, 5–10 minutes debrief. Test individually. One moderator and, if available, one note taker.
- Record the UI source commit and report timestamp before each session. Freeze that version across the five sessions unless a critical blocker requires repair; document any changed version.

## Consent and moderator introduction

Read this in Cantonese:

> 我哋想試吓 FareEnough 嘅易用程度，唔係考你。所有旅程同人物都係示範資料，唔會預訂座位、收費或者搵司機。唔使登入，亦唔好輸入真實個人資料。你隨時可以停，唔需要解釋。你願唔願意參加，同埋畀我哋用匿名筆記記低操作同意見？

Get explicit consent before starting. Ask separately before any screen/audio recording; written anonymous notes are sufficient. Do not commit recordings. Participants may withdraw. Store any consent/contact records separately under the owner's access control and delete recordings/identifiable recruitment records within 30 days after synthesis, or sooner on withdrawal.

Ask the participant to think aloud. Say “你而家諗緊啲咩？” when they go quiet. Do not name controls, point to actions or teach the intended flow. If stuck for 90 seconds, ask what they expected; then offer help and mark the task **assisted**, recording the exact prompt. Stop any task causing distress or requiring personal data.

## Tasks and observable success

Give only the task wording to the participant. The success criteria are for the moderator.

| Task | Cantonese prompt | Observe / success criteria |
| --- | --- | --- |
| 1. Find an airport journey | 「假設你今日搭 CX734 落機，想返屯門。搵一程啱嘅同路旅程，講吓幾點可以出發。」 | Finds the synthetic CX734 journey using destination/flight search; opens details; distinguishes 20:50 scheduled arrival, 21:30 estimated exit and 21:50 car departure. Note whether filters feel necessary or confusing. |
| 2. Understand overnight dates | 「另外有一程今晚由沙田去機場、凌晨 00:17 起飛。搵到之後，講吓架車同飛機分別係邊一日、幾點出發。」 | Correctly identifies today's 21:50 car departure and tomorrow's 00:17 takeoff using full dates. No same-day confusion. Clear filters first only if the participant chooses to. |
| 3. Express interest | 「返到頭先屯門嗰程。你想同發帖人傾吓，試吓表示有興趣。你覺得而家有幾多人？有冇留到位？之後試吓改變主意。」 | Adds and withdraws interest; says interest is not a booking, max planned group of four includes the host, interest count excludes the host and does not consume confirmed seats. Record their words before explaining. |
| 4. Publish and edit | 「用示範資料分享一程今日 21:50 由機場返屯門嘅旅程，同行名額三個。改一改帖文文字、揀個封面，再發佈。之後改成兩個同行名額。」 | Completes both steps, finds the primary publish action, edits Cantonese copy and cover, understands optional fields, edits the same post, sees max group three after editing. No self-interest action. Observe scrolling and content obscured by controls. |
| 5. Find activity and recover | 「搵返你發佈同有興趣嘅旅程。你估重新整理會點？然後試吓重新整理。」 | Finds My Journeys; predicts/demo notices explain reset; understands disappearance after refresh and can return to discovery from an expired local link. No expectation that a real booking vanished. |
| 6. Keyboard / reading order | 「用你平時嘅鍵盤或者讀屏方法睇幾張旅程卡，開篩選，再關返。繼續去下一張卡。」 | For users of these inputs: source/visual order makes sense; Tab/Shift+Tab stay in the modal; Escape/close return to the opener; closed optional controls are skipped; step changes are announced through heading focus. Ask about long card names, not just task completion. For other participants record N/A, not pass. |

Do not introduce a real passenger, real flight, fee or booking. If participants ask about live functions, first record their expectation, then explain that the current preview has no live matching, messages or persistence.

## Record per participant

Copy this section outside the repository for each session; commit only de-identified findings after consent and review. Leave the template blank until actual sessions occur.

```text
Participant code:
Session date / UI source commit:
Consent to anonymous notes: yes / no
Separate recording consent, if applicable:
Browser / viewport / input / assistive technology:
Airport-travel familiarity: frequent / occasional / first-time

Task | unassisted / assisted / failed / N/A | seconds | wrong turns | exact prompt/help | anonymous quote
1    |
2    |
3    |
4    |
5    |
6    |

Booking/interest interpretation before explanation:
Host/capacity interpretation before explanation:
Overnight date interpretation before explanation:
Most confusing moment:
Most useful thing:
Confidence finding company (1–5) and reason:
Moderator observations (distinguish observed behavior from interpretation):
```

## Synthesis and feature gate

- Report actual participants tested, completion per task (for example 4/5), assists, task times, recurring misunderstandings and anonymous quotes. Five people give qualitative evidence, not population-level statistical proof.
- Prioritize observed blockers and harm from misinterpreting booking status, capacity or overnight dates. Capture reproduction steps, affected input/viewport and source commit. Distinguish isolated preferences from repeated failures.
- Proposed acceptance: at least 4/5 complete each core task (1–5) without directional help; all five correctly explain non-booking interest, host-inclusive capacity and overnight dates. Any critical misunderstanding or keyboard/screen-reader blocker must be investigated and repaired, then retested with affected users before feature work.
- Record task 6 coverage honestly. If no screen-reader user was recruited, list it as unresolved; do not treat the automated accessibility scan as a substitute. Check 200% text/zoom and a 320px viewport during accessibility follow-up.
- Produce a dated findings table: issue, evidence/participant codes, severity, proposed focused repair, owner, retest result. Link this plan and the tested UX report from the PR. Begin additional feature work only after the five sessions, synthesis and required critical repairs are complete.

| Planned participant | Session | Notes | Status |
| --- | --- | --- | --- |
| P01 | — | — | Not recruited / not tested |
| P02 | — | — | Not recruited / not tested |
| P03 | — | — | Not recruited / not tested |
| P04 | — | — | Not recruited / not tested |
| P05 | — | — | Not recruited / not tested |
