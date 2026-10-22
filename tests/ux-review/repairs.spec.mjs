import { test, expect, chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { allowedRequest, baseURL } from "../../scripts/ux-review/settings.mjs";
import { resizeText, plusDay } from "./persona-helpers.mjs";

const past = "呢個出發時間已經過咗，請揀返未來嘅時間。";
test.use({ trace: "on" });
const dialog = (page) => page.getByRole("dialog");
const field = (page, name) => dialog(page).getByLabel(name, { exact: true });
const publishNav = (page) => page.getByRole("navigation", { name: "主要導覽", exact: true }).getByRole("button", { name: "發佈", exact: true });
const next = (page) => dialog(page).getByRole("button", { name: "幫我寫個帖文", exact: true });

async function guard(context, page) {
  const record = { states: [], blocked: [], browserErrors: [] };
  await context.route("**/*", (route) => {
    const request = route.request();
    if (allowedRequest(request.url(), request.method())) return route.continue();
    record.blocked.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return route.abort("blockedbyclient");
  });
  page.on("pageerror", (error) => record.browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") record.browserErrors.push(message.text()); });
  return record;
}
async function finish(record, info) {
  const path = info.outputPath("repair-evidence.json");
  await writeFile(path, JSON.stringify(record, null, 2));
  await info.attach("repair-evidence", { path, contentType: "application/json" });
  expect(record.blocked).toEqual([]);
  expect(record.browserErrors).toEqual([]);
}
async function shot(page, info, name) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled", caret: "hide" });
  await info.attach(name, { path, contentType: "image/png" });
}
async function layout(page, record, state, audit) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const data = await page.evaluate(() => {
    const modal = document.querySelector("dialog[open]");
    const cards = [...document.querySelectorAll("article")];
    const overlaps = cards.flatMap((card) => {
      const author = card.querySelector('[id^="journey-author-"] span'), control = card.querySelector('button[aria-label^="我有興趣"],button[aria-label^="撤回興趣"]');
      if (!author || !control) return [];
      const a = author.getBoundingClientRect(), b = control.getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top ? [card.dataset.journeyId] : [];
    });
    return { client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, columns: new Set(cards.map((c) => c.getBoundingClientRect().x)).size, overlaps,
      dialog: modal ? { client: modal.clientWidth, scroll: modal.scrollWidth } : null };
  });
  record.states.push({ state, ...data });
  expect(data.overlaps, `${state}: author and interest control`).toEqual([]);
  if (data.dialog) expect(data.dialog.scroll, `${state}: no dialog horizontal scrolling`).toBeLessThanOrEqual(data.dialog.client);
  if (audit) {
    const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    record.states.at(-1).violations = scan.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })) }));
    record.states.at(-1).incomplete = scan.incomplete.map((v) => v.id);
    expect(record.states.at(-1).violations, `${state}: accessibility rules remain enabled`).toEqual([]);
  }
  return data;
}
async function usableAction(page, button, record, state) {
  // Start from application-managed focus and use real Tab/Shift+Tab navigation.
  const stops = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")));
    stops.push(inside);
    expect(inside, `${state}: focus stays in the modal`).toBe(true);
    if (await button.evaluate((el) => el === document.activeElement)) break;
  }
  await expect(button).toBeFocused();
  await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await button.scrollIntoViewIfNeeded();
  const hit = await button.evaluate((el) => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { unobscured: y >= 0 && y < innerHeight && el.contains(top), width: r.width, height: r.height };
  });
  record.states.push({ state: `${state}-primary-action`, ...hit, keyboardStops: stops.length });
  expect(hit.unobscured, `${state}: primary action is not covered`).toBe(true);
  expect(hit.width).toBeGreaterThanOrEqual(44); expect(hit.height).toBeGreaterThanOrEqual(44);
}

