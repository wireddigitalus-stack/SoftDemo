"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Wrench, Plus, Phone, Calendar, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, Save, X, Loader2, Building2, User,
  ChevronDown, ChevronUp, Trash2, Edit2, Circle, Flame,
  DollarSign, Timer, MessageSquare, ArrowRight,
} from "lucide-react";
import PrintButton from "./PrintButton";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  title: string;
  description: string;
  building: string;
  unit: string;
  category: string;
  priority: 1 | 2 | 3 | 4;
  status: "open" | "scheduled" | "in_progress" | "complete" | "cancelled";
  assignedTo: string;
  reportedBy: string;
  estimatedCost: number;
  actualCost: number;
  estimatedHours: number;
  scheduledDate: string | null;
  completedDate: string | null;
  notes: string;
  source: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["HVAC", "Plumbing", "Electrical", "Door/Lock", "Appliance", "Structural", "Cleaning", "Pest", "Damage", "Other"];

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: string; response: string }> = {
  1: { label: "CAT 1 – Emergency",  color: "#EF4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.4)",  icon: "🔴", response: "4hr response" },
  2: { label: "CAT 2 – Urgent",     color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.35)", icon: "🟠", response: "24hr response" },
  3: { label: "CAT 3 – Scheduled",  color: "#FACC15", bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.3)",  icon: "🟡", response: "1 week" },
  4: { label: "CAT 4 – Cosmetic",   color: "#4ADE80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", icon: "🟢", response: "30 days" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:        { label: "Open",        color: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  scheduled:   { label: "Scheduled",   color: "#60A5FA", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.25)" },
  in_progress: { label: "In Progress", color: "#FACC15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.25)" },
  complete:    { label: "Complete",     color: "#4ADE80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.3)" },
  cancelled:   { label: "Cancelled",   color: "#6B7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToTicket(r: Record<string, unknown>): Ticket {
  return {
    id: r.id as string,
    title: (r.title as string) || "",
    description: (r.description as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    category: (r.category as string) || "Other",
    priority: (Number(r.priority) || 3) as 1 | 2 | 3 | 4,
    status: (r.status as Ticket["status"]) || "open",
    assignedTo: (r.assigned_to as string) || "",
    reportedBy: (r.reported_by as string) || "",
    estimatedCost: Number(r.estimated_cost) || 0,
    actualCost: Number(r.actual_cost) || 0,
    estimatedHours: Number(r.estimated_hours) || 0,
    scheduledDate: (r.scheduled_date as string) || null,
    completedDate: (r.completed_date as string) || null,
    notes: (r.notes as string) || "",
    source: (r.source as string) || "admin",
    createdAt: (r.created_at as string) || new Date().toISOString(),
  };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const LABEL = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1";
const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-600";
const BLANK_TICKET = (): Partial<Ticket> => ({
  title: "", description: "", building: "", unit: "",
  category: "Other", priority: 3, status: "open",
  assignedTo: "", reportedBy: "", estimatedCost: 0,
  estimatedHours: 0, scheduledDate: "", completedDate: "", notes: "",
});

// ─── DEMO DATA — remove before go-live ───────────────────────────────────────
// To remove: delete the DEMO_TICKETS array and the `if (data.tickets.length === 0)` block in fetch_

function demoDates() {
  const t = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
  return { yesterday: t(-1), today: t(0), tomorrow: t(1), nextWeek: t(7), twoWks: t(14) };
}

function getDemoTickets(): Ticket[] {
  const d = demoDates();
  return [
    { id: "demo_1", title: "HVAC not cooling — Suite 301", description: "Tenant reports unit blowing warm air. Thermostat set to 68°F but room holds at 78°F.", building: "The Executive", unit: "Suite 301", category: "HVAC", priority: 1, status: "in_progress", assignedTo: "Mike D.", reportedBy: "Allen Hurley", estimatedCost: 650, actualCost: 0, estimatedHours: 4, scheduledDate: d.today, completedDate: null, notes: "[Apr 17 — Mike D.] Compressor cycling on and off. Ordered capacitor. Parts arrive tomorrow.", source: "admin", createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: "demo_2", title: "Water leak under sink — Unit 112", description: "Tenant reported active drip pooling under kitchen sink cabinet. Possible P-trap failure.", building: "City Centre", unit: "Unit 112", category: "Plumbing", priority: 1, status: "open", assignedTo: "Carlos M.", reportedBy: "Tenant", estimatedCost: 180, actualCost: 0, estimatedHours: 2, scheduledDate: d.today, completedDate: null, notes: "", source: "staff", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: "demo_3", title: "Electrical outlet sparking — Boardroom", description: "Receptionist noticed sparking from outlet near window. Outlet taken offline. Licensed electrician needed.", building: "Bristol Commons", unit: "Boardroom", category: "Electrical", priority: 2, status: "scheduled", assignedTo: "James R.", reportedBy: "Allen Hurley", estimatedCost: 320, actualCost: 0, estimatedHours: 3, scheduledDate: d.tomorrow, completedDate: null, notes: "[Apr 17 — Allen Hurley] Contacted Tri-Cities Electric. Coming tomorrow 9am.", source: "admin", createdAt: new Date(Date.now() - 3600000 * 14).toISOString() },
    { id: "demo_4", title: "Lobby door lock not responding", description: "Main entrance keypad intermittently fails. Tenants having to use side entrance.", building: "The Executive", unit: "Main Lobby", category: "Door/Lock", priority: 2, status: "in_progress", assignedTo: "Mike D.", reportedBy: "Front Desk", estimatedCost: 220, actualCost: 0, estimatedHours: 1.5, scheduledDate: d.today, completedDate: null, notes: "", source: "admin", createdAt: new Date(Date.now() - 3600000 * 28).toISOString() },
    { id: "demo_5", title: "Parking lot light out — Section B", description: "Three LED fixtures in Section B are dark. Likely a tripped breaker or ballast issue.", building: "City Centre", unit: "Parking Lot", category: "Electrical", priority: 3, status: "scheduled", assignedTo: "Carlos M.", reportedBy: "Allen Hurley", estimatedCost: 140, actualCost: 0, estimatedHours: 2, scheduledDate: d.nextWeek, completedDate: null, notes: "", source: "admin", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: "demo_6", title: "Refrigerator not cooling — Break Room", description: "Staff fridge holding at 52°F. Contents may be unsafe. Needs service call or replacement.", building: "Bristol Commons", unit: "Break Room", category: "Appliance", priority: 3, status: "open", assignedTo: "", reportedBy: "Staff", estimatedCost: 280, actualCost: 0, estimatedHours: 2, scheduledDate: d.nextWeek, completedDate: null, notes: "", source: "staff", createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: "demo_7", title: "Paint scuff in hallway — 2nd floor", description: "5-ft scuff along north wall. Low priority. Touch-up paint on hand in maintenance closet.", building: "The Executive", unit: "2nd Floor Hallway", category: "Damage", priority: 4, status: "open", assignedTo: "James R.", reportedBy: "Cleaning Staff", estimatedCost: 40, actualCost: 0, estimatedHours: 1, scheduledDate: d.twoWks, completedDate: null, notes: "", source: "cleaning", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: "demo_8", title: "HVAC filter replacement — Suite 105", description: "Quarterly filter swap completed. New MERV-11 filters installed. Next due in 90 days.", building: "City Centre", unit: "Suite 105", category: "HVAC", priority: 4, status: "complete", assignedTo: "Mike D.", reportedBy: "Allen Hurley", estimatedCost: 60, actualCost: 55, estimatedHours: 0.5, scheduledDate: d.yesterday, completedDate: d.yesterday, notes: "[Apr 16 — Mike D.] Done. Used two 16x20x1 MERV-11s. Disposed of old filters.", source: "admin", createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];
}

// ─── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({ tickets }: { tickets: Ticket[] }) {
  const open = tickets.filter(t => t.status !== "complete" && t.status !== "cancelled");
  const cat1 = open.filter(t => t.priority === 1);
  const cat2 = open.filter(t => t.priority === 2);
  const totalEstCost = open.reduce((s, t) => s + t.estimatedCost, 0);
  const totalEstHours = open.reduce((s, t) => s + t.estimatedHours, 0);
  const overdue = open.filter(t => t.scheduledDate && new Date(t.scheduledDate) < new Date());

  return (
    <div className="rounded-2xl border border-[rgba(250,204,21,0.2)] bg-gradient-to-br from-[rgba(250,204,21,0.05)] via-transparent to-transparent p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#FACC15] opacity-[0.03] blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.25)]">
            <Wrench size={14} className="text-black" />
          </div>
          <div>
            <p className="text-xs font-black text-[#FACC15] uppercase tracking-widest">Maintenance Control</p>
            <p className="text-[11px] text-gray-500">{open.length} open ticket{open.length !== 1 ? "s" : ""} · {tickets.filter(t => t.status === "complete").length} completed</p>
          </div>
        </div>
        <a
          href="/staff/maintenance"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:opacity-75 flex-shrink-0"
          style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", color: "#FACC15" }}
        >
          🔧 Crew Portal ↗
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: "Open Tickets", value: String(open.length), color: "#94A3B8" },
          { label: "Emergencies", value: String(cat1.length), color: cat1.length > 0 ? "#EF4444" : "#4ADE80" },
          { label: "Est. Cost", value: totalEstCost > 0 ? `$${totalEstCost.toLocaleString()}` : "—", color: "#FACC15" },
          { label: "Est. Hours", value: totalEstHours > 0 ? `${totalEstHours}h` : "—", color: "#60A5FA" },
        ].map(s => (
          <div key={s.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
            <p className="text-[10px] text-gray-600 mb-0.5">{s.label}</p>
            <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alert rows */}
      <div className="space-y-1.5">
        {cat1.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)]">
            <Flame size={11} className="text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400"><span className="font-black">{cat1.length} CAT 1 Emergency</span> ticket{cat1.length !== 1 ? "s" : ""} require immediate attention</span>
          </div>
        )}
        {cat2.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(249,115,22,0.07)] border border-[rgba(249,115,22,0.2)]">
            <AlertTriangle size={11} className="text-orange-400 flex-shrink-0" />
            <span className="text-xs text-orange-400"><span className="font-bold">{cat2.length} CAT 2 Urgent</span> ticket{cat2.length !== 1 ? "s" : ""} due within 24hrs</span>
          </div>
        )}
        {overdue.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.18)]">
            <Clock size={11} className="text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400"><span className="font-bold">{overdue.length} ticket{overdue.length !== 1 ? "s" : ""} past scheduled date</span> — follow up required</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ticket Form ──────────────────────────────────────────────────────────────

function TicketForm({ initial, onSave, onCancel, currentUserName }:
  { initial: Partial<Ticket>; onSave: (d: Partial<Ticket>) => Promise<void>; onCancel: () => void; currentUserName?: string }) {
  const [form, setForm] = useState<Partial<Ticket>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof Ticket, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try { await onSave(form); } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[rgba(0,0,0,0.4)] border border-[rgba(250,204,21,0.2)] rounded-2xl p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
          <Wrench size={12} />{initial.id ? "Edit Ticket" : "New Work Order"}
        </p>
        <button onClick={onCancel} className="text-gray-600 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {/* Title + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Issue Title *</label>
          <input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="HVAC not cooling Suite 301" className={FIELD} spellCheck />
        </div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={form.category || "Other"} onChange={e => set("category", e.target.value)} className={FIELD}>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0A0F1A]">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={LABEL}>Description</label>
        <textarea spellCheck={true} value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} className={FIELD + " text-xs py-1.5 resize-none"} placeholder="Describe the issue in detail…" />
      </div>

      {/* Building / Unit / Priority */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Building / Property</label>
          <input value={form.building || ""} onChange={e => set("building", e.target.value)} placeholder="The Executive" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Unit / Suite</label>
          <input value={form.unit || ""} onChange={e => set("unit", e.target.value)} placeholder="301" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Priority</label>
          <select value={form.priority || 3} onChange={e => set("priority", Number(e.target.value))} className={FIELD}>
            {[1, 2, 3, 4].map(p => (
              <option key={p} value={p} className="bg-[#0A0F1A]">{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Assigned To</label>
          <input value={form.assignedTo || ""} onChange={e => set("assignedTo", e.target.value)} placeholder="Mike D." className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Reported By</label>
          <input value={form.reportedBy || ""} onChange={e => set("reportedBy", e.target.value)} placeholder={currentUserName || "Allen Hurley"} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select value={form.status || "open"} onChange={e => set("status", e.target.value as Ticket["status"])} className={FIELD}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#0A0F1A]">{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Costs + Dates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={LABEL}>Est. Cost ($)</label>
          <input type="number" value={form.estimatedCost || ""} onChange={e => set("estimatedCost", Number(e.target.value))} placeholder="350" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Est. Hours</label>
          <input type="number" step="0.5" value={form.estimatedHours || ""} onChange={e => set("estimatedHours", Number(e.target.value))} placeholder="3" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Scheduled Date</label>
          <input type="date" value={form.scheduledDate || ""} onChange={e => set("scheduledDate", e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Completed Date</label>
          <input type="date" value={form.completedDate || ""} onChange={e => set("completedDate", e.target.value)} className={FIELD} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes / Resolution</label>
        <textarea spellCheck={true} value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} className={FIELD + " text-xs py-1.5 resize-none"} placeholder="Parts needed, access details, resolution notes…" />
      </div>

      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-xs font-black hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "Saving…" : "Save Ticket"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Status Cycle Button ──────────────────────────────────────────────────────

const STATUS_CYCLE: Ticket["status"][] = ["open", "scheduled", "in_progress", "complete"];

function StatusCycler({ ticket, onUpdate }: { ticket: Ticket; onUpdate: (id: string, patch: Partial<Ticket>) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CONFIG[ticket.status];
  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(ticket.status) + 1) % STATUS_CYCLE.length];
  const nextCfg = STATUS_CONFIG[nextStatus];

  const advance = async () => {
    setLoading(true);
    const patch: Partial<Ticket> = { status: nextStatus };
    if (nextStatus === "complete") patch.completedDate = new Date().toISOString().split("T")[0];
    await onUpdate(ticket.id, patch);
    setLoading(false);
  };

  return (
    <button onClick={advance} disabled={loading}
      title={`Advance to: ${nextCfg.label}`}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {loading ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
      {cfg.label}
    </button>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onEdit, onDelete, onUpdate, currentUserName }:
  { ticket: Ticket; onEdit: (t: Ticket) => void; onDelete: (id: string) => void; onUpdate: (id: string, patch: Partial<Ticket>) => Promise<void>; currentUserName?: string }) {
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState(ticket.notes || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const p = PRIORITY_CONFIG[ticket.priority];
  const isOverdue = ticket.scheduledDate && new Date(ticket.scheduledDate) < new Date() && ticket.status !== "complete" && ticket.status !== "cancelled";
  const noteLines = localNotes ? localNotes.split("\n").filter(Boolean).reverse() : [];

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const author = currentUserName || "Admin";
    const newEntry = `[${timestamp} — ${author}] ${note.trim()}`;
    const updated = localNotes ? `${localNotes}\n${newEntry}` : newEntry;
    await fetch(`/api/maintenance?id=${ticket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: updated }),
    });
    setLocalNotes(updated); setNote("");
    setSavingNote(false);
  };

  return (
    <div id={`ticket-card-${ticket.id}`}
      className={`glass rounded-2xl border transition-all p-5 ${
        ticket.priority === 1 ? "border-[rgba(239,68,68,0.4)] shadow-[0_0_20px_rgba(239,68,68,0.07)]"
        : ticket.priority === 2 ? "border-[rgba(249,115,22,0.35)]"
        : ticket.status === "complete" ? "border-[rgba(74,222,128,0.2)] opacity-70"
        : isOverdue ? "border-[rgba(239,68,68,0.3)]"
        : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(250,204,21,0.2)]"
      }`}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Priority badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border" style={{ backgroundColor: p.bg, borderColor: p.border }}>
            {p.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 className="text-white font-bold text-sm">{ticket.title}</h3>
              {ticket.status === "complete" && <CheckCircle2 size={13} className="text-[#4ADE80]" />}
              {isOverdue && <span className="text-[10px] font-black text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] px-2 py-0.5 rounded-lg">OVERDUE</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span className="font-mono">{[ticket.building, ticket.unit].filter(Boolean).join(" · ") || "Unassigned"}</span>
              <span className="flex items-center gap-1"><Clock size={9} /> {timeAgo(ticket.createdAt)}</span>
              {ticket.reportedBy && <span className="flex items-center gap-1"><User size={9} /> {ticket.reportedBy}</span>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <StatusCycler ticket={ticket} onUpdate={onUpdate} />
          <button onClick={() => onEdit(ticket)} className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-[#FACC15] hover:border-[rgba(250,204,21,0.3)] transition-all"><Edit2 size={12} /></button>
          {confirmDelete ? (
            <div className="flex gap-1 items-center">
              <span className="text-[10px] text-red-400">Sure?</span>
              <button onClick={() => onDelete(ticket.id)} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 text-[10px]">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-all"><Trash2 size={12} /></button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2.5 py-1 rounded-lg border font-semibold" style={{ color: p.color, backgroundColor: p.bg, borderColor: p.border }}>{p.label}</span>
        <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">{ticket.category}</span>
        {ticket.assignedTo && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(96,165,250,0.07)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA]">
            <User size={9} /> {ticket.assignedTo}
          </span>
        )}
      </div>

      {/* Description */}
      {ticket.description && (
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{ticket.description}</p>
      )}

      {/* Financials grid */}
      {(ticket.estimatedCost > 0 || ticket.estimatedHours > 0 || ticket.scheduledDate) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {ticket.estimatedCost > 0 && (
            <div className="bg-[rgba(250,204,21,0.04)] rounded-xl p-2.5 border border-[rgba(250,204,21,0.1)]">
              <p className="text-[10px] text-gray-600 mb-0.5">Est. Cost</p>
              <p className="text-sm font-black text-[#FACC15]">${ticket.estimatedCost.toLocaleString()}</p>
            </div>
          )}
          {ticket.actualCost > 0 && (
            <div className="bg-[rgba(74,222,128,0.04)] rounded-xl p-2.5 border border-[rgba(74,222,128,0.1)]">
              <p className="text-[10px] text-gray-600 mb-0.5">Actual Cost</p>
              <p className="text-sm font-black text-[#4ADE80]">${ticket.actualCost.toLocaleString()}</p>
            </div>
          )}
          {ticket.estimatedHours > 0 && (
            <div className="bg-[rgba(96,165,250,0.04)] rounded-xl p-2.5 border border-[rgba(96,165,250,0.1)]">
              <p className="text-[10px] text-gray-600 mb-0.5">Est. Hours</p>
              <p className="text-sm font-black text-[#60A5FA]">{ticket.estimatedHours}h</p>
            </div>
          )}
          {ticket.scheduledDate && (
            <div className={`rounded-xl p-2.5 border ${isOverdue ? "bg-[rgba(239,68,68,0.07)] border-[rgba(239,68,68,0.2)]" : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"}`}>
              <p className="text-[10px] text-gray-600 mb-0.5">Scheduled</p>
              <p className={`text-xs font-bold ${isOverdue ? "text-red-400" : "text-white"}`}>{fmtDate(ticket.scheduledDate)}</p>
            </div>
          )}
        </div>
      )}

      {/* Completed date */}
      {ticket.completedDate && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#4ADE80] mb-3">
          <CheckCircle2 size={11} />
          Completed {fmtDate(ticket.completedDate)}
        </div>
      )}

      {/* Activity thread */}
      <div className="border-t border-[rgba(255,255,255,0.05)] pt-3">
        <button onClick={() => setShowNotes(n => !n)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${noteLines.length > 0 ? "text-[#FACC15]" : "text-gray-500 hover:text-[#FACC15]"}`}>
          <MessageSquare size={13} />
          Notes {noteLines.length > 0 ? `(${noteLines.length})` : ""}
          {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showNotes && (
          <div className="mt-3 space-y-2">
            {noteLines.map((line, i) => {
              const m = line.match(/^\[(.+?)\] (.+)$/);
              return (
                <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2">
                  {m && <p className="text-[10px] text-gray-600 mb-0.5">{m[1]}</p>}
                  <p className="text-xs text-gray-300">{m ? m[2] : line}</p>
                </div>
              );
            })}
            <div className="flex gap-2">
              <textarea spellCheck={true} value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
                rows={2} placeholder="Add a note… (Enter to post)"
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[rgba(250,204,21,0.35)] outline-none placeholder:text-gray-700 resize-none transition-colors" />
              <button onClick={saveNote} disabled={savingNote || !note.trim()}
                className="px-3 py-1.5 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] text-xs font-bold hover:bg-[rgba(250,204,21,0.2)] transition-colors disabled:opacity-40">
                {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main MaintenanceTab ──────────────────────────────────────────────────────

export default function MaintenanceTab({ currentUserName, currentUserEmail }: { currentUserName?: string; currentUserEmail?: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | 1 | 2 | 3 | 4>("all");
  const [sortBy, setSortBy] = useState<"priority" | "date" | "building">("priority");
  const [newPinInfo, setNewPinInfo] = useState<{ name: string; pin: string } | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance");
      const data = await res.json();
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets.map(rowToTicket));
        setSetupError(false);
      } else { setSetupError(true); }
    } catch { setSetupError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleSaveNew = async (form: Partial<Ticket>) => {
    const res = await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, building: form.building, unit: form.unit,
        category: form.category, priority: form.priority, status: form.status,
        assignedTo: form.assignedTo, reportedBy: form.reportedBy || currentUserName,
        estimatedCost: form.estimatedCost, estimatedHours: form.estimatedHours,
        scheduledDate: form.scheduledDate || null, completedDate: form.completedDate || null,
        notes: form.notes,
        actorName: currentUserName || "Admin",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) throw new Error();
    // Auto-provision the assigned technician in allowed_users
    if (form.assignedTo?.trim()) {
      try {
        const staffRes = await fetch("/api/ensure-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.assignedTo.trim(), role: "maintenance" }),
        });
        const staffData = await staffRes.json();
        if (staffData.isNew && staffData.pin) {
          setNewPinInfo({ name: form.assignedTo.trim(), pin: staffData.pin });
        }
      } catch { /* non-critical */ }
    }
    setShowForm(false); await fetch_();
  };

  const handleSaveEdit = async (form: Partial<Ticket>) => {
    if (!editingTicket) return;
    const res = await fetch(`/api/maintenance?id=${editingTicket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, building: form.building, unit: form.unit,
        category: form.category, priority: form.priority, status: form.status,
        assignedTo: form.assignedTo, reportedBy: form.reportedBy,
        estimatedCost: form.estimatedCost, actualCost: form.actualCost,
        estimatedHours: form.estimatedHours,
        scheduledDate: form.scheduledDate || null, completedDate: form.completedDate || null,
        notes: form.notes,
        actorName: currentUserName || "Admin",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) throw new Error();
    setEditingTicket(null); await fetch_();
  };

  const handleUpdate = async (id: string, patch: Partial<Ticket>) => {
    await fetch(`/api/maintenance?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/maintenance?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName: currentUserName || "Admin", actorEmail: currentUserEmail || "" }),
    });
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  const displayed = tickets
    .filter(t => statusFilter === "all" || t.status === statusFilter)
    .filter(t => priorityFilter === "all" || t.priority === priorityFilter)
    .sort((a, b) => {
      if (sortBy === "priority") return a.priority !== b.priority ? a.priority - b.priority : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "building") return a.building.localeCompare(b.building);
      return 0;
    });

  return (
    <div className="mt-6">
      <SummaryBanner tickets={tickets} />

      {newPinInfo && (
        <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.3)]">
          <span className="text-lg leading-none">🔐</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#FACC15]">New staff portal access created for {newPinInfo.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              PIN: <span className="font-mono font-black text-white tracking-widest">{newPinInfo.pin}</span>
              <span className="text-gray-600 ml-2">— share this with them to log into the staff portal</span>
            </p>
          </div>
          <button onClick={() => setNewPinInfo(null)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Setup error */}
      {setupError && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.05)]">
          <p className="text-xs font-bold text-[#FACC15] mb-2 flex items-center gap-1.5"><AlertTriangle size={12} />Database table not found — one-time setup required</p>
          <p className="text-xs text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
          <pre className="text-[10px] text-gray-300 bg-[rgba(0,0,0,0.4)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  building TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'open',
  assigned_to TEXT DEFAULT '',
  reported_by TEXT DEFAULT '',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  estimated_hours NUMERIC DEFAULT 0,
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT DEFAULT '',
  source TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_maintenance" ON maintenance_tickets
  FOR ALL TO anon USING (true) WITH CHECK (true);`}</pre>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          {(["all", "open", "scheduled", "in_progress", "complete"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize ${statusFilter === s ? "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.35)] text-[#FACC15]" : "border-[rgba(255,255,255,0.07)] text-gray-500 hover:text-gray-300"}`}>
              {s === "all" ? `All (${tickets.length})` : s === "in_progress" ? `In Progress (${tickets.filter(t=>t.status==="in_progress").length})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${tickets.filter(t=>t.status===s).length})`}
            </button>
          ))}
          {/* Priority quick filter */}
          {([1,2,3,4] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(prev => prev === p ? "all" : p)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${priorityFilter === p ? "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.2)] text-white" : "border-[rgba(255,255,255,0.06)] text-gray-600 hover:text-gray-400"}`}>
              {PRIORITY_CONFIG[p].icon} {p}
            </button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-xl text-xs border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-gray-400 outline-none">
            <option value="priority">Sort: Priority</option>
            <option value="date">Sort: Newest</option>
            <option value="building">Sort: Building</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetch_} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(250,204,21,0.06)] border border-[rgba(250,204,21,0.2)] text-[#FACC15] text-xs hover:bg-[rgba(250,204,21,0.12)] transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <PrintButton zoneId="print-maintenance" label="Print / PDF" title="Maintenance Work Orders" />
          <button onClick={() => { setEditingTicket(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-xs font-black hover:opacity-90 transition-opacity">
            <Plus size={13} /> New Ticket
          </button>
        </div>
      </div>

      {/* Forms */}
      {showForm && !editingTicket && <TicketForm initial={BLANK_TICKET()} onSave={handleSaveNew} onCancel={() => setShowForm(false)} currentUserName={currentUserName} />}
      {editingTicket && <TicketForm initial={editingTicket} onSave={handleSaveEdit} onCancel={() => setEditingTicket(null)} currentUserName={currentUserName} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[#FACC15]" />
          <span className="ml-2 text-sm text-gray-500">Loading tickets…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !setupError && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wrench size={36} className="text-gray-700 mb-3" />
          <p className="text-gray-500 font-bold">{tickets.length === 0 ? "No tickets yet" : "No tickets match your filters"}</p>
          <p className="text-xs text-gray-600 mt-1 mb-4">{tickets.length === 0 ? "Create your first work order to start tracking maintenance." : "Try clearing the filters."}</p>
          {tickets.length === 0 && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-sm font-black hover:opacity-90 transition-opacity">
              <Plus size={14} /> Create First Ticket
            </button>
          )}
        </div>
      )}

      {/* Ticket cards — wrapped in print zone */}
      <div id="print-maintenance" className="space-y-4">
        {/* Print-only summary header */}
        <div className="print-only" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #ccc", fontSize: 12 }}>
          Filters: Status = {statusFilter} · Priority = {priorityFilter === "all" ? "All" : `CAT ${priorityFilter}`} · Showing {displayed.length} of {tickets.length} tickets
        </div>
        {displayed.map(t => (
          <TicketCard key={t.id} ticket={t}
            onEdit={t => { setEditingTicket(t); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            currentUserName={currentUserName}
          />
        ))}
      </div>
    </div>
  );
}
