import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { chromium } from "playwright"; // ← playwright instead of puppeteer
import { safeGoto } from "~/server/utils/safeGoto.ts";

export const postRouter = createTRPCRouter({
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
});
