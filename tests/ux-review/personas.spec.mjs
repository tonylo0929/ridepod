import { test, expect, dialog, nav, close, search, flightSearch, next, field, combo, optional, cards, plusDay, resizeText } from "./persona-helpers.mjs";

test("P1 — first-time airport traveller", async ({ page, session: s }) => {
  await s.act("Unexpected action: search the English destination Tuen Mun", async () => { await search(page).fill("Tuen Mun"); return { cards: await cards(page).count(), empty: await page.getByRole("heading", { name: "呢個時間，仲未搵到同路人。", exact: true }).isVisible() }; });
  await s.shot("01-english-search-empty");
  await s.act("Recover using the visible clear-search button", () => page.getByRole("button", { name: "清除搜尋", exact: true }).click());
  await s.act("Try incorrect flight CX9999, then correct it to cx 734", async () => {
    await flightSearch(page).fill("CX9999"); const wrong = await cards(page).count();
    await flightSearch(page).fill("cx 734"); await expect(cards(page)).toHaveCount(1);
    return { wrongFlightMatches: wrong, correctedMatches: await cards(page).count(), card: await cards(page).innerText() };
  });
  await s.act("Open the matching visible airport-to-Tuen-Mun card", () => cards(page).getByRole("button").first().click());
  const details = await dialog(page).innerText();
  s.observe("Arrival, exit, departure, capacity and non-booking copy", details);
  s.check("Find CX734 journey and separate arrival/exit/car times", ["CX734", "20:50", "21:30", "21:50", "同行名額 3 個", "計劃最多 4 人"].every((text) => details.includes(text)) ? "PASS" : "FAIL", details);
  await s.act("Scroll to interest and express interest", async () => { const button = dialog(page).getByRole("button", { name: "我有興趣", exact: true }); await button.scrollIntoViewIfNeeded(); await button.click(); return await dialog(page).innerText(); });
  await expect(dialog(page)).toContainText("1 人有興趣");
  await s.act("Close details and open My Journeys", async () => { await close(page); await nav(page, "我的").click(); return await dialog(page).innerText(); });
  const my = await dialog(page).innerText();
  s.check("Locate the interested journey afterward", my.includes("香港機場") && my.includes("屯門") && my.includes("1 人有興趣") ? "PASS" : "FAIL", my);
  await s.shot("01-interested-journey-found");
});

test("P2 — family and luggage", async ({ page, session: s }) => {
  await s.act("Open airport filters and request two companion places", async () => {
    await page.getByRole("button", { name: /^篩選/ }).click();
    await combo(page, "想搵幾多個同行名額？").selectOption("2");
    await dialog(page).locator("summary").filter({ hasText: "更多條件" }).click();
    return await dialog(page).ariaSnapshot();
  });
  s.observe("Luggage filter labels concern the other poster's bags, not available baggage space", await dialog(page).innerText());
  await s.act("Set the other poster's luggage to at most two and apply", async () => { await combo(page, "對方最多帶幾多個喼？").selectOption("2"); await dialog(page).getByRole("button", { name: /^睇 \d+ 個旅程$/ }).click(); return { cards: await cards(page).count() }; });
  await s.act("Start a new post; attempt the same airport origin/destination", async () => { await nav(page, "發佈").click(); await field(page, "目的地").fill("香港機場"); await next(page); return await dialog(page).getByRole("alert").innerText(); });
  s.check("Reject an identical origin and destination", await dialog(page).getByRole("alert").isVisible() ? "PASS" : "FAIL", await dialog(page).innerText());
  await s.act("Correct destination, offer one additional place and enter two bags plus the existing two-adult party", async () => {
    await field(page, "目的地").fill("屯門"); await combo(page, "可供同行嘅人數（唔計自己）").selectOption("1"); await optional(page);
    await combo(page, "行李數量（選填）").selectOption("2");
    await field(page, "想同大家講啲咩？（選填）").fill("示範：我哋兩位成人，兩個大喼，想再搵一位同路人；實際車型同空間要再確認。");
    return await dialog(page).ariaSnapshot();
  });
  await s.act("Preview and publish the synthetic family post", async () => { await next(page); await dialog(page).getByRole("button", { name: "發佈示範帖文", exact: true }).click(); return await dialog(page).innerText(); });
  const family = await dialog(page).innerText();
  s.observe("Free-text existing party versus structured planned group", family);
  s.check("Represent two existing adults plus one new companion", family.includes("我哋兩位成人") && family.includes("計劃最多 2 人") ? "WORKAROUND" : "FAIL", family);
  await dialog(page).locator("dl").first().scrollIntoViewIfNeeded();
  await s.shot("02-family-count-and-luggage");
});

