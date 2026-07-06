-- ============================================================================
-- VisionPIP SoftDemo — Full Schema + Seed Data Migration
-- ============================================================================
-- Run this file in the Supabase SQL Editor to set up the ENTIRE demo database.
-- It will:
--   1. DROP all existing tables (clean slate)
--   2. CREATE all tables with proper columns and indexes
--   3. CREATE the session_summary view
--   4. ENABLE Row Level Security on all tables
--   5. INSERT all demo seed data
-- ============================================================================


-- ============================================================================
-- SECTION 1: DROP EXISTING TABLES (clean slate, reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS site_content CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS property_details CASCADE;
DROP TABLE IF EXISTS available_spaces CASCADE;
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS site_analytics CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS property_image_overrides CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS cleaning_assignments CASCADE;
DROP TABLE IF EXISTS maintenance_tickets CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS allowed_users CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP VIEW IF EXISTS session_summary CASCADE;


-- ============================================================================
-- SECTION 2: CREATE TABLE STATEMENTS
-- ============================================================================

-- --------------------------------------------------------------------------
-- allowed_users
-- --------------------------------------------------------------------------
CREATE TABLE allowed_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  active BOOLEAN DEFAULT true,
  pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- leads
-- --------------------------------------------------------------------------
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  space_type TEXT,
  budget NUMERIC DEFAULT 0,
  timeline TEXT,
  team_size TEXT,
  score INTEGER DEFAULT 0,
  score_label TEXT DEFAULT 'Nurture',
  reasoning TEXT,
  matched_properties JSONB DEFAULT '[]',
  is_whale BOOLEAN DEFAULT false,
  whale_tier TEXT,
  whale_keywords JSONB DEFAULT '[]',
  source TEXT DEFAULT 'organic',
  medium TEXT DEFAULT 'direct',
  campaign TEXT DEFAULT '',
  additional_info TEXT,
  archived_at TIMESTAMPTZ,
  session_id TEXT
);

-- --------------------------------------------------------------------------
-- tenants
-- --------------------------------------------------------------------------
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  building TEXT,
  unit TEXT,
  rep TEXT,
  monthly_rent NUMERIC DEFAULT 0,
  utilities_fee NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  nnn_fee NUMERIC DEFAULT 0,
  cleaning_fee NUMERIC DEFAULT 0,
  cam_fee NUMERIC DEFAULT 0,
  nn_fee NUMERIC DEFAULT 0,
  lease_start DATE,
  lease_end DATE,
  renewal_date DATE,
  lease_alert_days INTEGER DEFAULT 60,
  escalation_pct NUMERIC DEFAULT 0,
  escalation_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  source_lead_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- maintenance_tickets
-- --------------------------------------------------------------------------
CREATE TABLE maintenance_tickets (
  id TEXT PRIMARY KEY,
  property TEXT,
  unit TEXT,
  issue TEXT NOT NULL,
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'open',
  assigned_worker TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  parts_needed TEXT
);

