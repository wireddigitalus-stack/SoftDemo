"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import TenantsTab from "./TenantsTab";
import AnalyticsTab, { type AnalyticsLead } from "./AnalyticsTab";
import MaintenanceTab from "./MaintenanceTab";
import CleaningTab from "./CleaningTab";
import MarketingTab from "./MarketingTab";
import ContentTab from "./ContentTab";
import ProTips from "./ProTips";
import CallLogModal, { type CallLog, outcomeColor, outcomeLabel } from "./CallLogModal";
import PrintButton from "./PrintButton";
import { supabaseBrowser } from "@/lib/supabase-browser";
import * as XLSX from "xlsx";
import {
  Zap, RefreshCw, Phone, Clock, Building2, TrendingUp,
  Users, Filter, AlertCircle, DollarSign, Calendar,
  Settings, Plus, Trash2, Save, CheckCircle2, Loader2,
  Bell, Mail, Shield, X, Radio, Smartphone, Lock, BellRing, Moon,
  Sparkles, Brain, Send, ChevronRight, ChevronDown, Archive, MessageSquare, BarChart3, Wrench,
  FileSpreadsheet, Download, Upload, FileText, Flame, Pencil, Share2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedProperty {
  id: string; name: string; type: string;
  sqft: string; location: string; matchReason: string;
}

interface Lead {
  id: string; timestamp: string; name: string; email: string;
  phone: string; spaceType: string; budget: number; timeline: string;
  teamSize: string; score: number;
  scoreLabel: "Hot Lead" | "Warm Lead" | "Nurture";
  reasoning: string; matchedProperties: MatchedProperty[];
  isWhale?: boolean;
  whaleTier?: "gold" | "silver" | null;
  whaleKeywords?: string[];
  source?: string;
  medium?: string;
  campaign?: string;
  additionalInfo?: string;
}

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "maintenance" | "cleaning";
  active: boolean;
  pin?: string;
  created_at?: string;
}



// ─── Export Button ───────────────────────────────────────────────────────────

function ExportButton({ leads }: { leads: Lead[] }) {
  const [exporting, setExporting] = useState(false);

  function doExport() {
    setExporting(true);
    try {
      const rows = leads.map(l => ({
        "Name":       l.name,
        "Phone":      l.phone,
        "Email":      l.email,
        "Space Type": l.spaceType,
        "Budget/mo":  l.budget,
        "Timeline":   l.timeline,
        "Team Size":  l.teamSize,
        "AI Score":   l.score,
        "Label":      l.scoreLabel,
        "Source":     l.source || "organic",
        "Notes":      l.additionalInfo || "",
        "Submitted":  new Date(l.timestamp).toLocaleString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `vision-leads-${new Date().toISOString().slice(0,10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={doExport}
      disabled={exporting || leads.length === 0}
      className="mt-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all"
    >
      {exporting ? <><Loader2 size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Download Excel</>}
    </button>
  );
}

// ─── Import Panel ─────────────────────────────────────────────────────────────

type ImportRow = Record<string, string | number>;

function ImportPanel() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setErr(""); setDone(0); setRows([]); setHeaders([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!parsed.length) { setErr("No rows found in file."); return; }
        setHeaders(Object.keys(parsed[0]));
        setRows(parsed.slice(0, 5)); // preview first 5
      } catch { setErr("Could not read file. Make sure it's .xlsx or .csv."); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function doImport() {
    if (!inputRef.current?.files?.[0]) return;
    setImporting(true); setErr(""); setDone(0);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        let count = 0;
        for (const row of allRows) {
          const name = String(row["Name"] || row["name"] || row["Contact"] || row["Lead Name"] || "").trim();
          if (!name) continue;
          const body = {
            name,
            phone:          String(row["Phone"] || row["phone"] || ""),
            email:          String(row["Email"] || row["email"] || ""),
            spaceType:      String(row["Space Type"] || row["spaceType"] || row["Type"] || "Office Space"),
            budget:         Number(row["Budget/mo"] || row["Budget"] || row["budget"] || 0),
            timeline:       String(row["Timeline"] || row["timeline"] || "Exploring options"),
            teamSize:       String(row["Team Size"] || row["teamSize"] || "Solo"),
            additionalInfo: String(row["Notes"] || row["notes"] || row["Additional Info"] || ""),
            score:          Number(row["AI Score"] || row["Score"] || row["score"] || 50),
            scoreLabel:     String(row["Label"] || row["scoreLabel"] || "Warm Lead"),
            reasoning:      `Imported from spreadsheet on ${new Date().toLocaleDateString()}.`,
            source:         "import",
            medium:         "excel",
          };
          await fetch("/api/admin-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          count++;
        }
        setDone(count); setImporting(false);
      };
      reader.readAsArrayBuffer(inputRef.current.files[0]);
    } catch { setErr("Import failed. Please try again."); setImporting(false); }
  }

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Drop zone */}
      <label
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(96,165,250,0.25)] bg-[rgba(96,165,250,0.04)] p-5 cursor-pointer hover:border-[rgba(96,165,250,0.5)] hover:bg-[rgba(96,165,250,0.07)] transition-all"
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={e => e.preventDefault()}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <Upload size={20} className="text-[#60A5FA] opacity-60" />
        <p className="text-[11px] text-gray-500 text-center">Drag & drop your <strong className="text-gray-400">.xlsx</strong> or <strong className="text-gray-400">.csv</strong> here<br />or click to browse</p>
      </label>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-auto max-h-40">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider px-3 pt-2 pb-1">Preview — first {rows.length} rows</p>
          <table className="w-full text-[10px] text-gray-400">
            <thead><tr className="border-b border-[rgba(255,255,255,0.05)]">
              {headers.slice(0,5).map(h => <th key={h} className="px-3 py-1 text-left text-[9px] text-gray-600 font-bold uppercase">{h}</th>)}
            </tr></thead>
            <tbody>{rows.map((r,i) => (
              <tr key={i} className="border-b border-[rgba(255,255,255,0.03)]">
                {headers.slice(0,5).map(h => <td key={h} className="px-3 py-1.5 truncate max-w-[80px]">{String(r[h]).slice(0,30)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {err && <p className="text-xs text-red-400">{err}</p>}
      {done > 0 && <p className="text-xs text-[#4ADE80] font-bold">✓ {done} leads imported successfully!</p>}

      {rows.length > 0 && (
        <button
          onClick={doImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {importing ? <><Loader2 size={13} className="animate-spin" /> Importing…</> : <><Upload size={13} /> Import All Rows</>}
        </button>
      )}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
// Hover on desktop · long-press on mobile · zero external deps

function Tooltip({ text, children, wide }: { text: string; children: React.ReactNode; wide?: boolean }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => setVisible(true);
  const hide = () => { setVisible(false); if (timerRef.current) clearTimeout(timerRef.current); };
  const startLong = () => { timerRef.current = setTimeout(() => setVisible(true), 500); };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={show} onMouseLeave={hide}
      onTouchStart={startLong} onTouchEnd={hide} onTouchCancel={hide}
    >
      {children}
      {visible && (
        <span
          className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[999] ${wide ? "w-56" : "w-44"} text-center`}
          role="tooltip"
        >
          <span className="block px-3 py-2 rounded-xl text-[11px] leading-snug font-medium text-gray-200 bg-[rgba(10,16,26,0.97)] border border-[rgba(255,255,255,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {text}
          </span>
          {/* Caret */}
          <span className="block w-2 h-2 mx-auto -mt-1 rotate-45 bg-[rgba(10,16,26,0.97)] border-r border-b border-[rgba(255,255,255,0.1)]" />
        </span>
      )}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "#4ADE80";
  if (score >= 40) return "#FACC15";
  return "#94A3B8";
}
function scoreBadge(label: string) {
  if (label === "Hot Lead") return "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] border-[rgba(74,222,128,0.3)]";
  if (label === "Warm Lead") return "bg-[rgba(250,204,21,0.1)] text-[#FACC15] border-[rgba(250,204,21,0.3)]";
  return "bg-[rgba(148,163,184,0.1)] text-[#94A3B8] border-[rgba(148,163,184,0.2)]";
}
function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}
function isUrgent(lead: Lead) {
  const hrs = (Date.now() - new Date(lead.timestamp).getTime()) / 36e5;
  return lead.scoreLabel === "Hot Lead" && hrs < 24;
}
function nameToSlug(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  return parts.find(p => p.length > 2) ?? parts[0];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
// ── Lead Aging ───────────────────────────────────────────────────────

const MAX_AGE_DAYS = 180;
const COLD_DAYS    = 60;   // days without contact before lead goes cold

function daysOld(ts: string): number {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 864e5);
}
function daysRemaining(ts: string): number {
  return Math.max(0, MAX_AGE_DAYS - daysOld(ts));
}
function isArchived(ts: string): boolean {
  return daysOld(ts) >= MAX_AGE_DAYS;
}
// Note: callLogs passed in at call site — no closure needed
function daysSinceContact(lead: { id: string; timestamp: string }, callLogs: import("./CallLogModal").CallLog[]): number {
  const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
  const lastDate = logsForLead.length > 0
    ? new Date(logsForLead[0].created_at)   // already sorted desc
    : new Date(lead.timestamp);
  return Math.floor((Date.now() - lastDate.getTime()) / 864e5);
}
function isCold(lead: { id: string; timestamp: string }, callLogs: import("./CallLogModal").CallLog[]): boolean {
  return daysSinceContact(lead, callLogs) >= COLD_DAYS && !isArchived(lead.timestamp);
}
function ageBarColor(days: number): string {
  if (days < 90) return "#4ADE80";   // green — fresh
  if (days < 140) return "#FACC15";  // yellow — warming
  if (days < 165) return "#FB923C";  // orange — expiring
  return "#EF4444";                  // red — critical
}
function ageBarPct(days: number): number {
  return Math.min(100, (days / MAX_AGE_DAYS) * 100);
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_LEADS: Lead[] = [
  { id: "demo_1", timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), name: "Sarah Mitchell", email: "", phone: "423-555-0192", spaceType: "Executive Office", budget: 3000, timeline: "ASAP — under 30 days", teamSize: "2–4 people", score: 91, scoreLabel: "Hot Lead", reasoning: "Strong budget, urgent timeline, and professional office need align perfectly with City Centre availability.", matchedProperties: [{ id: "city-centre", name: "City Centre Professional Suites", type: "Office", sqft: "1,200–3,000 sqft", location: "Downtown Bristol, TN", matchReason: "Premium finishes, immediate availability, fits 2-4 team." }] },
  { id: "demo_2", timestamp: new Date(Date.now() - 1000 * 60 * 34).toISOString(), name: "Mark Delaney", email: "", phone: "", spaceType: "CoWork Membership", budget: 800, timeline: "1–2 months", teamSize: "Solo", score: 58, scoreLabel: "Warm Lead", reasoning: "Solo operator with moderate budget — Bristol CoWork is an excellent fit. Nurture toward dedicated desk.", matchedProperties: [{ id: "bristol-cowork", name: "Bristol CoWork", type: "CoWork", sqft: "Hot desk / Dedicated desk", location: "620 State Street, Bristol, TN", matchReason: "All-inclusive monthly membership, perfect for solo professional." }] },
  { id: "demo_3", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), name: "Dr. James Patel", email: "", phone: "276-555-0847", spaceType: "Private Office Suite", budget: 6000, timeline: "ASAP — under 30 days", teamSize: "5–10 people", score: 96, scoreLabel: "Hot Lead", reasoning: "Very high budget, urgent timeline, established team — priority contact for today.", matchedProperties: [{ id: "the-executive", name: "The Executive Office Suites", type: "Office", sqft: "2,000–6,000 sqft", location: "Downtown Bristol, TN", matchReason: "Historic prestige building, fits team of 5-10, premium positioning." }, { id: "city-centre", name: "City Centre Professional Suites", type: "Office", sqft: "3,000–8,000 sqft", location: "Downtown Bristol, TN", matchReason: "Larger footprint option with flexible configuration." }], isWhale: true, whaleTier: "gold", whaleKeywords: [] },
  { id: "demo_4", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), name: "Blake Thornton", email: "", phone: "", spaceType: "Retail Storefront", budget: 1500, timeline: "3–6 months", teamSize: "2–4 people", score: 42, scoreLabel: "Warm Lead", reasoning: "Retail need with longer timeline. Good candidate for State Street storefront. Follow up in 60 days.", matchedProperties: [{ id: "centre-point", name: "Centre Point Suites", type: "Retail", sqft: "800–2,000 sqft", location: "Downtown Bristol, TN", matchReason: "High foot traffic retail units at budget-friendly rates." }] },
];

