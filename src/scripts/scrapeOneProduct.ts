#!/usr/bin/env ts-node
import { chromium } from "playwright";
import { getProductInfo } from "../server/services/scrapers/getProductInfo.ts";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "lv-LV",
    timezoneId: "Europe/Riga",
  });
  const page = await context.newPage();
  await page.goto("https://www.jysk.lv/matracis-prestige-luxury-133244-lv.html");
  const info = await getProductInfo(page);
  console.log(info);
  await page.close();
  await browser.close();
})();
