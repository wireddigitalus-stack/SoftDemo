import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  "apikey":        SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type":  "application/json",
};

// GET /api/activity-log?limit=50&resource_type=tenant
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") || "50";
  const type  = req.nextUrl.searchParams.get("resource_type");

  let url = `${SUPABASE_URL}/rest/v1/activity_log?order=created_at.desc&limit=${limit}`;
  if (type) url += `&resource_type=eq.${encodeURIComponent(type)}`;

  const res = await fetch(url, { headers: H, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    // Surface migration hint if the table doesn't exist yet
    if (text.includes("relation") && text.includes("does not exist")) {
      return NextResponse.json({
        logs: [],
        migrationSql: `
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email   TEXT NOT NULL DEFAULT 'unknown',
  actor_name    TEXT NOT NULL DEFAULT 'Admin',
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT DEFAULT '',
  resource_id   TEXT DEFAULT '',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
`.trim(),
      });
    }
    return NextResponse.json({ logs: [] });
  }

  const logs = await res.json();
  return NextResponse.json({ logs }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}
