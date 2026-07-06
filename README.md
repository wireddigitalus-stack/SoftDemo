# 🏢 VisionPIP — Property Intelligence Platform

**Interactive Sales Demo** · Team Vision LLC · Bristol, TN

> AI-powered commercial real estate management platform featuring automated lead scoring, tenant lifecycle management, maintenance operations, and portfolio analytics.

---

## 🚀 Quick Start

```bash
git clone https://github.com/wireddigitalus-stack/SoftDemo.git
cd SoftDemo
./start-demo.sh
```

The script will install dependencies, configure the environment, reset demo data, and open the dashboard.

> **Prerequisite**: [Node.js 18+](https://nodejs.org)

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| **AI Lead Scoring** | Google Gemini analyzes leads in real-time via chat |
| **Tenant Management** | Full lifecycle from lease to renewal with alerts |
| **Maintenance Ops** | Priority ticket system with staff assignment |
| **Cleaning Scheduling** | Move-in/move-out prep and routine assignments |
| **Portfolio Analytics** | Real-time KPIs, charts, and AI market briefs |
| **Architecture Maps** | Interactive system and cash flow visualizations |
| **QuickBooks Export** | IIF and Excel rent roll generation |

---

## 🔄 Resetting Demo Data

- **Dashboard**: Settings tab → 🔄 Reset Demo Data
- **Startup**: `./start-demo.sh` resets data on every launch
- **Manual**: `cp supabase/mock-db-seed.json supabase/mock-db.json`

---

## 🤖 AI Lease-Bot

1. Get a free key at [Google AI Studio](https://aistudio.google.com/apikey)
2. Add to `.env.local`: `GEMINI_API_KEY=your_key`
3. Restart the server
4. Visit the homepage and click the chat bubble

---

## 📊 Included Demo Data

| Category | Count |
|----------|-------|
| Properties | 9 |
| Tenants | 6 |
| Leads | 4 |
| Maintenance Tickets | 3 |
| Cleaning Assignments | 2 |

---

## 🛡️ Notes

- Self-contained demo — no cloud database connections
- All data stored locally in `supabase/mock-db.json`
- Changes persist until reset
- Not intended for production use

---

*Built with Next.js 15, React 19, Tailwind CSS, and Google Gemini AI*
*© Team Vision LLC*