for (const flightPresent of [false, true]) test(`A1 fixed-clock form matrix; optional flight ${flightPresent ? "present" : "absent"}`, async ({ page, context }, info) => {
  const record = await guard(context, page);
  try {
    await page.goto(`${baseURL}/v2-preview`); await publishNav(page).click();
    const day = await field(page, "夾車出發日期").inputValue();
    const at = (time) => new Date(`${day}T${time}+08:00`);
    const cases = [
      ["yesterday", plusDay(day, -1), "23:59", at("00:06:00"), false],
      ["earlier-today", day, "00:00", at("00:06:00"), false],
      ["exact-boundary", day, "00:06", at("00:06:00"), true],
      ["one-ms-past-boundary", day, "00:06", at("00:06:00.001"), false],
      ["later-today", day, "09:00", at("00:06:00"), true],
      ["tomorrow", plusDay(day, 1), "00:00", at("00:06:00"), true],
      ["cross-midnight", plusDay(day, 1), "00:00", at("23:59:59"), true],
    ];
    await dialog(page).getByRole("combobox", { name: "旅程方向", exact: true }).selectOption("to_airport");
    await dialog(page).locator("summary").filter({ hasText: "加啲行程資料" }).click();
    await field(page, "集合地點（選填）").fill("示範：保留集合資料");
    if (flightPresent) await field(page, "航班預定起飛（選填）").fill(`${plusDay(day, 2)}T01:00`);
    for (const [name, date, time, now, accepted] of cases) {
      await test.step(name, async () => {
        await page.clock.setFixedTime(now);
        await field(page, "夾車出發日期").fill(date); await field(page, "預計夾車出發時間").fill(time); await next(page).click();
        const preview = dialog(page).getByRole("heading", { name: "預覽同發佈帖文。", exact: true });
        expect(await preview.isVisible()).toBe(accepted);
        record.states.push({ name, date, time, fixedClock: now.toISOString(), flightPresent, accepted: await preview.isVisible() });
        if (accepted) {
          if (flightPresent) { await dialog(page).locator("summary").filter({ hasText: "核對航班時間" }).click(); await expect(dialog(page).locator("dl")).toContainText("01:00"); }
          await dialog(page).getByRole("button", { name: "返回修改", exact: true }).click();
        } else {
          await expect(dialog(page).getByRole("alert")).toHaveText(past);
          await expect(field(page, "夾車出發日期")).toHaveValue(date);
          await expect(field(page, "預計夾車出發時間")).toHaveValue(time);
          if (name === "earlier-today") await shot(page, info, "A1-past-departure-rejected");
        }
        if (!(await field(page, "集合地點（選填）").isVisible())) await dialog(page).locator("summary").filter({ hasText: "加啲行程資料" }).click();
        await expect(field(page, "集合地點（選填）")).toHaveValue("示範：保留集合資料");
        if (flightPresent) await expect(field(page, "航班預定起飛（選填）")).toHaveValue(`${plusDay(day, 2)}T01:00`);
      });
    }
    await page.clock.setFixedTime(at("00:06:00"));
    await field(page, "夾車出發日期").fill(day); await field(page, "預計夾車出發時間").fill("00:07"); await next(page).click();
    await dialog(page).getByRole("textbox", { name: "帖文標題", exact: true }).fill("示範：唔好改我嘅標題");
    await dialog(page).getByRole("textbox", { name: "帖文內文", exact: true }).fill("示範：保留我輸入嘅內文。");
    await page.clock.setFixedTime(at("00:07:00.001"));
    await dialog(page).getByRole("button", { name: "發佈示範帖文", exact: true }).click();
    await expect(dialog(page).getByRole("alert")).toHaveText(past);
    await expect(dialog(page).getByRole("textbox", { name: "帖文標題", exact: true })).toHaveValue("示範：唔好改我嘅標題");
    await expect(dialog(page).getByRole("textbox", { name: "帖文內文", exact: true })).toHaveValue("示範：保留我輸入嘅內文。");
    record.states.push({ name: "expired-at-final-publication", fixedClock: at("00:07:00.001").toISOString(), rejected: true, customCopyPreserved: true });
    await shot(page, info, "A1-expired-at-publication");
    await dialog(page).getByRole("button", { name: "返回修改", exact: true }).click();
    await expect(field(page, "預計夾車出發時間")).toHaveValue("00:07");
    await field(page, "預計夾車出發時間").fill("00:08"); await next(page).click();
    await dialog(page).getByRole("button", { name: "發佈示範帖文", exact: true }).click();
    await expect(dialog(page).getByRole("button", { name: "編輯旅程", exact: true })).toBeVisible();
    await expect(dialog(page)).toContainText("示範：保留我輸入嘅內文。");
    record.states.push({ name: "correct-time-and-publish", published: true });
  } finally { await finish(record, info); }
});

