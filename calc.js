const PROPERTIES = [
  { id: "city-centre", name: "City Centre Professional Suites" },
  { id: "bristol-cowork", name: "Bristol CoWork" },
  { id: "the-executive", name: "The Executive — Premier Office Suites" },
  { id: "centre-point-suites", name: "Centre Point" },
  { id: "foundation-event-facility", name: "Foundation Event Facility" },
  { id: "west-state-commons", name: "West State Commons — Offices & Warehouse" },
  { id: "815-shelby-street", name: "Jamestown at Shelby" },
  { id: "250-commonwealth-ave", name: "250 Commonwealth Ave" },
  { id: "628-state-street", name: "628 State Street" }
];

const PROPERTY_DROPDOWN_NAMES = {
  "city-centre": ["City Centre Professional Suites", "City Centre"],
  "bristol-cowork": ["Bristol CoWork"],
  "the-executive": ["The Executive"],
  "centre-point-suites": ["Centre Point"],
  "foundation-event-facility": ["Foundation Event Facility"],
  "commercial-warehouse": ["Commercial Warehouse"],
  "west-state-commons": ["West State Commons"],
  "815-shelby-street": ["Jamestown at Shelby"],
  "250-commonwealth-ave": ["250 Commonwealth Ave"],
  "628-state-street": ["628 State Street"],
};

function exactBuildingMatch(tenantBuilding, propertyId, displayName) {
  if (!tenantBuilding) return false;
  const b = tenantBuilding.trim().toLowerCase();
  if (displayName && b === displayName.trim().toLowerCase()) return true;
  const names = PROPERTY_DROPDOWN_NAMES[propertyId];
  if (names && names.some(n => b === n.toLowerCase())) return true;
  return false;
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - new Date("2026-06-09").getTime()) / 86400000); // 2026-06-09
}

async function run() {
  const [tRes, pRes] = await Promise.all([
    fetch("https://jjbswcdsssthqecrcafl.supabase.co/rest/v1/tenants", {
      headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnN3Y2Rzc3N0aHFlY3JjYWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDU2OTQsImV4cCI6MjA5MTc4MTY5NH0._2Lq5EfavNtc2_ghxOzyDwuOi7LKDYhQtIg04Y0MhD0" }
    }),
    fetch("https://jjbswcdsssthqecrcafl.supabase.co/rest/v1/properties", {
      headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnN3Y2Rzc3N0aHFlY3JjYWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDU2OTQsImV4cCI6MjA5MTc4MTY5NH0._2Lq5EfavNtc2_ghxOzyDwuOi7LKDYhQtIg04Y0MhD0" }
    })
  ]);
  const tenants = await tRes.json();
  const dynProps = await pRes.json();

  const staticProps = PROPERTIES.map(p => ({
    id: p.id, name: p.name
  }));
  const staticIds = new Set(staticProps.map(p => p.id));
  const uniqueDyn = dynProps.filter(p => !staticIds.has(p.id)).map(p => ({
    id: p.id, name: p.name
  }));
  const allProperties = [...staticProps, ...uniqueDyn];

  const detailMap = {};

  const propData = allProperties.map(p => {
    const d = detailMap[p.id];
    const displayName = d?.display_name || p.name; // FIXED: fallback to p.name
    const pts = tenants.filter(t => exactBuildingMatch(t.building || "", p.id, displayName));
    const activePts = pts.filter(t => t.status === "active");
    const totalUnits = d?.total_units || activePts.length || 1;
    const occupancy = Math.min(100, Math.round((activePts.length / totalUnits) * 100));
    const alerts = pts.filter(t => {
      const days = daysUntil(t.leaseEnd || t.renewalDate);
      return days !== null && days <= 90;
    }).length;
    return { id: p.id, name: p.name, occupancy, alerts, matchedCount: pts.length, activeCount: activePts.length };
  });

  console.log(JSON.stringify(propData, null, 2));
}

run();