-- --------------------------------------------------------------------------
-- cleaning_assignments
-- --------------------------------------------------------------------------
CREATE TABLE cleaning_assignments (
  id TEXT PRIMARY KEY,
  property TEXT,
  area TEXT,
  scheduled_date DATE,
  assigned_worker TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- site_settings
-- --------------------------------------------------------------------------
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- property_image_overrides
-- --------------------------------------------------------------------------
CREATE TABLE property_image_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id TEXT,
  image_url TEXT,
  hero_url TEXT,
  all_urls JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- call_logs
-- --------------------------------------------------------------------------
CREATE TABLE call_logs (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  lead_name TEXT,
  actor_name TEXT,
  actor_email TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- site_analytics
-- --------------------------------------------------------------------------
CREATE TABLE site_analytics (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  page_title TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  event_data JSONB DEFAULT '{}',
  duration_ms INTEGER DEFAULT 0,
  device_type TEXT DEFAULT 'desktop',
  screen_width INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON site_analytics (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON site_analytics (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON site_analytics (created_at DESC);

-- --------------------------------------------------------------------------
-- blog_posts
-- --------------------------------------------------------------------------
CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  content TEXT,
  published BOOLEAN DEFAULT false,
  published_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- activity_log
-- --------------------------------------------------------------------------
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  actor_email TEXT,
  actor_name TEXT,
  action TEXT,
  resource_type TEXT,
  resource_name TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- portfolio_snapshots
-- --------------------------------------------------------------------------
CREATE TABLE portfolio_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  snapshot_date DATE NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  net_income NUMERIC DEFAULT 0,
  occupancy_rate NUMERIC DEFAULT 0,
  total_tenants INTEGER DEFAULT 0,
  open_tickets INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- properties
-- --------------------------------------------------------------------------
CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  address TEXT,
  city TEXT,
  sqft TEXT,
  lease_status TEXT DEFAULT 'available',
  badge TEXT,
  badge_color TEXT,
  description TEXT,
  features JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  hero_image TEXT,
  in_banner BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- available_spaces
-- --------------------------------------------------------------------------
CREATE TABLE available_spaces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id TEXT,
  name TEXT,
  sqft TEXT,
  price NUMERIC,
  status TEXT DEFAULT 'available',
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- property_details
-- --------------------------------------------------------------------------
CREATE TABLE property_details (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id TEXT,
  section TEXT,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- contact_submissions
-- --------------------------------------------------------------------------
CREATE TABLE contact_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  property_id TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- site_content
-- --------------------------------------------------------------------------
CREATE TABLE site_content (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  section TEXT,
  content JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- session_summary (VIEW)
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW session_summary AS
SELECT
  session_id,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  EXTRACT(EPOCH FROM MAX(created_at) - MIN(created_at)) * 1000 AS total_duration_ms,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
  COUNT(*) FILTER (WHERE event_type = 'cta_click') AS cta_clicks,
  COUNT(*) FILTER (WHERE event_type = 'property_click') AS property_clicks,
  MAX((event_data->>'scroll_pct')::int) AS max_scroll_pct,
  ARRAY_AGG(DISTINCT page_path) FILTER (WHERE event_type = 'page_view') AS pages_visited,
  (ARRAY_AGG(referrer ORDER BY created_at ASC))[1] AS entry_referrer,
  (ARRAY_AGG(utm_source ORDER BY created_at ASC))[1] AS utm_source,
  (ARRAY_AGG(utm_medium ORDER BY created_at ASC))[1] AS utm_medium,
  (ARRAY_AGG(utm_campaign ORDER BY created_at ASC))[1] AS utm_campaign,
  (ARRAY_AGG(device_type ORDER BY created_at ASC))[1] AS device_type
FROM site_analytics
GROUP BY session_id;


-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on all tables with deny-all for anon/authenticated.
-- Service role bypasses RLS by default in Supabase.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'allowed_users','leads','tenants','maintenance_tickets',
    'cleaning_assignments','site_settings','property_image_overrides',
    'call_logs','site_analytics','blog_posts','activity_log',
    'portfolio_snapshots','properties','available_spaces',
    'property_details','contact_submissions','site_content'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'allow_service_role_' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false)',
      'deny_all_' || tbl, tbl
    );
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 4: SEED DATA INSERT STATEMENTS
-- ============================================================================


-- --------------------------------------------------------------------------
-- 4.1  allowed_users (3 rows)
-- --------------------------------------------------------------------------

INSERT INTO allowed_users (id, email, name, role, active, pin, created_at) VALUES
  ('demo-admin-user', 'demo@teamvisionllc.com', 'Demo Admin', 'admin', true, NULL, '2026-05-14T04:45:29.326Z'),
  ('worker-john', 'john@teamvisionllc.com', 'John W. (Maintenance)', 'maintenance', true, '111111', '2026-05-16T04:45:29.326Z'),
  ('worker-mary', 'mary@teamvisionllc.com', 'Mary S. (Cleaning)', 'cleaning', true, '222222', '2026-05-16T04:45:29.326Z');


-- --------------------------------------------------------------------------
-- 4.2  leads (4 rows)
-- --------------------------------------------------------------------------

INSERT INTO leads (id, timestamp, name, email, phone, space_type, budget, timeline, team_size, score, score_label, reasoning, matched_properties, is_whale, whale_tier, whale_keywords, source, medium, campaign, additional_info, archived_at) VALUES
  (
    'demo_lead_1',
    '2026-06-13T04:37:29.326Z',
    'Sarah Mitchell',
    'smitchell@techcorp.io',
    '423-555-0192',
    'Office',
    2800,
    'ASAP — under 30 days',
    '2–4 people',
    91,
    'Hot Lead',
    'Strong budget ($2,800/mo), urgent timeline, and team size of 2-4 match the City Centre Professional Suites perfectly. Property has premium office options and immediate availability.',
    '[{"id":"city-centre","name":"City Centre Professional Suites","type":"Office","sqft":"120 – 6,000","matchReason":"All-inclusive pricing covers utilities, fits 2-4 people nicely."}]'::jsonb,
    false,
    NULL,
    '[]'::jsonb,
    'organic',
    'search',
    '',
    'Looking for a turn-key office with good high-speed internet and access to a meeting room.',
    NULL
  ),
  (
    'demo_lead_2',
    '2026-06-13T04:00:29.326Z',
    'Dr. James Patel',
    'jpatel@tricitiesmedical.org',
    '276-555-0847',
    'Office',
    8500,
    'ASAP — under 30 days',
    '5–10 people',
    96,
    'Hot Lead',
    'Premium budget ($8,500/mo), immediate timeline, and established medical/consulting firm size of 5-10 people. Matches The Executive Premier Office Suites (historic prestige) and City Centre larger suites.',
    '[{"id":"the-executive","name":"The Executive — Premier Office Suites","type":"Office","sqft":"500 – 12,000","matchReason":"Prestige address, full-service amenities fit corporate/medical offices."},{"id":"city-centre","name":"City Centre Professional Suites","type":"Office","sqft":"120 – 6,000","matchReason":"Contiguous square footage meets client space requirements."}]'::jsonb,
    true,
    'gold',
    '["medical","established","executive"]'::jsonb,
    'direct',
    'direct',
    '',
    'Needs client waiting area, off-street parking, and professional entry for medical consultation.',
    NULL
  ),
  (
    'demo_lead_3',
    '2026-06-13T00:45:29.326Z',
    'Elena Rostova',
    'elena.design@gmail.com',
    '423-555-9821',
    'CoWorking',
    600,
    '1–2 months',
    'Solo',
    64,
    'Warm Lead',
    'Solo designer seeking coworking setup. Bristol CoWork memberships are available immediately. Good candidate for dedicated desk or private single office.',
    '[{"id":"bristol-cowork","name":"Bristol CoWork","type":"CoWorking","sqft":"5,000+","matchReason":"Fully furnished private offices, dedicated desks, high-speed internet."}]'::jsonb,
    false,
    NULL,
    '[]'::jsonb,
    'social',
    'facebook',
    'cowork_promo',
    'Needs 24/7 access and conference room hours.',
    NULL
  ),
  (
    'demo_lead_4',
    '2026-06-11T16:45:29.326Z',
    'Marcus Vance',
    'mvance@vancelogistics.com',
    '865-555-4091',
    'Mixed-Use / Industrial',
    12500,
    '3–6 months',
    '15+ people',
    94,
    'Hot Lead',
    'Extremely high budget ($12,500/mo) and large space requirement for industrial distribution. Fits former Coca-Cola warehouse at West State Commons perfectly.',
    '[{"id":"west-state-commons","name":"West State Commons — Offices & Warehouse","type":"Mixed-Use / Industrial","sqft":"8,000 Office + 45,500 Warehouse","matchReason":"Coca-Cola facility has 45k sqft warehouse, high ceilings, loading docks."}]'::jsonb,
    true,
    'gold',
    '["warehouse","logistics","distribution"]'::jsonb,
    'organic',
    'search',
    '',
    'Requires tractor-trailer accessibility and 3-phase power for packaging systems.',
    NULL
  );


-- --------------------------------------------------------------------------
-- 4.3  tenants (6 rows)
-- --------------------------------------------------------------------------

INSERT INTO tenants (id, name, contact_name, email, phone, building, unit, rep, monthly_rent, utilities_fee, security_deposit, nnn_fee, cleaning_fee, cam_fee, nn_fee, lease_start, lease_end, renewal_date, lease_alert_days, escalation_pct, escalation_date, status, notes, source_lead_id, created_at) VALUES
  (
    'tenant_comm_1',
    'Bristol Catering Company',
    'Julie McClanahan',
    'jmcclanahan@bristolcatering.com',
    '423-573-1022',
    'City Centre Professional Suites',
    'Suite 100',
    'Julie McClanahan',
    3800, 150, 3800, 0, 0, 0, 0,
    '2024-07-13', '2026-06-28', '2026-05-29',
    90, 3, '2026-05-14',
    'active',
    'Main catering offices and street front retail space. Expiring soon - critical renewal discussion needed.',
    '',
    '2024-07-13T04:45:29.326Z'
  ),
  (
    'tenant_comm_2',
    'Wolf Hills Law Group',
    'Blake Thornton, Esq.',
    'bthornton@wolfhillslaw.com',
    '276-555-9012',
    'Jamestown at Shelby',
    'Suite 300',
    'Allen Hurley',
    2400, 100, 2400, 120, 50, 0, 0,
    '2025-01-29', '2026-07-28', '2026-06-28',
    60, 2.5, '2026-07-13',
    'active',
    'Corporate legal offices. Off-street parking was key requirement. Alert: 45 days remaining on lease.',
    'demo_lead_4',
    '2025-01-29T04:45:29.326Z'
  ),
  (
    'tenant_res_1',
    'David & Emily Carter',
    'David Carter',
    'dcarter@gmail.com',
    '423-555-7890',
    'St. Albert Court Apartments',
    'Apt 101',
    'Leasing Agent',
    1150, 80, 1150, 0, 0, 15, 0,
    '2025-08-17', '2026-08-12', '2026-07-13',
    90, 5, '2026-06-23',
    'active',
    'Quiet residential tenant. Expiring in 60 days. Requested kitchen disposal repair recently.',
    '',
    '2025-08-17T04:45:29.326Z'
  ),
  (
    'tenant_res_2',
    'Sophia Martinez',
    'Sophia Martinez',
    'smartinez@king.edu',
    '423-555-4512',
    'St. Albert Court Apartments',
    'Apt 102',
    'Leasing Agent',
    1200, 80, 1200, 0, 0, 15, 0,
    '2026-03-15', '2027-03-20', '2027-02-18',
    60, 4, '2027-03-10',
    'active',
    'Graduate student at King University. Rent auto-paid on 1st.',
    '',
    '2026-03-15T04:45:29.326Z'
  ),
  (
    'tenant_res_3',
    'Marcus & Clara Vance',
    'Marcus Vance',
    'marcus.vance@yahoo.com',
    '865-555-4091',
    'St. Albert Court Apartments',
    'Apt 201',
    'Leasing Agent',
    1400, 95, 1400, 0, 0, 15, 0,
    '2025-06-03', '2026-06-03', '2026-05-04',
    60, 6, '2026-06-03',
    'active',
    'Spacious upper floor layout. ALERT: Lease has expired 10 days ago! Requires urgent follow up.',
    '',
    '2025-06-03T04:45:29.326Z'
  ),
  (
    'tenant_res_4',
    'Thomas Jenkins',
    'Thomas Jenkins',
    'tjenkins@gmail.com',
    '276-555-1122',
    'Virginia Heights Residential',
    'Townhouse A',
    'Leasing Agent',
    1650, 0, 1650, 0, 0, 0, 0,
    '2026-01-14', '2027-01-09', '2026-12-10',
    60, 3.5, '2027-01-09',
    'active',
    'Residential tenant on the Virginia side. Self-paying utilities.',
    '',
    '2026-01-14T04:45:29.326Z'
  );


-- --------------------------------------------------------------------------
-- 4.4  maintenance_tickets (3 rows)
-- --------------------------------------------------------------------------

INSERT INTO maintenance_tickets (id, property, unit, issue, priority, status, assigned_worker, notes, created_at, completed_at, parts_needed) VALUES
  (
    'ticket_1',
    'St. Albert Court Apartments',
    'Apt 101',
    'Garbage disposal jammed and kitchen sink draining slowly.',
    2,
    'open',
    NULL,
    'David reported it this morning. Needs inspection.',
    '2026-06-13T01:45:29.326Z',
    NULL,
    'None yet'
  ),
  (
    'ticket_2',
    'City Centre Professional Suites',
    'Suite 100',
    'HVAC blowing warm air in receptionist area.',
    1,
    'scheduled',
    'John W. (Maintenance)',
    'John dispatched. Replaced air filters, checking condenser units.',
    '2026-06-12T04:45:29.326Z',
    NULL,
    'Freon R410A recharge maybe'
  ),
  (
    'ticket_3',
    'St. Albert Court Apartments',
    'Apt 201',
    'Replace balcony door weather stripping.',
    3,
    'complete',
    'John W. (Maintenance)',
    'Stripping replaced. Door seals fine now.',
    '2026-06-03T04:45:29.326Z',
    '2026-06-04T04:45:29.326Z',
    'Weather seal strip 8ft'
  );


-- --------------------------------------------------------------------------
-- 4.5  cleaning_assignments (2 rows)
-- --------------------------------------------------------------------------

INSERT INTO cleaning_assignments (id, property, area, scheduled_date, assigned_worker, status, notes, created_at) VALUES
  (
    'clean_1',
    'City Centre Professional Suites',
    'Common Lobby & Bathrooms',
    '2026-06-14',
    'Mary S. (Cleaning)',
    'scheduled',
    'Regular high-frequency common area wipe down.',
    '2026-06-12T04:45:29.326Z'
  ),
  (
    'clean_2',
    'St. Albert Court Apartments',
    'Apt 102 Move-in Cleaning Prep',
    '2026-06-11',
    'Mary S. (Cleaning)',
    'completed',
    'Post-renovation deep clean. Unit is fully prepped for move-in.',
    '2026-06-08T04:45:29.326Z'
  );


-- --------------------------------------------------------------------------
-- 4.6  site_settings (1 row)
-- --------------------------------------------------------------------------

INSERT INTO site_settings (key, value, updated_at) VALUES
  (
    'hero_config',
    '{
      "slides": [
        {
          "type": "property",
          "propertyId": "city-centre",
          "label": "City Centre Professional Suites",
          "location": "Downtown Bristol, TN",
          "enabled": true,
          "order": 0
        },
        {
          "type": "property",
          "propertyId": "bristol-cowork",
          "label": "Bristol CoWork",
          "location": "620 State Street, Bristol, TN",
          "enabled": true,
          "order": 1
        },
        {
          "type": "property",
          "propertyId": "the-executive",
          "label": "The Executive Office Suites",
          "location": "Downtown Bristol, TN",
          "enabled": true,
          "order": 2
        },
        {
          "type": "property",
          "propertyId": "centre-point-suites",
          "label": "Centre Point",
          "location": "Bristol, VA (Casino Adjacent)",
          "enabled": true,
          "order": 3
        },
        {
          "type": "property",
          "propertyId": "st-albert-apartments",
          "label": "St. Albert Court Apartments",
          "location": "Downtown Bristol, TN",
          "enabled": true,
          "order": 4
        },
        {
          "type": "property",
          "propertyId": "west-state-commons",
          "label": "West State Commons",
          "location": "Bristol, VA",
          "enabled": true,
          "order": 5
        }
      ],
      "videoUrl": null,
      "videoEnabled": false
    }'::jsonb,
    '2026-06-13T04:45:29.326Z'
  );


-- --------------------------------------------------------------------------
-- 4.7  call_logs (2 rows)
-- --------------------------------------------------------------------------

INSERT INTO call_logs (id, lead_id, lead_name, actor_name, actor_email, outcome, notes, created_at) VALUES
  (
    'call_1',
    'demo_lead_1',
    'Sarah Mitchell',
    'Demo Admin',
    'demo@teamvisionllc.com',
    'spoke',
    'Spoke with Sarah. She is extremely interested in the 300 sqft corner office at City Centre. Scheduled a physical tour for Monday at 10 AM.',
    '2026-06-13T02:15:29.326Z'
  ),
  (
    'call_2',
    'demo_lead_2',
    'Dr. James Patel',
    'Demo Admin',
    'demo@teamvisionllc.com',
    'vm',
    'Left voicemail following up on their clinic expansion requirements. Mentioned The Executive suites and dedicated staff parking.',
    '2026-06-12T02:21:29.326Z'
  );


-- --------------------------------------------------------------------------
-- 4.8  site_analytics (3 rows)
-- --------------------------------------------------------------------------

INSERT INTO site_analytics (session_id, event_type, page_path, page_title, referrer, utm_source, utm_medium, utm_campaign, event_data, duration_ms, device_type, screen_width, created_at) VALUES
  (
    'session_mock_1',
    'page_view',
    '/',
    'Vision LLC — Commercial Properties',
    'https://www.google.com/',
    'google',
    'cpc',
    'bristol_cre',
    '{}'::jsonb,
    45000,
    'desktop',
    1440,
    '2026-06-13T02:33:29.326Z'
  ),
  (
    'session_mock_1',
    'property_click',
    '/',
    'Vision LLC — Commercial Properties',
    'https://www.google.com/',
    'google',
    'cpc',
    'bristol_cre',
    '{"property_id":"city-centre"}'::jsonb,
    12000,
    'desktop',
    1440,
    '2026-06-13T02:39:29.326Z'
  ),
  (
    'session_mock_1',
    'cta_click',
    '/properties/city-centre',
    'City Centre Professional Suites | Vision LLC',
    'https://www.google.com/',
    'google',
    'cpc',
    'bristol_cre',
    '{"label":"Chat with Lease Bot"}'::jsonb,
    0,
    'desktop',
    1440,
    '2026-06-13T02:45:29.326Z'
  );


-- --------------------------------------------------------------------------
-- 4.9  blog_posts (1 row)
-- --------------------------------------------------------------------------

INSERT INTO blog_posts (id, title, slug, summary, content, published, published_at, created_at) VALUES
  (
    'blog_1',
    'The Historical Transformation of Downtown Bristol',
    'historical-transformation-downtown-bristol',
    'Explore how adaptive reuse of 100-year-old structures is powering a modern economic boom along State Street.',
    '<p>Downtown Bristol is experiencing a massive revival...</p>',
    true,
    '2026-05-29',
    '2026-05-28T00:00:00.000Z'
  );


-- --------------------------------------------------------------------------
-- 4.10  activity_log (8 rows)
-- --------------------------------------------------------------------------

INSERT INTO activity_log (id, actor_email, actor_name, action, resource_type, resource_name, resource_id, metadata, created_at) VALUES
  (
    'act_1',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'created',
    'tenant',
    'Wolf Hills Law Group',
    'tenant_comm_2',
    '{"building":"Jamestown at Shelby","unit":"Suite 300","monthly_rent":2400}'::jsonb,
    '2026-06-08T04:45:29.326Z'
  ),
  (
    'act_2',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'updated',
    'maintenance',
    'Replace balcony door weather stripping',
    'ticket_3',
    '{"status":"completed"}'::jsonb,
    '2026-06-09T04:45:29.326Z'
  ),
  (
    'acti_1781325929326_nd883',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'admin_login',
    'auth',
    'Demo Admin',
    '',
    '{"device":"desktop"}'::jsonb,
    '2026-06-13T04:45:28.688Z'
  ),
  (
    'acti_1781326018803_zyjgl',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'admin_login',
    'auth',
    'Demo Admin',
    '',
    '{"device":"desktop"}'::jsonb,
    '2026-06-13T04:46:58.765Z'
  ),
  (
    'acti_1781326069060_xe8qt',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'admin_login',
    'auth',
    'Demo Admin',
    '',
    '{"device":"desktop"}'::jsonb,
    '2026-06-13T04:47:49.037Z'
  ),
  (
    'acti_1781419353176_kqt9o',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'admin_login',
    'auth',
    'Demo Admin',
    '',
    '{"device":"desktop"}'::jsonb,
    '2026-06-14T06:42:33.102Z'
  ),
  (
    'acti_1781419486003_avyrc',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'admin_login',
    'auth',
    'Demo Admin',
    '',
    '{"device":"desktop"}'::jsonb,
    '2026-06-14T06:44:45.976Z'
  ),
  (
    'acti_1781420230177_zv9rm',
    'demo@teamvisionllc.com',
    'Demo Admin',
    'admin_login',
    'auth',
    'Demo Admin',
    '',
    '{"device":"desktop"}'::jsonb,
    '2026-06-14T06:57:10.118Z'
  );


-- --------------------------------------------------------------------------
-- 4.11  portfolio_snapshots (7 rows)
-- --------------------------------------------------------------------------

INSERT INTO portfolio_snapshots (id, snapshot_date, total_revenue, total_expenses, net_income, occupancy_rate, total_tenants, open_tickets, notes, created_at) VALUES
  (
    gen_random_uuid()::text,
    '2026-01-14',
    10500, 3200, 7300, 55.5, 5, 4,
    'Seeding month 1',
    '2026-01-14T04:45:29.326Z'
  ),
  (
    gen_random_uuid()::text,
    '2026-02-13',
    11000, 3000, 8000, 60, 5, 3,
    'Seeding month 2',
    '2026-02-13T04:45:29.326Z'
  ),
  (
    gen_random_uuid()::text,
    '2026-03-15',
    11500, 3400, 8100, 60, 5, 2,
    'Seeding month 3',
    '2026-03-15T04:45:29.326Z'
  ),
  (
    gen_random_uuid()::text,
    '2026-04-14',
    12800, 2900, 9900, 66.6, 6, 2,
    'Seeding month 4',
    '2026-04-14T04:45:29.326Z'
  ),
  (
    gen_random_uuid()::text,
    '2026-05-14',
    13400, 3100, 10300, 66.6, 6, 1,
    'Seeding month 5',
    '2026-05-14T04:45:29.326Z'
  ),
  (
    gen_random_uuid()::text,
    '2026-06-13',
    12650, 3000, 9650, 66.6, 6, 2,
    'Today''s snapshot',
    '2026-06-13T04:45:29.326Z'
  ),
  (
    'port_1781420327568_samsl',
    '2026-06-14',
    12320, 0, 12320, 46.2, 6, 1,
    NULL,
    '2026-06-14T06:58:47.568Z'
  );


-- --------------------------------------------------------------------------
-- 4.12  properties (4 rows)
-- --------------------------------------------------------------------------

INSERT INTO properties (id, name, type, address, city, sqft, lease_status, badge, badge_color, description, features, images, hero_image, in_banner, published, created_at) VALUES
  (
    'city-centre',
    'City Centre Professional Suites',
    'Office',
    '100 5th St., Bristol, TN 37620',
    'Bristol, TN',
    '120 – 6,000',
    'available',
    'Featured',
    '#4ADE80',
    'City Centre Professional Suites is the Preservation Award-winning office address in the heart of Downtown Bristol — The Birthplace of Country Music. We offer premier office suites from 120 to 6,000 sqft with a professional environment that makes a great first impression on clients and business associates.',
    '["120 – 6,000 sqft Suites","All-Inclusive Pricing","CCTV Security","Fitness Access","Preservation Award Winner","Downtown Bristol","Single Offices Available"]'::jsonb,
    '["/property-images/commercial-city-centre-exterior.jpg","/property-images/commercial-vision-office.jpg"]'::jsonb,
    '/property-images/commercial-city-centre-exterior.jpg',
    true,
    true,
    '2026-05-14T04:45:29.326Z'
  ),
  (
    'bristol-cowork',
    'Bristol CoWork',
    'CoWorking',
    '620 State Street, Bristol, TN',
    'Bristol, TN',
    '5,000+',
    'available',
    'CoWork',
    '#FACC15',
    'Experience modern commercial leasing at Bristol CoWork — a 5,000+ sqft facility at 620 State Street offering fully furnished private offices, dedicated desks, and equipped conference rooms with high-speed internet and all utilities included.',
    '["Private Offices","Dedicated Desks","Conference Rooms","High-Speed Internet","Fully Furnished"]'::jsonb,
    '["/property-images/cowork-shared-office.jpg","/property-images/cowork-conference-room.jpg","/property-images/cowork-lobby-waiting.jpg","/property-images/cowork-private-office.jpg"]'::jsonb,
    '/property-images/cowork-shared-office.jpg',
    true,
    true,
    '2026-05-14T04:45:29.326Z'
  ),
  (
    'st-albert-apartments',
    'St. Albert Court Apartments',
    'Residential',
    '312 Spencer St., Bristol, TN 37620',
    'Bristol, TN',
    '900 – 1,400',
    'available',
    'Multi-Tenant',
    '#60A5FA',
    'St. Albert Court Apartments offers premium multi-tenant residential living in Downtown Bristol. Meticulously maintained units featuring 1-2 bedrooms, modern kitchens, off-street parking, and walking distance to State Street.',
    '["1-2 Bedroom Units","Off-Street Parking","Modern Kitchens","Pet Friendly","Walking Distance to Downtown"]'::jsonb,
    '["/property-images/residential-exterior.jpg"]'::jsonb,
    '/property-images/residential-exterior.jpg',
    true,
    true,
    '2026-05-14T04:45:29.326Z'
  ),
  (
    'virginia-heights',
    'Virginia Heights Residential',
    'Residential',
    '804 Commonwealth Ave, Bristol, VA 24201',
    'Bristol, VA',
    '1,200 – 1,800',
    'available',
    'Virginia Side',
    '#FACC15',
    'Virginia Heights features beautiful townhouses located near the exit 5 corridor, offering easy access to both I-81 and Downtown Bristol VA. Spacious layouts with private garages.',
    '["Private Garages","Spacious Layouts","Near Exit 5 Corridor","Virginia Side Location"]'::jsonb,
    '["/property-images/townhouse-exterior.jpg"]'::jsonb,
    '/property-images/townhouse-exterior.jpg',
    true,
    true,
    '2026-05-14T04:45:29.326Z'
  );


-- ============================================================================
-- DONE! All tables created, RLS enabled, and demo data seeded.
-- ============================================================================
