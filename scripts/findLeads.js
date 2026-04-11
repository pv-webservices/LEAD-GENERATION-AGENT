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
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for the results list to render
    await page.waitForTimeout(3000);

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

    // Extract business cards from the page
    // 2GIS uses hashed class names, so we rely on structure:
    // - Business cards are clickable elements with a title-like text
    // - Website links contain external URLs (not 2gis.ae internal links)
    newLeads = await page.evaluate((maxResults) => {
      const results = [];
      const seen = new Set();

      // Strategy: find all links on the page, identify business cards
      // by looking for links that point to 2GIS firm pages (/firm/),
      // then look for sibling/nearby external website links
      const allLinks = document.querySelectorAll("a[href]");

      // First pass: collect business names from firm links
      const businesses = [];
      for (const a of allLinks) {
        const href = a.getAttribute("href") || "";
        const text = a.innerText.trim().split("\n")[0];

        // 2GIS firm detail links look like: /dubai/firm/... or contain /firm/
        if (href.includes("/firm/") && text && text.length > 2 && text.length < 150) {
          if (!seen.has(text)) {
            seen.add(text);
            // Walk up to find the parent card container
            let card = a.closest('[class]');
            // Try to find a wider card container (up to 5 levels)
            for (let i = 0; i < 5 && card; i++) {
              if (card.querySelector('a[href^="http"]') && card.offsetHeight > 60) break;
              card = card.parentElement;
            }
            businesses.push({ name: text, card });
          }
        }
      }

      // Second pass: for each business, find an external website link in its card
      for (const biz of businesses) {
        if (results.length >= maxResults) break;
        if (!biz.card) continue;

        const cardLinks = biz.card.querySelectorAll("a[href]");
        let websiteUrl = null;

        for (const link of cardLinks) {
          const href = link.getAttribute("href") || "";
          // External link: starts with http, not 2gis internal
          if (
            href.startsWith("http") &&
            !href.includes("2gis.") &&
            !href.includes("google.") &&
            !href.includes("facebook.com") &&
            !href.includes("instagram.com") &&
            !href.includes("twitter.com") &&
            !href.includes("youtube.com") &&
            !href.includes("linkedin.com")
          ) {
            websiteUrl = href;
            break;
          }
        }

        if (websiteUrl && !results.some((r) => r.url === websiteUrl)) {
          results.push({ name: biz.name, url: websiteUrl });
        }
      }

      return results;
    }, MAX_RESULTS);

    console.log(`Found ${newLeads.length} businesses with websites.`);
  } catch (err) {
    console.error(`Error during search: ${err.message}`);
    await browser.close();
    process.exit(1);
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
