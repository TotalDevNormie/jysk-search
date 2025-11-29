import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { chromium } from "playwright";
import { safeGoto } from "~/server/utils/safeGoto.ts";
import { getProductAvailability } from "~/server/services/scrapers/getAvailability";

const categoryLinks = [
  "https://www.jysk.lv/darzam.html",
  "https://www.jysk.lv/gulamistabai.html",
  "https://www.jysk.lv/vannas-istabai.html",
  "https://www.jysk.lv/birojam.html",
  "https://www.jysk.lv/dzivojamai-istabai.html",
  "https://www.jysk.lv/edamistabai.html",
  "https://www.jysk.lv/uzglabasanai.html",
  "https://www.jysk.lv/aizkari.html",
  "https://www.jysk.lv/majokla-dizains.html",
  "https://www.jysk.lv/mebelu-kolekcijas.html",
];

export const scrapeRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input }) => {
      const base = "https://www.jysk.lv";

      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      const page = await context.newPage();
      await safeGoto(page, base + "/search?q=" + input.query);
      await page.waitForLoadState("networkidle");

      const firstResult = await page.$(
        "a.lupa-search-result-product-image-section",
      );
      const productLink = await firstResult?.getAttribute("href");

      await safeGoto(page, base + productLink);

      const title = await page.textContent("h1.page-title");

      const screenshotBuffer = await page.screenshot({ fullPage: true });
      const screenshot = screenshotBuffer.toString("base64");

      await browser.close();

      return { title, screenshot };
    }),

  getProductAvailability: publicProcedure
    .input(z.object({ link: z.string(), size: z.string().optional() }))
    .query(async ({ input }) => {
      let browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });

      let context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale: "lv-LV",
        timezoneId: "Europe/Riga",
      });

      const p = await context.newPage();
      await p.goto(input.link);
      if (input.size) await p.waitForLoadState("networkidle");
      const availability = await getProductAvailability(p, input.size);
      await p.close();
      await browser.close();

      return availability;
    }),

});
