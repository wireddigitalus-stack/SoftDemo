"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Phone, Mail, Calendar, TrendingUp, DollarSign,
  AlertTriangle, ChevronDown, ChevronUp, Edit2, Trash2, Save, X,
  Clock, RefreshCw, CheckCircle2, User, Home, BadgePercent, Loader2,
  MessageSquare, FileSpreadsheet,
} from "lucide-react";
import TenantImporter from "./TenantImporter";
import PrintButton from "./PrintButton";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  rep: string;
  monthlyRent: number;
  utilitiesFee: number;
  securityDeposit: number;
  nnnFee: number;
  leaseStart: string | null;
  leaseEnd: string | null;
  renewalDate: string | null;
  leaseAlertDays: 30 | 60 | 180 | null;  // days-before-expiry to start alerting
  escalationPct: number;
  escalationDate: string | null;
  status: "active" | "pending" | "expired";
  notes: string;
  sourceLeadId: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToTenant(r: Record<string, unknown>): Tenant {
  return {
    id: r.id as string,
    name: r.name as string,
    contactName: (r.contact_name as string) || "",
    email: (r.email as string) || "",
    phone: (r.phone as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    rep: (r.rep as string) || "",
    monthlyRent: Number(r.monthly_rent) || 0,
    utilitiesFee: Number(r.utilities_fee) || 0,
    securityDeposit: Number(r.security_deposit) || 0,
    nnnFee: Number(r.nnn_fee) || 0,
    leaseStart: (r.lease_start as string) || null,
    leaseEnd: (r.lease_end as string) || null,
    renewalDate: (r.renewal_date as string) || null,
    leaseAlertDays: (r.lease_alert_days as 30 | 60 | 180 | null) || null,
    escalationPct: Number(r.escalation_pct) || 0,
    escalationDate: (r.escalation_date as string) || null,
    status: (r.status as "active" | "pending" | "expired") || "active",
    notes: (r.notes as string) || "",
    sourceLeadId: (r.source_lead_id as string) || "",
    createdAt: (r.created_at as string) || new Date().toISOString(),
  };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function renewalUrgency(days: number | null): { color: string; bg: string; border: string; label: string } | null {
  if (days === null) return null;
  if (days <= 0)  return { color: "#EF4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.4)",  label: "EXPIRED" };
  if (days <= 30) return { color: "#EF4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.35)", label: `${days}d — URGENT` };
  if (days <= 60) return { color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.35)", label: `${days}d — SOON` };
  if (days <= 90) return { color: "#FACC15", bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.3)",  label: `${days}d — WATCH` };
  return null;
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK = (): Partial<Tenant> => ({
  name: "", contactName: "", email: "", phone: "",
  building: "", unit: "", rep: "",
  monthlyRent: 0, utilitiesFee: 0, securityDeposit: 0, nnnFee: 0,
  leaseStart: "", leaseEnd: "", renewalDate: "", leaseAlertDays: 60,
  escalationPct: 0, escalationDate: "",
  status: "active", notes: "",
});

// ─── Tenant Form ─────────────────────────────────────────────────────────────

const LABEL = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1";
const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-600";
const FIELD_SM = FIELD + " text-xs py-1.5";

function TenantForm({
  initial, onSave, onCancel, currentUserName,
}: {
  initial: Partial<Tenant>;
  onSave: (data: Partial<Tenant>) => Promise<void>;
  onCancel: () => void;
  currentUserName?: string;
}) {
  const [form, setForm] = useState<Partial<Tenant>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof Tenant, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Tenant name is required."); return; }
    setSaving(true);
    setError("");
    try { await onSave(form); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[rgba(0,0,0,0.4)] border border-[rgba(74,222,128,0.2)] rounded-2xl p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-black text-[#4ADE80] uppercase tracking-widest">
          {initial.id ? "Edit Tenant" : "Add New Tenant"}
        </p>
        <button onClick={onCancel} className="text-gray-600 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {/* Company & Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Company / Tenant Name *</label>
          <input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Bristol Tech Co." className={FIELD} spellCheck /></div>
        <div><label className={LABEL}>Primary Contact</label>
          <input value={form.contactName || ""} onChange={e => set("contactName", e.target.value)} placeholder="Jane Smith" className={FIELD} spellCheck /></div>
        <div><label className={LABEL}>Email</label>
          <input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="jane@company.com" className={FIELD} /></div>
        <div><label className={LABEL}>Phone</label>
          <input type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="(423) 555-0000" className={FIELD} /></div>
      </div>

      {/* Property */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2"><label className={LABEL}>Building / Property</label>
          <input value={form.building || ""} onChange={e => set("building", e.target.value)} placeholder="The Executive Office Suites" className={FIELD} /></div>
        <div><label className={LABEL}>Unit / Suite</label>
          <input value={form.unit || ""} onChange={e => set("unit", e.target.value)} placeholder="204" className={FIELD} /></div>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Monthly Rent ($)</label>
          <input type="number" value={form.monthlyRent || ""} onChange={e => set("monthlyRent", Number(e.target.value))} placeholder="4200" className={FIELD} /></div>
        <div><label className={LABEL}>Monthly Utilities Fee ($)</label>
          <input type="number" value={form.utilitiesFee || ""} onChange={e => set("utilitiesFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Returnable Deposit ($)</label>
          <input type="number" value={form.securityDeposit || ""} onChange={e => set("securityDeposit", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
        <div><label className={LABEL}>NNN Fee / Triple Net ($)</label>
          <input type="number" value={form.nnnFee || ""} onChange={e => set("nnnFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Annual Escalation (%)</label>
          <input type="number" step="0.1" value={form.escalationPct || ""} onChange={e => set("escalationPct", Number(e.target.value))} placeholder="3" className={FIELD} /></div>
        <div><label className={LABEL}>Next Escalation Date</label>
          <input type="date" value={form.escalationDate || ""} onChange={e => set("escalationDate", e.target.value)} className={FIELD} /></div>
      </div>

      {/* Lease Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className={LABEL}>Lease Start</label>
          <input type="date" value={form.leaseStart || ""} onChange={e => set("leaseStart", e.target.value)} className={FIELD} /></div>
        <div><label className={LABEL}>Lease End / Expiration</label>
          <input type="date" value={form.leaseEnd || ""} onChange={e => set("leaseEnd", e.target.value)} className={FIELD} /></div>
        <div><label className={LABEL}>Renewal Offer Deadline</label>
          <input type="date" value={form.renewalDate || ""} onChange={e => set("renewalDate", e.target.value)} className={FIELD} /></div>
      </div>

      {/* Lease Renewal Alert */}
      <div>
        <label className={LABEL}>Lease Renewal Alert Window</label>
        <p className="text-[10px] text-gray-600 mb-2">Get an alert this many days before lease expiry</p>
        <div className="flex gap-2">
          {([30, 60, 180, null] as const).map(v => (
            <button
              key={String(v)}
              type="button"
              onClick={() => set("leaseAlertDays", v)}
              className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                form.leaseAlertDays === v
                  ? "bg-[rgba(74,222,128,0.15)] border-[rgba(74,222,128,0.5)] text-[#4ADE80]"
                  : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"
              }`}
            >
              {v === null ? "None" : `${v}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Rep + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Assigned Rep</label>
          <input value={form.rep || ""} onChange={e => set("rep", e.target.value)}
            placeholder={currentUserName || "Allen Hurley"} className={FIELD} /></div>
        <div><label className={LABEL}>Status</label>
          <select value={form.status || "active"} onChange={e => set("status", e.target.value as "active"|"pending"|"expired")} className={FIELD}>
            <option value="active" className="bg-[#0A0F1A]">Active</option>
            <option value="pending" className="bg-[#0A0F1A]">Pending</option>
            <option value="expired" className="bg-[#0A0F1A]">Expired</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div><label className={LABEL}>Notes</label>
        <textarea spellCheck={true} value={form.notes || ""} onChange={e => set("notes", e.target.value)}
          rows={2} className={FIELD_SM} placeholder="Additional lease terms, special conditions…" /></div>

      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-xs font-black hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "Saving…" : "Save Tenant"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Revenue Intelligence Banner ─────────────────────────────────────────────

function RevenueBanner({ tenants, onTenantClick }: { tenants: Tenant[]; onTenantClick: (id: string) => void }) {
  const active = tenants.filter(t => t.status === "active");
  const totalMonthly = active.reduce((s, t) => s + t.monthlyRent, 0);
  const totalARR = totalMonthly * 12;

  // Renewal alerts — per-tenant threshold (leaseAlertDays) or default 90
  const renewalAlerts = active
    .filter(t => t.renewalDate || t.leaseEnd)
    .map(t => ({ tenant: t, days: daysUntil(t.renewalDate || t.leaseEnd) }))
    .filter(x => {
      if (x.days === null) return false;
      const threshold = x.tenant.leaseAlertDays ?? 90;
      return x.days <= threshold;
    })
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  // Upcoming escalations
  const escalations = active
    .filter(t => t.escalationDate && t.escalationPct > 0)
    .map(t => ({ tenant: t, days: daysUntil(t.escalationDate) }))
    .filter(x => x.days !== null && x.days > 0 && x.days <= 180)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  return (
    <div className="rounded-2xl border border-[rgba(74,222,128,0.25)] bg-gradient-to-br from-[rgba(74,222,128,0.06)] via-[rgba(74,222,128,0.02)] to-transparent p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#4ADE80] opacity-[0.03] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-[0_0_12px_rgba(74,222,128,0.3)]">
          <DollarSign size={14} className="text-black" />
        </div>
        <div>
          <p className="text-xs font-black text-[#4ADE80] uppercase tracking-widest">Revenue Intelligence</p>
          <p className="text-[11px] text-gray-500">{active.length} active tenant{active.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Monthly Revenue", value: fmtMoney(totalMonthly) },
          { label: "Annual ARR", value: fmtMoney(totalARR) },
          { label: "Avg Lease/Tenant", value: active.length ? fmtMoney(Math.round(totalMonthly / active.length)) : "$0" },
        ].map(s => (
          <div key={s.label} className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className="text-lg font-black text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Renewal Alerts */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <AlertTriangle size={10} /> Renewals Requiring Attention
          </p>
          {renewalAlerts.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No renewals due within 90 days ✓</p>
          ) : renewalAlerts.map(({ tenant, days }) => {
            const urg = renewalUrgency(days);
            if (!urg) return null;
            return (
              <button key={tenant.id} onClick={() => onTenantClick(tenant.id)}
                className="w-full text-left flex items-center justify-between gap-2 mb-1.5 px-3 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: urg.color }} />
                  <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{tenant.name}</span>
                  {tenant.unit && <span className="text-[10px] text-gray-600">· {tenant.unit}</span>}
                </div>
                <span className="text-[10px] font-bold flex-shrink-0 px-2 py-0.5 rounded-lg border"
                  style={{ color: urg.color, backgroundColor: urg.bg, borderColor: urg.border }}>
                  {urg.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Upcoming Escalations */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <BadgePercent size={10} /> Upcoming Rent Escalations
          </p>
          {escalations.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No escalations in next 6 months</p>
          ) : escalations.map(({ tenant, days }) => {
            const increase = Math.round(tenant.monthlyRent * (tenant.escalationPct / 100));
            return (
              <button key={tenant.id} onClick={() => onTenantClick(tenant.id)}
                className="w-full text-left flex items-center justify-between gap-2 mb-1.5 px-3 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingUp size={10} className="text-[#4ADE80] flex-shrink-0" />
                  <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{tenant.name}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-[#4ADE80] font-bold">+{tenant.escalationPct}% · +{fmtMoney(increase)}/mo</span>
                  <span className="text-[10px] text-gray-600 ml-1">in {days}d</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tenant Card ──────────────────────────────────────────────────────────────

function TenantCard({
  tenant, onEdit, onDelete, currentUserName,
}: {
  tenant: Tenant;
  onEdit: (t: Tenant) => void;
  onDelete: (id: string) => void;
  currentUserName?: string;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState(tenant.notes || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const leaseEndDays = daysUntil(tenant.leaseEnd);
  const renewalDays = daysUntil(tenant.renewalDate);
  const urgency = renewalUrgency(renewalDays ?? leaseEndDays);
  const escalationDays = daysUntil(tenant.escalationDate);
  const annualRent = tenant.monthlyRent * 12;

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const author = currentUserName || "Admin";
    const newEntry = `[${timestamp} — ${author}] ${note.trim()}`;
    const updated = localNotes ? `${localNotes}\n${newEntry}` : newEntry;
    try {
      await fetch(`/api/tenants?id=${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updated }),
      });
      setLocalNotes(updated);
      setNote("");
    } finally { setSavingNote(false); }
  };

  const noteLines = localNotes ? localNotes.split("\n").filter(Boolean).reverse() : [];

  return (
    <div id={`tenant-card-${tenant.id}`}
      className={`glass rounded-2xl border transition-all p-5 ${
        urgency?.color === "#EF4444" ? "border-[rgba(239,68,68,0.4)] shadow-[0_0_18px_rgba(239,68,68,0.06)]"
        : urgency?.color === "#F97316" ? "border-[rgba(249,115,22,0.35)]"
        : urgency?.color === "#FACC15" ? "border-[rgba(250,204,21,0.3)]"
        : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(74,222,128,0.2)]"
      }`}>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-[#4ADE80]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-white font-bold text-sm">{tenant.name}</h3>
              {tenant.status === "expired" && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 font-bold">EXPIRED</span>
              )}
              {tenant.status === "pending" && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.3)] text-[#FACC15] font-bold">PENDING</span>
              )}
            </div>
            {tenant.contactName && (
              <p className="text-xs text-gray-500 mt-0.5">{tenant.contactName}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1 text-xs">
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-1 text-gray-400 hover:text-[#4ADE80] font-mono transition-colors">
                  <Phone size={10} />{tenant.phone}
                </a>
              )}
              {tenant.email && (
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-1 text-gray-400 hover:text-[#60A5FA] transition-colors">
                  <Mail size={10} />{tenant.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Renewal badge */}
        <div className="flex flex-wrap gap-2 items-start flex-shrink-0">
          {urgency && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg border whitespace-nowrap"
              style={{ color: urgency.color, backgroundColor: urgency.bg, borderColor: urgency.border }}>
              ⚠ Renew in {urgency.label}
            </span>
          )}
          <div className="flex gap-1">
            <button onClick={() => onEdit(tenant)}
              className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-[#4ADE80] hover:border-[rgba(74,222,128,0.3)] transition-all">
              <Edit2 size={12} />
            </button>
            {confirmDelete ? (
              <div className="flex gap-1 items-center">
                <span className="text-[10px] text-red-400">Sure?</span>
                <button onClick={() => onDelete(tenant.id)} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 text-[10px] hover:text-white transition-colors">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Property + Rep chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {tenant.building && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">
            <Home size={10} />{tenant.building}{tenant.unit ? ` · ${tenant.unit}` : ""}
          </span>
        )}
        {tenant.rep && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">
            <User size={10} />Rep: {tenant.rep}
          </span>
        )}
      </div>

      {/* Financials grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-[rgba(74,222,128,0.05)] rounded-xl p-2.5 border border-[rgba(74,222,128,0.12)]">
          <p className="text-[10px] text-gray-600 mb-0.5">Monthly Rent</p>
          <p className="text-sm font-black text-[#4ADE80]">{fmtMoney(tenant.monthlyRent)}</p>
        </div>
        <div className="bg-[rgba(74,222,128,0.05)] rounded-xl p-2.5 border border-[rgba(74,222,128,0.12)]">
          <p className="text-[10px] text-gray-600 mb-0.5">Annual Value</p>
          <p className="text-sm font-black text-[#4ADE80]">{fmtMoney(annualRent)}</p>
        </div>
        {tenant.utilitiesFee > 0 && (
          <div className="bg-[rgba(96,165,250,0.05)] rounded-xl p-2.5 border border-[rgba(96,165,250,0.12)]">
            <p className="text-[10px] text-gray-600 mb-0.5">Utilities Fee</p>
            <p className="text-sm font-black text-[#60A5FA]">{fmtMoney(tenant.utilitiesFee)}</p>
          </div>
        )}
        {tenant.nnnFee > 0 && (
          <div className="bg-[rgba(168,85,247,0.05)] rounded-xl p-2.5 border border-[rgba(168,85,247,0.12)]">
            <p className="text-[10px] text-gray-600 mb-0.5">NNN / Triple Net</p>
            <p className="text-sm font-black text-[#A855F7]">{fmtMoney(tenant.nnnFee)}</p>
          </div>
        )}
        {tenant.securityDeposit > 0 && (
          <div className="bg-[rgba(250,204,21,0.05)] rounded-xl p-2.5 border border-[rgba(250,204,21,0.12)]">
            <p className="text-[10px] text-gray-600 mb-0.5">Deposit (Returnable)</p>
            <p className="text-sm font-black text-[#FACC15]">{fmtMoney(tenant.securityDeposit)}</p>
          </div>
        )}
        <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-2.5 border border-[rgba(255,255,255,0.06)]">
          <p className="text-[10px] text-gray-600 mb-0.5">Lease End</p>
          <p className="text-xs font-bold text-white">{fmtDate(tenant.leaseEnd)}</p>
          {leaseEndDays !== null && (
            <p className={`text-[10px] mt-0.5 ${leaseEndDays <= 0 ? "text-red-400" : leaseEndDays <= 60 ? "text-orange-400" : "text-gray-600"}`}>
              {leaseEndDays <= 0 ? "EXPIRED" : `${leaseEndDays}d remaining`}
            </p>
          )}
        </div>
        <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-2.5 border border-[rgba(255,255,255,0.06)]">
          <p className="text-[10px] text-gray-600 mb-0.5">Lease Start</p>
          <p className="text-xs font-bold text-white">{fmtDate(tenant.leaseStart)}</p>
        </div>
      </div>

      {/* Escalation row */}
      {tenant.escalationPct > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[rgba(74,222,128,0.04)] border border-[rgba(74,222,128,0.1)]">
          <TrendingUp size={11} className="text-[#4ADE80] flex-shrink-0" />
          <span className="text-xs text-gray-400">
            <span className="text-[#4ADE80] font-bold">+{tenant.escalationPct}% escalation</span>
            {tenant.escalationDate && (
              <> on {fmtDate(tenant.escalationDate)}
                {escalationDays !== null && escalationDays > 0 && (
                  <span className="text-gray-600"> ({escalationDays}d) → +{fmtMoney(Math.round(tenant.monthlyRent * tenant.escalationPct / 100))}/mo</span>
                )}
              </>
            )}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {tenant.phone && (
          <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs font-bold hover:bg-[rgba(74,222,128,0.14)] transition-colors">
            <Phone size={11} /> Call
          </a>
        )}
        {tenant.email && (
          <a href={`mailto:${tenant.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.14)] transition-colors">
            <Mail size={11} /> Email
          </a>
        )}
      </div>

      {/* Activity / Notes thread */}
      <div className="border-t border-[rgba(255,255,255,0.05)] pt-3">
        <button onClick={() => setShowNotes(n => !n)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${noteLines.length > 0 ? "text-[#4ADE80] drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]" : "text-gray-500 hover:text-[#4ADE80]"}`}>
          <MessageSquare size={14} className={noteLines.length > 0 ? "fill-[rgba(74,222,128,0.15)]" : ""} />
          Activity {noteLines.length > 0 ? `(${noteLines.length})` : ""}
          {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showNotes && (
          <div className="mt-3 space-y-2">
            {noteLines.map((line, i) => {
              const match = line.match(/^\[(.+?)\] (.+)$/);
              const meta = match?.[1] || "";
              const body = match?.[2] || line;
              return (
                <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-600 mb-0.5">{meta}</p>
                  <p className="text-xs text-gray-300">{body}</p>
                </div>
              );
            })}
            <div className="flex gap-2">
              <textarea spellCheck={true} value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
                rows={2} placeholder="Add a note… (Enter to post)"
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[rgba(74,222,128,0.35)] outline-none placeholder:text-gray-700 resize-none transition-colors" />
              <button onClick={saveNote} disabled={savingNote || !note.trim()}
                className="px-3 py-1.5 rounded-lg bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] text-xs font-bold hover:bg-[rgba(74,222,128,0.2)] transition-colors disabled:opacity-40">
                {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main TenantsTab ──────────────────────────────────────────────────────────

export default function TenantsTab({ currentUserName, currentUserEmail }: { currentUserName?: string; currentUserEmail?: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "expired">("all");
  const [sortBy, setSortBy] = useState<"name" | "rent" | "lease_end">("lease_end");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (Array.isArray(data.tenants)) {
        setTenants(data.tenants.map(rowToTenant));
        setSetupError(false);
      } else {
        setSetupError(true);
      }
    } catch {
      setSetupError(true);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleSaveNew = async (form: Partial<Tenant>) => {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
        building: form.building, unit: form.unit, rep: form.rep,
        monthlyRent: Number(form.monthlyRent) || 0,
        utilitiesFee: Number(form.utilitiesFee) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        nnnFee: Number(form.nnnFee) || 0,
        leaseStart: form.leaseStart || null, leaseEnd: form.leaseEnd || null,
        renewalDate: form.renewalDate || null,
        leaseAlertDays: form.leaseAlertDays ?? null,
        escalationPct: form.escalationPct, escalationDate: form.escalationDate || null,
        status: form.status, notes: form.notes,
        actorName: currentUserName || "Admin",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) throw new Error("Save failed");
    setShowForm(false);
    await fetchTenants();
  };

  const handleSaveEdit = async (form: Partial<Tenant>) => {
    if (!editingTenant) return;

    // ── Compute only the fields that actually changed ─────────────────────────
    type FieldKey = keyof Tenant;
    const TRACKED: FieldKey[] = [
      "name", "contactName", "email", "phone",
      "building", "unit", "rep",
      "monthlyRent", "utilitiesFee", "securityDeposit", "nnnFee",
      "leaseStart", "leaseEnd", "renewalDate", "leaseAlertDays",
      "escalationPct", "escalationDate", "status", "notes",
    ];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of TRACKED) {
      const oldVal = editingTenant[key] ?? null;
      const newVal = (form as Record<string, unknown>)[key] ?? null;
      // Normalise numbers for comparison
      const norm = (v: unknown) => (v === "" || v === undefined) ? null : v;
      if (String(norm(oldVal)) !== String(norm(newVal))) {
        changes[String(key).replace(/([A-Z])/g, " $1").toLowerCase().trim()] = {
          from: oldVal,
          to:   newVal,
        };
      }
    }

    const res = await fetch(`/api/tenants?id=${editingTenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
        building: form.building, unit: form.unit, rep: form.rep,
        monthlyRent: Number(form.monthlyRent) || 0,
        utilitiesFee: Number(form.utilitiesFee) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        nnnFee: Number(form.nnnFee) || 0,
        leaseStart: form.leaseStart || null, leaseEnd: form.leaseEnd || null,
        renewalDate: form.renewalDate || null,
        leaseAlertDays: form.leaseAlertDays ?? null,
        escalationPct: form.escalationPct, escalationDate: form.escalationDate || null,
        status: form.status, notes: form.notes,
        actorName:  currentUserName  || "Admin",
        actorEmail: currentUserEmail || "",
        // Pass the diff so the audit log shows what actually changed
        _changes: changes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setEditingTenant(null);
    await fetchTenants();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tenants?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName: currentUserName || "Admin", actorEmail: currentUserEmail || "" }),
    });
    setTenants(prev => prev.filter(t => t.id !== id));
  };

  const handleBatchImport = async (tenants: Partial<Tenant>[]) => {
    for (const form of tenants) {
      await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
          building: form.building, unit: form.unit, rep: "",
          monthlyRent: Number(form.monthlyRent) || 0,
          utilitiesFee: 0,
          securityDeposit: 0,
          nnnFee: 0,
          leaseStart: form.leaseStart || null, leaseEnd: form.leaseEnd || null,
          renewalDate: null, leaseAlertDays: 60,
          escalationPct: 0, escalationDate: null,
          status: form.status ?? "active", notes: form.notes ?? "",
        }),
      });
    }
    await fetchTenants();
  };

  const scrollToTenant = (id: string) => {
    const el = document.getElementById(`tenant-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow 0.3s";
      el.style.boxShadow = "0 0 0 2px #4ADE80, 0 0 24px rgba(74,222,128,0.35)";
      setTimeout(() => { el.style.boxShadow = ""; }, 1800);
    }
  };

  // Filter + sort
  const displayed = tenants
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rent") return b.monthlyRent - a.monthlyRent;
      if (sortBy === "lease_end") {
        const ad = daysUntil(a.leaseEnd) ?? 9999;
        const bd = daysUntil(b.leaseEnd) ?? 9999;
        return ad - bd;
      }
      return 0;
    });

  return (
    <div className="mt-6">
      {/* Revenue Intelligence Banner */}
      <RevenueBanner tenants={tenants} onTenantClick={scrollToTenant} />

      {/* SQL Setup Banner — only shown on actual API error */}
      {setupError && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.05)]">
          <p className="text-xs font-bold text-[#FACC15] mb-2 flex items-center gap-1.5"><AlertTriangle size={12} />Database table not found — one-time setup required</p>
          <p className="text-xs text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
          <pre className="text-[10px] text-gray-300 bg-[rgba(0,0,0,0.4)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`-- ① Create table (new install)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  building TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  rep TEXT DEFAULT '',
  monthly_rent NUMERIC DEFAULT 0,
  utilities_fee NUMERIC DEFAULT 0,
  lease_start DATE,
  lease_end DATE,
  renewal_date DATE,
  lease_alert_days INTEGER DEFAULT 60,
  escalation_pct NUMERIC DEFAULT 0,
  escalation_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT DEFAULT '',
  source_lead_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_tenants" ON tenants
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ② Already have the table? Run ONLY these lines instead:
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utilities_fee NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lease_alert_days INTEGER DEFAULT 60;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nnn_fee NUMERIC DEFAULT 0;`}</pre>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {(["all","active","pending","expired"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize ${filterStatus === s ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.4)] text-[#4ADE80]" : "border-[rgba(255,255,255,0.07)] text-gray-500 hover:text-gray-300"}`}>
              {s === "all" ? `All (${tenants.length})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${tenants.filter(t=>t.status===s).length})`}
            </button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-xl text-xs border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-gray-400 outline-none">
            <option value="lease_end">Sort: Lease Expiry</option>
            <option value="rent">Sort: Rent (High→Low)</option>
            <option value="name">Sort: Name A→Z</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchTenants} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs hover:bg-[rgba(74,222,128,0.12)] transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <PrintButton zoneId="print-tenants" label="Print Roster" title="Tenant Roster" />
          <button onClick={() => setShowImporter(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(74,222,128,0.3)] text-[#4ADE80] text-xs font-black hover:bg-[rgba(74,222,128,0.08)] transition-colors">
            <FileSpreadsheet size={13} /> Import Excel
          </button>
          <button onClick={() => { setEditingTenant(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-xs font-black hover:opacity-90 transition-opacity">
            <Plus size={13} /> Add Tenant
          </button>
        </div>
      </div>

      {/* Excel Importer Modal */}
      {showImporter && (
        <TenantImporter
          onImport={handleBatchImport}
          onClose={() => setShowImporter(false)}
        />
      )}

      {/* Add form */}
      {showForm && !editingTenant && (
        <TenantForm initial={BLANK()} onSave={handleSaveNew} onCancel={() => setShowForm(false)} currentUserName={currentUserName} />
      )}

      {/* Edit form */}
      {editingTenant && (
        <TenantForm initial={editingTenant} onSave={handleSaveEdit} onCancel={() => setEditingTenant(null)} currentUserName={currentUserName} />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[#4ADE80]" />
          <span className="ml-2 text-sm text-gray-500">Loading tenants…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && displayed.length === 0 && filterStatus === "all" && tenants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 size={36} className="text-gray-700 mb-3" />
          <p className="text-gray-500 font-bold">No tenants yet</p>
          <p className="text-xs text-gray-600 mt-1 mb-4">Add your first tenant to start tracking leases and revenue.</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add First Tenant
          </button>
        </div>
      )}

      {/* Tenant cards — wrapped in print zone */}
      <div id="print-tenants" className="space-y-4">
        {displayed.map(tenant => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            onEdit={t => { setEditingTenant(t); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onDelete={handleDelete}
            currentUserName={currentUserName}
          />
        ))}
      </div>
    </div>
  );
}
