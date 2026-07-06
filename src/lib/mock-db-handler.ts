import fs from "fs";
import path from "path";

const DB_FILE_PATH = path.join(process.cwd(), "supabase", "mock-db.json");

// Define TypeScript interfaces for our database structure
interface MockDatabase {
  leads: any[];
  tenants: any[];
  maintenance_tickets: any[];
  cleaning_assignments: any[];
  allowed_users: any[];
  site_settings: any[];
  property_image_overrides: any[];
  call_logs: any[];
  site_analytics: any[];
  blog_posts: any[];
  activity_log: any[];
  portfolio_snapshots: any[];
  available_spaces: any[];
  property_details: any[];
  contact_submissions: any[];
}

// Default seed data that mimics real data and adds multi-tenant apartments
const DEFAULT_DB: MockDatabase = {
  allowed_users: [
    {
      id: "demo-admin-user",
      email: "demo@teamvisionllc.com",
      name: "Demo Admin",
      role: "admin",
      active: true,
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 30).toISOString(),
    },
    {
      id: "worker-john",
      email: "john@teamvisionllc.com",
      name: "John W. (Maintenance)",
      role: "maintenance",
      active: true,
      pin: "111111",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 28).toISOString(),
    },
    {
      id: "worker-mary",
      email: "mary@teamvisionllc.com",
      name: "Mary S. (Cleaning)",
      role: "cleaning",
      active: true,
      pin: "222222",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 28).toISOString(),
    }
  ],
  leads: [
    {
      id: "demo_lead_1",
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      name: "Sarah Mitchell",
      email: "smitchell@techcorp.io",
      phone: "423-555-0192",
      space_type: "Office",
      budget: 3500,
      timeline: "ASAP — under 30 days",
      team_size: "2–4 people",
      score: 91,
      score_label: "Hot Lead",
      reasoning: "Strong budget ($3,500/mo), urgent timeline, and team size of 2-4 match the City Centre Professional Suites perfectly. Property has premium office options and immediate availability.",
      matched_properties: [
        { id: "city-centre", name: "City Centre Professional Suites", type: "Office", sqft: "120 – 6,000", matchReason: "All-inclusive pricing covers utilities, fits 2-4 people nicely." }
      ],
      is_whale: false,
      whale_tier: null,
      whale_keywords: [],
      source: "organic",
      medium: "search",
      campaign: "",
      additional_info: "Looking for a turn-key office with good high-speed internet and access to a meeting room.",
      archived_at: null
    },
    {
      id: "demo_lead_2",
      timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
      name: "Dr. James Patel",
      email: "jpatel@tricitiesmedical.org",
      phone: "276-555-0847",
      space_type: "Office",
      budget: 9500,
      timeline: "ASAP — under 30 days",
      team_size: "5–10 people",
      score: 96,
      score_label: "Hot Lead",
      reasoning: "Premium budget ($9,500/mo), immediate timeline, and established medical/consulting firm size of 5-10 people. Matches The Executive Premier Office Suites (historic prestige) and City Centre larger suites.",
      matched_properties: [
        { id: "the-executive", name: "The Executive — Premier Office Suites", type: "Office", sqft: "500 – 12,000", matchReason: "Prestige address, full-service amenities fit corporate/medical offices." },
        { id: "city-centre", name: "City Centre Professional Suites", type: "Office", sqft: "120 – 6,000", matchReason: "Larger contiguous layout options available." }
      ],
      is_whale: true,
      whale_tier: "gold",
      whale_keywords: ["medical", "established", "executive"],
      source: "direct",
      medium: "direct",
      campaign: "",
      additional_info: "Needs client waiting area, off-street parking, and professional entry for medical consultation.",
      archived_at: null
    },
    {
      id: "demo_lead_3",
      timestamp: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
      name: "Elena Rostova",
      email: "elena.design@gmail.com",
      phone: "423-555-9821",
      space_type: "CoWorking",
      budget: 650,
      timeline: "1–2 months",
      team_size: "Solo",
      score: 64,
      score_label: "Warm Lead",
      reasoning: "Solo designer seeking coworking setup. Bristol CoWork memberships are available immediately. Good candidate for dedicated desk or private single office.",
      matched_properties: [
        { id: "bristol-cowork", name: "Bristol CoWork", type: "CoWorking", sqft: "5,000+", matchReason: "Fully furnished private offices, dedicated desks, high-speed internet." }
      ],
      is_whale: false,
      whale_tier: null,
      whale_keywords: [],
      source: "social",
      medium: "facebook",
      campaign: "cowork_promo",
      additional_info: "Needs 24/7 access and conference room hours.",
      archived_at: null
    },
    {
      id: "demo_lead_4",
      timestamp: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
      name: "Marcus Vance",
      email: "mvance@vancelogistics.com",
      phone: "865-555-4091",
      space_type: "Mixed-Use / Industrial",
      budget: 15000,
      timeline: "3–6 months",
      team_size: "15+ people",
      score: 94,
      score_label: "Hot Lead",
      reasoning: "Extremely high budget ($15,000/mo) and large space requirement for industrial distribution. Fits former Coca-Cola warehouse at West State Commons perfectly.",
      matched_properties: [
        { id: "west-state-commons", name: "West State Commons — Offices & Warehouse", type: "Mixed-Use / Industrial", sqft: "8,000 Office + 45,500 Warehouse", matchReason: "Coca-Cola facility has 45k sqft warehouse, high ceilings, loading docks." }
      ],
      is_whale: true,
      whale_tier: "gold",
      whale_keywords: ["warehouse", "logistics", "distribution"],
      source: "organic",
      medium: "search",
      campaign: "",
      additional_info: "Requires tractor-trailer accessibility and 3-phase power for packaging systems.",
      archived_at: null
    }
  ],
  tenants: [
    // Commercial Tenants
    {
      id: "tenant_comm_1",
      name: "Bristol Catering Company",
      contact_name: "Julie McClanahan",
      email: "jmcclanahan@bristolcatering.com",
      phone: "423-573-1022",
      building: "City Centre Professional Suites",
      unit: "Suite 100",
      rep: "Julie McClanahan",
      monthly_rent: 4500,
      utilities_fee: 150,
      security_deposit: 4500,
      nnn_fee: 0,
      cleaning_fee: 0,
      cam_fee: 0,
      nn_fee: 0,
      lease_start: "2023-01-01",
      lease_end: "2027-12-31",
      renewal_date: "2027-10-01",
      lease_alert_days: 90,
      escalation_pct: 3,
      escalation_date: "2027-01-01",
      status: "active",
      notes: "Main catering offices and street front retail space. Excellent long-term tenant.",
      source_lead_id: "",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 400).toISOString(),
    },
    {
      id: "tenant_comm_2",
      name: "Wolf Hills Law Group",
      contact_name: "Blake Thornton, Esq.",
      email: "bthornton@wolfhillslaw.com",
      phone: "276-555-9012",
      building: "Jamestown at Shelby",
      unit: "Suite 300",
      rep: "Allen Hurley",
      monthly_rent: 2800,
      utilities_fee: 100,
      security_deposit: 2800,
      nnn_fee: 120,
      cleaning_fee: 50,
      cam_fee: 0,
      nn_fee: 0,
      lease_start: "2024-05-01",
      lease_end: "2026-04-30",
      renewal_date: "2026-02-01",
      lease_alert_days: 60,
      escalation_pct: 2.5,
      escalation_date: "2025-05-01",
      status: "active",
      notes: "Corporate legal offices. Off-street parking was key requirement.",
      source_lead_id: "demo_4",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 200).toISOString(),
    },
    // Multi-tenant Residential (St. Albert Court Apartments)
    {
      id: "tenant_res_1",
      name: "David & Emily Carter",
      contact_name: "David Carter",
      email: "dcarter@gmail.com",
      phone: "423-555-7890",
      building: "St. Albert Court Apartments",
      unit: "Apt 101",
      rep: "Leasing Agent",
      monthly_rent: 1250,
      utilities_fee: 80,
      security_deposit: 1250,
      nnn_fee: 0,
      cleaning_fee: 0,
      cam_fee: 15,
      nn_fee: 0,
      lease_start: "2025-01-01",
      lease_end: "2026-12-31",
      renewal_date: "2026-10-01",
      lease_alert_days: 60,
      escalation_pct: 5,
      escalation_date: "2026-01-01",
      status: "active",
      notes: "Quiet residential tenant. Requested kitchen disposal repair recently.",
      source_lead_id: "",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 180).toISOString(),
    },
    {
      id: "tenant_res_2",
      name: "Sophia Martinez",
      contact_name: "Sophia Martinez",
      email: "smartinez@king.edu",
      phone: "423-555-4512",
      building: "St. Albert Court Apartments",
      unit: "Apt 102",
      rep: "Leasing Agent",
      monthly_rent: 1200,
      utilities_fee: 80,
      security_deposit: 1200,
      nnn_fee: 0,
      cleaning_fee: 0,
      cam_fee: 15,
      nn_fee: 0,
      lease_start: "2025-09-01",
      lease_end: "2026-08-31",
      renewal_date: "2026-06-30",
      lease_alert_days: 60,
      escalation_pct: 4,
      escalation_date: "2026-09-01",
      status: "active",
      notes: "Graduate student at King University. Rent auto-paid on 1st.",
      source_lead_id: "",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 90).toISOString(),
    },
    {
      id: "tenant_res_3",
      name: "Marcus & Clara Vance",
      contact_name: "Marcus Vance",
      email: "marcus.vance@yahoo.com",
      phone: "865-555-4091",
      building: "St. Albert Court Apartments",
      unit: "Apt 201",
      rep: "Leasing Agent",
      monthly_rent: 1450,
      utilities_fee: 95,
      security_deposit: 1450,
      nnn_fee: 0,
      cleaning_fee: 0,
      cam_fee: 15,
      nn_fee: 0,
      lease_start: "2024-06-01",
      lease_end: "2025-05-31",
      renewal_date: "2025-03-31",
      lease_alert_days: 60,
      escalation_pct: 6,
      escalation_date: "2025-06-01",
      status: "active",
      notes: "Spacious upper floor layout. Seeking to renew lease for another year.",
      source_lead_id: "",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 300).toISOString(),
    },
    {
      id: "tenant_res_4",
      name: "Thomas Jenkins",
      contact_name: "Thomas Jenkins",
      email: "tjenkins@gmail.com",
      phone: "276-555-1122",
      building: "Virginia Heights Residential",
      unit: "Townhouse A",
      rep: "Leasing Agent",
      monthly_rent: 1650,
      utilities_fee: 0,
      security_deposit: 1650,
      nnn_fee: 0,
      cleaning_fee: 0,
      cam_fee: 0,
      nn_fee: 0,
      lease_start: "2025-02-01",
      lease_end: "2026-01-31",
      renewal_date: "2025-11-30",
      lease_alert_days: 60,
      escalation_pct: 3.5,
      escalation_date: "2026-02-01",
      status: "active",
      notes: "Residential tenant on the Virginia side. Self-paying utilities.",
      source_lead_id: "",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 150).toISOString(),
    }
  ],
  maintenance_tickets: [
    {
      id: "ticket_1",
      property: "St. Albert Court Apartments",
      unit: "Apt 101",
      issue: "Garbage disposal jammed and kitchen sink draining slowly.",
      priority: 2,
      status: "open",
      assigned_worker: null,
      notes: "David reported it this morning. Needs inspection.",
      created_at: new Date(Date.now() - 1000 * 3600 * 4).toISOString(),
      completed_at: null,
      parts_needed: "None yet"
    },
    {
      id: "ticket_2",
      property: "City Centre Professional Suites",
      unit: "Suite 100",
      issue: "HVAC blowing warm air in receptionist area.",
      priority: 1,
      status: "scheduled",
      assigned_worker: "John W. (Maintenance)",
      notes: "John dispatched. Replaced air filters, checking condenser units.",
      created_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
      completed_at: null,
      parts_needed: "Freon R410A recharge maybe"
    },
    {
      id: "ticket_3",
      property: "St. Albert Court Apartments",
      unit: "Apt 201",
      issue: "Replace balcony door weather stripping.",
      priority: 3,
      status: "complete",
      assigned_worker: "John W. (Maintenance)",
      notes: "Stripping replaced. Door seals fine now.",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 10).toISOString(),
      completed_at: new Date(Date.now() - 1000 * 3600 * 24 * 9).toISOString(),
      parts_needed: "Weather seal strip 8ft"
    }
  ],
  cleaning_assignments: [
    {
      id: "clean_1",
      property: "City Centre Professional Suites",
      area: "Common Lobby & Bathrooms",
      scheduled_date: new Date(Date.now() + 1000 * 3600 * 24).toISOString().split("T")[0],
      assigned_worker: "Mary S. (Cleaning)",
      status: "scheduled", // scheduled, completed, missed
      notes: "Regular high-frequency common area wipe down.",
      created_at: new Date().toISOString()
    },
    {
      id: "clean_2",
      property: "St. Albert Court Apartments",
      area: "Apt 102 Move-in Cleaning Prep",
      scheduled_date: new Date(Date.now() - 1000 * 3600 * 24 * 2).toISOString().split("T")[0],
      assigned_worker: "Mary S. (Cleaning)",
      status: "completed",
      notes: "Post-renovation deep clean. Unit is fully prepped for move-in.",
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 5).toISOString()
    }
  ],
  site_settings: [
    {
      key: "hero_config",
      value: {
        slides: [
          { type: "property", propertyId: "city-centre", label: "City Centre Professional Suites", location: "Downtown Bristol, TN", enabled: true, order: 0 },
          { type: "property", propertyId: "bristol-cowork", label: "Bristol CoWork", location: "620 State Street, Bristol, TN", enabled: true, order: 1 },
          { type: "property", propertyId: "the-executive", label: "The Executive Office Suites", location: "Downtown Bristol, TN", enabled: true, order: 2 },
          { type: "property", propertyId: "centre-point-suites", label: "Centre Point", location: "Bristol, VA (Casino Adjacent)", enabled: true, order: 3 },
          { type: "property", propertyId: "foundation-event-facility", label: "Foundation Event Venue", location: "Downtown Bristol, TN", enabled: true, order: 4 },
          { type: "property", propertyId: "west-state-commons", label: "West State Commons", location: "Bristol, VA", enabled: true, order: 5 }
        ],
        videoUrl: null,
        videoEnabled: false
      },
      updated_at: new Date().toISOString()
    }
  ],
  property_image_overrides: [],
  call_logs: [
    {
      id: "call_1",
      lead_id: "demo_lead_1",
      lead_name: "Sarah Mitchell",
      actor_name: "Demo Admin",
      actor_email: "demo@teamvisionllc.com",
      outcome: "spoke", // spoke, vm, busy, no_answer
      notes: "Spoke with Sarah. She is extremely interested in the 300 sqft corner office at City Centre. Scheduled a physical tour for Monday at 10 AM.",
      created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString()
    },
    {
      id: "call_2",
      lead_id: "demo_lead_2",
      lead_name: "Dr. James Patel",
      actor_name: "Demo Admin",
      actor_email: "demo@teamvisionllc.com",
      outcome: "vm",
      notes: "Left voicemail following up on their clinic expansion requirements. Mentioned The Executive suites and dedicated staff parking.",
      created_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString()
    }
  ],
  site_analytics: [
    {
      id: 1,
      session_id: "session_mock_1",
      event_type: "page_view",
      page_path: "/",
      page_title: "Vision LLC — Commercial Properties",
      referrer: "https://www.google.com/",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "bristol_cre",
      event_data: {},
      duration_ms: 45000,
      device_type: "desktop",
      screen_width: 1440,
      created_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString()
    },
    {
      id: 2,
      session_id: "session_mock_1",
      event_type: "property_click",
      page_path: "/",
      page_title: "Vision LLC — Commercial Properties",
      referrer: "https://www.google.com/",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "bristol_cre",
      event_data: { property_id: "city-centre" },
      duration_ms: 12000,
      device_type: "desktop",
      screen_width: 1440,
      created_at: new Date(Date.now() - 1000 * 3600 * 1.95).toISOString()
    },
    {
      id: 3,
      session_id: "session_mock_1",
      event_type: "cta_click",
      page_path: "/properties/city-centre",
      page_title: "City Centre Professional Suites | Vision LLC",
      referrer: "https://www.google.com/",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "bristol_cre",
      event_data: { label: "Chat with Lease Bot" },
      duration_ms: 0,
      device_type: "desktop",
      screen_width: 1440,
      created_at: new Date(Date.now() - 1000 * 3600 * 1.8).toISOString()
    }
  ],
  blog_posts: [
    {
      id: "blog_1",
      title: "The Historical Transformation of Downtown Bristol",
      slug: "historical-transformation-downtown-bristol",
      summary: "Explore how adaptive reuse of 100-year-old structures is powering a modern economic boom along State Street.",
      content: "<p>Downtown Bristol is experiencing a massive revival...</p>",
      published: true,
      published_at: new Date(Date.now() - 1000 * 3600 * 24 * 15).toISOString(),
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 16).toISOString()
    }
  ],
  activity_log: [
    {
      id: "act_1",
      actor_email: "demo@teamvisionllc.com",
      actor_name: "Demo Admin",
      action: "created",
      resource_type: "tenant",
      resource_name: "Wolf Hills Law Group",
      resource_id: "tenant_comm_2",
      metadata: { building: "Jamestown at Shelby", unit: "Suite 300", monthly_rent: 2800 },
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 5).toISOString()
    },
    {
      id: "act_2",
      actor_email: "demo@teamvisionllc.com",
      actor_name: "Demo Admin",
      action: "updated",
      resource_type: "maintenance",
      resource_name: "Replace balcony door weather stripping",
      resource_id: "ticket_3",
      metadata: { status: "completed" },
      created_at: new Date(Date.now() - 1000 * 3600 * 24 * 9).toISOString()
    }
  ],
  portfolio_snapshots: [
    {
      snapshot_date: new Date(Date.now() - 1000 * 3600 * 24 * 4).toISOString().split("T")[0],
      total_properties: 9,
      leased_units: 6,
      vacant_units: 4,
      occupancy_rate: 60.0,
      monthly_revenue: 12850,
      maintenance_open: 2,
      created_at: new Date().toISOString()
    }
  ],
  available_spaces: [],
  property_details: [],
  contact_submissions: []
};

