import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { allowedRequest, baseURL, screens } from "../../scripts/ux-review/settings.mjs";

const arrivalTitle = "今晚 CX734 落機，有冇人一齊返屯門？✈️";
const ownTitle = "UX 示範：落機一齊返屯門";
const ownBody = "只用作自動化 UX 示範。時間啱就一齊，集合位置再傾。";

const test = base.extend({
  evidence: [async ({ page, context }, provide, testInfo) => {
    const evidence = { captures: [], blockedRequests: [], consoleErrors: [], observations: [], demoDate: "", browser: context.browser().version() };
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (allowedRequest(request.url(), request.method())) return route.continue();
      // Record no headers, bodies, query strings or credentials.
      const url = new URL(request.url());
      evidence.blockedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort("blockedbyclient");
    });
    page.on("pageerror", (error) => evidence.consoleErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") evidence.consoleErrors.push(message.text());
    });
    try {
      await provide(evidence);
      expect(evidence.blockedRequests, "No production/API/auth/external requests").toEqual([]);
      expect(evidence.consoleErrors, "No browser errors").toEqual([]);
    } finally {
      await testInfo.attach("ux-evidence", {
        body: JSON.stringify(evidence, null, 2), contentType: "application/json",
      });
    }
  }, { auto: true }],
});

async function capture(page, testInfo, evidence, id) {
  expect(new URL(page.url()).origin).toBe(baseURL);
  expect(new URL(page.url()).pathname).toBe("/v2-preview");
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => Array.from(document.images).filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && (!img.complete || img.naturalWidth === 0);
  }).length)).toBe(0);
  const layout = await page.evaluate(() => ({
    viewport: innerWidth, client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    smallTargets: Array.from((document.querySelector("dialog[open]") || document).querySelectorAll("button, input, select, summary, a[href]")).filter((el) => {
      if (el.closest("[inert]")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && (r.width < 44 || r.height < 44);
    }).slice(0, 4).map((el) => {
      const r = el.getBoundingClientRect();
      return { label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 70), width: Math.round(r.width), height: Math.round(r.height) };
    }),
  }));
  expect(layout.scroll, `${id}: no horizontal page overflow`).toBeLessThanOrEqual(layout.client);
  const path = testInfo.outputPath(`${id}.png`);
  await page.screenshot({ path, fullPage: false, animations: "disabled", caret: "hide" });
  await testInfo.attach(id, { path, contentType: "image/png" });
  const audit = await accessibilityAudit(page);
  const violations = audit.violations;
  evidence.captures.push({ id, filename: `${testInfo.project.name}-${id}.png`, path, layout, ...audit });
  // P0 regressions gate publication; keep all audit rules and detailed evidence.
  expect(violations.filter((v) => ["color-contrast", "label-content-name-mismatch"].includes(v.id)), `${id}: contrast and visible-label accessible names`).toEqual([]);
}
async function accessibilityAudit(page) {
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const rules = (items) => items.map((v) => ({
    id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })),
  }));
  return { violations: rules(audit.violations), incompleteRules: audit.incomplete.map((v) => v.id), incomplete: rules(audit.incomplete) };
}