for (const mode of ["normal", "text-200", "native-zoom-200"]) for (const width of [320, 390]) {
  test(`A2/A3 ${mode} at ${width}px: home, filters, detail and creation`, async ({ page: fixturePage, context: fixtureContext }, info) => {
    let page = fixturePage, context = fixtureContext, owned = false;
    if (mode === "native-zoom-200") {
      const extension = fileURLToPath(new URL("./zoom-extension", import.meta.url));
      context = await chromium.launchPersistentContext("", { channel: "chromium", headless: true, locale: "zh-HK", timezoneId: "Asia/Hong_Kong", reducedMotion: "reduce", viewport: { width: width * 2, height: 1688 }, deviceScaleFactor: 1,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
      owned = true; page = context.pages()[0];
    } else await page.setViewportSize({ width, height: 844 });
    const record = await guard(context, page);
    record.mode = mode; record.effectiveWidth = width;
    try {
      await page.goto(`${baseURL}/v2-preview`); await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "*,*::before,*::after { scroll-behavior:auto !important; transition:none !important; animation:none !important; }" });
      if (owned) {
        const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
        const zoom = await worker.evaluate(async () => {
          const [tab] = await globalThis.chrome.tabs.query({ active: true });
          await globalThis.chrome.tabs.setZoomSettings(tab.id, { mode: "automatic", scope: "per-tab" });
          await globalThis.chrome.tabs.setZoom(tab.id, 2);
          return await globalThis.chrome.tabs.getZoom(tab.id);
        });
        const metrics = await page.evaluate(() => ({ cssWidth: innerWidth, dpr: devicePixelRatio, pinchScale: visualViewport.scale, cssZoom: getComputedStyle(document.body).zoom }));
        record.nativeZoom = { zoom, physicalViewport: width * 2, ...metrics };
        expect(zoom).toBe(2); expect(metrics.cssWidth).toBe(width); expect(metrics.dpr).toBe(2);
        expect(metrics.pinchScale).toBe(1); expect(metrics.cssZoom).toBe("1");
      }
      const enlarge = async () => { if (mode === "text-200") await resizeText(page, await dialog(page).count() ? "dialog[open]" : "body"); };
      await enlarge();
      if (mode === "text-200") await expect(page.locator('[data-text-reflow="true"]')).toHaveCount(1);
      const home = await layout(page, record, "homepage", mode !== "normal");
      expect(home.columns).toBe(mode === "text-200" ? 1 : 2);
      await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, info, "A2-homepage");
      const heart = page.getByRole("article").first().getByRole("button").last();
      await heart.scrollIntoViewIfNeeded();
      expect(await heart.evaluate((el) => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }), "Home interest action is not covered by navigation").toBe(true);
      await shot(page, info, "A3-author-and-interest");
      await page.getByRole("button", { name: /^篩選/ }).click();
      await dialog(page).locator("summary").filter({ hasText: "更多條件" }).click();
      await enlarge(); await layout(page, record, "airport-filters", mode !== "normal");
      const apply = dialog(page).getByRole("button", { name: /^睇 \d+ 個旅程$/ });
      await usableAction(page, apply, record, "airport-filters"); await shot(page, info, "A2-filters-action");
      await page.keyboard.press("Escape");
      await page.getByRole("article").first().getByRole("button").first().click();
      await enlarge(); await layout(page, record, "journey-details", mode !== "normal");
      await expect(dialog(page)).toContainText("發帖人 1 人 + 同行名額 3 個");
      await usableAction(page, dialog(page).getByRole("button", { name: "我有興趣", exact: true }), record, "journey-details");
      await shot(page, info, "A2-detail-action"); await page.keyboard.press("Escape");
      await publishNav(page).click();
      const day = await field(page, "夾車出發日期").inputValue(); await page.clock.setFixedTime(new Date(`${day}T00:06:00+08:00`));
      await dialog(page).locator("summary").filter({ hasText: "加啲行程資料" }).click();
      await field(page, "航班編號（選填）").fill("CX734");
      await field(page, "航班預定抵達（選填）").fill(`${day}T20:50`);
      await field(page, "預計出閘時間（選填）").fill(`${day}T21:30`);
      await enlarge(); await layout(page, record, "create-step-1", mode !== "normal");
      await usableAction(page, next(page), record, "create-step-1"); await shot(page, info, "A2-create-step-1-action");
      await page.keyboard.press("Enter");
      await expect(dialog(page).getByRole("heading", { name: "預覽同發佈帖文。", exact: true })).toBeVisible();
      await enlarge(); await layout(page, record, "create-preview", mode !== "normal");
      const publish = dialog(page).getByRole("button", { name: "發佈示範帖文", exact: true });
      await usableAction(page, publish, record, "create-preview"); await shot(page, info, "A2-create-preview-action");
      await page.keyboard.press("Enter"); await expect(dialog(page).getByRole("button", { name: "編輯旅程", exact: true })).toBeVisible();
      record.states.push({ state: "creation-after-resizing", published: true });
    } finally {
      try { await finish(record, info); }
      finally { if (owned) await context.close(); }
    }
  });
}
