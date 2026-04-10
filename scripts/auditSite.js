/**
 * auditSite.js — Audit a single website using Playwright.
 *
 * Usage:
 *   node scripts/auditSite.js <url> <city>
 *
 * Outputs:
 *   data/raw_sites/{city}/{domain}.png   — full-page screenshot
 *   data/audits/{city}/{domain}.html     — saved HTML (for MarkItDown conversion)
 *   data/audits/{city}/{domain}.json     — structured audit record
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const url = process.argv[2];
const city = process.argv[3] || "dubai";

if (!url) {
  console.error("Usage: node scripts/auditSite.js <url> <city>");
  process.exit(1);
}

// Convert URL to safe filename: "www.example-store.com/ae/en/" → "www_example-store_com"
function domainSlug(u) {
  try {
    return new URL(u).hostname.replace(/\./g, "_");
  } catch {
    return u.replace(/[^a-zA-Z0-9-]/g, "_");
  }
}

(async () => {
  const domain = domainSlug(url);
  const screenshotDir = path.join("data", "raw_sites", city);
  const auditDir = path.join("data", "audits", city);

  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(auditDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, `${domain}.png`);
  const htmlPath = path.join(auditDir, `${domain}.html`);
  const auditPath = path.join(auditDir, `${domain}.json`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const audit = {
    url,
    screenshot_path: null,
    has_chat: false,
    has_whatsapp: false,
    main_cta: "none",
    hero_text: "",
    nav_items: [],
    visual_impression: "",
    markdown_summary_path: null,
  };

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Screenshot
    await page.screenshot({ path: screenshotPath, fullPage: true });
    audit.screenshot_path = screenshotPath.replace(/\\/g, "/");

    // Save HTML for MarkItDown
    const html = await page.content();
    fs.writeFileSync(htmlPath, html, "utf-8");

    // Hero text: first h1, fallback to largest heading
    audit.hero_text = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      if (h1 && h1.innerText.trim()) return h1.innerText.trim().slice(0, 120);
      const h2 = document.querySelector("h2");
      if (h2 && h2.innerText.trim()) return h2.innerText.trim().slice(0, 120);
      return "";
    });

    // Main CTA: first prominent link/button
    audit.main_cta = await page.evaluate(() => {
      const selectors = [
        'a.btn', 'a.button', 'a.cta', 'button.cta',
        'a[class*="btn"]', 'a[class*="button"]', 'a[class*="cta"]',
        '.hero a', '.banner a', 'header a[class*="shop"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) {
          const text = el.innerText.trim().slice(0, 60);
          const href = el.getAttribute("href") || "";
          return `${text} → ${href}`;
        }
      }
      return "none";
    });

    // Chat widget detection
    audit.has_chat = await page.evaluate(() => {
      const chatSelectors = [
        '[class*="chat"]', 'iframe[src*="tawk"]', 'iframe[src*="tidio"]',
        '#hubspot-messages-iframe-container', '[class*="livechat"]',
        'iframe[src*="livechat"]', '[id*="chat"]',
      ];
      return chatSelectors.some((s) => document.querySelector(s) !== null);
    });

    // WhatsApp detection
    audit.has_whatsapp = await page.evaluate(() => {
      const waSelectors = [
        'a[href*="wa.me"]', 'a[href*="whatsapp.com"]', '[class*="whatsapp"]',
        'a[href*="api.whatsapp"]',
      ];
      return waSelectors.some((s) => document.querySelector(s) !== null);
    });

    // Nav items (top-level, max 8)
    audit.nav_items = await page.evaluate(() => {
      const nav = document.querySelector("nav") || document.querySelector('[role="navigation"]');
      if (!nav) return [];
      const links = nav.querySelectorAll("a");
      const items = [];
      for (const a of links) {
        const text = a.innerText.trim();
        if (text && text.length < 30 && items.length < 8 && !items.includes(text)) {
          items.push(text);
        }
      }
      return items;
    });

    // Visual impression (short)
    const viewport = page.viewportSize();
    audit.visual_impression = await page.evaluate(({ w }) => {
      const body = document.body;
      const hasDarkBg = getComputedStyle(body).backgroundColor.includes("0, 0, 0") ||
        getComputedStyle(body).backgroundColor.includes("rgb(0");
      const theme = hasDarkBg ? "Dark theme" : "Light theme";
      const heroImg = document.querySelector('.hero img, .banner img, [class*="hero"] img');
      const heroNote = heroImg ? "has hero image" : "no hero image";
      return `${theme}, ${heroNote}`;
    }, { w: viewport?.width });

  } catch (err) {
    audit.visual_impression = `FAILED: ${err.message.slice(0, 80)}`;
    audit.screenshot_path = null;
  }

  // Write audit JSON
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2), "utf-8");
  console.log(`Audit saved: ${auditPath}`);
  console.log(`HTML saved:  ${htmlPath}`);
  console.log(`Screenshot:  ${screenshotPath}`);

  await browser.close();
})();
