import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAILS = ["leasing@teamvisionllc.com", "jmcclanahan@teamvisionllc.com", "dmyers@teamvisionllc.com"];
// Must match a verified domain in Resend — set RESEND_FROM env var or update below
const FROM_EMAIL = process.env.RESEND_FROM ?? "Vision LLC <noreply@teamvisionllc.com>";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(s: unknown): string {
  return String(s ?? "").trim().slice(0, 2000);
}

function buildHtml(data: {
  name: string; email: string; company: string; phone: string;
  interest: string; city: string; message: string;
}): string {
  const row = (label: string, value: string) =>
    value
      ? `<tr>
           <td style="padding:8px 12px 8px 0;color:#9CA3AF;font-size:12px;text-transform:uppercase;white-space:nowrap;vertical-align:top;">${label}</td>
           <td style="padding:8px 0;color:#fff;font-weight:600;">${value}</td>
         </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px;">
    <div style="background:#080C14;border:1px solid rgba(74,222,128,0.3);border-radius:16px;padding:32px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <div style="width:10px;height:10px;border-radius:50%;background:#4ADE80;flex-shrink:0;"></div>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;">New Contact Inquiry</h1>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${row("Name", data.name)}
        ${row("Email", data.email)}
        ${row("Company", data.company)}
        ${row("Phone", data.phone)}
        ${row("Interested In", data.interest)}
        ${row("Preferred Market", data.city)}
      </table>

      ${data.message ? `
      <div style="margin-top:20px;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.07);">
        <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Message</p>
        <p style="margin:0;color:#fff;line-height:1.6;">${data.message}</p>
      </div>` : ""}

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);">
        <p style="margin:0;color:#4B5563;font-size:12px;">
          Reply directly to this email to reach <strong style="color:#9CA3AF;">${data.name}</strong> at
          <a href="mailto:${data.email}" style="color:#4ADE80;">${data.email}</a>
        </p>
        <p style="margin:8px 0 0;color:#374151;font-size:11px;">Submitted via teamvisionllc.com contact form</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name, email, company, phone, interest, city, message,
      // Anti-spam fields
      website,        // honeypot — bots fill this, humans don't
      formOpenedAt,   // timestamp set when form renders
      // Analytics correlation
      sessionId,      // anonymous browser session from useAnalytics
    } = body;

    // ── 1. Honeypot check — return silent 200 to fool bots ──────────────────
    if (website) {
      return NextResponse.json({ success: true });
    }

    // ── 2. Timing check — reject submissions faster than 4 seconds ──────────
    const elapsed = Date.now() - Number(formOpenedAt ?? 0);
    if (elapsed < 4000) {
      return NextResponse.json({ success: true }); // Silent OK
    }

    // ── 3. Rate limiting — 5 submissions per IP per hour ────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later or call us directly." },
        { status: 429 }
      );
    }

    // ── 4. Server-side validation ────────────────────────────────────────────
    const cleanName     = sanitize(name);
    const cleanEmail    = sanitize(email).toLowerCase();
    const cleanCompany  = sanitize(company);
    const cleanPhone    = sanitize(phone);
    const cleanInterest = sanitize(interest);
    const cleanCity     = sanitize(city);
    const cleanMessage  = sanitize(message);

    if (!cleanName || !cleanEmail || !cleanInterest || !cleanPhone) {
      return NextResponse.json(
        { error: "Name, phone, email, and interest are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // ── 5. Store in Supabase audit table (optional — table may not exist) ───
    try {
      await supabaseAdmin.from("contact_submissions").insert({
        id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        submitted_at: new Date().toISOString(),
        name: cleanName,
        email: cleanEmail,
        company: cleanCompany,
        phone: cleanPhone,
        interest: cleanInterest,
        city: cleanCity,
        message: cleanMessage,
        ip_hash: ip.split(".").slice(0, 3).join(".") + ".x", // partially mask IP
        session_id: sessionId || null,  // Link to analytics session
      });
    } catch {
      console.warn("[contact] Supabase audit insert skipped (table may not exist)");
    }

    // ── 5b. INSERT INTO LEADS PIPELINE ─── so it shows in the admin dashboard ──
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      // Build a message/notes field combining company, city, and the message
      const notes = [
        cleanCompany && `Company: ${cleanCompany}`,
        cleanCity && `Preferred Market: ${cleanCity}`,
        cleanMessage,
      ].filter(Boolean).join("\n");

      // Simple score heuristic based on what they told us
      const hasPhone = !!cleanPhone;
      const hasCompany = !!cleanCompany;
      const urgentInterests = ["Office Space", "Retail Storefront", "Warehouse / Industrial"];
      const isUrgentType = urgentInterests.includes(cleanInterest);
      const baseScore = 50 + (hasPhone ? 15 : 0) + (hasCompany ? 10 : 0) + (isUrgentType ? 10 : 0);
      const score = Math.min(baseScore, 95);
      const scoreLabel = score >= 70 ? "Hot Lead" : score >= 40 ? "Warm Lead" : "Nurture";

      const lead = {
        id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        space_type: cleanInterest,
        budget: 0,
        timeline: "Exploring options",
        team_size: "Unknown",
        additional_info: notes,
        score,
        score_label: scoreLabel,
        reasoning: `Submitted via contact form. Interest: ${cleanInterest}.${hasPhone ? " Phone provided — higher intent." : ""}${hasCompany ? ` Company: ${cleanCompany}.` : ""}`,
        matched_properties: [],
        is_whale: false,
        whale_tier: null,
        whale_keywords: [],
        source: "contact-form",
        medium: "web",
        campaign: "",
        session_id: sessionId || null,  // Link to analytics session
      };

      await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(lead),
      });
    } catch (leadErr) {
      // Non-fatal — email still goes out even if lead insert fails
      console.warn("[contact] Lead pipeline insert failed:", leadErr);
    }

    // ── 6. Send email via Resend REST API ────────────────────────────────────
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: TO_EMAILS,
          reply_to: cleanEmail,
          subject: `New Inquiry: ${cleanInterest} — ${cleanName}`,
          html: buildHtml({
            name: cleanName, email: cleanEmail, company: cleanCompany,
            phone: cleanPhone, interest: cleanInterest, city: cleanCity,
            message: cleanMessage,
          }),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("[contact] Resend error:", errText);
        // Don't fail the user-facing response if email fails but DB save worked
      }
    } else {
      console.warn("[contact] RESEND_API_KEY not set — email delivery disabled. Add it to Vercel env vars.");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please call us directly at (423) 573-5700." },
      { status: 500 }
    );
  }
}
