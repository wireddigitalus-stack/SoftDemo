import { NextRequest, NextResponse } from "next/server";
import { LEADS_STORE, type Lead } from "@/lib/leads-store";
import { detectWhale } from "@/lib/whale-detector";
import { supabaseAdmin, rowToLead } from "@/lib/supabase";
import { writeActivityLog } from "@/lib/activity-log";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY environment variable is not set");


const PROPERTIES_CONTEXT = `
Available Vision LLC Properties (use EXACT id values shown):
1. id="city-centre"       — City Centre Professional Suites — 1,200–18,000+ sqft, downtown office, State Street Bristol TN, premium finishes
2. id="the-executive"     — The Executive — 500–12,000 sqft, private executive office suites, historic building, downtown Bristol TN
3. id="bristol-cowork"    — Bristol CoWork — 620 State Street, private offices, dedicated desks, conference rooms, monthly memberships
4. id="centre-point"      — Centre Point Suites — 800–5,000 sqft, high-traffic retail/office, multiple units available, Bristol TN
5. id="foundation-event"  — Foundation Event Facility — 3,000–8,000 sqft, historic adaptive reuse, event & commercial space
6. id="commercial-warehouse" — Commercial Warehouse — 2,000–25,000 sqft, loading docks, highway access, Bristol metro area
`;

