import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { chromium } from "playwright";
import { getSubcategorieLinks } from "~/server/services/scrapers/getSubcategorieLinks";
import { getProductLinks } from "~/server/services/scrapers/getProductLinks";
import { getProductInfo } from "~/server/services/scrapers/getProductInfo";
import { safeGoto } from "~/server/utils/safeGoto.ts";

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

  subcategories: publicProcedure.query(async () => {
    console.log("prefetch");
    // const links = await getSubcategorieLinks(
    //   "https://www.jysk.lv/birojam.html",
    // );
    //
    // if (!links || links.length === 0) {
    //   return { links, error: "No subcategories found" };
    // }
    //
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await safeGoto(page, "https://www.jysk.lv/aizkari/aizkari.html");

    // const productLinks = await getProductLinks(page);
    //
    return {
      // links: productLinks.allLinks,
      // subcategories: links,
      subcategories: [],
      // screenshot: productLinks.screenshot,
    };
  }),

  product: publicProcedure
    .input(z.object({ productLink: z.string() }))
    .query(async ({ input }) => {
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      const page = await context.newPage();
      await safeGoto(page, input.productLink);

      const productInfo = await getProductInfo(page);
      return { productInfo };
    }),
});