test("P3 — late-night and invalid times", async ({ page, session: s }) => {
  await s.act("Choose outbound direction and open the visible Sha Tin airport journey", async () => { await page.getByRole("button", { name: "出發去機場", exact: true }).click(); await cards(page).filter({ has: page.getByRole("heading", { name: "沙田 去 香港機場", exact: true }) }).getByRole("button").first().click(); return await dialog(page).innerText(); });
  s.observe("Existing overnight full-date timeline", await dialog(page).locator("dl").innerText());
  await dialog(page).locator("dl").scrollIntoViewIfNeeded(); await s.shot("03-overnight-timeline");
  await s.act("Create an outbound post and try yesterday's departure date", async () => {
    await close(page); await nav(page, "發佈").click(); await combo(page, "旅程方向").selectOption({ label: "出發去機場" });
    const day = await field(page, "夾車出發日期").inputValue(); s.record.demoDate = day;
    await field(page, "夾車出發日期").fill(plusDay(day, -1)); await next(page);
    const invalid = await field(page, "夾車出發日期").evaluate((el) => ({ rejected: el.validity.rangeUnderflow, message: el.validationMessage }));
    s.check("Reject yesterday's departure date", invalid.rejected ? "PASS" : "FAIL", invalid);
    await field(page, "夾車出發日期").fill(day); return invalid;
  });
  await s.act("Try same-day 00:17 takeoff before 21:50 car departure", async () => {
    await field(page, "預計夾車出發時間").fill("21:50"); await optional(page);
    await field(page, "航班預定起飛（選填）").fill(`${s.record.demoDate}T00:17`); await next(page);
    return await dialog(page).getByRole("alert").innerText();
  });
  s.check("Reject takeoff before the car departure", await dialog(page).getByRole("alert").isVisible() ? "PASS" : "FAIL", await dialog(page).innerText());
  await s.act("Move takeoff independently to tomorrow 00:17 and preview", async () => { await field(page, "航班預定起飛（選填）").fill(`${plusDay(s.record.demoDate, 1)}T00:17`); await next(page); await dialog(page).locator("summary").filter({ hasText: "核對航班時間" }).click(); return await dialog(page).locator("dl").innerText(); });
  const overnight = await dialog(page).locator("dl").innerText();
  const displayDate = (day) => { const [year, month, date] = day.split("-"); return `${year}年${Number(month)}月${Number(date)}日`; };
  s.check("Retain independent overnight dates", [displayDate(s.record.demoDate), displayDate(plusDay(s.record.demoDate, 1)), "21:50", "00:17"].every((text) => overnight.includes(text)) ? "PASS" : "FAIL", overnight);
  await s.act("Unexpected action: return and enter today's 00:00 departure without an optional flight schedule", async () => {
    await dialog(page).getByRole("button", { name: "返回修改", exact: true }).click();
    await field(page, "預計夾車出發時間").fill("00:00");
    if (!(await field(page, "航班預定起飛（選填）").isVisible())) await optional(page);
    await field(page, "航班預定起飛（選填）").fill("");
    const now = await page.evaluate(() => ({ iso: new Date().toISOString(), hkDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()), epoch: Date.now() }));
    s.record.clock = now;
    await next(page);
    const accepted = await dialog(page).getByRole("heading", { name: "預覽同發佈帖文。", exact: true }).isVisible();
    const isPast = now.hkDate === s.record.demoDate && Date.parse(`${s.record.demoDate}T00:00:00+08:00`) < now.epoch;
    s.observe("Observed clock and past-departure preview acceptance", { now, date: s.record.demoDate, time: "00:00", isPast, accepted });
    s.check("Reject a same-day departure in the past", !isPast ? "NOT_TESTED" : accepted ? "FAIL" : "PASS", { now, accepted, isPast });
    if (accepted) { await dialog(page).getByRole("button", { name: "發佈示範帖文", exact: true }).click(); s.observe("Past departure published into own journey", await dialog(page).innerText()); }
  });
  await dialog(page).locator("dl").first().scrollIntoViewIfNeeded();
  await s.shot("03-same-day-past-departure");
});