const SCORING_PROMPT = (lead: Partial<Lead>) => `
You are a commercial real estate lead scoring AI for Vision LLC in Bristol, TN.

Score this lead from 0-100 based on these criteria:
- Budget > $2,000/mo = strong signal (+25 pts)
- Budget $1,000–$2,000/mo = moderate signal (+15 pts)
- Budget < $1,000/mo = weak signal (+5 pts)
- Move-in timeline < 30 days = very hot (+30 pts)
- Move-in timeline 30–60 days = warm (+20 pts)
- Move-in timeline 60–90 days = cool (+10 pts)
- Move-in timeline > 90 days = cold (+5 pts)
- Space type = Office or Executive Suite = high fit (+20 pts)
- Space type = CoWork = good fit (+15 pts)
- Space type = Retail or Warehouse = moderate fit (+10 pts)
- Team size 5+ = strong need (+15 pts)
- Team size 2–4 = moderate need (+10 pts)
- Solo = solo (+5 pts)

LEAD DATA:
- Name: ${lead.name}
- Space Type Requested: ${lead.spaceType}
- Monthly Budget: $${lead.budget}
- Move-in Timeline: ${lead.timeline}
- Team Size: ${lead.teamSize}
- Additional Info: ${lead.additionalInfo || "None provided"}

${PROPERTIES_CONTEXT}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "score": <number 0-100>,
  "scoreLabel": "<Hot Lead|Warm Lead|Nurture>",
  "reasoning": "<2-sentence max explanation of score>",
  "matchedProperties": [
    {
      "id": "<use EXACT id from property list above>",
      "name": "<property name>",
      "type": "<Office|CoWork|Retail|Warehouse|Event>",
      "sqft": "<size range>",
      "location": "Downtown Bristol, TN",
      "matchReason": "<one sentence why this property fits>"
    }
  ]
}

Rules for scoreLabel:
- score >= 70 = "Hot Lead"
- score 40–69 = "Warm Lead"
- score < 40 = "Nurture"

Include 1-2 best matching properties only.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, spaceType, budget, timeline, teamSize, additionalInfo,
      utm_source, utm_medium, utm_campaign, sessionId,
      actorName, actorEmail } = body;

    if (!name || !spaceType || !budget) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const leadData: Partial<Lead> = {
      name, email, phone,
      spaceType, budget: Number(budget),
      timeline, teamSize, additionalInfo,
    };

    // v1beta for gemini-2.5-flash — v1 returns 400 for this key on some configurations
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SCORING_PROMPT(leadData) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
          // NOTE: no thinkingConfig — not supported by this API key
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: `Gemini ${geminiRes.status}: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    // Filter out thought:true parts — gemini-2.5-flash returns thinking tokens
    // in separate parts alongside the real response. We only want the actual text.
    const parts: Array<{ text?: string; thought?: boolean }> =
      geminiData.candidates?.[0]?.content?.parts || [];
    const rawText = parts
      .filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
      .trim();

    // Robust JSON extraction — find the first {...} block even if thinking text is present
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Gemini response:", rawText.slice(0, 500));
      return NextResponse.json({ error: "AI response was not valid JSON" }, { status: 500 });
    }
    const aiResult = JSON.parse(jsonMatch[0]);

    // Run whale detection on the free-text additionalInfo
    const whale = detectWhale(additionalInfo || "");

    const lead: Lead = {
      id: `lead_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name,
      email: email || "",
      phone: phone || "",
      spaceType,
      budget: Number(budget),
      timeline,
      teamSize,
      additionalInfo: additionalInfo || "",
      score: aiResult.score,
      scoreLabel: aiResult.scoreLabel,
      reasoning: aiResult.reasoning,
      matchedProperties: aiResult.matchedProperties || [],
      // Whale Alert
      isWhale: whale.isWhale,
      whaleTier: whale.whaleTier,
      whaleKeywords: whale.whaleKeywords,
      // UTM attribution
      source: utm_source || "organic",
      medium: utm_medium || "direct",
      campaign: utm_campaign || "",
    };

    LEADS_STORE.unshift(lead);
    if (LEADS_STORE.length > 50) LEADS_STORE.pop();

    // Persist to Supabase via direct REST API (supabase-js was silently failing)
    try {
      const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          id: lead.id,
          timestamp: lead.timestamp,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          space_type: lead.spaceType,
          budget: lead.budget,
          timeline: lead.timeline,
          team_size: lead.teamSize,
          additional_info: lead.additionalInfo,
          score: lead.score,
          score_label: lead.scoreLabel,
          reasoning: lead.reasoning,
          matched_properties: lead.matchedProperties,
          is_whale: lead.isWhale,
          whale_tier: lead.whaleTier,
          whale_keywords: lead.whaleKeywords,
          source: lead.source,
          medium: lead.medium,
          campaign: lead.campaign,
          session_id: sessionId || null,  // Link to analytics session
        }),
      });
      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.error("Supabase REST insert failed:", insertRes.status, errText);
      } else {
        // Audit log — fire and forget
        writeActivityLog({
          actor_email:   actorEmail   || "unknown",
          actor_name:    actorName || actorEmail?.split("@")[0] || "Staff",
          action:        "created",
          resource_type: "lead",
          resource_name: lead.name,
          resource_id:   lead.id,
          metadata: {
            score:       lead.score,
            score_label: lead.scoreLabel,
            budget:      lead.budget,
            space_type:  lead.spaceType,
          },
        });
      }
    } catch (dbErr) {
      console.error("Supabase insert error:", dbErr);
    }

    return NextResponse.json({ success: true, lead });

  } catch (error) {
    console.error("Lease-Bot scoring error:", error);
    return NextResponse.json(
      { error: "Scoring failed — please try again" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&order=timestamp.desc&limit=50`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) throw new Error(`Supabase GET failed: ${res.status}`);
    const data = await res.json();

    const leads: Lead[] = (data || []).map(rowToLead);
    // Also sync into memory store so the same-process cache is warm
    LEADS_STORE.length = 0;
    LEADS_STORE.push(...leads);

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Supabase fetch error:", err);
    // Graceful fallback: return whatever is in-memory
    return NextResponse.json({ leads: LEADS_STORE });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, all } = body as { id?: string; all?: boolean };

    const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    };

    if (all) {
      // Bulk delete: remove ALL leads
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?id=not.is.null`,
        { method: "DELETE", headers }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error("Supabase bulk delete failed:", res.status, errText);
        return NextResponse.json({ error: "Bulk delete failed" }, { status: 500 });
      }
      LEADS_STORE.length = 0;
      return NextResponse.json({ success: true, deleted: "all" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
    }

    // Single delete via REST API (supabase-js was silently failing)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error("Supabase delete failed:", res.status, errText);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    // Remove from memory store
    const idx = LEADS_STORE.findIndex(l => l.id === id);
    if (idx !== -1) LEADS_STORE.splice(idx, 1);

    return NextResponse.json({ success: true, deleted: id });
  } catch (err) {
    console.error("Delete lead error:", err);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
