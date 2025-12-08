import { z } from "zod";
import { unstable_cache } from "next/cache";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { chromium, type Browser, type Page } from "playwright";
import { safeGoto } from "~/server/utils/safeGoto";
import { getProductAvailability } from "~/server/services/scrapers/getAvailability";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getSecondsUntilEndOfDay() {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return Math.floor((end.getTime() - now.getTime()) / 1000);
}

// --- Singleton browser for reuse ---
let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
      ],
    });
  }
  return sharedBrowser;
}

// --- Create page with network blocking ---
async function createPage(): Promise<Page> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: DEFAULT_USER_AGENT,
    locale: "lv-LV",
    timezoneId: "Europe/Riga",
  });

  const page = await context.newPage();

  // Block images/fonts/analytics for speed
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.endsWith(".png") ||
      url.endsWith(".jpg") ||
      url.endsWith(".jpeg") ||
      url.endsWith(".gif") ||
      url.endsWith(".woff2") ||
      url.includes("analytics") ||
      url.includes("tracking")
    ) {
      route.abort();
    } else {
      route.continue();
    }
  });

  return page;
}

export const scrapeRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input }) => {
      const base = "https://www.jysk.lv";
      const page = await createPage();

      try {
        await safeGoto(
          page,
          `${base}/search?q=${encodeURIComponent(input.query)}`,
        );

        // Wait for first product link only
        const firstResult = page
          .locator("a.lupa-search-result-product-image-section")
          .first();
        await firstResult.waitFor({ state: "visible" });

        const productLink = await firstResult.getAttribute("href");
        if (!productLink) throw new Error("No product found for query");

        await safeGoto(page, base + productLink);

        const titleLocator = page.locator("h1.page-title");
        await titleLocator.waitFor({ state: "visible" });
        const title = await titleLocator.textContent();

        // Screenshot only product detail section (faster)
        const productSection = page.locator("div.product-detail");
        const screenshotBuffer = await productSection.screenshot();
        const screenshot = screenshotBuffer.toString("base64");

        return { title, screenshot };
      } finally {
        await page.close();
      }
    }),

  getProductAvailability: publicProcedure
    .input(z.object({ link: z.string(), size: z.string().optional() }))
    .query(async ({ input }) => {
      const page = await createPage(); // singleton browser
      try {
        console.log("getProductAvailability");
        await safeGoto(page, input.link);
        const availability = await getProductAvailability(page, input.size);
        await page.close();
        return availability;
      } catch (e) {
        await page.close();
        throw e;
      }
    }),

  getCupon: publicProcedure.query(async () => {
    const seconds = getSecondsUntilEndOfDay();

    const cachedGetCupon = unstable_cache(
      async () => {
        const page = await createPage();
        try {
          await page.goto("https://www.jysk.lv/darzam.html");

          const text = await page.locator(".promo-strip h2").textContent();
          if (!text) return "";

          return text.split(">>")[0]?.trim();
        } finally {
          await page.close();
        }
      },
      ["daily-cupon"], // cache key
      {
        revalidate: seconds, // expires at end of day
        tags: ["cupon"],
      },
    );

    return cachedGetCupon();
  }),
});