function resolveRelativeValues(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Check if it's relative date: relative_date:-30 or relative_date:+15
    const dateMatch = obj.match(/^relative_date:([+\-]?\d+)$/);
    if (dateMatch) {
      const days = parseInt(dateMatch[1], 10);
      const targetDate = new Date(Date.now() + days * 86400000);
      return targetDate.toISOString().split("T")[0];
    }
    // Check if it's relative time: relative_time:-2.5h or relative_time:-10d or relative_time:-15m
    const timeMatch = obj.match(/^relative_time:([+\-]?\d+(?:\.\d+)?)(s|m|h|d)$/);
    if (timeMatch) {
      const amount = parseFloat(timeMatch[1]);
      const unit = timeMatch[2];
      let multiplier = 1000;
      if (unit === "m") multiplier = 60 * 1000;
      if (unit === "h") multiplier = 3600 * 1000;
      if (unit === "d") multiplier = 24 * 3600 * 1000;
      const targetTime = new Date(Date.now() + amount * multiplier);
      return targetTime.toISOString();
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => resolveRelativeValues(item));
  }
  if (typeof obj === "object") {
    const resolved: any = {};
    for (const key of Object.keys(obj)) {
      resolved[key] = resolveRelativeValues(obj[key]);
    }
    return resolved;
  }
  return obj;
}

