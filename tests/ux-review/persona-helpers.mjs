import { test as base, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { allowedRequest, baseURL } from "../../scripts/ux-review/settings.mjs";

export { expect };
export const test = base.extend({
  session: [async ({ page, context }, provide, info) => {
    const start = performance.now();
    const record = { scenario: info.title, started: new Date().toISOString(), browser: context.browser().version(), actions: [], checks: [], observations: [], screenshots: [], blocked: [], browserErrors: [] };
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (allowedRequest(request.url(), request.method())) return route.continue();
      const url = new URL(request.url());
      record.blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort("blockedbyclient");
    });
    page.on("pageerror", (error) => record.browserErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") record.browserErrors.push(message.text()); });
    const session = {
      record,
      async act(label, action) {
        return base.step(label, async () => {
          const at = performance.now();
          try {
            const response = await action();
            record.actions.push({ n: record.actions.length + 1, label, elapsedMs: Math.round(performance.now() - at), response });
            return response;
          } catch (error) {
            record.actions.push({ n: record.actions.length + 1, label, error: error.message });
            throw error;
          }
        });
      },
      check(task, outcome, actual) { record.checks.push({ task, outcome, actual }); },
      observe(label, actual) { record.observations.push({ label, actual }); },
      async shot(name) {
        await page.evaluate(() => document.fonts.ready);
        const path = info.outputPath(`${name}.png`);
        await page.screenshot({ path, animations: "disabled", caret: "hide" });
        await info.attach(name, { path, contentType: "image/png" });
        record.screenshots.push({ name, path });
      },
    };
    try {
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      await page.clock.setFixedTime(new Date(`${day}T00:06:00+08:00`));
      record.clockMethod = "Browser Date fixed to 00:06 HKT on the server's current Hong Kong date; P3 explicitly resets it from the form date.";
      await session.act("Begin at the normal V2 homepage in a fresh context", () => page.goto(`${baseURL}/v2-preview`).then(() => ({ url: page.url() })));
      await expect(page.getByRole("heading", { name: "下一程，搵個同路人。", exact: true })).toBeVisible();
      record.homepage = await page.locator("body").ariaSnapshot();
      record.viewport = page.viewportSize();
      await provide(session);
      expect(record.blocked, "No production/API/auth/external requests").toEqual([]);
      expect(record.browserErrors, "No browser errors").toEqual([]);
    } finally {
      record.durationMs = Math.round(performance.now() - start);
      record.execution = info.status || "completed";
      const path = info.outputPath("observations.json");
      await writeFile(path, JSON.stringify(record, null, 2));
      await info.attach("persona-observations", { path, contentType: "application/json" });
    }
  }, { auto: true }],
});

export const dialog = (page) => page.getByRole("dialog");
export const nav = (page, name) => page.getByRole("navigation", { name: "主要導覽", exact: true }).getByRole("button", { name, exact: true });
export const close = (page) => dialog(page).getByRole("button", { name: "關閉", exact: true }).click();
export const search = (page) => page.getByRole("textbox", { name: "搜尋目的地或旅程", exact: true });
export const flightSearch = (page) => page.getByRole("textbox", { name: "按航班編號篩選", exact: true });
export const next = (page) => dialog(page).getByRole("button", { name: "幫我寫個帖文", exact: true }).click();
export const field = (page, name) => dialog(page).getByLabel(name, { exact: true });
export const combo = (page, name) => dialog(page).getByRole("combobox", { name, exact: true });
export const optional = (page) => dialog(page).locator("summary").filter({ hasText: "加啲行程資料" }).click();
export const cards = (page) => page.getByRole("article");
// Instrument text size only: snapshot computed values before applying them so nested
// labels are not accidentally enlarged fourfold. This is not native browser zoom.
export const resizeText = (page, selector) => page.evaluate((rootSelector) => {
  const root = document.querySelector(rootSelector);
  const elements = [...root.querySelectorAll("*")].filter((el) => !el.closest("svg,script,style") && (el.matches("button,input,select,textarea") || [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())));
  const sizes = elements.filter((el) => !el.hasAttribute("data-ux-original-font-size")).map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }));
  const heading = root.querySelector("h1,h2"), before = getComputedStyle(heading).fontSize;
  sizes.forEach(({ el, size }) => { el.setAttribute("data-ux-original-font-size", String(size)); el.style.setProperty("font-size", `${size * 2}px`, "important"); });
  return { elements: sizes.length, headingBefore: before, headingOriginal: heading.getAttribute("data-ux-original-font-size"), headingAfter: getComputedStyle(heading).fontSize, method: "computed CSS font-size doubled once per element; not native browser zoom" };
}, selector);
export const plusDay = (date, days) => {
  const value = new Date(`${date}T12:00:00+08:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
