/**
 * findLeads.js — Discover furniture/decor store leads via 2GIS directory.
 *
 * Usage:
 *   node scripts/findLeads.js <city> "<query>"
 *
 * Examples:
 *   node scripts/findLeads.js dubai "Home decor"
 *   node scripts/findLeads.js dubai "furniture store"
 *   node scripts/findLeads.js riyadh "furniture store"
 *
 * Outputs:
 *   data/raw_sites/{city}.json — merged & deduplicated lead list
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const city = process.argv[2];
const query = process.argv[3];

if (!city || !query) {
  console.error('Usage: node scripts/findLeads.js <city> "<query>"');
  console.error("  city: dubai | riyadh");
  process.exit(1);
}

const CITY_MAP = {
  dubai: {
    city: "dubai",
    country: "AE",
    baseUrl: "https://2gis.ae/dubai/search/",
  },
  riyadh: {
    city: "riyadh",
    country: "SA",
    baseUrl: "https://2gis.ae/riyadh/search/",
  },
};

const config = CITY_MAP[city.toLowerCase()];
if (!config) {
  console.error(`Unknown city: "${city}". Use "dubai" or "riyadh".`);
  process.exit(1);
}

const MAX_RESULTS = 20;

(async () => {
  const outputDir = path.join("data", "raw_sites");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `${config.city}.json`);

  const searchUrl = `${config.baseUrl}${encodeURIComponent(query)}`;
  console.log(`Searching 2GIS: ${searchUrl}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let newLeads = [];

  try {
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Give 2GIS extra time to load JS-heavy content
    await page.waitForTimeout(5000);
    // Try to wait for any result cards to appear (but don't throw if they don't)
    try {
      await page.waitForSelector("a[href^='http']", { timeout: 10000 });
    } catch (e) {
      console.log("No obvious result links detected yet, continuing anyway...");
    }

    // Scroll the results panel to load more cards
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        // 2GIS renders results inside a scrollable sidebar panel
        const panels = document.querySelectorAll('[class*="scroll"]');
        for (const p of panels) {
          p.scrollTop += 600;
        }
        // Fallback: scroll any element that looks like the results list
        const lists = document.querySelectorAll('[role="list"], [class*="catalog"], [class*="search"]');
        for (const l of lists) {
          if (l.scrollHeight > l.clientHeight) {
            l.scrollTop += 600;
          }
        }
      });
      await page.waitForTimeout(1000);
    }

    // Extract all external links from the page in a single pass
    newLeads = await page.evaluate((maxResults) => {
      const results = [];
      const seenUrls = new Set();
      const skipLabels = ["website", "directions", "call", "view on map", "route", "share"];
      const skipDomains = ["2gis.", "google.", "facebook.com", "instagram.com", "twitter.com", "youtube.com", "linkedin.com"];

      const allLinks = document.querySelectorAll("a[href]");

      for (const a of allLinks) {
        if (results.length >= maxResults) break;

        const href = a.getAttribute("href") || "";
        const text = (a.innerText || "").trim().split("\n")[0].trim();

        // Skip empty or very short text
        if (!text || text.length < 3) continue;

        // Skip generic UI labels
        if (skipLabels.includes(text.toLowerCase())) continue;

        // Must be an absolute URL
        if (!href.startsWith("http")) continue;

        // Skip internal / social domains
        if (skipDomains.some((d) => href.includes(d))) continue;

        // Deduplicate by URL
        if (seenUrls.has(href)) continue;
        seenUrls.add(href);

        results.push({ name: text, url: href });
      }

      return results;
    }, MAX_RESULTS);

    console.log(`Found ${newLeads.length} businesses with websites.`);
  } catch (err) {
    console.error(`Error during search: ${err.message}`);
    await browser.close();
    process.exit(0);
  }

  await browser.close();

  // Build lead objects matching maps-seed-search schema
  const cleaned = newLeads.map((lead) => ({
    name: lead.name,
    url: lead.url,
    city: config.city,
    country: config.country,
    source: "2gis",
    notes: "",
  }));

  if (cleaned.length === 0) {
    console.log("No valid leads found. Try a different query.");
    process.exit(0);
  }

  // Merge with existing file, deduplicate by url
  let existing = [];
  if (fs.existsSync(outputFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
      if (!Array.isArray(existing)) existing = [];
    } catch {
      console.log("Warning: existing file was not valid JSON, starting fresh.");
      existing = [];
    }
  }

  const existingUrls = new Set(existing.map((e) => e.url));
  let added = 0;

  for (const lead of cleaned) {
    if (!existingUrls.has(lead.url)) {
      existing.push(lead);
      existingUrls.add(lead.url);
      added++;
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(existing, null, 2), "utf-8");
  console.log(`\nResults:`);
  console.log(`  New leads added: ${added}`);
  console.log(`  Duplicates skipped: ${cleaned.length - added}`);
  console.log(`  Total leads in file: ${existing.length}`);
  console.log(`  Saved to: ${outputFile}`);
})();
