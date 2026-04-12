/**
 * pushLeadsToSheet.js — Push scored leads to a Google Sheet via service account.
 *
 * Usage:
 *   node scripts/pushLeadsToSheet.js
 *
 * Reads:
 *   data/scored_leads/dubai.json
 *   data/scored_leads/riyadh.json
 *
 * Env vars (from .env):
 *   GOOGLE_SHEETS_CLIENT_EMAIL
 *   GOOGLE_SHEETS_PRIVATE_KEY
 *   GOOGLE_SHEETS_SPREADSHEET_ID
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { google } = require("googleapis");

const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
// dotenv parses quoted values and keeps \n as literal two-char sequences.
// Replace them with real newlines for the PEM key.
const PRIVATE_KEY = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "")
  .replace(/\\n/g, "\n");
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

if (!CLIENT_EMAIL || !PRIVATE_KEY || !SPREADSHEET_ID) {
  console.error("Missing env vars. Set GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID in .env");
  process.exit(1);
}

const SHEET_NAME = "Leads";

/**
 * Load scored leads from a JSON file, tagging each with city/country.
 */
function loadLeads(filePath, city, country) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(data)) return [];
    return data.map((lead) => ({ ...lead, city, country }));
  } catch {
    console.log(`Warning: could not parse ${filePath}`);
    return [];
  }
}

/**
 * Build an index of all audit JSONs for a city, keyed by hostname.
 * Allows matching leads to their audit regardless of path variations.
 */
function loadAuditIndex(cityKey) {
  const dir = path.join("data", "audits", cityKey);
  if (!fs.existsSync(dir)) return {};
  const index = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const audit = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      if (!audit.url) continue;
      const host = new URL(audit.url).hostname.replace(/^www\./, "").toLowerCase();
      index[host] = audit;
    } catch {
      // skip unreadable audit files
    }
  }
  return index;
}

/**
 * Look up the audit for a given lead URL against a city's audit index.
 */
function findAudit(leadUrl, index) {
  try {
    const host = new URL(leadUrl).hostname.replace(/^www\./, "").toLowerCase();
    return index[host] || null;
  } catch {
    return null;
  }
}

(async () => {
  // Load leads from both cities, tagged with a cityKey for audit lookup
  const dubaiLeads = loadLeads("data/scored_leads/dubai.json", "Dubai", "UAE").map((l) => ({ ...l, cityKey: "dubai" }));
  const riyadhLeads = loadLeads("data/scored_leads/riyadh.json", "Riyadh", "KSA").map((l) => ({ ...l, cityKey: "riyadh" }));
  const allLeads = [...dubaiLeads, ...riyadhLeads];

  // Load audit indexes per city (by hostname)
  const auditIndex = {
    dubai: loadAuditIndex("dubai"),
    riyadh: loadAuditIndex("riyadh"),
  };

  // Filter out failed / score-0 leads
  const validLeads = allLeads.filter(
    (l) => l.overall_score > 0 && !l.exclude_from_outreach
  );

  console.log(`Total leads: ${allLeads.length}`);
  console.log(`Valid leads (score > 0): ${validLeads.length}`);

  if (validLeads.length === 0) {
    console.log("No valid leads to push.");
    process.exit(0);
  }

  // Build rows
  const header = [
    "City",
    "Country",
    "Name",
    "Website URL",
    "Overall Score",
    "Visual Score",
    "UX Score",
    "Lead-Capture Score",
    "Key Issues",
    "Suggested Pitch",
    "Contacted",
    "Email",
    "Phone",
    "LinkedIn",
    "Instagram",
    "Facebook",
    "Twitter",
  ];

  const rows = validLeads.map((l) => {
    const audit = findAudit(l.url, auditIndex[l.cityKey] || {});
    const emails = (audit && audit.emails) || [];
    const phones = (audit && audit.phones) || [];
    const social = (audit && audit.social_links) || {};

    return [
      l.city || "",
      l.country || "",
      l.name || "",
      l.url || "",
      l.overall_score || 0,
      l.visual_score || 0,
      l.ux_score || 0,
      l.lead_capture_score || 0,
      (l.key_issues || []).join("; "),
      l.suggested_pitch || "",
      "",
      emails[0] || "",
      phones[0] || "",
      social.linkedin || "",
      social.instagram || "",
      social.facebook || "",
      social.twitter || "",
    ];
  });

  // Sort by overall score descending
  rows.sort((a, b) => b[4] - a[4]);

  const values = [header, ...rows];

  // Authenticate via service account
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Check if "Leads" sheet exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets.some(
      (s) => s.properties.title === SHEET_NAME
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: SHEET_NAME },
              },
            },
          ],
        },
      });
      console.log(`Created sheet: "${SHEET_NAME}"`);
    } else {
      // Clear existing content
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}`,
      });
      console.log(`Cleared existing sheet: "${SHEET_NAME}"`);
    }

    // Write all rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    console.log(`\nDone! ${rows.length} lead rows written to "${SHEET_NAME}" sheet.`);
    console.log(`Spreadsheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
  } catch (err) {
    console.error(`Google Sheets API error: ${err.message}`);
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Details: ${JSON.stringify(err.response.data?.error?.message || "")}`);
    }
    process.exit(1);
  }
})();