test.describe("desktop commuting", () => {
  test.use({ viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false });
  test("P4 — daily commuter", async ({ page, session: s }) => {
    await s.act("Open Popular Routes, Tuen Mun → Central and recurring journeys", async () => { await page.getByRole("tab", { name: "熱門路線", exact: true }).click(); await page.getByRole("button", { name: "屯門 → 中環", exact: true }).click(); await page.getByRole("button", { name: "定期同路", exact: true }).click(); return { count: await cards(page).count(), text: await cards(page).allInnerTexts() }; });
    s.check("Find a recurring Tuen Mun → Central journey", await cards(page).count() > 0 ? "PASS" : "FAIL", await cards(page).allInnerTexts());
    await s.act("Unexpected action: enter an unmatched route phrase, then clear only search", async () => { await search(page).fill("屯門去中環xyz"); const empty = await cards(page).count(); await page.getByRole("button", { name: "清除搜尋", exact: true }).click(); return { empty, recovered: await cards(page).count() }; });
    await s.act("Create a recurring journey and inspect its visible scheduling controls", async () => { await nav(page, "發佈").click(); await combo(page, "旅程類型").selectOption({ label: "定期同路" }); await field(page, "出發時間").fill("08:00"); return await dialog(page).ariaSnapshot(); });
    s.observe("Recurring creation form", await dialog(page).ariaSnapshot());
    await s.shot("04-recurring-single-date-form");
    await s.act("Describe Monday–Friday frequency in the optional body and publish", async () => {
      await optional(page); await field(page, "想同大家講啲咩？（選填）").fill("示範：想星期一至五朝早八點由屯門返中環。每次是否成行要再確認。"); await next(page);
      await dialog(page).getByRole("button", { name: "發佈示範帖文", exact: true }).click(); return await dialog(page).innerText();
    });
    s.check("Specify a regular weekday schedule", "WORKAROUND", "Recurring is selectable, but the form exposes one departure date/time; weekday frequency was added as free text, not a generated schedule.");
    await s.shot("04-recurring-published");
  });
});

test("P5 — trust-conscious passenger", async ({ page, session: s }) => {
  await s.act("Inspect the first visible airport journey", () => cards(page).first().getByRole("button").first().click());
  s.observe("Organizer, counts, meeting and booking/safety wording visible in detail", await dialog(page).innerText());
  await s.act("Unexpected action: click the organizer's visible name", async () => { const before = page.url(); await dialog(page).getByText("Mandy", { exact: true }).click(); return { sameURL: page.url() === before, dialogs: await dialog(page).count(), headings: await dialog(page).getByRole("heading").allTextContents() }; });
  await s.act("Add interest, then tap again to withdraw", async () => { await dialog(page).getByRole("button", { name: "我有興趣", exact: true }).click(); const added = await dialog(page).innerText(); await dialog(page).getByRole("button", { name: "撤回興趣", exact: true }).click(); return { added, withdrawn: await dialog(page).innerText() }; });
  const trust = await dialog(page).innerText();
  s.check("Interest remains distinct from confirmed booking/capacity", trust.includes("0 人有興趣") && trust.includes("計劃最多 4 人") && trust.includes("唔代表已預訂或確認共乘") ? "PASS" : "FAIL", trust);
  await dialog(page).locator("dl").first().scrollIntoViewIfNeeded(); await s.shot("05-trust-meeting-and-status");
  await s.act("Add interest again and inspect the Messages destination", async () => { await dialog(page).getByRole("button", { name: "我有興趣", exact: true }).click(); await close(page); await nav(page, "訊息").click(); return await dialog(page).innerText(); });
  const messages = await dialog(page).innerText();
  s.observe("Messages is a shortlist, with no live chat or verification shown", messages);
  s.check("Find the explicit unavailable-live-chat explanation", messages.includes("真人聊天會喺之後開放") ? "PASS" : "FAIL", messages);
  await s.shot("05-message-shortlist-not-chat");
});

