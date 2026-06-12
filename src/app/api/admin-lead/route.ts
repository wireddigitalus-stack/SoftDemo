import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// POST — insert a manually-scored lead directly to Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, phone, spaceType, budget,
      timeline, teamSize, additionalInfo,
      score, scoreLabel, reasoning,
    } = body;

    if (!name || !spaceType || budget === undefined || budget === null) {
      return NextResponse.json({ error: "name and spaceType are required" }, { status: 400 });
    }

    const budgetNum = Number(budget);
    const derivedLabel =
      score >= 70 ? "Hot Lead" : score >= 40 ? "Warm Lead" : "Nurture";

    // Whale detection — $4k+/mo = silver, $8k+/mo = gold
    const isWhale = budgetNum >= 4000;
    const whaleTier = budgetNum >= 8000 ? "gold" : budgetNum >= 4000 ? "silver" : null;

    const lead = {
      id: `manual_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      space_type: spaceType,
      budget: budgetNum,
      timeline: timeline || "Exploring options",
      team_size: teamSize || "Solo",
      additional_info: additionalInfo?.trim() || "",
      score: Number(score) || 50,
      score_label: scoreLabel || derivedLabel,
      reasoning: reasoning?.trim() || "Manually entered lead.",
      matched_properties: [],
      is_whale: isWhale,
      whale_tier: whaleTier,
      whale_keywords: [],
      source: body.source || "manual",
      medium: body.medium || "admin",
      campaign: body.campaign || "",
    };

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify(lead),
    });

    if (!dbRes.ok) {
      const err = await dbRes.text();
      console.error("Supabase insert error:", err);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }

    // Audit log — fire and forget
    writeActivityLog({
      actor_email:   body.actorEmail  || "unknown",
      actor_name:    body.actorName   || "Staff",
      action:        "created",
      resource_type: "lead",
      resource_name: lead.name,
      resource_id:   lead.id,
      metadata: { score: lead.score, score_label: lead.score_label, budget: lead.budget, space_type: lead.space_type },
    });

    // Return in the same shape as lease-bot so AdminPage can use it uniformly
    const returned = {
      id: lead.id,
      timestamp: lead.timestamp,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      spaceType: lead.space_type,
      budget: lead.budget,
      timeline: lead.timeline,
      teamSize: lead.team_size,
      additionalInfo: lead.additional_info,
      score: lead.score,
      scoreLabel: lead.score_label,
      reasoning: lead.reasoning,
      matchedProperties: [],
      isWhale: lead.is_whale,
      whaleTier: lead.whale_tier,
      whaleKeywords: [],
      source: lead.source,
      medium: lead.medium,
      campaign: lead.campaign,
    };

    return NextResponse.json({ success: true, lead: returned });
  } catch (err) {
    console.error("admin-lead error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// PATCH — archive or unarchive a lead
export async function PATCH(req: NextRequest) {
  try {
    const { id, archive } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing lead id" }, { status: 400 });

    const archived_at = archive ? new Date().toISOString() : null;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ archived_at }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Archive PATCH failed:", err);
      return NextResponse.json({ error: "Archive failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, archived_at });
  } catch (err) {
    console.error("admin-lead PATCH error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
