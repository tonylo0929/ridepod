import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const port = Number(process.env.FAREENOUGH_UX_PORT || 3044);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("FAREENOUGH_UX_PORT must be an integer from 1024 to 65535.");

export const baseURL = `http://127.0.0.1:${port}`;
export const reviewDir = join(repoRoot, "docs", "ux-review");
export const resultsDir = join(repoRoot, "test-results", "ux-review");
export const maxScreenshotBytes = 4 * 1024 * 1024;
export const screens = [
  ["01-homepage", "Homepage and masonry feed", "Default airport feed, with route/date, optional flight, independent interest and capacity, and author."],
  ["02-airport-search", "Airport search", "Destination search plus a normalized `cx 734` flight filter; one synthetic matching journey."],
  ["03-airport-filters", "Airport filters", "Common district/planned places/direction filters, with selected advanced conditions folded away. Places are not confirmed remaining seats."],
  ["04-popular-routes", "Popular routes", "The 屯門 → 中環 corridor; both one-off and recurring demo journeys are discoverable."],
  ["05-journey-details", "Arrival journey details", "Full uncropped illustration and journey overview. Lower airport timing/interest information appears in the before/after states."],
  ["06-create-step-1", "Create Post — step 1", "Essential fields first; optional trip details are collapsed."],
  ["07-create-step-2", "Create Post — preview", "Compact full-date car departure summary, editable Cantonese copy, optional flight timeline/cover, and normal-flow publish action."],
  ["08-interest-before", "Interest — before", "Another person's journey: zero interested people, maximum planned group of four, and 我有興趣."],
  ["09-interest-after", "Interest — after", "The same viewport after interest: one interested person, capacity still four, and 撤回興趣."],
  ["10-my-journeys", "My Journeys", "One local published journey and one interested journey, with the refresh warning."],
];

/** Never send a test browser to production, APIs, authentication or remote assets. */
export function allowedRequest(rawURL, method = "GET") {
  const url = new URL(rawURL);
  if (url.origin !== baseURL || !["GET", "HEAD"].includes(method)) return false;
  if (url.pathname === "/_next/image") {
    const image = url.searchParams.get("url") || "";
    return /^\/avatars\/animals\/[a-z-]+\.png$/.test(image);
  }
  return url.pathname === "/v2-preview" || url.pathname === "/v2-preview/" ||
    url.pathname.startsWith("/_next/static/") ||
    /^\/avatars\/animals\/[a-z-]+\.png$/.test(url.pathname) ||
    url.pathname === "/favicon.ico";
}