// ─── User Section Component ──────────────────────────────────────────────────

// ─── Owner lock — these emails can never be deleted from the dashboard
const OWNER_EMAILS = new Set([
  "ahurley1474@gmail.com",   // Allen Hurley — owner
  "wireddigitalus@gmail.com", // Robert Neilson — developer
]);

function UserSection({ title, role, icon, color, users, onRefresh }: {
  title: string; role: string; icon: React.ReactNode; color: string;
  users: AllowedUser[]; onRefresh: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const isStaffRole = role === "maintenance" || role === "cleaning";

  const generatePin = () => {
    const p = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(p);
  };

  const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-600";

  const addUser = async () => {
    if (!isStaffRole && !email.trim()) { setError("Email is required."); return; }
    if (isStaffRole && !name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, string> = { name: name.trim(), role };
      if (email.trim()) payload.email = email.trim();
      if (isStaffRole) payload.pin = pin || "123456";
      const res = await fetch("/api/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed — email may already exist."); }
      else { setEmail(""); setName(""); setPin(""); setShowAdd(false); onRefresh(); }
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const removeUser = async (id: string) => {
    await fetch(`/api/allowed-users?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/allowed-users?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    onRefresh();
  };

  return (
    <div className="rounded-2xl border bg-[rgba(255,255,255,0.02)] p-5"
      style={{ borderColor: `${color}22`, boxShadow: `0 0 20px ${color}10` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}35` }}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{title}</h3>
            <p className="text-[10px] text-gray-600">{users.length} user{users.length !== 1 ? "s" : ""} · instant access control</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
          style={{ color, borderColor: `${color}40`, backgroundColor: showAdd ? `${color}15` : "transparent" }}>
          <Plus size={11} /> Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.2)] space-y-2">
          <div className={`grid ${isStaffRole ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Full Name {isStaffRole && '*'}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Mike D." className={FIELD} />
            </div>
            {!isStaffRole && (
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Gmail Address *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="mike@gmail.com" type="email" className={FIELD}
                  onKeyDown={e => { if (e.key === "Enter") addUser(); }} />
              </div>
            )}
          </div>
          {isStaffRole && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">6-Digit PIN</label>
              <div className="flex gap-2">
                <input value={pin} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setPin(v); }}
                  placeholder="123456" maxLength={6} inputMode="numeric" pattern="[0-9]*"
                  className={FIELD + " font-mono tracking-[0.3em] text-center"}
                  onKeyDown={e => { if (e.key === "Enter") addUser(); }} />
                <button onClick={generatePin} type="button"
                  className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[10px] font-bold text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-all whitespace-nowrap">
                  🎲 Random
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Leave empty for default PIN: 123456</p>
            </div>
          )}
          {isStaffRole && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Email (optional)</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="mike@gmail.com" type="email" className={FIELD} />
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addUser} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, color: "#000" }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? "Adding…" : "Add User"}
            </button>
            <button onClick={() => { setShowAdd(false); setError(""); setEmail(""); setName(""); setPin(""); }}
              className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
      {users.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">{isStaffRole ? "No staff yet — add a name and PIN above." : "No users yet — add a Gmail address above."}</p>
        )}
        {users.map(u => {
            const isOwner = u.email ? OWNER_EMAILS.has(u.email.toLowerCase()) : false;
            return (
          <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${u.active ? "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]" : "border-[rgba(255,255,255,0.03)] opacity-40"}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
              style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
              {initials(u.name || u.email || "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white truncate">{u.name || "(no name)"}</p>
                {isOwner && (
                  <Tooltip text="Owner account — protected. Can only be removed via Supabase directly.">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-black cursor-help">🔒 Owner</span>
                  </Tooltip>
                )}
              </div>
              <p className="text-[11px] text-gray-500 truncate">{u.email || "(PIN-only)"}</p>
              {isStaffRole && u.pin && (
                <button onClick={() => { navigator.clipboard.writeText(u.pin!); }}
                  title="Copy PIN"
                  className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors mt-0.5">
                  <span className="font-mono tracking-wider bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">PIN: {u.pin}</span>
                  📋
                </button>
              )}
            </div>
            {!isOwner && (
              <button onClick={() => toggleActive(u.id, u.active)}
                title={u.active ? "Suspend access" : "Re-enable access"}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                  u.active ? "text-[#4ADE80] border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(239,68,68,0.08)] hover:text-red-400 hover:border-[rgba(239,68,68,0.3)]"
                  : "text-gray-600 border-[rgba(255,255,255,0.08)] hover:text-[#4ADE80]"
                }`}>
                {u.active ? "Active" : "Off"}
              </button>
            )}
            {isOwner ? (
              <span className="text-[10px] text-[#4ADE80] font-bold px-2 py-0.5 rounded-lg border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.06)]">Active</span>
            ) : (
              <button onClick={() => removeUser(u.id)} className="flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
            );
          })}
      </div>

      {/* Setup hint (shown only if table doesn't exist yet) */}
      {role === "admin" && users.length === 0 && (
        <p className="text-[10px] text-gray-700 mt-3">
          💡 First time? Run the SQL setup in the Supabase SQL Editor, then add users here.
        </p>
      )}
    </div>
  );
}


// ─── Notifications Card (Beta) ────────────────────────────────────────────────

const NOTIF_KEY = "vision_notif_prefs";

