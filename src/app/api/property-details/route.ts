import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/property-details — fetch all rows
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/property_details?order=property_id.asc`,
    { headers: HEADERS, cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    // Table may not exist yet — return empty gracefully
    if (text.includes("does not exist") || text.includes("relation")) {
      return NextResponse.json({ details: [], needsMigration: true });
    }
    console.error("property-details GET error:", text);
    return NextResponse.json({ details: [] });
  }
  const details = await res.json();
  return NextResponse.json({ details }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

// POST /api/property-details — upsert (create or replace) a property row
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, ...fields } = body;
    if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

    const row = {
      property_id:      propertyId,
      total_units:      Number(fields.totalUnits)    || 0,
      taxes_annual:     Number(fields.taxesAnnual)   || 0,
      insurance_annual: Number(fields.insuranceAnnual) || 0,
      electric_monthly: Number(fields.electricMonthly) || 0,
      water_monthly:    Number(fields.waterMonthly)   || 0,
      other_monthly:    Number(fields.otherMonthly)   || 0,
      trend:            (fields.trend as string) || "stable",
      notes:            (fields.notes as string)?.trim() || "",
      updated_at:       new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/property_details`, {
      method: "POST",
      headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });

    const text = await res.text();

    if (!res.ok) {
      // If the table doesn't exist, surface it clearly
      if (text.includes("does not exist") || text.includes("relation")) {
        return NextResponse.json({ error: "migration_required", sql: MIGRATION_SQL }, { status: 503 });
      }
      console.error("property-details POST error:", text);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("property-details POST catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// The SQL admin needs to run once in Supabase if the table doesn't exist
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS property_details (
  property_id       TEXT PRIMARY KEY,
  total_units       INT DEFAULT 0,
  taxes_annual      NUMERIC(10,2) DEFAULT 0,
  insurance_annual  NUMERIC(10,2) DEFAULT 0,
  electric_monthly  NUMERIC(10,2) DEFAULT 0,
  water_monthly     NUMERIC(10,2) DEFAULT 0,
  other_monthly     NUMERIC(10,2) DEFAULT 0,
  trend             TEXT DEFAULT 'stable',
  notes             TEXT DEFAULT '',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
-- If table already exists, add missing columns:
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'stable';
`.trim();