async function closeDialog(page) {
  await page.getByRole("dialog").getByRole("button", { name: "關閉", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function openArrival(page) {
  await journeyCard(page, arrivalTitle).locator("button").first().click();
  await expect(page.getByRole("dialog", { name: "旅程詳情", exact: true })).toBeVisible();
}
function journeyCard(page, title) {
  const id = title === arrivalTitle ? "demo-1" : "demo-3";
  return title === ownTitle ? page.locator('article[data-journey-id^="local-"]') : page.locator(`article[data-journey-id="${id}"]`);
}
async function detailBottom(page) {
  await page.getByRole("dialog").evaluate((el) => { el.scrollTop = el.scrollHeight; });
}
function dayPlus(date, days) {
  const value = new Date(`${date}T12:00:00+08:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function fullDateTime(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日 ${time}`;
}

test("curated preview review journeys", async ({ page, evidence }, testInfo) => {
  const shot = (id) => capture(page, testInfo, evidence, id);
  const dialog = page.getByRole("dialog");
  const defaultCard = journeyCard(page, arrivalTitle);

  await test.step("Homepage: synthetic feed, responsive masonry and no overflow", async () => {
    await page.goto("/v2-preview");
    await expect(page).toHaveTitle(/FareEnough.*V\d/);
    await expect(page.getByRole("article")).toHaveCount(8);
    const columns = testInfo.project.name === "mobile" ? 2 : 4;
    await expect.poll(() => page.getByRole("article").evaluateAll((cards) => new Set(cards.map((card) => Math.round(card.getBoundingClientRect().x))).size)).toBe(columns);
    await page.addStyleTag({ content: "*, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }" });
    const positions = await page.getByRole("article").evaluateAll((cards) => cards.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), bottom: Math.round(r.bottom) }; }));
    expect(positions.slice(0, columns).every((p) => p.y === positions[0].y)).toBe(true);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].y).toBeGreaterThanOrEqual(positions[i-1].y);
      if (positions[i].y === positions[i-1].y) expect(positions[i].x).toBeGreaterThan(positions[i-1].x);
      for (let j = 0; j < i; j++) if (positions[j].x === positions[i].x) expect(positions[i].y).toBeGreaterThanOrEqual(positions[j].bottom + 9);
    }
    // Keyboard follows the next visual card, including its separate interest action.
    const firstCard = page.getByRole("article").first();
    await firstCard.locator("button").first().focus();
    await page.keyboard.press("Tab");
    await expect(firstCard.locator("button").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("article").nth(1).locator("button").first()).toBeFocused();
    await expect(firstCard.locator("button").first()).toHaveAccessibleName(/香港機場.*屯門.*21:50.*CX734/);
    evidence.observations.push({ kind: "masonry-order", positions, note: "Flat DOM follows sparse row-flow grid positions, with no overlap; keyboard advances to the next visual card." });
    if (testInfo.project.name === "mobile") {
      for (const [width, count] of [[320, 2], [900, 3], [390, 2]]) {
        await page.setViewportSize({ width, height: 1100 });
        await expect.poll(() => page.getByRole("article").evaluateAll((cards) => {
          const r = cards.map((c) => c.getBoundingClientRect());
          const noOverlap = r.every((b, i) => r.slice(0, i).every((a) => Math.abs(a.x-b.x) > 1 || b.top >= a.bottom + 9));
          return { columns: new Set(r.map((x) => Math.round(x.x))).size, noOverlap, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
        })).toEqual({ columns: count, noOverlap: true, overflow: false });
        evidence.observations.push({ kind: "responsive-smoke", width, columns: count, noOverlap: true, overflow: false });
      }
    }
    await page.getByRole("heading", { level: 1 }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("01-homepage");
  });
  await test.step("Airport search: route text and normalized optional flight", async () => {
    await page.getByRole("textbox", { name: "搜尋目的地或旅程", exact: true }).fill("屯門");
    await page.getByRole("textbox", { name: "按航班編號篩選", exact: true }).fill("cx 734");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(defaultCard).toContainText("CX734");
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("02-airport-search");
  });
  await test.step("Airport filters: planned places and district, native-dialog keyboard audit", async () => {
    await page.getByRole("button", { name: /^篩選/ }).click();
    await dialog.getByLabel("想去邊區？", { exact: true }).fill("屯門");
    await dialog.getByRole("combobox", { name: "想搵幾多個同行名額？", exact: true }).selectOption("2");
    await expect(dialog.getByLabel("幾點之後夾車出發？", { exact: true })).toBeHidden();
    const advanced = dialog.locator("summary").filter({ hasText: "更多條件" });
    await advanced.click();
    await dialog.getByLabel("幾點之後夾車出發？", { exact: true }).fill("21:00");
    await dialog.getByRole("combobox", { name: "對方最多帶幾多個喼？", exact: true }).selectOption("1");
    await dialog.getByRole("combobox", { name: "對方最少等到幾耐？", exact: true }).selectOption("20");
    const filterAudit = await accessibilityAudit(page);
    evidence.observations.push({ kind: "expanded-filter-audit", ...filterAudit });
    expect(filterAudit.violations.filter((v) => ["color-contrast", "label-content-name-mismatch"].includes(v.id))).toEqual([]);
    await advanced.click();
    await dialog.getByRole("button", { name: "關閉", exact: true }).focus();
    const focusStop = () => page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim().slice(0, 60),
      inside: Boolean(document.querySelector("dialog[open]")?.contains(document.activeElement)),
    }));
    const stops = [await focusStop()];
    await page.keyboard.press("Shift+Tab");
    stops.push(await focusStop());
    await page.keyboard.press("Tab");
    stops.push(await focusStop());
    expect(stops.every((stop) => stop.inside)).toBe(true);
    expect(stops[1].label).toContain("睇 1 個旅程");
    expect(stops[2].label).toBe("關閉");
    evidence.observations.push({ kind: "dialog-keyboard", stops });
    await dialog.getByRole("heading").click();
    await shot("03-airport-filters");
    await dialog.getByRole("button", { name: "睇 1 個旅程", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("button", { name: "清除篩選", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(8);
  });
  await test.step("Popular routes: corridor, recurring filter and empty recovery", async () => {
    await page.getByRole("tab", { name: "熱門路線", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(7);
    await page.getByRole("button", { name: "屯門 → 中環", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("04-popular-routes");
    await page.getByRole("button", { name: "定期同路", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("textbox", { name: "搜尋目的地或旅程", exact: true }).fill("UX-NO-SUCH-PLACE");
    await expect(page.getByRole("heading", { name: "呢個時間，仲未搵到同路人。", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "清除篩選", exact: true }).first().click();
    await page.getByRole("tab", { name: "機場同路", exact: true }).click();
  });
  await test.step("Journey details: arrival/exit/car times, optional flight and Escape", async () => {
    await openArrival(page);
    const times = page.getByRole("region", { name: "航班與夾車時間", exact: true });
    await expect(times).toContainText("21:30");
    await expect(times).toContainText("21:50");
    await expect(times).toContainText("20:50");
    await expect(dialog).toContainText("發帖人 1 人 + 同行名額 3 個");
    await detailBottom(page);
    await shot("05-journey-details");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    const focusReturned = await journeyCard(page, arrivalTitle).locator("button").first().evaluate((el) => document.activeElement === el);
    evidence.observations.push({ kind: "focus-return", passed: focusReturned });
    expect(focusReturned, "Escape restores the card opener").toBe(true);
    const noFlight = page.locator('article[data-journey-id="demo-5"]');
    await expect(noFlight).not.toContainText("航班");
  });
  await test.step("Outbound example: car and takeoff keep independent full dates", async () => {
    await journeyCard(page, "聽日凌晨 00:17 起飛，今晚一齊去機場？").locator("button").first().click();
    const values = await dialog.locator("dl dd").allTextContents();
    expect(values).toHaveLength(2);
    // Obtain the server's date anchor from its structured departure date, not an assumed timezone.
    const date = (await dialog.innerText()).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    expect(date).toBeTruthy();
    evidence.demoDate = date;
    expect(values).toEqual([fullDateTime(date, "21:50"), fullDateTime(dayPlus(date, 1), "00:17")]);
    await closeDialog(page);
  });
  await test.step("Create step 1: essentials work with optional fields empty", async () => {
    await page.getByRole("navigation", { name: "主要導覽", exact: true }).getByRole("button", { name: "發佈", exact: true }).click();
    await expect(dialog.getByLabel("航班預定抵達（選填）", { exact: true })).toBeHidden();
    await shot("06-create-step-1");
    await dialog.getByRole("button", { name: "幫我寫個帖文", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "帖文內文", exact: true })).not.toHaveValue(/出閘|個喼|可以等|undefined/);
    await dialog.getByRole("button", { name: "返回修改", exact: true }).click();
    await dialog.locator("summary").getByText("加啲行程資料（選填）", { exact: true }).click();
    const date = await dialog.getByLabel("夾車出發日期", { exact: true }).inputValue();
    const flightInput = dialog.getByRole("textbox", { name: "航班編號（選填）", exact: true });
    await flightInput.fill("CX<734");
    expect(await flightInput.evaluate((el) => el.validity.patternMismatch)).toBe(true);
    await flightInput.fill("cx 734");
    expect(await flightInput.evaluate((el) => el.validity.valid)).toBe(true);
    await dialog.getByLabel("航班預定抵達（選填）", { exact: true }).fill(`${date}T20:50`);
    await dialog.getByLabel("預計出閘時間（選填）", { exact: true }).fill(`${date}T22:00`);
    await dialog.getByRole("button", { name: "幫我寫個帖文", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("夾車出發時間要喺預計出閘時間之後。");
    await dialog.getByLabel("預計出閘時間（選填）", { exact: true }).fill(`${date}T21:30`);
    await dialog.getByRole("button", { name: "幫我寫個帖文", exact: true }).click();
  });
  await test.step("Create step 2: preview, edited copy survives back navigation, publish", async () => {
    await expect(dialog.getByRole("heading", { name: "預覽同發佈帖文。", exact: true })).toBeFocused();
    const flightDetails = dialog.locator("summary").filter({ hasText: "核對航班時間" });
    await flightDetails.click();
    const previewFlight = dialog.getByRole("textbox", { name: "預覽航班編號（選填）", exact: true });
    await previewFlight.fill("CX<734");
    expect(await previewFlight.evaluate((el) => el.validity.patternMismatch)).toBe(true);
    await previewFlight.fill("CX734");
    expect(await previewFlight.evaluate((el) => el.validity.valid)).toBe(true);
    await expect(dialog.locator("dl")).toContainText("20:50");
    await expect(dialog.locator("dl")).toContainText("21:30");
    await flightDetails.click();
    const coverChoices = dialog.locator("summary").filter({ hasText: "揀個封面" });
    await coverChoices.click();
    await dialog.getByRole("button", { name: "同路登機證", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "同路登機證", exact: true })).toHaveAttribute("aria-pressed", "true");
    const expandedAudit = await accessibilityAudit(page);
    evidence.observations.push({ kind: "expanded-cover-audit", ...expandedAudit });
    expect(expandedAudit.violations.filter((v) => ["color-contrast", "label-content-name-mismatch"].includes(v.id))).toEqual([]);
    await coverChoices.click();
    await dialog.getByRole("textbox", { name: "帖文標題", exact: true }).fill(ownTitle);
    await dialog.getByRole("textbox", { name: "帖文內文", exact: true }).fill(ownBody);
    await dialog.getByRole("button", { name: "返回修改", exact: true }).click();
    await dialog.getByRole("button", { name: "幫我寫個帖文", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "帖文標題", exact: true })).toHaveValue(ownTitle);
    await expect(dialog.getByRole("textbox", { name: "帖文內文", exact: true })).toHaveValue(ownBody);
    await dialog.evaluate((el) => { el.scrollTop = 0; });
    const publishButton = dialog.getByRole("button", { name: "發佈示範帖文", exact: true });
    const action = await publishButton.evaluate((el) => {
      const r = el.getBoundingClientRect(), modal = el.closest("dialog").getBoundingClientRect();
      return { visible: r.top >= modal.top && r.bottom <= Math.min(modal.bottom, innerHeight), unobscured: el.contains(document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)), fixed: ["fixed", "sticky"].includes(getComputedStyle(el.parentElement).position) };
    });
    expect(action, "Step 2 primary action is visible and unobscured without a fixed toolbar").toEqual({ visible: true, unobscured: true, fixed: false });
    await shot("07-create-step-2");
    await dialog.getByRole("button", { name: "發佈示範帖文", exact: true }).click();
    await expect(dialog).toContainText("你係呢程嘅發帖人");
    await expect(dialog.getByRole("button", { name: "我有興趣", exact: true })).toHaveCount(0);
  });
  await test.step("Own journey: local edit updates the same post with no self-interest", async () => {
    await dialog.getByRole("button", { name: "編輯旅程", exact: true }).click();
    await dialog.getByRole("combobox", { name: "可供同行嘅人數（唔計自己）", exact: true }).selectOption("2");
    await dialog.getByRole("button", { name: "預覽修改", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "帖文內文", exact: true })).toHaveValue(ownBody);
    await dialog.getByRole("button", { name: "儲存示範修改", exact: true }).click();
    await expect(dialog).toContainText("計劃最多 3 人 · 連發帖人");
    await closeDialog(page);
    const own = journeyCard(page, ownTitle);
    await expect(own).toHaveCount(1);
    await expect(own.getByRole("button")).toHaveCount(1);
  });
  await test.step("Interest before/after: add and withdraw without changing capacity", async () => {
    await openArrival(page);
    await expect(dialog).toContainText("0 人有興趣");
    await detailBottom(page);
    await shot("08-interest-before");
    await dialog.getByRole("button", { name: "我有興趣", exact: true }).click();
    await expect(dialog).toContainText("1 人有興趣");
    await expect(dialog).toContainText("計劃最多 4 人 · 連發帖人");
    await detailBottom(page);
    await shot("09-interest-after");
    await dialog.getByRole("button", { name: "撤回興趣", exact: true }).click();
    await expect(dialog).toContainText("0 人有興趣");
    await dialog.getByRole("button", { name: "我有興趣", exact: true }).click();
    await closeDialog(page);
    await expect(defaultCard).toContainText("1 人有興趣");
  });
  await test.step("My Journeys and message shortlist: real session counts, demo notices", async () => {
    await page.getByRole("button", { name: "我的", exact: true }).click();
    await expect(dialog).toContainText("重新整理後清除");
    await expect(dialog.locator("span").filter({ hasText: /^1已發佈旅程$/ })).toHaveCount(1);
    await expect(dialog.locator("span").filter({ hasText: /^1有興趣旅程$/ })).toHaveCount(1);
    await expect(dialog).toContainText("你係發帖人");
    await shot("10-my-journeys");
    await closeDialog(page);
    await page.getByRole("button", { name: "訊息", exact: true }).click();
    await expect(dialog).toContainText("真人聊天會喺之後開放");
    await closeDialog(page);
  });
  await test.step("Refresh: local posts expire and both activity counters reset", async () => {
    await journeyCard(page, ownTitle).locator("button").first().click();
    await page.reload();
    await expect(page.getByRole("status")).toContainText("呢個示範旅程已清除");
    await page.getByRole("button", { name: "返回發現同路", exact: true }).click();
    await page.getByRole("button", { name: "我的", exact: true }).click();
    await expect(dialog.locator("span").filter({ hasText: /^0已發佈旅程$/ })).toHaveCount(1);
    await expect(dialog.locator("span").filter({ hasText: /^0有興趣旅程$/ })).toHaveCount(1);
    await closeDialog(page);
    expect(evidence.captures.map((c) => c.id)).toEqual(screens.map(([id]) => id));
  });
});