for (const width of [320, 390]) test.describe(`small screen ${width}`, () => {
  test.use({ viewport: { width, height: 844 } });
  test(`P6 — keyboard and 200% text at ${width}px`, async ({ page, session: s }) => {
    const focus = () => page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim().slice(0, 120), inCard: Boolean(document.activeElement?.closest("article")), inDialog: Boolean(document.activeElement?.closest("dialog[open]")) }));
    await s.act("Use successive Tab keys from the homepage to reach the first journey card", async () => {
      const stops = [];
      for (let i = 0; i < 45; i++) { await page.keyboard.press("Tab"); const stop = await focus(); stops.push(stop); if (stop.inCard) break; }
      s.record.keyboardStops = stops;
      return stops;
    });
    const opener = await focus();
    await s.act("Enter opens details; Shift+Tab and Tab cycle; Escape closes", async () => {
      await page.keyboard.press("Enter"); await expect(dialog(page)).toBeVisible();
      const initial = await focus(), cycle = [];
      for (const key of [...Array(6).fill("Tab"), ...Array(6).fill("Shift+Tab")]) { await page.keyboard.press(key); cycle.push({ key, ...await focus() }); }
      await page.keyboard.press("Escape");
      const restored = await focus();
      s.check("Modal keyboard cycle and opener restoration", cycle.every((stop) => stop.inDialog) && restored.inCard && restored.label === opener.label ? "PASS" : "FAIL", { initial, cycle, restored, opener });
      return { initial, cycle, restored, opener };
    });
    await s.act("Continue Tab from the restored card through its interest button to the next card", async () => {
      const stops = [];
      for (let i = 0; i < 2; i++) { await page.keyboard.press("Tab"); stops.push(await focus()); }
      const order = await cards(page).evaluateAll((items) => items.map((el, i) => { const box = el.getBoundingClientRect(); return { i, heading: el.querySelector("h3")?.textContent, x: box.x, y: box.y, width: box.width }; }));
      s.observe("DOM card order and visible masonry positions", order);
      s.check("Keyboard moves from the first card through interest to the next DOM card", stops[0].label?.startsWith("我有興趣") && stops[1].label?.includes("大埔") ? "PASS" : "FAIL", stops);
      return { stops, order };
    });
    await s.act("Unexpected action: clear required destination and submit; recover by typing Tuen Mun in Cantonese", async () => {
      await nav(page, "發佈").click(); await field(page, "目的地").fill(""); await next(page);
      const rejected = await field(page, "目的地").evaluate((el) => ({ missing: el.validity.valueMissing, message: el.validationMessage }));
      await field(page, "目的地").fill("屯門"); await next(page); const recovered = await dialog(page).getByRole("heading", { name: "預覽同發佈帖文。", exact: true }).isVisible();
      s.check("Required destination validation and correction", rejected.missing && recovered ? "PASS" : "FAIL", { rejected, recovered });
      await close(page); return { rejected, recovered };
    });
    await s.act("Return Home before the enlarged-text exercise", () => nav(page, "首頁").click());
    s.observe("Baseline layout", await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })));
    s.observe("Baseline visible control dimensions (CSS pixels)", await page.locator("button,input,select,summary").evaluateAll((items) => items.map((el) => { const r = el.getBoundingClientRect(); return { label: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 80), width: r.width, height: r.height }; }).filter((r) => r.width > 0 && r.height > 0)));
    await s.shot(`06-${width}-baseline`);
    const textResize = await s.act("Apply a 200% computed-font text-resize simulation, excluding SVG artwork", () => resizeText(page, "body"));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const layout = await page.evaluate(() => {
      const brand = document.querySelector("header a").getBoundingClientRect();
      const author = [...document.querySelectorAll("article span")].find((el) => el.textContent === "Mandy");
      const heart = document.querySelector('article button[aria-label^="我有興趣"]');
      const a = author.getBoundingClientRect(), b = heart.getBoundingClientRect();
      return { width: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, brand: { left: brand.left, right: brand.right, width: brand.width }, authorHeartOverlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top };
    });
    s.observe("200% text layout", { ...textResize, ...layout });
    s.check("200% enlarged text fits the small screen without horizontal overflow", layout.scroll <= layout.client ? "PASS" : "FAIL", layout);
    s.check("Author label and separate interest control remain unobscured", layout.authorHeartOverlap ? "FAIL" : "PASS", layout);
    await s.shot(`06-${width}-text-200`);
    if (width === 320) {
      await s.act("Scroll the enlarged first card's author into view to capture the overlap", () => page.getByText("Mandy", { exact: true }).scrollIntoViewIfNeeded());
      await s.shot("06-320-author-overlap");
    }
    await s.act("Open filters, enlarge the newly mounted dialog text, scroll to Apply, then close by keyboard", async () => {
      await page.getByRole("button", { name: /^篩選/ }).click();
      const resized = await resizeText(page, "dialog[open]");
      await dialog(page).getByRole("button", { name: /^睇 \d+ 個旅程$/ }).scrollIntoViewIfNeeded();
      const text = await dialog(page).innerText(); await page.keyboard.press("Escape");
      return { closed: await dialog(page).count() === 0, resized, filterText: text };
    });
  });
});
