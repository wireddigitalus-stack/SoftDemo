import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/maintenance_tickets?order=priority.asc,created_at.desc`,
    { headers: H }
  );
  if (!res.ok) return NextResponse.json({ tickets: [] });
  return NextResponse.json({ tickets: await res.json() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ticket = {
    id: `maint_${Date.now()}`,
    title: body.title?.trim() || "",
    description: body.description?.trim() || "",
    building: body.building?.trim() || "",
    unit: body.unit?.trim() || "",
    category: body.category || "Other",
    priority: Number(body.priority) || 3,
    status: body.status || "open",
    assigned_to: body.assignedTo?.trim() || "",
    reported_by: body.reportedBy?.trim() || "",
    estimated_cost: Number(body.estimatedCost) || 0,
    actual_cost: Number(body.actualCost) || 0,
    estimated_hours: Number(body.estimatedHours) || 0,
    scheduled_date: body.scheduledDate || null,
    completed_date: body.completedDate || null,
    notes: body.notes?.trim() || "",
    source: body.source || "admin",
    created_at: new Date().toISOString(),
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets`, {
    method: "POST",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(ticket),
  });
  if (!res.ok) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

  writeActivityLog({
    actor_email:   body.actorEmail  || "unknown",
    actor_name:    body.actorName || body.actorEmail?.split("@")[0] || "Staff",
    action:        "created",
    resource_type: "maintenance",
    resource_name: ticket.title,
    resource_id:   ticket.id,
    metadata: { building: ticket.building, priority: ticket.priority, category: ticket.category },
  });

  return NextResponse.json({ success: true, ticket });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const map: Record<string, string> = {
    title: "title", description: "description", building: "building", unit: "unit",
    category: "category", priority: "priority", status: "status",
    assignedTo: "assigned_to", reportedBy: "reported_by",
    estimatedCost: "estimated_cost", actualCost: "actual_cost",
    estimatedHours: "estimated_hours", scheduledDate: "scheduled_date",
    completedDate: "completed_date", notes: "notes",
    photoUrl: "photo_url", completionNotes: "completion_notes", actualMinutes: "actual_minutes",
  };
  const patch: Record<string, unknown> = {};
  Object.entries(map).forEach(([js, db]) => { if (body[js] !== undefined) patch[db] = body[js]; });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  writeActivityLog({
    actor_email:   body.actorEmail || "unknown",
    actor_name:    body.actorName || body.actorEmail?.split("@")[0] || "Staff",
    action:        "updated",
    resource_type: "maintenance",
    resource_name: body.title     || id,
    resource_id:   id,
    metadata: { status: body.status, fields_changed: Object.keys(patch) },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE", headers: H,
  });

  writeActivityLog({
    actor_email:   req.nextUrl.searchParams.get("actorEmail") || "unknown",
    actor_name:    req.nextUrl.searchParams.get("actorName") || req.nextUrl.searchParams.get("actorEmail")?.split("@")[0] || "Staff",
    action:        "deleted",
    resource_type: "maintenance",
    resource_name: req.nextUrl.searchParams.get("name")       || id,
    resource_id:   id,
  });

  return NextResponse.json({ success: true });
}
