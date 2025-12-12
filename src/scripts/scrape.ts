import scrapeAllProductLinks from "../server/services/scrapers/scrapeAllProductLinks.ts";

(async () => {
  const categoryLinks = [
    "https://www.jysk.lv/ziemassvetkiem.html",
    "https://www.jysk.lv/darzam.html",
    "https://www.jysk.lv/gulamistabai.html",
    "https://www.jysk.lv/vannas-istabai.html",
    "https://www.jysk.lv/birojam.html",
    "https://www.jysk.lv/dzivojamai-istabai.html",
    "https://www.jysk.lv/edamistabai.html",
    "https://www.jysk.lv/uzglabasanai.html",
    "https://www.jysk.lv/aizkari.html",
    "https://www.jysk.lv/majokla-dizains.html",
  ];

  const result = await scrapeAllProductLinks(categoryLinks);
  console.log(result.length, "links found");

  process.exit(0);
})();