// Reads the DB from disk, creating & seeding it if it doesn't exist.
export function getMockDb(): MockDatabase {
  if (!fs.existsSync(DB_FILE_PATH)) {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return resolveRelativeValues(parsed);
  } catch (err) {
    console.error("[Mock DB] Error reading mock db, resetting:", err);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

// Writes changes to disk
export function saveMockDb(db: MockDatabase) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("[Mock DB] Error writing mock db to disk:", err);
  }
}

// Process PostgREST HTTP queries against our local JSON database.
export async function handleMockSupabaseRequest(
  urlStr: string,
  method: string,
  headers: Record<string, string>,
  bodyText: string
): Promise<{ status: number; body: any; headers?: Record<string, string> }> {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;

    console.log(`[Mock Supabase REST] ${method} ${pathname}${url.search}`);

    // SQL RPC endpoint mock
    if (pathname.includes("/rpc/exec_sql")) {
      return { status: 200, body: {} };
    }

    // Storage uploads
    if (pathname.includes("/storage/v1/object/")) {
      const match = pathname.match(/\/storage\/v1\/object\/([a-zA-Z0-9_\-]+)\/(.+)$/);
      if (match) {
        const bucket = match[1];
        const filename = match[2];
        console.log(`[Mock Supabase Storage] Uploading/fetching ${filename} in bucket ${bucket}`);

        // If it's a upload (POST) or replace (PUT)
        if (method === "POST" || method === "PUT") {
          // We can parse the file content if possible, or just generate a local public uploads url.
          // Let's create the uploads dir.
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Save whatever raw content we received
          const filepath = path.join(uploadsDir, filename);
          // Standard multipart uploads will be strings/buffers
          fs.writeFileSync(filepath, bodyText || "", "binary");

          const publicUrl = `/uploads/${filename}`;
          return {
            status: 200,
            body: { Key: `${bucket}/${filename}`, Id: filename, publicUrl },
          };
        }

        // Delete (DELETE)
        if (method === "DELETE") {
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          const filepath = path.join(uploadsDir, filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          return { status: 200, body: { message: "Deleted" } };
        }
      }

      // Fallback response for public assets link
      if (pathname.includes("/public/")) {
        const filename = pathname.split("/").pop();
        return { status: 200, body: `/uploads/${filename}` };
      }
    }

    // Match rest table endpoints: /rest/v1/table_name
    const tableMatch = pathname.match(/\/rest\/v1\/([a-zA-Z_0-9]+)$/);
    if (!tableMatch) {
      return { status: 404, body: { error: `Endpoint ${pathname} not mocked` } };
    }

    const table = tableMatch[1] as keyof MockDatabase;
    const db = getMockDb();

    if (!(table in db)) {
      // If table doesn't exist, create it as empty array
      (db as any)[table] = [];
      saveMockDb(db);
    }

    const rows = (db as any)[table] as any[];

    // --- READ OPERATION (GET) ---
    if (method === "GET") {
      let filtered = [...rows];

      // Parse filters from query parameters
      url.searchParams.forEach((val, key) => {
        if (key === "select" || key === "order" || key === "limit") return;

        // PostgREST filter formats: col=eq.val, col=not.is.null, col=gte.val, col=in.(val1,val2)
        if (val.startsWith("eq.")) {
          const matchVal = val.substring(3);
          filtered = filtered.filter(row => {
            const rowVal = row[key];
            if (rowVal === undefined) return false;
            return String(rowVal).toLowerCase() === matchVal.toLowerCase();
          });
        } else if (val === "not.is.null") {
          filtered = filtered.filter(row => row[key] !== null && row[key] !== undefined);
        } else if (val.startsWith("gte.")) {
          const numVal = Number(val.substring(4));
          const isDate = isNaN(numVal);
          filtered = filtered.filter(row => {
            if (isDate) {
              return new Date(row[key]) >= new Date(val.substring(4));
            }
            return Number(row[key]) >= numVal;
          });
        } else if (val.startsWith("in.")) {
          // in.("val1","val2") -> strip parentheses and quotes
          const cleaned = val.substring(3).replace(/^\((.*)\)$/, "$1");
          const allowed = cleaned.split(",").map(s => s.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
          filtered = filtered.filter(row => row[key] && allowed.includes(String(row[key])));
        }
      });

      // Sort
      const order = url.searchParams.get("order");
      if (order) {
        // e.g. order=created_at.desc or order=scheduled_date.asc,property.asc
        const orderParts = order.split(",");
        filtered.sort((a, b) => {
          for (const part of orderParts) {
            const [col, direction] = part.split(".");
            const valA = a[col];
            const valB = b[col];
            if (valA === undefined || valB === undefined) continue;

            const isAString = typeof valA === "string";
            const isANumber = typeof valA === "number";

            let compare = 0;
            if (isANumber) {
              compare = (valA as number) - (valB as number);
            } else if (isAString) {
              // Date checks
              const dateA = Date.parse(valA as string);
              const dateB = Date.parse(valB as string);
              if (!isNaN(dateA) && !isNaN(dateB)) {
                compare = dateA - dateB;
              } else {
                compare = (valA as string).localeCompare(valB as string);
              }
            } else {
              compare = String(valA).localeCompare(String(valB));
            }

            if (compare !== 0) {
              return direction === "desc" ? -compare : compare;
            }
          }
          return 0;
        });
      }

      // Limit
      const limitStr = url.searchParams.get("limit");
      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        if (!isNaN(limit)) {
          filtered = filtered.slice(0, limit);
        }
      }

      // If they queried site_settings for value
      const select = url.searchParams.get("select");
      if (table === "site_settings" && select === "value") {
        // PostgREST select format returns objects with only specified keys
        return {
          status: 200,
          body: filtered.map(r => ({ value: r.value })),
        };
      }

      return { status: 200, body: filtered };
    }

    // --- CREATE OPERATION (POST) ---
    if (method === "POST") {
      let payload: any;
      try {
        payload = JSON.parse(bodyText);
      } catch {
        return { status: 400, body: { error: "Invalid JSON body" } };
      }

      // Support array inserts or single object
      const itemsToInsert = Array.isArray(payload) ? payload : [payload];
      const inserted: any[] = [];

      for (const item of itemsToInsert) {
        // Handle resolution=merge-duplicates or on-conflict key matching
        const preferHeader = headers["prefer"] || headers["Prefer"] || "";
        const mergeDuplicates = preferHeader.includes("resolution=merge-duplicates");

        let index = -1;
        // Match key if specified or defaults
        if (table === "site_settings" && item.key) {
          index = rows.findIndex(r => r.key === item.key);
        } else if (item.id) {
          index = rows.findIndex(r => r.id === item.id);
        }

        if (index > -1 && (mergeDuplicates || url.searchParams.get("on_conflict"))) {
          // Merge
          rows[index] = { ...rows[index], ...item, updated_at: new Date().toISOString() };
          inserted.push(rows[index]);
        } else {
          // Insert
          const newItem = {
            id: item.id || `${table.substring(0, 4)}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            created_at: new Date().toISOString(),
            ...item,
          };
          rows.push(newItem);
          inserted.push(newItem);
        }
      }

      saveMockDb(db);

      const preferHeader = headers["prefer"] || headers["Prefer"] || "";
      const returnRepresentation = preferHeader.includes("return=representation");

      return {
        status: 201,
        body: returnRepresentation ? inserted : [],
      };
    }

    // --- UPDATE OPERATION (PATCH) ---
    if (method === "PATCH") {
      let patchPayload: any;
      try {
        patchPayload = JSON.parse(bodyText);
      } catch {
        return { status: 400, body: { error: "Invalid JSON body" } };
      }

      // Filter rows to update based on query filters
      let matchedCount = 0;
      url.searchParams.forEach((val, key) => {
        if (key === "select" || key === "order" || key === "limit") return;

        if (val.startsWith("eq.")) {
          const matchVal = val.substring(3);
          rows.forEach((row, idx) => {
            if (row[key] !== undefined && String(row[key]).toLowerCase() === matchVal.toLowerCase()) {
              rows[idx] = { ...row, ...patchPayload, updated_at: new Date().toISOString() };
              matchedCount++;
            }
          });
        }
      });

      if (matchedCount === 0 && url.searchParams.toString() === "") {
        // If no filter, update all (safeguard: normally not allowed by RLS, but in mock we allow it if called)
        rows.forEach((row, idx) => {
          rows[idx] = { ...row, ...patchPayload, updated_at: new Date().toISOString() };
        });
      }

      saveMockDb(db);
      return { status: 204, body: null }; // 204 No Content for PATCH standard
    }

    // --- DELETE OPERATION (DELETE) ---
    if (method === "DELETE") {
      let filteredRows = [...rows];
      url.searchParams.forEach((val, key) => {
        if (val.startsWith("eq.")) {
          const matchVal = val.substring(3);
          filteredRows = filteredRows.filter(
            row => !(row[key] !== undefined && String(row[key]).toLowerCase() === matchVal.toLowerCase())
          );
        }
      });

      (db as any)[table] = filteredRows;
      saveMockDb(db);
      return { status: 204, body: null };
    }

    return { status: 405, body: { error: `Method ${method} not supported` } };
  } catch (err: any) {
    console.error("[Mock Supabase Error]:", err);
    return { status: 500, body: { error: err?.message || "Internal server error" } };
  }
}