interface NotifPrefs {
  emailEnabled: boolean;
  emailAddress: string;
  smsEnabled: boolean;
  smsPhone: string;
  alerts: {
    newLead: boolean;
    maintenanceEmergency: boolean;
    chatRequest: boolean;
    cleaningComplete: boolean;
    weeklyDigest: boolean;
  };
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

const DEFAULT_PREFS: NotifPrefs = {
  emailEnabled: false,
  emailAddress: "",
  smsEnabled: false,
  smsPhone: "",
  alerts: {
    newLead: true,
    maintenanceEmergency: true,
    chatRequest: false,
    cleaningComplete: false,
    weeklyDigest: true,
  },
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};

function NotificationsCard() {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleAlert = (key: keyof NotifPrefs["alerts"]) => {
    update({ alerts: { ...prefs.alerts, [key]: !prefs.alerts[key] } });
  };

  const ALERT_TYPES: { key: keyof NotifPrefs["alerts"]; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "newLead", label: "New Lead", icon: <Zap size={14} className="text-[#FACC15]" />, desc: "Instant alert when a prospect submits a form" },
    { key: "maintenanceEmergency", label: "Maintenance Emergency", icon: <AlertCircle size={14} className="text-[#EF4444]" />, desc: "Urgent tickets from maintenance staff" },
    { key: "chatRequest", label: "AI Chat Escalation", icon: <MessageSquare size={14} className="text-[#60A5FA]" />, desc: "When a visitor asks to speak with a person" },
    { key: "cleaningComplete", label: "Cleaning Complete", icon: <Sparkles size={14} className="text-[#4ADE80]" />, desc: "Unit turnovers marked as done" },
    { key: "weeklyDigest", label: "Weekly Digest", icon: <BarChart3 size={14} className="text-[#A78BFA]" />, desc: "Summary of leads, activity & performance" },
  ];

  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Header — clickable to expand/collapse */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#F59E0B] to-[#EF4444] flex items-center justify-center flex-shrink-0">
          <BellRing size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Notifications</h2>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[rgba(250,204,21,0.15)] to-[rgba(245,158,11,0.15)] border border-[rgba(250,204,21,0.3)] text-[#FACC15] font-black tracking-wider">BETA</span>
        <div className="ml-auto w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <ChevronRight size={16} className={`text-[#FACC15] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      <p className="text-[11px] text-gray-500 mb-3">
        Configure how you get notified about new leads, emergencies, and activity.
      </p>

      {!expanded ? null : (<>

      {/* Saved toast */}
      {saved && (
        <div className="mb-4 flex items-center gap-2 text-[11px] text-[#4ADE80] font-bold animate-pulse">
          <CheckCircle2 size={12} /> Preferences saved
        </div>
      )}

      <div className="space-y-4">

        {/* ── Email Alerts ── */}
        <div className="rounded-2xl border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.03)] p-4" style={{ boxShadow: "0 0 20px rgba(96,165,250,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[rgba(96,165,250,0.12)] flex items-center justify-center">
                <Mail size={16} className="text-[#60A5FA]" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Email Alerts</p>
                <p className="text-[10px] text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <button onClick={() => update({ emailEnabled: !prefs.emailEnabled })}
              className="w-11 h-6 rounded-full transition-all duration-300 relative"
              style={{
                backgroundColor: prefs.emailEnabled ? "#60A5FA" : "rgba(255,255,255,0.08)",
                boxShadow: prefs.emailEnabled ? "0 0 12px rgba(96,165,250,0.4)" : "none",
              }}>
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-md"
                style={{ left: prefs.emailEnabled ? "22px" : "2px" }} />
            </button>
          </div>
          {prefs.emailEnabled && (
            <input
              type="email"
              value={prefs.emailAddress}
              onChange={e => update({ emailAddress: e.target.value })}
              placeholder="your@email.com"
              className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(96,165,250,0.2)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[rgba(96,165,250,0.5)] transition-colors"
            />
          )}
        </div>

        {/* ── SMS Alerts (Twilio — Coming Soon) ── */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 relative overflow-hidden">
          {/* Coming Soon overlay */}
          <div className="absolute inset-0 bg-[rgba(8,12,20,0.6)] backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center mb-2">
              <Lock size={16} className="text-gray-500" />
            </div>
            <p className="text-xs font-black text-gray-400">Coming Soon</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Powered by Twilio</p>
          </div>
          {/* Underneath content (dimmed) */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[rgba(74,222,128,0.12)] flex items-center justify-center">
                <Smartphone size={16} className="text-[#4ADE80]" />
              </div>
              <div>
                <p className="text-sm font-black text-white">SMS Alerts</p>
                <p className="text-[10px] text-gray-500">Text message via Twilio</p>
              </div>
            </div>
            <div className="w-11 h-6 rounded-full bg-[rgba(255,255,255,0.08)] relative">
              <div className="w-5 h-5 rounded-full bg-gray-600 absolute top-0.5 left-0.5" />
            </div>
          </div>
          <input
            disabled
            placeholder="(423) 555-0100"
            className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2.5 text-sm text-gray-600 outline-none"
          />
        </div>

        {/* ── Alert Types ── */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <p className="text-xs font-black text-white uppercase tracking-wider mb-3">What to notify</p>
          <div className="space-y-1">
            {ALERT_TYPES.map(({ key, label, icon, desc }) => (
              <button key={key} onClick={() => toggleAlert(key)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-[rgba(255,255,255,0.03)] active:scale-[0.98]">
                <div className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-white truncate">{label}</p>
                  <p className="text-[10px] text-gray-600 truncate">{desc}</p>
                </div>
                <div className="w-9 h-5 rounded-full transition-all duration-300 relative flex-shrink-0"
                  style={{
                    backgroundColor: prefs.alerts[key] ? "#4ADE80" : "rgba(255,255,255,0.08)",
                    boxShadow: prefs.alerts[key] ? "0 0 8px rgba(74,222,128,0.3)" : "none",
                  }}>
                  <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-sm"
                    style={{ left: prefs.alerts[key] ? "18px" : "2px" }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Quiet Hours ── */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[rgba(168,85,247,0.12)] flex items-center justify-center">
                <Moon size={16} className="text-[#A78BFA]" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Quiet Hours</p>
                <p className="text-[10px] text-gray-500">Pause non-emergency alerts</p>
              </div>
            </div>
            <button onClick={() => update({ quietHoursEnabled: !prefs.quietHoursEnabled })}
              className="w-11 h-6 rounded-full transition-all duration-300 relative"
              style={{
                backgroundColor: prefs.quietHoursEnabled ? "#A78BFA" : "rgba(255,255,255,0.08)",
                boxShadow: prefs.quietHoursEnabled ? "0 0 12px rgba(167,139,250,0.3)" : "none",
              }}>
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-md"
                style={{ left: prefs.quietHoursEnabled ? "22px" : "2px" }} />
            </button>
          </div>
          {prefs.quietHoursEnabled && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block mb-1">From</label>
                <input type="time" value={prefs.quietStart}
                  onChange={e => update({ quietStart: e.target.value })}
                  className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(168,85,247,0.2)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[rgba(168,85,247,0.5)] transition-colors [color-scheme:dark]" />
              </div>
              <div className="text-gray-600 text-xs font-bold pt-4">→</div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block mb-1">Until</label>
                <input type="time" value={prefs.quietEnd}
                  onChange={e => update({ quietEnd: e.target.value })}
                  className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(168,85,247,0.2)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[rgba(168,85,247,0.5)] transition-colors [color-scheme:dark]" />
              </div>
            </div>
          )}
        </div>

      </div>

      </>)}
    </div>
  );
}


// ─── Social Capture Links Card ──────────────────────────────────────────────

function SocialLinksCard() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState("");
  const BASE = "https://vision-llc.vercel.app";

  const LINKS = [
    { slug: "", label: "All Properties", emoji: "🏠", desc: "Default — shows all properties equally" },
    { slug: "the-executive", label: "The Executive", emoji: "🏢", desc: "Premier office suites · Downtown" },
    { slug: "city-centre", label: "City Centre", emoji: "💼", desc: "Flexible offices · 1.2k–18k sqft" },
    { slug: "bristol-cowork", label: "Bristol CoWork", emoji: "☕", desc: "All-inclusive · 620 State St" },
    { slug: "centre-point-suites", label: "Centre Point", emoji: "🏪", desc: "Casino adjacent · Retail & office" },
    { slug: "foundation-event-facility", label: "Foundation Events", emoji: "🎉", desc: "Premier event facility" },
    { slug: "warehouse", label: "Warehouse", emoji: "🏭", desc: "2k–25k sqft · Bristol Metro" },
  ];

  function copy(platform: "fb" | "ig", slug: string) {
    const url = slug ? `${BASE}/l/${platform}?feature=${slug}` : `${BASE}/l/${platform}`;
    navigator.clipboard.writeText(url);
    setCopied(`${platform}-${slug}`);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#3B82F6] to-[#EC4899] flex items-center justify-center flex-shrink-0">
          <Share2 size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Social Capture Links</h2>
        <div className="ml-auto w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <ChevronRight size={16} className={`text-[#60A5FA] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      <p className="text-[11px] text-gray-500 mb-3">
        Copy ready-to-use links for Facebook & Instagram posts. Feature a specific property to match your social content.
      </p>

      {!expanded ? null : (<>
        <div className="space-y-2">
          {LINKS.map(({ slug, label, emoji, desc }) => (
            <div key={slug || "all"} className="flex items-center gap-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{emoji} {label}</p>
                <p className="text-[10px] text-gray-600 truncate">{desc}</p>
              </div>
              <button
                onClick={() => copy("fb", slug)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  copied === `fb-${slug}`
                    ? "bg-[#4ADE80] text-black"
                    : "bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] text-[#60A5FA] hover:bg-[rgba(59,130,246,0.2)]"
                }`}
              >
                {copied === `fb-${slug}` ? "✓ Copied" : "📘 FB"}
              </button>
              <button
                onClick={() => copy("ig", slug)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  copied === `ig-${slug}`
                    ? "bg-[#4ADE80] text-black"
                    : "bg-[rgba(236,72,153,0.12)] border border-[rgba(236,72,153,0.25)] text-[#F472B6] hover:bg-[rgba(236,72,153,0.2)]"
                }`}
              >
                {copied === `ig-${slug}` ? "✓ Copied" : "📷 IG"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-[rgba(74,222,128,0.04)] border border-[rgba(74,222,128,0.12)] px-3 py-2.5">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            <span className="text-[#4ADE80] font-bold">How it works:</span> Paste the link into your Facebook/Instagram post. When someone clicks, they land on a branded page that highlights the featured property with a hero card, photo, and CTA — the rest of your properties show below.
          </p>
        </div>
      </>)}
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ leads, deletingAll, deleteAllConfirm, setDeleteAllConfirm, deleteAllLeads }: {
  leads: Lead[];
  deletingAll: boolean;
  deleteAllConfirm: string;
  setDeleteAllConfirm: (v: string) => void;
  deleteAllLeads: () => void;
}) {
  const [adminUsers,  setAdminUsers]  = useState<AllowedUser[]>([]);
  const [maintUsers,  setMaintUsers]  = useState<AllowedUser[]>([]);
  const [cleanUsers,  setCleanUsers]  = useState<AllowedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [setupSQL, setSetupSQL] = useState(false);
  const [editingQR, setEditingQR] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingQR, setDeletingQR] = useState<string | null>(null);
  const [savingQR, setSavingQR] = useState(false);
  const [hiddenQR, setHiddenQR] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("vision_hidden_qr") || "[]") as string[]); }
    catch { return new Set(); }
  });
  const [showHidden, setShowHidden] = useState(false);

  function hideCard(id: string) {
    const next = new Set(hiddenQR).add(id);
    setHiddenQR(next);
    localStorage.setItem("vision_hidden_qr", JSON.stringify([...next]));
    setDeletingQR(null);
  }

  function unhideCard(id: string) {
    const next = new Set(hiddenQR);
    next.delete(id);
    setHiddenQR(next);
    localStorage.setItem("vision_hidden_qr", JSON.stringify([...next]));
  }

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [ar, mr, cr] = await Promise.all([
        fetch("/api/allowed-users?role=admin").then(r => r.json()),
        fetch("/api/allowed-users?role=maintenance&include_pins=true").then(r => r.json()),
        fetch("/api/allowed-users?role=cleaning&include_pins=true").then(r => r.json()),
      ]);
      setAdminUsers(ar.users || []);
      setMaintUsers(mr.users || []);
      setCleanUsers(cr.users || []);
      setSetupSQL(false);
    } catch { setSetupSQL(true); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div className="space-y-8">
      {/* ─ Portal Access ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={15} className="text-[#4ADE80]" />
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Portal Access</h2>
        </div>
        <p className="text-[11px] text-gray-500 mb-5">
          Admin access uses Gmail sign-in. Staff portals (Maintenance & Cleaning) use a 6-digit PIN — no Gmail required. Changes take effect immediately.
        </p>

        {/* Setup SQL banner */}
        {setupSQL && (
          <div className="mb-5 p-4 rounded-xl border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.05)]">
            <p className="text-xs font-bold text-[#4ADE80] mb-2">One-time Supabase setup required</p>
            <p className="text-[11px] text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
            <pre className="text-[10px] text-gray-300 bg-[rgba(0,0,0,0.5)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS allowed_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'admin',
  pin TEXT DEFAULT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_allowed_users" ON allowed_users
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- If upgrading from an older schema, add the pin column:
-- ALTER TABLE allowed_users ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT NULL;
-- ALTER TABLE allowed_users ALTER COLUMN email DROP NOT NULL;

-- Seed your own email as first admin:
INSERT INTO allowed_users (id, email, name, role, active)
VALUES ('user_owner', 'ahurley1474@gmail.com', 'Allen Hurley', 'admin', true)
ON CONFLICT (email) DO NOTHING;`}</pre>
            <button onClick={loadUsers} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#4ADE80] hover:underline">
              <RefreshCw size={11} /> Refresh after running SQL
            </button>
          </div>
        )}

        {usersLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 size={16} className="animate-spin text-[#4ADE80]" />
            <span className="text-sm text-gray-500">Loading users…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UserSection
              title="Admin Dashboard"
              role="admin"
              icon={<Shield size={13} className="text-[#4ADE80]" />}
              color="#4ADE80"
              users={adminUsers}
              onRefresh={loadUsers}
            />
            <UserSection
              title="Maintenance Staff"
              role="maintenance"
              icon={<Wrench size={13} className="text-[#FACC15]" />}
              color="#FACC15"
              users={maintUsers}
              onRefresh={loadUsers}
            />
            <UserSection
              title="Cleaning Staff"
              role="cleaning"
              icon={<Sparkles size={13} className="text-[#4ADE80]" />}
              color="#34D399"
              users={cleanUsers}
              onRefresh={loadUsers}
            />
          </div>
        )}
      </div>

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Notifications (Beta) ── */}
      <NotificationsCard />

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Data Import / Export ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={13} className="text-white" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Data Import / Export</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Bring in historical leads from Excel, or export your full dashboard data for backup, sharing, or analysis.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ── EXPORT ── */}
          <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.03)] p-5 flex flex-col gap-3"
            style={{ boxShadow: "0 0 22px rgba(74,222,128,0.08)" }}>
            <div className="flex items-center gap-2">
              <Download size={15} className="text-[#4ADE80]" />
              <p className="text-xs font-black text-white uppercase tracking-widest">Export Leads</p>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Download all active leads as a formatted Excel spreadsheet — names, phones, scores, budgets, timelines and more.
            </p>
            <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-2">Columns included</p>
              <div className="flex flex-wrap gap-1.5">
                {["Name","Phone","Email","Space Type","Budget/mo","Timeline","Team Size","AI Score","Label","Source","Submitted"].map(c => (
                  <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.12)] text-gray-500">{c}</span>
                ))}
              </div>
            </div>
            <ExportButton leads={leads} />
          </div>

          {/* ── IMPORT ── */}
          <div className="rounded-2xl border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.03)] p-5 flex flex-col gap-3"
            style={{ boxShadow: "0 0 22px rgba(96,165,250,0.08)" }}>
            <div className="flex items-center gap-2">
              <Upload size={15} className="text-[#60A5FA]" />
              <p className="text-xs font-black text-white uppercase tracking-widest">Import Leads</p>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Upload an Excel (.xlsx) or CSV file from Monday.com, your old CRM, or any spreadsheet. We'll map the columns automatically.
            </p>
            <ImportPanel />
          </div>

        </div>
      </div>

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Danger Zone: Clear All Leads ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#EF4444] to-[#DC2626] flex items-center justify-center flex-shrink-0">
            <AlertCircle size={13} className="text-white" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Danger Zone</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Permanently delete all leads from the database. This is useful for clearing test data before launch. This action cannot be undone.
        </p>

        <div className="rounded-2xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)] p-5"
          style={{ boxShadow: "0 0 22px rgba(239,68,68,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={15} className="text-red-400" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Clear All Leads</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-red-400 font-bold ml-auto">
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
            This will permanently remove <strong className="text-red-400">{leads.length}</strong> lead{leads.length !== 1 ? "s" : ""} from Supabase.
            Type <code className="text-red-400 bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 rounded text-[10px] font-bold">DELETE</code> below to confirm.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={deleteAllConfirm}
              onChange={e => setDeleteAllConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="flex-1 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(239,68,68,0.15)] text-white text-xs placeholder:text-gray-600 outline-none focus:border-[rgba(239,68,68,0.4)] transition-colors font-mono"
            />
            <button
              onClick={deleteAllLeads}
              disabled={deleteAllConfirm !== "DELETE" || deletingAll || leads.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.35)] text-red-400 text-xs font-bold hover:bg-[rgba(239,68,68,0.25)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {deletingAll ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {deletingAll ? "Deleting…" : "Delete All"}
            </button>
          </div>
        </div>
      </div>


      {/* ─ QR Capture Hub ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center">
            <span className="text-black text-[10px] font-black">QR</span>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">QR Capture Cards</h2>
            <p className="text-[10px] text-gray-500">Each admin user gets a unique link — scan to capture leads in-person</p>
          </div>
          {hiddenQR.size > 0 && (
            <button
              onClick={() => setShowHidden(h => !h)}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-300 border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1 transition-colors"
            >
              {showHidden ? "Hide hidden" : `Show ${hiddenQR.size} hidden`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {adminUsers.map(admin => {
            const isHidden = hiddenQR.has(admin.id);
            if (isHidden && !showHidden) return null;

            const slug = nameToSlug(admin.name || admin.email);
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.teamvisionllc.com";
            const captureUrl = `${baseUrl}/meet/${slug}`;
            const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=080C14&color=4ADE80&margin=10&data=${encodeURIComponent(captureUrl)}`;
            const qrLeadCount = leads.filter(l => l.source === "qr" && l.campaign === slug).length;
            const isEditing = editingQR === admin.id;
            const isDeleting = deletingQR === admin.id;

            async function saveEdit() {
              if (!editName.trim()) return;
              setSavingQR(true);
              await fetch(`/api/allowed-users?id=${admin.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim() }),
              });
              setSavingQR(false);
              setEditingQR(null);
              loadUsers();
            }

            return (
              <div key={admin.id} className={`rounded-2xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.03)] p-4 ${isHidden ? "opacity-40" : ""}`}>
                {isHidden && (
                  <div className="flex items-center justify-between mb-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-3 py-2">
                    <span className="text-[10px] text-gray-500">Card hidden — login access unchanged</span>
                    <button onClick={() => unhideCard(admin.id)} className="text-[10px] font-bold text-[#4ADE80] hover:underline">Restore</button>
                  </div>
                )}
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4ADE80]/20 to-[#22C55E]/10 border border-[rgba(74,222,128,0.25)] flex items-center justify-center text-xs font-black text-[#4ADE80]">
                    {initials(admin.name || admin.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingQR(null); }}
                        className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(74,222,128,0.4)] rounded-lg px-2 py-1 text-sm text-white outline-none"
                      />
                    ) : (
                      <p className="text-sm font-bold text-white truncate">{admin.name || admin.email}</p>
                    )}
                    <p className="text-[10px] text-[#4ADE80] font-bold">{qrLeadCount} QR lead{qrLeadCount !== 1 ? "s" : ""}</p>
                  </div>
                  {/* Edit / Delete controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={savingQR}
                          className="px-2 py-1 rounded-lg text-[10px] font-black bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.4)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.25)] disabled:opacity-50 transition-colors"
                        >
                          {savingQR ? <Loader2 size={10} className="animate-spin" /> : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingQR(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : isDeleting ? (
                      <>
                        <button
                          onClick={() => hideCard(admin.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-black bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.4)] text-red-400 hover:bg-[rgba(239,68,68,0.25)] transition-colors"
                        >
                          Hide Card
                        </button>
                        <button
                          onClick={() => setDeletingQR(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Tooltip text="Edit display name">
                          <button
                            onClick={() => { setEditingQR(admin.id); setEditName(admin.name || ""); setDeletingQR(null); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white hover:border-[rgba(74,222,128,0.3)] transition-colors"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </Tooltip>
                        <Tooltip text="Hide this card (login stays active)">
                          <button
                            onClick={() => { setDeletingQR(admin.id); setEditingQR(null); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                {isDeleting && (
                  <p className="text-[11px] text-amber-400 bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] rounded-xl px-3 py-2 mb-3">
                    This hides <strong>{admin.name || admin.email}&apos;s</strong> QR card from this view only. Their login access is <strong>not</strong> affected.
                  </p>
                )}

                <div className="flex justify-center my-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt={`QR for ${admin.name}`} width={120} height={120} className="rounded-xl" />
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] text-gray-500 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1.5 truncate">
                    /meet/{slug}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(captureUrl).catch(() => {}); }}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(74,222,128,0.25)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.08)] transition-colors"
                  >
                    Copy
                  </button>
                  <a href={captureUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors"
                  >
                    Preview
                  </a>
                </div>
              </div>
            );
          })}
          {adminUsers.length === 0 && (
            <p className="text-xs text-gray-600 col-span-2 text-center py-6">Add admin users above to generate QR capture cards.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ask VISION Modal ──────────────────────────────────────────────────────────

const QUICK_QUERIES = [
  "Who should I call first today?",
  "Summarise the hot leads",
  "What's the total pipeline value?",
  "Which leads need follow-up this week?",
  "Compare our warm leads by budget",
];

function AskVisionModal({ leads, onClose }: { leads: Lead[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const ask = async (q?: string) => {
    const question = q || query.trim();
    if (!question) return;
    setQuery(question);
    setLoading(true);
    setAsked(true);
    setResponse("");
    try {
      // Strip heavy fields before sending — keep payload lean
      const leanLeads = leads.map(l => ({
        name: l.name, spaceType: l.spaceType, budget: l.budget,
        score: l.score, scoreLabel: l.scoreLabel, timeline: l.timeline,
        teamSize: l.teamSize, timestamp: l.timestamp, phone: l.phone,
        isWhale: l.isWhale, whaleKeywords: l.whaleKeywords,
      }));
      const res = await fetch("/api/ask-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, leads: leanLeads }),
      });
      const data = await res.json();
      setResponse(data.response || data.error || "No response received.");
    } catch (err) {
      setResponse(`Connection error — ${err instanceof Error ? err.message : "please try again"}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0F1A] border border-[rgba(74,222,128,0.25)] rounded-2xl w-full max-w-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(74,222,128,0.12)] bg-gradient-to-r from-[rgba(74,222,128,0.06)] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-[0_0_16px_rgba(74,222,128,0.35)]">
              <Brain size={16} className="text-black" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Ask VISION</p>
              <p className="text-[10px] text-[#4ADE80]">Lead Intelligence · {leads.length} leads in context</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Quick queries */}
          {!asked && (
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUERIES.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] text-xs text-gray-300 hover:text-white hover:border-[rgba(74,222,128,0.4)] hover:bg-[rgba(74,222,128,0.1)] transition-all"
                  >
                    {q} <ChevronRight size={10} className="text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Response area */}
          {asked && (
            <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(74,222,128,0.03)] p-4 min-h-[80px]">
              <p className="text-[10px] text-[#4ADE80] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={10} /> Ask VISION Analysis
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin text-[#4ADE80]" />
                  Analysing {leads.length} leads…
                </div>
              ) : (
                <p className="text-sm text-gray-200 leading-relaxed">{response}</p>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 focus-within:border-[rgba(74,222,128,0.4)] transition-colors">
              <textarea
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                placeholder="Ask anything about your leads…"
                rows={2}
                className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none"
              />
            </div>
            <button
              onClick={() => ask()}
              disabled={!query.trim() || loading}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center text-black hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          {asked && (
            <button
              onClick={() => { setAsked(false); setQuery(""); setResponse(""); }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors text-center"
            >
              ← Ask another question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Brief Card ──────────────────────────────────────────────────────────

function DailyBriefCard({ leads, onBadgeClick, onLeadClick }: {
  leads: Lead[];
  onBadgeClick: (filter: string) => void;
  onLeadClick: (id: string) => void;
}) {
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const hot = leads.filter(l => l.scoreLabel === "Hot Lead").length;
  const warm = leads.filter(l => l.scoreLabel === "Warm Lead").length;
  const nurture = leads.filter(l => l.scoreLabel === "Nurture").length;
  const whales = leads.filter(l => l.isWhale).length;
  const newToday = leads.filter(l => {
    const hrs = (Date.now() - new Date(l.timestamp).getTime()) / 36e5;
    return hrs < 24;
  }).length;
  const pipeline = leads.filter(l => l.scoreLabel === "Hot Lead").reduce((a, l) => a + l.budget, 0);
  const topLead = [...leads].sort((a, b) => (b.budget * b.score) - (a.budget * a.score))[0];

  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const leanLeads = leads.map(l => ({
        name: l.name, spaceType: l.spaceType, budget: l.budget,
        score: l.score, scoreLabel: l.scoreLabel, timeline: l.timeline,
        teamSize: l.teamSize, timestamp: l.timestamp, phone: l.phone,
        isWhale: l.isWhale, whaleKeywords: l.whaleKeywords,
      }));
      const res = await fetch("/api/ask-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `VISION PROPERTY INTELLIGENCE DAILY BRIEF — max 2 short sentences, facts only, no greetings or headers:
1. Name the top 2 leads by revenue potential (highest budget × score). For each: name, budget/month, timeline.
2. Hot pipeline total per month. Mention whale count only if above 0.
Use real names and numbers. Be punchy.`,
          leads: leanLeads,
        }),
      });
      const data = await res.json();
      setBriefText(data.response || data.error || "");
    } catch {
      setBriefText("Unable to generate brief — check your connection.");
    } finally {
      setBriefLoading(false);
    }
  };

  useEffect(() => { if (leads.length) generateBrief(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [
    { label: "Hot",      value: hot,      emoji: "🔥", color: "#4ADE80", filter: "Hot Lead"  },
    { label: "Warm",     value: warm,     emoji: "⚡", color: "#FACC15", filter: "Warm Lead" },
    { label: "Nurture",  value: nurture,  emoji: "●",  color: "#94A3B8", filter: "Nurture"   },
    { label: "New Today",value: newToday, emoji: "⚠️", color: "#FACC15", filter: "New Today" },
    { label: "Whales",   value: whales,   emoji: "🐳", color: "#FACC15", filter: "Whale"     },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(74,222,128,0.3)] bg-gradient-to-br from-[rgba(74,222,128,0.06)] via-[rgba(74,222,128,0.03)] to-transparent p-5 mb-6 relative overflow-hidden"
      style={{ boxShadow: "0 0 32px rgba(74,222,128,0.10)" }}>
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#4ADE80] opacity-[0.04] blur-3xl pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-[0_0_12px_rgba(74,222,128,0.3)] flex-shrink-0">
            <Sparkles size={14} className="text-black" />
          </div>
          <div>
            <p className="text-xs font-black text-[#4ADE80] uppercase tracking-widest">Daily Brief</p>
            <p className="text-[11px] text-gray-500">{today}</p>
          </div>
        </div>
        <button
          onClick={generateBrief}
          disabled={briefLoading}
          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-[#4ADE80] transition-colors disabled:opacity-40"
          title="Regenerate brief"
        >
          <RefreshCw size={10} className={briefLoading ? "animate-spin" : ""} />
          {briefLoading ? "Updating…" : "Refresh"}
        </button>
      </div>

      {/* Stats chips — clickable, filter + scroll to leads */}
      <div className="flex flex-wrap gap-2 mb-4">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => onBadgeClick(s.filter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(74,222,128,0.35)] hover:bg-[rgba(74,222,128,0.06)] transition-all cursor-pointer group"
            title={`Filter: ${s.label}`}
          >
            <span className="text-sm">{s.emoji}</span>
            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">{s.label}</span>
            <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
          </button>
        ))}
        <button
          onClick={() => onBadgeClick("Hot Lead")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] hover:bg-[rgba(74,222,128,0.14)] hover:border-[rgba(74,222,128,0.4)] transition-all cursor-pointer group"
          title="Filter: Hot Pipeline"
        >
          <DollarSign size={12} className="text-[#4ADE80]" />
          <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Hot Pipeline</span>
          <span className="text-sm font-black text-[#4ADE80] tabular-nums">${pipeline.toLocaleString()}/mo</span>
        </button>
      </div>

      {/* AI Brief text */}
      <div className="border-t border-[rgba(74,222,128,0.1)] pt-3">
        {briefLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin text-[#4ADE80]" />
            Generating brief…
          </div>
        ) : briefText ? (
          <p className="text-sm text-gray-300 leading-relaxed">
            {/* Scan for lead names and make them clickable */}
            {(() => {
              const sorted = [...leads].sort((a, b) => b.name.length - a.name.length);
              let parts: (string | React.ReactNode)[] = [briefText];
              sorted.forEach(lead => {
                const next: (string | React.ReactNode)[] = [];
                parts.forEach((part, pi) => {
                  if (typeof part !== "string") { next.push(part); return; }
                  const chunks = part.split(lead.name);
                  chunks.forEach((chunk, ci) => {
                    next.push(chunk);
                    if (ci < chunks.length - 1) next.push(
                      <button key={`${lead.id}-${pi}-${ci}`} onClick={() => onLeadClick(lead.id)}
                        className="text-[#4ADE80] font-bold underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
                      >{lead.name}</button>
                    );
                  });
                });
                parts = next;
              });
              return parts;
            })()}
          </p>
        ) : topLead ? (
          <p className="text-sm text-gray-500 italic">Top priority: {topLead.name} — {topLead.spaceType} at ${topLead.budget.toLocaleString()}/mo</p>
        ) : null}
        <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1">
          <Sparkles size={9} /> Powered by Ask VISION
        </p>
      </div>
    </div>
  );
}

// ─── Lead Comments Component ───────────────────────────────────────────

interface LeadComment {
  id: string; lead_id: string; author: string; body: string; timestamp: string;
}

function LeadComments({ leadId, currentUserName }: { leadId: string; currentUserName?: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [loadingCmts, setLoadingCmts] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [authorName, setAuthorName] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("vision_commenter") ?? "" : ""
  );
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync Google user name when auth resolves
  useEffect(() => { if (currentUserName) setAuthorName(currentUserName); }, [currentUserName]);

  const loadComments = async () => {
    setLoadingCmts(true);
    try {
      const res = await fetch(`/api/lead-comments?lead_id=${encodeURIComponent(leadId)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch { /* keep existing */ }
    finally { setLoadingCmts(false); }
  };

  useEffect(() => { if (open) loadComments(); }, [open]); // eslint-disable-line

  const postComment = async () => {
    if (!newBody.trim() || !authorName.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/lead-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, author: authorName.trim(), body: newBody.trim() }),
      });
      localStorage.setItem("vision_commenter", authorName.trim());
      setNewBody("");
      await loadComments();
    } finally { setPosting(false); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
          open || comments.length > 0
            ? "text-[#4ADE80] drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]"
            : "text-gray-500 hover:text-[#4ADE80]"
        }`}
      >
        <MessageSquare size={14} className={comments.length > 0 ? "fill-[rgba(74,222,128,0.15)]" : ""} />
        Activity {comments.length > 0 ? `(${comments.length})` : ""}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Comment list */}
          {loadingCmts ? (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <Loader2 size={11} className="animate-spin" /> Loading activity…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[11px] text-gray-700 italic">No activity yet — be the first to add a note.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#4ADE80]/20 to-[#22C55E]/10 border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[9px] font-black text-[#4ADE80] flex-shrink-0">
                  {c.author.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-gray-300">{c.author}</span>
                    <span className="text-[10px] text-gray-600">{timeAgo(c.timestamp)}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))
          )}

          {/* New comment input */}
          <div className="mt-3 space-y-2">
            <input
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[rgba(74,222,128,0.35)] outline-none placeholder:text-gray-700 transition-colors"
            />
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                placeholder="Add a note… (Enter to post)"
                rows={2}
                spellCheck={true}
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[rgba(74,222,128,0.35)] outline-none placeholder:text-gray-700 transition-colors resize-none"
              />
              <button
                onClick={postComment}
                disabled={posting || !newBody.trim() || !authorName.trim()}
                className="flex-shrink-0 flex items-center justify-center w-9 h-auto rounded-lg bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.18)] disabled:opacity-40 transition-all"
              >
                {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Lead Panel ───────────────────────────────────────────────────

const SPACE_TYPES = ["Office", "Executive Suite", "CoWork / Flex", "Retail Storefront", "Warehouse / Industrial", "Event Space", "Not sure yet"] as const;
const TIMELINES = ["ASAP — under 30 days", "30–60 days", "60–90 days", "3–6 months", "Exploring options"] as const;
const TEAM_SIZES = ["Solo", "2–4 people", "5–10 people", "10+ people"] as const;

function formatPhoneAdmin(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function derivedLabel(score: number): "Hot Lead" | "Warm Lead" | "Nurture" {
  if (score >= 70) return "Hot Lead";
  if (score >= 40) return "Warm Lead";
  return "Nurture";
}

const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-600 transition-colors";
const LABEL = "block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1";

function AddLeadPanel({ onLeadAdded }: { onLeadAdded: (lead: Lead) => void }) {
  const [open, setOpen] = useState(false);
  const [scoreMode, setScoreMode] = useState<"ai" | "manual">("ai");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    spaceType: "Office" as typeof SPACE_TYPES[number],
    budget: "",
    timeline: "ASAP — under 30 days" as typeof TIMELINES[number],
    teamSize: "Solo" as typeof TEAM_SIZES[number],
    notes: "",
    manualScore: 70,
  });

  function reset() {
    setForm({ name: "", phone: "", email: "", spaceType: "Office", budget: "", timeline: "ASAP — under 30 days", teamSize: "Solo", notes: "", manualScore: 70 });
    setScoreMode("ai");
    setError("");
    setSuccess(false);
  }

  const label = derivedLabel(form.manualScore);
  const labelColor = label === "Hot Lead" ? "#4ADE80" : label === "Warm Lead" ? "#FACC15" : "#94A3B8";

  async function submit() {
    if (!form.name.trim() || !form.budget) { setError("Name and budget are required."); return; }
    setSubmitting(true); setError("");
    try {
      if (scoreMode === "ai") {
        const res = await fetch("/api/lease-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(), email: form.email.trim(), phone: form.phone,
            spaceType: form.spaceType, budget: form.budget,
            timeline: form.timeline, teamSize: form.teamSize,
            additionalInfo: form.notes, utm_source: "manual", utm_medium: "admin", utm_campaign: "",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.lead) { setError(data.error || "AI scoring failed."); return; }
        onLeadAdded(data.lead);
      } else {
        const res = await fetch("/api/admin-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(), email: form.email.trim(), phone: form.phone,
            spaceType: form.spaceType, budget: form.budget,
            timeline: form.timeline, teamSize: form.teamSize,
            additionalInfo: form.notes,
            score: form.manualScore, scoreLabel: label,
            reasoning: "Manually entered and scored by admin.",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.lead) { setError(data.error || "Save failed."); return; }
        onLeadAdded(data.lead);
      }
      setSuccess(true);
      reset();
      setTimeout(() => { setSuccess(false); setOpen(false); }, 1800);
    } catch (e) {
      setError(`Network error — ${e instanceof Error ? e.message : "please try again"}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6">
      {/* Toggle button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) reset(); }}
        id="add-lead-toggle"
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
          open
            ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.4)] text-[#4ADE80]"
            : "bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.2)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.1)]"
        }`}
      >
        <Plus size={15} />
        Add Lead
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Collapsible form */}
      {open && (
        <div className="mt-3 rounded-2xl border border-[rgba(74,222,128,0.25)] bg-gradient-to-br from-[rgba(74,222,128,0.05)] to-[rgba(74,222,128,0.02)] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black text-white">New Lead Entry</p>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors"><X size={15} /></button>
          </div>

          {/* Grid of fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Full Name *</label>
              <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Smith" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: formatPhoneAdmin(e.target.value) })} placeholder="(423) ___-____" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Space Type</label>
              <select value={form.spaceType} onChange={e => setForm({ ...form, spaceType: e.target.value as typeof SPACE_TYPES[number] })} className={FIELD}>
                {SPACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Budget ($/mo) *</label>
              <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. 2500" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Move-in Timeline</label>
              <select value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value as typeof TIMELINES[number] })} className={FIELD}>
                {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Team Size</label>
              <select value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value as typeof TEAM_SIZES[number] })} className={FIELD}>
                {TEAM_SIZES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any context, source, referral..." className={FIELD} />
            </div>
          </div>

          {/* Score mode toggle */}
          <div className="mb-4">
            <p className={LABEL}>Scoring Method</p>
            <div className="flex gap-2 mb-3">
              {(["ai", "manual"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setScoreMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    scoreMode === m
                      ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.4)] text-[#4ADE80]"
                      : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {m === "ai" ? <><Brain size={11} /> AI Score It</> : <><CheckCircle2 size={11} /> Set Manually</>}
                </button>
              ))}
            </div>

            {scoreMode === "manual" && (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range" min={0} max={100}
                    value={form.manualScore}
                    onChange={e => setForm({ ...form, manualScore: Number(e.target.value) })}
                    className="w-full accent-[#4ADE80]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>0</span><span>50</span><span>100</span>
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-2xl font-black tabular-nums" style={{ color: labelColor }}>{form.manualScore}</p>
                  <p className="text-[10px] font-bold" style={{ color: labelColor }}>{label}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {error && <p className="text-xs text-red-400 mb-3 flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>}
          {success && <p className="text-xs text-[#4ADE80] mb-3 flex items-center gap-1.5"><CheckCircle2 size={12} />Lead saved successfully!</p>}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting || !form.name.trim() || !form.budget}
              id="save-lead-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : scoreMode === "ai" ? <><Brain size={14} /> Score with AI</> : <><Save size={14} /> Save Lead</>}
            </button>
            <button onClick={() => { setOpen(false); reset(); }} className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-sm hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{name: string; email: string; avatar?: string}>>([]);
  const briefKeyRef = useRef(0);
  const [briefKey, setBriefKey] = useState(0);
  const searchParams = useSearchParams();
  const VALID_TABS = ["leads", "tenants", "analytics", "maintenance", "cleaning", "archived", "marketing", "content", "settings"] as const;
  type TabKey = typeof VALID_TABS[number];
  const initialTab = (VALID_TABS.includes(searchParams.get("tab") as TabKey) ? searchParams.get("tab") : "leads") as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Keep URL in sync when tab changes — use replace so the back button isn't polluted
  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };
  const [marketingSubTab, setMarketingSubTab] = useState("properties");
  const [contentSubView, setContentSubView] = useState("content-homepage");

  // Always start at the very top — prevents browser scroll-restoration from
  // loading the dashboard mid-page and hiding the tab nav under the site nav
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, []);
  const [leads, setLeads] = useState<Lead[]>(DEMO_LEADS);
  const [filter, setFilter] = useState<"All" | "Hot Lead" | "Warm Lead" | "Nurture" | "Whale" | "New Today">("All");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newLeadToast, setNewLeadToast] = useState<Lead | null>(null);
  const [recentLiveIds, setRecentLiveIds] = useState<Set<string>>(new Set());
  const [showAskVision, setShowAskVision] = useState(false);
  const [callListOpen, setCallListOpen] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [activeCallLog, setActiveCallLog] = useState<{ leadId: string; leadName: string; phone: string } | null>(null);
  const [coldPipelineOpen, setColdPipelineOpen] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState("");
  const seenIdsRef = useRef<Set<string>>(new Set(DEMO_LEADS.map(d => d.id)));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Delete a single lead ──
  const deleteLead = async (id: string) => {
    try {
      const res = await fetch("/api/lease-bot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id));
        seenIdsRef.current.delete(id);
      }
    } catch { /* silent */ }
    setDeletingLeadId(null);
  };

  // ── Delete ALL leads ──
  const deleteAllLeads = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch("/api/lease-bot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setLeads([]);
        seenIdsRef.current.clear();
      }
    } catch { /* silent */ }
    setDeletingAll(false);
    setDeleteAllConfirm("");
  };

  // Fetch call logs on mount
  useEffect(() => {
    fetch("/api/call-logs")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.logs)) setCallLogs(d.logs); })
      .catch(() => {});
  }, []);

  // Auth check — redirect to login if no session, block if not on allowlist
  useEffect(() => {
    supabaseBrowser.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/admin/login");
        // intentionally leave authChecking=true so the loading spinner stays up
        // while navigation completes — prevents dashboard flash
        return;
      }
      const email = data.user.email || "";
      // Check allowed_users table in Supabase (instant, no redeployment needed)
      try {
        const { data: access } = await supabaseBrowser
          .from("allowed_users")
          .select("id")
          .eq("email", email.toLowerCase())
          .eq("role", "admin")
          .eq("active", true)
          .maybeSingle();

        // Fallback: also honour the old NEXT_PUBLIC_ADMIN_EMAILS env var during transition
        const rawList = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
        const envAllowed = rawList.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        const isEnvAllowed = envAllowed.length > 0 && envAllowed.includes(email.toLowerCase());

        if (!access && !isEnvAllowed) {
          setAccessDenied(true);
          setAuthChecking(false);
          return;
        }
      } catch {
        // If table doesn't exist yet, fall through and allow access
        // (prevents lockout before first DB setup)
      }
      const name = data.user.user_metadata?.full_name || email.split("@")[0] || "Team";
      setCurrentUser({
        name,
        email,
        avatar: data.user.user_metadata?.avatar_url,
      });
      try { localStorage.setItem("vision_commenter", name); } catch { /**/ }
      setAuthChecking(false);
    });
  }, [router]);

  // Clear stale localStorage on mount — Supabase is now source of truth
  useEffect(() => {
    try { localStorage.removeItem("vision_live_leads"); } catch { /* ignore */ }
  }, []);

  // Supabase Realtime Presence — show who else is online
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabaseBrowser.channel("admin_presence", {
      config: { presence: { key: currentUser.email } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; email: string; avatar?: string }>();
        setOnlineUsers(Object.values(state).flat());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar });
        }
      });
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [currentUser]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lease-bot");
      const data = await res.json();
      if (data.leads && Array.isArray(data.leads)) {
        const fetched: Lead[] = data.leads.length > 0 ? data.leads : DEMO_LEADS;
        fetched.forEach(l => seenIdsRef.current.add(l.id));
        setLeads(fetched);
        // Bump briefKey once after the first real fetch so the brief regenerates with live data
        if (briefKeyRef.current === 0 && fetched.some(l => !l.id.startsWith("demo_"))) {
          briefKeyRef.current = 1;
          setBriefKey(1);
        }
      }
    } catch { /* keep existing state on error */ }
    finally { setLoading(false); setLastRefresh(new Date()); }
  };

  // ── localStorage live-lead poller (4s interval) ────────────────────────────
  const pollLocalStorage = useCallback(() => {
    try {
      const stored: Lead[] = JSON.parse(localStorage.getItem("vision_live_leads") || "[]");
      if (!stored.length) return;

      const brandNew = stored.filter(l => !seenIdsRef.current.has(l.id));
      if (!brandNew.length) return;

      // Mark all as seen
      brandNew.forEach(l => seenIdsRef.current.add(l.id));
      setRecentLiveIds(prev => { const s = new Set(prev); brandNew.forEach(l => s.add(l.id)); return s; });

      // Merge into leads list (new ones at top, before demo leads)
      setLeads(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const toAdd = brandNew.filter(l => !existingIds.has(l.id));
        return toAdd.length ? [...toAdd, ...prev] : prev;
      });

      // Show toast for the most recent new lead
      const latest = brandNew[0];
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setNewLeadToast(latest);
      toastTimerRef.current = setTimeout(() => setNewLeadToast(null), 5000);
      setLastRefresh(new Date());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLeads();
    const apiInterval = setInterval(fetchLeads, 30000);
    const lsInterval = setInterval(pollLocalStorage, 4000);
    // Also run once on mount in case chatbot already fired
    pollLocalStorage();
    return () => { clearInterval(apiInterval); clearInterval(lsInterval); };
  }, [pollLocalStorage]);

  // Remove NEW badge after 60s
  useEffect(() => {
    if (!recentLiveIds.size) return;
    const t = setTimeout(() => setRecentLiveIds(new Set()), 60000);
    return () => clearTimeout(t);
  }, [recentLiveIds]);

  // ── Lead Segmentation ──────────────────────────────────────────────────
  const allNonArchived = leads.filter(l => !isArchived(l.timestamp));
  const coldLeads      = allNonArchived.filter(l => isCold(l, callLogs));
  const coldSet        = new Set(coldLeads.map(l => l.id));
  const activeLeads    = allNonArchived.filter(l => !coldSet.has(l.id));
  const archivedLeads  = leads.filter(l => isArchived(l.timestamp));
  const filtered =
    filter === "All"      ? activeLeads :
    filter === "Whale"    ? activeLeads.filter(l => l.isWhale) :
    filter === "New Today" ? activeLeads.filter(l => (Date.now() - new Date(l.timestamp).getTime()) < 864e5) :
    activeLeads.filter(l => l.scoreLabel === filter);
  const hotLeads = activeLeads.filter(l => l.scoreLabel === "Hot Lead");
  const warmCount = activeLeads.filter(l => l.scoreLabel === "Warm Lead").length;
  const urgentLeads = activeLeads.filter(isUrgent);
  const whaleLeads = activeLeads.filter(l => l.isWhale);
  const avgScore = Math.round(activeLeads.reduce((a, l) => a + l.score, 0) / (activeLeads.length || 1));
  const hotMonthlyPipeline = hotLeads.reduce((a, l) => a + l.budget, 0);
  const totalMonthlyPipeline = activeLeads.reduce((a, l) => a + l.budget, 0);
  const annualProjection = hotMonthlyPipeline * 12;
  // Call list sorted by revenue potential: budget × (score/100) — highest $/mo first
  const callList = [...activeLeads].filter(l => l.phone).sort((a, b) => (b.budget * b.score) - (a.budget * a.score));

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center mx-auto mb-5">
            <Shield size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your Google account is not authorized to access VISION.
            <br />Contact your administrator to request access.
          </p>
          <button
            onClick={async () => { await supabaseBrowser.auth.signOut(); router.replace("/admin/login"); }}
            className="px-5 py-2.5 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-red-400 text-sm font-bold hover:bg-[rgba(239,68,68,0.18)] transition-colors"
          >
            Sign out and try another account
          </button>
        </div>
      </div>
    );
  }

  // Auth loading screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mx-auto mb-3 shadow-[0_0_24px_rgba(74,222,128,0.3)] animate-pulse">
            <Zap size={20} className="text-black" />
          </div>
          <p className="text-xs text-gray-600">Loading VISION…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-16">

        {/* ─ New Lead Toast ──────────────────────────────────────────────── */}
        {newLeadToast && (
          <div
            className="fixed top-24 right-4 z-50 max-w-xs w-full"
            style={{ animation: "slideInRight 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both" }}
          >
            <style>{`
              @keyframes slideInRight {
                from { opacity: 0; transform: translateX(120%); }
                to   { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div className="bg-[#0D1117] border border-[rgba(74,222,128,0.4)] rounded-2xl p-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(74,222,128,0.4)]">
                <Radio size={16} className="text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-black text-[#4ADE80] uppercase tracking-wider">New Lead</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                </div>
                <p className="text-sm font-bold text-white truncate">{newLeadToast.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {newLeadToast.spaceType} · <span style={{ color: scoreColor(newLeadToast.score) }}>{newLeadToast.score}/100</span> · {newLeadToast.scoreLabel}
                </p>
              </div>
              <button onClick={() => setNewLeadToast(null)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0 mt-0.5">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img src="/vision-icon.png" alt="Vision" className="w-10 h-10 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.25)] object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-black text-xl tracking-tight">VISION</h1>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#4ADE80] bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] px-2 py-0.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase -mt-0.5">Property Intelligence Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] text-gray-600 hidden sm:block">Last refresh: {lastRefresh.toLocaleTimeString()}</span>

            {/* Online presence avatars */}
            {onlineUsers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1" title={onlineUsers.map(u => u.name).join(", ") + " online"}>
                {[...new Map(onlineUsers.map(u => [u.email, u])).values()].map(u => (
                  <div key={u.email} className="relative" title={`${u.name} — online now`}>
                    {u.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full border border-[rgba(74,222,128,0.4)]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4ADE80]/30 to-[#22C55E]/20 border border-[rgba(74,222,128,0.3)] flex items-center justify-center text-[9px] font-black text-[#4ADE80]">
                        {u.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#4ADE80] border border-[#080C14] animate-pulse" />
                  </div>
                ))}
                {onlineUsers.length > 1 && (
                  <span className="text-[10px] text-gray-600 ml-1">{onlineUsers.length} online</span>
                )}
              </div>
            )}

            <button
              onClick={() => setShowAskVision(true)}
              className="btn-ask-vision px-3 sm:px-4 py-2"
              title="Ask VISION"
            >
              <Brain size={13} />
              <span className="hidden sm:inline">Ask VISION</span>
            </button>
            {activeTab === "leads" && (
              <button
                onClick={fetchLeads}
                disabled={loading}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs hover:bg-[rgba(74,222,128,0.12)] transition-colors disabled:opacity-50"
                title="Refresh leads"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            {/* User avatar + sign-out */}
            {currentUser && (
              <div className="flex items-center gap-2">
                {currentUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-7 h-7 rounded-full border border-[rgba(74,222,128,0.3)]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4ADE80]/30 to-[#22C55E]/20 border border-[rgba(74,222,128,0.3)] flex items-center justify-center text-[10px] font-black text-[#4ADE80]">
                    {currentUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={async () => { await supabaseBrowser.auth.signOut(); router.replace("/admin/login"); }}
                  className="text-[10px] text-gray-600 hover:text-red-400 transition-colors hidden sm:block"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Ask VISION Modal */}
        {showAskVision && (
          <AskVisionModal leads={leads} onClose={() => setShowAskVision(false)} />
        )}

        {/* ─ CALL LOG MODAL ──────────────────────────────────────────────────── */}
        {activeCallLog && (
          <CallLogModal
            leadId={activeCallLog.leadId}
            leadName={activeCallLog.leadName}
            phone={activeCallLog.phone}
            existingLogs={callLogs.filter(l => l.lead_id === activeCallLog.leadId)}
            currentUser={currentUser?.name || "Admin"}
            onSave={log => setCallLogs(prev => [log, ...prev.filter(l => l.id !== log.id)])}
            onDelete={id => setCallLogs(prev => prev.filter(l => l.id !== id))}
            onClose={() => setActiveCallLog(null)}
          />
        )}

        {/* Tab Nav — sticky below fixed site-nav, horizontally scrollable on mobile */}
        <div className="sticky top-14 z-40 bg-[#080C14] -mx-4 sm:-mx-6 px-4 sm:px-6 mb-8">
          <div className="scrollbar-none flex items-center gap-0.5 border-b border-[rgba(255,255,255,0.06)] overflow-x-auto pb-0 -mx-2 px-2 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-x", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}>
            {([
              { key: "leads",       label: "Leads",    fullLabel: `Leads (${activeLeads.length})`, icon: TrendingUp },
              { key: "tenants",     label: "Tenants",  fullLabel: "Tenants",     icon: Building2 },
              { key: "maintenance", label: "Maint.",   fullLabel: "Maintenance", icon: Wrench },
              { key: "cleaning",    label: "Cleaning", fullLabel: "Cleaning",    icon: Sparkles },
              { key: "analytics",   label: "Analytic", fullLabel: "Analytics",   icon: BarChart3 },
              { key: "marketing",   label: "Market",   fullLabel: "Marketing",   icon: FileText },
              { key: "content",     label: "Content",  fullLabel: "Content",     icon: Pencil },
              { key: "archived",    label: "Archive",  fullLabel: `Archived (${archivedLeads.length})`, icon: Archive },
              { key: "settings",    label: "Settings", fullLabel: "Settings",    icon: Settings },
            ] as const).map(({ key, label, fullLabel, icon: Icon }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap flex-shrink-0 ${activeTab === key ? "border-[#4ADE80] text-[#4ADE80]" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                <Icon size={13} />
                <span className="sm:hidden">{label}</span>
                <span className="hidden sm:inline">{fullLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─ LEADS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "leads" && (
          <>
            {/* Personalized greeting */}
            {currentUser && (() => {
              const hour = new Date().getHours();
              const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
              const firstName = currentUser.name.split(" ")[0];
              return (
                <div className="mb-5 flex items-center gap-3">
                  {currentUser.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border-2 border-[rgba(74,222,128,0.3)] flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4ADE80]/30 to-[#22C55E]/20 border-2 border-[rgba(74,222,128,0.3)] flex items-center justify-center text-sm font-black text-[#4ADE80] flex-shrink-0">
                      {currentUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-white">{greeting}, {firstName} 👋</h2>
                    <p className="text-[11px] text-gray-500">Here&apos;s your pipeline snapshot for today.</p>
                  </div>
                </div>
              );
            })()}

            {/* Daily Brief — first thing a CEO sees */}
            <DailyBriefCard
              key={briefKey}
              leads={activeLeads}
              onBadgeClick={(f) => {
                setFilter(f as typeof filter);
                setTimeout(() => {
                  document.getElementById("leads-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              onLeadClick={(id) => {
                setFilter("All");
                setTimeout(() => {
                  const el = document.getElementById(`lead-card-${id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.style.transition = "box-shadow 0.3s";
                    el.style.boxShadow = "0 0 0 2px #4ADE80, 0 0 24px rgba(74,222,128,0.35)";
                    setTimeout(() => { el.style.boxShadow = ""; }, 1800);
                  }
                }, 80);
              }}
            />

            {/* Pipeline Banner */}
            <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-gradient-to-r from-[rgba(74,222,128,0.07)] to-[rgba(74,222,128,0.02)] p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.12)] flex items-center justify-center"><DollarSign size={20} className="text-[#4ADE80]" /></div>
                  <span className="text-sm font-bold text-[#4ADE80] uppercase tracking-widest">Active Pipeline</span>
                </div>
                <div className="flex flex-wrap gap-8">
                  <div>
                    <p className="text-[11px] text-gray-500 mb-0.5">Hot Lead Monthly Value</p>
                    <p className="text-3xl font-black text-white tabular-nums">${hotMonthlyPipeline.toLocaleString()}<span className="text-base text-gray-500 font-normal">/mo</span></p>
                  </div>
                  <div className="w-px bg-[rgba(255,255,255,0.06)] hidden sm:block" />
                  <div>
                    <p className="text-[11px] text-gray-500 mb-0.5">Projected Annual Revenue</p>
                    <p className="text-3xl font-black text-[#4ADE80] tabular-nums">${annualProjection.toLocaleString()}<span className="text-base text-[#4ADE80]/60 font-normal">/yr</span></p>
                  </div>
                  <div className="w-px bg-[rgba(255,255,255,0.06)] hidden sm:block" />
                  <div>
                    <p className="text-[11px] text-gray-500 mb-0.5">Total Pipeline (All Leads)</p>
                    <p className="text-3xl font-black text-gray-300 tabular-nums">${totalMonthlyPipeline.toLocaleString()}<span className="text-base text-gray-600 font-normal">/mo</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Urgent Strip */}
            {urgentLeads.length > 0 && (
              <div className="rounded-2xl border border-[rgba(250,204,21,0.25)] bg-[rgba(250,204,21,0.04)] p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-[#FACC15] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[#FACC15] font-bold text-sm mb-2">⚡ {urgentLeads.length} lead{urgentLeads.length > 1 ? "s" : ""} need contact TODAY</p>
                    <div className="flex flex-wrap gap-3">
                      {urgentLeads.map(lead => (
                        <div key={lead.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)]">
                          <span className="text-sm font-semibold text-white">{lead.name}</span>
                          <span className="text-xs text-[#FACC15]">${lead.budget.toLocaleString()}/mo</span>
                          <span className="text-xs text-gray-500">· {timeAgo(lead.timestamp)}</span>
                          {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-[#4ADE80] font-bold hover:underline"><Phone size={10} /> Call</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Leads", value: leads.length, icon: Users, color: "#60A5FA" },
                { label: "Hot Leads 🔥", value: hotLeads.length, icon: TrendingUp, color: "#4ADE80" },
                { label: "Warm Leads", value: warmCount, icon: Zap, color: "#FACC15" },
                { label: "Whale Alerts 🐳", value: whaleLeads.length, icon: Building2, color: "#FACC15" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass rounded-2xl p-4 border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2 mb-2"><Icon size={14} style={{ color }} /><span className="text-xs text-gray-500">{label}</span></div>
                  <p className="text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Call List — collapsible */}
            {callList.length > 0 && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] mb-8 overflow-hidden">
                {/* Toggle header */}
                <button
                  onClick={() => setCallListOpen(o => !o)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.25)] flex items-center justify-center flex-shrink-0">
                    <Phone size={13} className="text-[#4ADE80]" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Priority Call List</h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] font-bold">
                        {callList.length} lead{callList.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {callListOpen ? "▲ Tap to collapse" : "▼ Tap to expand · sorted by score × budget"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-transform duration-200 ${callListOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Body */}
                {callListOpen && (
                  <div className="px-5 pb-5 space-y-2 border-t border-[rgba(255,255,255,0.04)] pt-4">
                    {callList.map((lead, i) => {
                      const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
                      const lastLog = logsForLead[0];
                      const followUpDue = lastLog?.follow_up_date && new Date(lastLog.follow_up_date) < new Date() && lastLog.outcome !== "answered";
                      return (
                        <div key={lead.id} className="rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(74,222,128,0.2)] transition-all overflow-hidden">
                          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3">
                            <span className="text-xs font-black w-4 text-center flex-shrink-0" style={{ color: scoreColor(lead.score) }}>#{i + 1}</span>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-black" style={{ backgroundColor: `${scoreColor(lead.score)}12`, color: scoreColor(lead.score) }}>{lead.score}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-500 mt-0.5">
                                <span className="truncate max-w-[90px] sm:max-w-none">{lead.spaceType}</span>
                                <span className="text-[#4ADE80] font-semibold">${lead.budget.toLocaleString()}/mo</span>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold hidden sm:block flex-shrink-0 ${scoreBadge(lead.scoreLabel)}`}>{lead.scoreLabel}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-xs font-black hover:opacity-90 transition-opacity">
                                <Phone size={11} />
                                <span className="hidden sm:inline">{lead.phone}</span>
                                <span className="sm:hidden">Call</span>
                              </a>
                              <button
                                onClick={() => setActiveCallLog({ leadId: lead.id, leadName: lead.name, phone: lead.phone || "" })}
                                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-400 text-xs font-bold hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-all"
                                title="Log call notes"
                              >
                                <FileText size={11} />
                                <span className="hidden sm:inline">Log</span>
                              </button>
                            </div>
                          </div>
                          {/* Call activity strip */}
                          {lastLog && (
                            <div className={`px-4 py-1.5 flex items-center gap-2 border-t border-[rgba(255,255,255,0.04)] ${followUpDue ? "bg-[rgba(239,68,68,0.06)]" : "bg-[rgba(255,255,255,0.01)]"}`}>
                              {followUpDue && <span className="text-[9px] font-black text-red-400 uppercase tracking-wide animate-pulse">⚠ Follow-up Due</span>}
                              <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: outcomeColor(lastLog.outcome) }}>{outcomeLabel(lastLog.outcome)}</span>
                              <span className="text-[9px] text-gray-700">·</span>
                              <span className="text-[9px] text-gray-600">{new Date(lastLog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}</span>
                              {logsForLead.length > 1 && <span className="text-[9px] text-gray-700 ml-auto">{logsForLead.length} calls logged</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add Lead Panel */}
            <AddLeadPanel onLeadAdded={lead => {
              seenIdsRef.current.add(lead.id);
              setLeads(prev => [lead, ...prev]);
            }} />

            {/* QR Leaderboard */}
            {(() => {
              const qrLeads = activeLeads.filter(l => l.source === "qr");
              if (!qrLeads.length) return null;
              const byAgent: Record<string, { count: number; pipeline: number; latest: string }> = {};
              qrLeads.forEach(l => {
                const slug = l.campaign || "team";
                if (!byAgent[slug]) byAgent[slug] = { count: 0, pipeline: 0, latest: l.timestamp };
                byAgent[slug].count++;
                byAgent[slug].pipeline += l.budget;
                if (l.timestamp > byAgent[slug].latest) byAgent[slug].latest = l.timestamp;
              });
              const ranked = Object.entries(byAgent).sort((a, b) => b[1].count - a[1].count);
              return (
                <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.03)] p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">🏆</span>
                    <p className="text-xs font-black text-[#4ADE80] uppercase tracking-widest">QR Lead Leaderboard</p>
                    <span className="text-[10px] text-gray-600 ml-1">— in-person captures</span>
                  </div>
                  <div className="space-y-2">
                    {ranked.map(([slug, stats], i) => (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="text-sm font-black w-5 text-center" style={{ color: i === 0 ? "#FACC15" : i === 1 ? "#94A3B8" : "#92400E" }}>#{i + 1}</span>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4ADE80]/20 to-[#22C55E]/10 border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[10px] font-black text-[#4ADE80]">
                          {slug.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white capitalize">{slug}</p>
                          <p className="text-[10px] text-gray-600">{timeAgo(stats.latest)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#4ADE80]">{stats.count} lead{stats.count !== 1 ? "s" : ""}</p>
                          {stats.pipeline > 0 && <p className="text-[10px] text-gray-600">${stats.pipeline.toLocaleString()}/mo</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Filter + Print row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div id="leads-list" className="flex items-center gap-2 flex-wrap">
                <Filter size={13} className="text-gray-500" />
                <span className="text-xs text-gray-600 mr-1">Filter:</span>
                {(["All", "Hot Lead", "Warm Lead", "Nurture", "Whale", "New Today"] as const).map(f => {
                  const tip =
                    f === "All"      ? "Show all active leads" :
                    f === "Hot Lead" ? "Score 70+. High urgency, strong budget. Call today." :
                    f === "Warm Lead"? "Score 40–69. Interested but needs nurturing." :
                    f === "Nurture"  ? "Score below 40. Long-term potential — keep warm." :
                    f === "Whale"    ? "Budget $4,000+/mo. High-value prospects — prioritize." :
                                      "Leads that arrived in the last 24 hours.";
                  return (
                    <Tooltip key={f} text={tip}>
                      <button onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter === f ? "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)] text-[#4ADE80]" : "border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-gray-300"}`}>
                        {f === "Whale" ? "🐳 Whales" : f === "New Today" ? "🆕 New Today" : f}
                        {f === "Whale" && ` (${activeLeads.filter(l => l.isWhale).length})`}
                        {f === "New Today" && ` (${activeLeads.filter(l => (Date.now() - new Date(l.timestamp).getTime()) < 864e5).length})`}
                        {f !== "All" && f !== "Whale" && f !== "New Today" && ` (${activeLeads.filter(l => l.scoreLabel === f).length})`}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              <PrintButton
                label="Print Call Sheet"
                title={`Daily Call Sheet — ${filter} Leads`}
                buildHTML={() => {
                  if (filtered.length === 0) return "<p>No leads match the current filter.</p>";
                  const rows = filtered.map((l, i) => `
                    <tr style="background:${i % 2 === 0 ? "#fff" : "#f7f7f7"}">
                      <td style="text-align:center;font-size:10pt;font-weight:900;border:1px solid #bbb;padding:5px 8px">${l.score}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px"><strong>${l.name || "—"}</strong></td>
                      <td style="border:1px solid #bbb;padding:5px 8px">${l.phone ? `<a href="tel:${l.phone}" style="color:#000">${l.phone}</a>` : "—"}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px">${l.email ? `<a href="mailto:${l.email}" style="color:#000;font-size:8.5pt">${l.email}</a>` : "—"}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px">${l.budget ? `$${l.budget.toLocaleString()}/mo` : "—"}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px">${l.spaceType || "—"}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px">${l.teamSize || "—"}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px;font-size:8.5pt">${l.timeline || "—"}</td>
                      <td style="border:1px solid #bbb;padding:5px 8px;font-weight:700;font-size:8.5pt">${l.scoreLabel || "—"}</td>
                    </tr>`).join("");
                  return `
                    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;color:#000">
                      <thead>
                        <tr style="background:#f0f0f0">
                          <th style="border:1px solid #bbb;padding:6px 8px;text-align:center">Score</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Name</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Phone</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Email</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Budget</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Space Type</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Team Size</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Timeline</th>
                          <th style="border:1px solid #bbb;padding:6px 8px">Priority</th>
                        </tr>
                      </thead>
                      <tbody>${rows}</tbody>
                    </table>
                    <p style="margin-top:16px;font-size:8.5pt;color:#666">Total: ${filtered.length} lead${filtered.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Filter: ${filter}</p>`;
                }}
              />
            </div>

            <div id="print-leads" className="space-y-4">
              {filtered.map(lead => {
                const isLive = recentLiveIds.has(lead.id);
                return (
                <div
                  key={lead.id}
                  id={`lead-card-${lead.id}`}
                  className={`glass rounded-2xl border transition-all p-5 ${
                    lead.isWhale && lead.whaleTier === "gold"
                      ? "border-[rgba(250,204,21,0.45)] shadow-[0_0_28px_rgba(250,204,21,0.07)]"
                      : lead.isWhale
                      ? "border-[rgba(196,181,253,0.3)]"
                      : isLive
                      ? "border-[rgba(74,222,128,0.5)] shadow-[0_0_24px_rgba(74,222,128,0.1)]"
                      : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(74,222,128,0.2)]"
                  }`}
                  style={isLive ? { animation: "slideInTop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both" } : undefined}
                >
                  {isLive && (
                    <style>{`
                      @keyframes slideInTop {
                        from { opacity: 0; transform: translateY(-12px); }
                        to   { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0 text-center">
                      <Tooltip text={`AI Lead Score: ${lead.score}/100 — calculated from budget, urgency, timeline, and space type signals.`} wide>
                        <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border cursor-help" style={{ borderColor: `${scoreColor(lead.score)}40`, backgroundColor: `${scoreColor(lead.score)}0A` }}>
                          <span className="text-2xl font-black tabular-nums leading-none" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                          <span className="text-[9px] text-gray-600 mt-0.5">/ 100</span>
                        </div>
                      </Tooltip>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-bold text-base">{lead.name}</h3>
                            <Tooltip text={lead.scoreLabel === "Hot Lead" ? "Hot Lead: Score 70+. Call today — high close probability." : lead.scoreLabel === "Warm Lead" ? "Warm Lead: Score 40–69. Nurture with follow-up emails or a call this week." : "Nurture: Score below 40. Keep warm — long-term prospect."}>
                              <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold cursor-help ${scoreBadge(lead.scoreLabel)}`}>{lead.scoreLabel}</span>
                            </Tooltip>
                            {lead.isWhale && lead.whaleTier === "gold" && (
                              <Tooltip text="Whale Alert: Budget $8k+/mo. Top-priority prospect — escalate immediately and offer a personal showing." wide>
                                <span className="flex items-center gap-1 text-[10px] font-black text-[#FACC15] bg-[rgba(250,204,21,0.12)] border border-[rgba(250,204,21,0.4)] px-2 py-0.5 rounded-lg cursor-help">
                                  ⭐ Whale Alert
                                </span>
                              </Tooltip>
                            )}
                            {lead.isWhale && lead.whaleTier === "silver" && (
                              <Tooltip text="High-Intent Whale: Budget $4–8k/mo. High-value prospect — prioritize follow-up within 24 hours." wide>
                                <span className="flex items-center gap-1 text-[10px] font-black text-[#C4B5FD] bg-[rgba(196,181,253,0.08)] border border-[rgba(196,181,253,0.25)] px-2 py-0.5 rounded-lg cursor-help">
                                  🐳 High Intent
                                </span>
                              </Tooltip>
                            )}
                            {isLive && (
                              <Tooltip text="New lead — just arrived in real time from the AI chat widget.">
                                <span className="flex items-center gap-1 text-[10px] font-black text-[#4ADE80] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.35)] px-2 py-0.5 rounded-lg cursor-help">
                                  <span className="w-1 h-1 rounded-full bg-[#4ADE80] animate-pulse" />
                                  NEW
                                </span>
                              </Tooltip>
                            )}
                            {/* Call history badge */}
                            {(() => {
                              const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
                              const lastLog = logsForLead[0];
                              if (!lastLog) return null;
                              const followUpDue = lastLog.follow_up_date && new Date(lastLog.follow_up_date) < new Date() && lastLog.outcome !== "answered";
                              return (
                                <button
                                  onClick={() => setActiveCallLog({ leadId: lead.id, leadName: lead.name, phone: lead.phone || "" })}
                                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer"
                                  style={{ color: followUpDue ? "#F87171" : outcomeColor(lastLog.outcome), borderColor: followUpDue ? "rgba(248,113,113,0.4)" : `${outcomeColor(lastLog.outcome)}40`, backgroundColor: followUpDue ? "rgba(248,113,113,0.1)" : `${outcomeColor(lastLog.outcome)}12` }}
                                  title={`Last call: ${outcomeLabel(lastLog.outcome)} — click to view call log`}
                                >
                                  <Phone size={9} />
                                  {followUpDue ? "⚠ Follow-up Due" : outcomeLabel(lastLog.outcome)}
                                  {logsForLead.length > 1 && <span className="opacity-60">×{logsForLead.length}</span>}
                                </button>
                              );
                            })()}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-gray-400 hover:text-[#4ADE80] transition-colors font-mono" title="Click to call or copy">
                                <Phone size={10} className="flex-shrink-0" />
                                {lead.phone}
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-gray-400 hover:text-[#60A5FA] transition-colors" title="Send email">
                                <Mail size={10} className="flex-shrink-0" />
                                {lead.email}
                              </a>
                            )}
                            <span className="flex items-center gap-1 text-gray-600"><Clock size={10} /> {timeAgo(lead.timestamp)}</span>
                          {/* Expiring-soon badge */}
                          {daysRemaining(lead.timestamp) <= 30 && daysRemaining(lead.timestamp) > 0 && (
                            <Tooltip text={`This lead auto-archives in ${daysRemaining(lead.timestamp)} days if no action is taken. Follow up soon!`} wide>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 animate-pulse cursor-help">
                                ⏳ {daysRemaining(lead.timestamp)}d left
                              </span>
                            </Tooltip>
                          )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs font-bold hover:bg-[rgba(74,222,128,0.14)] transition-colors">
                              <Phone size={11} /> Call Now
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.14)] transition-colors">
                              <Mail size={11} /> Email
                            </a>
                          )}
                          {/* Delete lead */}
                          {deletingLeadId === lead.id ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[10px] text-red-400 font-semibold">Delete?</span>
                              <button
                                onClick={() => deleteLead(lead.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.35)] text-red-400 text-[10px] font-bold hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                              >
                                <Trash2 size={10} /> Yes
                              </button>
                              <button
                                onClick={() => setDeletingLeadId(null)}
                                className="px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 text-[10px] font-bold hover:text-gray-300 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingLeadId(lead.id)}
                              className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-[rgba(239,68,68,0.06)] transition-colors"
                              title="Delete lead"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[`🏢 ${lead.spaceType}`, `💰 $${lead.budget.toLocaleString()}/mo`, `📅 ${lead.timeline}`, `👥 ${lead.teamSize}`].map(chip => (
                          <span key={chip} className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">{chip}</span>
                        ))}
                        {lead.isWhale && lead.whaleKeywords && lead.whaleKeywords.length > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                            🎯 {lead.whaleKeywords.slice(0, 2).join(" · ")}
                          </span>
                        )}
                        {lead.source === "qr" && (
                          <Tooltip text={`Captured in person via ${lead.campaign ? lead.campaign.charAt(0).toUpperCase() + lead.campaign.slice(1) + "'s" : "a"} QR code — direct referral, high conversion potential.`} wide>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold border bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.35)] text-[#4ADE80] flex items-center gap-1 cursor-help">
                              📲 QR Capture{lead.campaign ? ` · ${lead.campaign.charAt(0).toUpperCase() + lead.campaign.slice(1)}` : ""}
                            </span>
                          </Tooltip>
                        )}
                        {lead.source === "contact-form" && (
                          <Tooltip text="Submitted via the Contact page form — this person actively sought you out." wide>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold border bg-[rgba(168,85,247,0.1)] border-[rgba(168,85,247,0.35)] text-[#C084FC] flex items-center gap-1 cursor-help">
                              ✉️ Contact Form
                            </span>
                          </Tooltip>
                        )}
                        {lead.source === "import" && (
                          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold border bg-[rgba(96,165,250,0.08)] border-[rgba(96,165,250,0.25)] text-[#60A5FA]">
                            📥 Imported
                          </span>
                        )}
                        {lead.source === "manual" && (
                          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold border bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94A3B8]">
                            ✏️ Manual
                          </span>
                        )}
                        {lead.source && lead.source !== "organic" && lead.source !== "qr" && lead.source !== "contact-form" && lead.source !== "import" && lead.source !== "manual" && (
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                            lead.source === "facebook"
                              ? "bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.25)] text-[#60A5FA]"
                              : lead.source === "instagram"
                              ? "bg-[rgba(236,72,153,0.08)] border-[rgba(236,72,153,0.25)] text-[#F472B6]"
                              : lead.source === "google"
                              ? "bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.2)] text-[#FACC15]"
                              : "bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94A3B8]"
                          }`}>
                            {lead.source === "facebook" ? "📘" : lead.source === "instagram" ? "📷" : lead.source === "google" ? "🔍" : "🌐"} {lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">
                        <span className="text-[#4ADE80] font-semibold">AI Analysis: </span>{lead.reasoning}
                      </p>
                      {/* Comments / Activity */}
                      <LeadComments leadId={lead.id} currentUserName={currentUser?.name} />
                      {/* Age bar */}
                    <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Clock size={9} /> Lead age: {daysOld(lead.timestamp)} day{daysOld(lead.timestamp) !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: ageBarColor(daysOld(lead.timestamp)) }}>
                          {daysRemaining(lead.timestamp)} days remaining
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${ageBarPct(daysOld(lead.timestamp))}%`,
                            backgroundColor: ageBarColor(daysOld(lead.timestamp)),
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ); })}

            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <Zap size={32} className="mx-auto mb-3 opacity-30" />
                <p>No {filter.toLowerCase()}s yet.</p>
                <p className="text-sm mt-1">Leads appear here as they come in through Ask VISION.</p>
              </div>
            )}

            {/* ── Cold Pipeline ─────────────────────────────────────────── */}
            {coldLeads.length > 0 && (
              <div className="mt-8 rounded-2xl border border-[rgba(96,165,250,0.15)] bg-[rgba(96,165,250,0.03)] overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setColdPipelineOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[rgba(96,165,250,0.15)] flex items-center justify-center text-base">❄️</div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#93C5FD]">Cold Pipeline <span className="text-[#60A5FA] font-bold ml-1">({coldLeads.length})</span></p>
                      <p className="text-[10px] text-gray-600">No contact in {COLD_DAYS}+ days — needs re-engagement</p>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-gray-600 transition-transform duration-200 ${coldPipelineOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Cold lead cards */}
                {coldPipelineOpen && (
                  <div className="px-5 pb-5 space-y-2 border-t border-[rgba(96,165,250,0.08)]">
                    {coldLeads.map(lead => {
                      const dsc = daysSinceContact(lead, callLogs);
                      const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
                      const lastLog = logsForLead[0];
                      return (
                        <div key={lead.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(96,165,250,0.04)] border border-[rgba(96,165,250,0.1)] hover:border-[rgba(96,165,250,0.25)] transition-all">
                          {/* Score circle */}
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-gray-500 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">{lead.score}</div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-gray-400 truncate">{lead.name}</p>
                              <span className="text-[9px] px-2 py-0.5 rounded-full border border-[rgba(96,165,250,0.3)] text-[#93C5FD] font-black bg-[rgba(96,165,250,0.08)]">
                                ❄ {dsc}d cold
                              </span>
                              {lastLog && (
                                <span className="text-[9px] text-gray-700">
                                  Last: {outcomeLabel(lastLog.outcome)} · {new Date(lastLog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-x-3 mt-0.5 text-[11px] text-gray-600">
                              <span>{lead.spaceType}</span>
                              <span>${lead.budget.toLocaleString()}/mo</span>
                              {lead.phone && <span className="font-mono">{lead.phone}</span>}
                            </div>
                          </div>
                          {/* Warm Up button */}
                          <button
                            onClick={() => setActiveCallLog({ leadId: lead.id, leadName: lead.name, phone: lead.phone || "" })}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(96,165,250,0.3)] text-[#60A5FA] text-xs font-black hover:bg-[rgba(96,165,250,0.12)] transition-all flex-shrink-0"
                            title="Log a call to re-warm this lead"
                          >
                            <Flame size={11} />
                            Warm Up
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ─ ARCHIVED TAB ─────────────────────────────────────── */}
        {/* ─ ANALYTICS TAB ──────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <AnalyticsTab leads={activeLeads as unknown as AnalyticsLead[]} />
        )}

        {/* ─ MAINTENANCE TAB ─────────────────────────────────────────── */}
        {activeTab === "maintenance" && (
          <MaintenanceTab currentUserName={currentUser?.name} />
        )}

        {/* ─ CLEANING TAB ──────────────────────────────────────────── */}
        {activeTab === "cleaning" && <CleaningTab />}

        {/* ─ TENANTS TAB ──────────────────────────────────────────────── */}
        {activeTab === "tenants" && (
          <TenantsTab currentUserName={currentUser?.name} />
        )}

        {activeTab === "archived" && (
          <>
            <div className="rounded-2xl border border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.03)] p-5 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Archive size={14} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-400">Archived Leads</p>
              </div>
              <p className="text-xs text-gray-600">Leads that have passed the 180-day window. They are retained for reference and can be reactivated at any time.</p>
            </div>

            {archivedLeads.length === 0 ? (
              <div className="text-center py-20 text-gray-700">
                <Archive size={32} className="mx-auto mb-3 opacity-30" />
                <p>No archived leads yet.</p>
                <p className="text-sm mt-1 text-gray-600">Leads automatically move here after 180 days.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedLeads.map(lead => (
                  <div key={lead.id} className="glass rounded-2xl border border-[rgba(255,255,255,0.04)] p-4 opacity-70 hover:opacity-90 transition-opacity">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.05)] flex-shrink-0">
                        <span className="text-lg font-black tabular-nums text-gray-500">{lead.score}</span>
                        <span className="text-[8px] text-gray-700">/ 100</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-400">{lead.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg border border-[rgba(148,163,184,0.2)] text-gray-600 font-bold">{lead.scoreLabel}</span>
                          <span className="text-[10px] text-gray-700 flex items-center gap-1"><Archive size={9} /> Archived {daysOld(lead.timestamp) - MAX_AGE_DAYS}d ago</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-600">
                          <span>{lead.spaceType}</span>
                          <span>${lead.budget.toLocaleString()}/mo</span>
                          {lead.phone && <span>{lead.phone}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Reset timestamp to now to reactivate
                          setLeads(prev => prev.map(l =>
                            l.id === lead.id ? { ...l, timestamp: new Date().toISOString() } : l
                          ));
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs font-bold hover:bg-[rgba(74,222,128,0.08)] transition-colors"
                      >
                        <RefreshCw size={11} /> Reactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─ SETTINGS TAB ───────────────────────────────────────────────────── */}
        {activeTab === "marketing" && (<>
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8">
            <MarketingTab onSubTabChange={setMarketingSubTab} />
          </div>
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8 mt-6">
            <SocialLinksCard />
          </div>
        </>)}


        {activeTab === "content" && (
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8">
            <ContentTab onSubViewChange={setContentSubView} />
          </div>
        )}

        {activeTab === "settings" && <SettingsPanel leads={activeLeads} deletingAll={deletingAll} deleteAllConfirm={deleteAllConfirm} setDeleteAllConfirm={setDeleteAllConfirm} deleteAllLeads={deleteAllLeads} />}

        <p className="text-center text-[11px] text-gray-700 mt-10">
          VISION Property Intelligence Platform · AI-Powered by Gemini · Auto-refreshes every 30s
          <br />
          <span className="text-gray-600">🟢 Database connected</span>
        </p>
      </div>

      {/* ─ PRO TIPS floating button (always visible, context-aware) ─────────── */}
      <ProTips activeTab={(activeTab === "marketing" ? `marketing-${marketingSubTab}` : activeTab === "content" ? contentSubView : activeTab) as import("./ProTips").TabKey} />

    </div>
  );
}
