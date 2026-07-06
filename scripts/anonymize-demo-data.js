#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'supabase', 'mock-db-seed.json');
const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// ═══════════════════════════════════════════
// REPLACEMENT MAPPINGS
// ═══════════════════════════════════════════

const allReplacements = {
  // Property names
  "City Centre Professional Suites": "Metro Park Professional Suites",
  "Bristol CoWork": "Summit CoWork",
  "St. Albert Court Apartments": "Riverside Court Apartments",
  "Virginia Heights Residential": "Highland Ridge Townhomes",
  "The Executive — Premier Office Suites": "The Pinnacle — Premier Office Suites",
  "West State Commons — Offices & Warehouse": "Commerce Park — Offices & Warehouse",
  "Centre Point — Corporate Suites": "Midtown Point — Corporate Suites",
  "Foundation Event Facility": "Heritage Event Facility",
  "Jamestown at Shelby": "Madison Square at Oakley",
  // Property IDs
  "city-centre": "metro-park",
  "bristol-cowork": "summit-cowork",
  "st-albert-apartments": "riverside-court",
  "virginia-heights": "highland-ridge",
  "the-executive": "the-pinnacle",
  "west-state-commons": "commerce-park",
  "centre-point-suites": "midtown-point",
  "foundation-event-facility": "heritage-event",
  // Addresses
  "100 5th St., Bristol, TN 37620": "200 Commerce Ave., Ashton, TN 37601",
  "620 State Street, Bristol, TN": "450 Market Street, Ashton, TN 37601",
  "312 Spencer St., Bristol, TN 37620": "185 River Walk Dr., Ashton, TN 37601",
  "804 Commonwealth Ave, Bristol, VA 24201": "720 Highland Blvd., Ashton, VA 24210",
  // Cities
  "Downtown Bristol, TN": "Downtown Ashton, TN",
  "Bristol, VA (Casino Adjacent)": "Ashton, VA (Entertainment District)",
  "Bristol, TN": "Ashton, TN",
  "Bristol, VA": "Ashton, VA",
  // Tenant/contact names
  "Bristol Catering Company": "Valley Catering Company",
  "Julie McClanahan": "Jessica Morgan",
  "jmcclanahan@bristolcatering.com": "jmorgan@valleycatering.com",
  "423-573-1022": "423-555-1022",
  "Wolf Hills Law Group": "Summit Law Group",
  "Blake Thornton, Esq.": "Brian Thompson, Esq.",
  "bthornton@wolfhillslaw.com": "bthompson@summitlaw.com",
  "Allen Hurley": "Alex Harrison",
  // Admin/worker emails
  "demo@teamvisionllc.com": "demo@visionpip-demo.com",
  "john@teamvisionllc.com": "john@visionpip-demo.com",
  "mary@teamvisionllc.com": "mary@visionpip-demo.com",
  // Lead company refs
  "tricitiesmedical.org": "valleymedgroup.org",
  "vancelogistics.com": "ventureship.com",
  // Description text
  "Downtown Bristol": "Downtown Ashton",
  "State Street": "Market Street",
};

function deepReplace(obj, replacements) {
  if (typeof obj === 'string') {
    let result = obj;
    for (const [from, to] of replacements) {
      result = result.split(from).join(to);
    }
    return result;
  }
  if (Array.isArray(obj)) return obj.map(item => deepReplace(item, replacements));
  if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = deepReplace(value, replacements);
    }
    return newObj;
  }
  return obj;
}

// Sort by length (longest first) to avoid partial replacements
const sorted = Object.entries(allReplacements).sort((a, b) => b[0].length - a[0].length);

const anonymized = deepReplace(data, sorted);
fs.writeFileSync(seedPath, JSON.stringify(anonymized, null, 2), 'utf8');
console.log('✅ Seed data anonymized!');
console.log('Tables:', Object.keys(anonymized).join(', '));
