"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2, Users, DollarSign, TrendingUp, AlertTriangle,
  Clock, CheckCircle2, Home, Loader2, RefreshCw, Save,
  ChevronDown, ChevronUp, Zap, Droplets, ShieldCheck, Receipt,
  MoreHorizontal, TrendingDown, Minus, Printer, X,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import type { Tenant } from "./TenantsTab";
import PortfolioOverviewCard from "./PortfolioOverviewCard";
import PortfolioHistoryChart from "./PortfolioHistoryChart";

// ── Types ────────────────────────────────────────────────────────────────────

interface PropDetail {
  property_id: string;
  total_units: number;
  taxes_annual: number;
  insurance_annual: number;
  electric_monthly: number;
  water_monthly: number;
  other_monthly: number;
  trend: "up" | "stable" | "down";
  notes: string;
}

type Trend = "up" | "stable" | "down";

type DetailForm = {
  totalUnits: string;
  taxesAnnual: string;
  insuranceAnnual: string;
  electricMonthly: string;
  waterMonthly: string;
  otherMonthly: string;
  trend: Trend;
  notes: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function fmt(n: number) { return n ? `$${n.toLocaleString()}` : "—"; }
function n(s: string) { return parseFloat(s) || 0; }

// Strips spaces, punctuation & digits → pure alpha token for fuzzy matching
// e.g. "Centre Point 357" → "centrepoint", "CentrePoint" → "centrepoint"
function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}
function buildingMatch(building: string, propertyName: string): boolean {
  const b = norm(building);
  const p = norm(propertyName);
  if (!b || !p) return false;
  // Exact normalized match
  if (b === p) return true;
  // Token-based: extract significant words (≥3 chars) from both sides
  const toWords = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(w => w.length >= 3);
  const bWords = toWords(building);
  const pWords = toWords(propertyName);
  // Either all building words exist in property name, or all property words exist in building
  // Both must have ≥2 words to avoid single-word false positives
  if (bWords.length >= 2) {
    const pText = propertyName.toLowerCase().replace(/[^a-z\s]/g, "");
    if (bWords.every(w => pText.includes(w))) return true;
  }
  if (pWords.length >= 2) {
    const bText = building.toLowerCase().replace(/[^a-z\s]/g, "");
    if (pWords.every(w => bText.includes(w))) return true;
  }
  return false;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Ring({ value, color }: { value: number; color: string }) {
  const r = 28, c = 2 * Math.PI * r;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={36} y={41} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">{value}%</text>
    </svg>
  );
}

function Pill({ icon: I, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border" style={{ background: `${color}08`, borderColor: `${color}20` }}>
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <I size={11} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-600 leading-none mb-0.5">{label}</p>
        <p className="text-xs font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, prefix = "$" }: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <div>
      <label className="text-[10px] text-gray-600 block mb-1">{label}</label>
      <div className="flex items-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] overflow-hidden">
        {prefix && <span className="text-xs text-gray-600 pl-2.5">{prefix}</span>}
        <input
          type="number" min={0} value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-xs text-white px-2 py-2 outline-none w-full"
        />
      </div>
    </div>
  );
}

// ── TrendSelector ─────────────────────────────────────────────────────────────

const TRENDS: { value: Trend; label: string; icon: React.ElementType; color: string }[] = [
  { value: "up",     label: "Improving", icon: TrendingUp,   color: "#4ADE80" },
  { value: "stable", label: "Stable",    icon: Minus,        color: "#FACC15" },
  { value: "down",   label: "Declining", icon: TrendingDown, color: "#EF4444" },
];

function TrendSelector({ value, onChange }: { value: Trend; onChange: (v: Trend) => void }) {
  return (
    <div className="flex gap-1.5">
      {TRENDS.map(({ value: v, label, icon: Icon, color }) => (
        <button key={v} onClick={() => onChange(v)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
          style={value === v
            ? { background: `${color}18`, color, borderColor: `${color}40` }
            : { background: "transparent", color: "#6b7280", borderColor: "rgba(255,255,255,0.08)" }}>
          <Icon size={10} />{label}
        </button>
      ))}
    </div>
  );
}

// ── PrintReport ───────────────────────────────────────────────────────────────

interface PrintData {
  property: typeof PROPERTIES[number];
  tenants: Tenant[];
  detail?: PropDetail;
}

function PrintReport({ data, onClose }: { data: PrintData[]; onClose: () => void }) {
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const totalRevenue = data.reduce((s, { tenants: ts }) => s + ts.reduce((a, t) => a + (t.monthlyRent || 0), 0), 0);
  const totalExp = data.reduce((s, { detail: d }) => {
    if (!d) return s;
    return s + d.electric_monthly + d.water_monthly + d.other_monthly + d.taxes_annual / 12 + d.insurance_annual / 12;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl">
        {/* Print controls — hidden when printing */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <span className="text-sm font-bold text-gray-700">Portfolio Report Preview</span>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              <Printer size={13} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-md flex-shrink-0"
              title="Close"
            >
              <X size={14} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Report body */}
        <div className="p-8 space-y-6">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-5">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Portfolio Report</h1>
              <p className="text-sm text-gray-500 mt-1">Generated {now}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-gray-900">{data.length} Properties</p>
              <p className="text-gray-500">{data.reduce((s, d) => s + d.tenants.length, 0)} Active Tenants</p>
            </div>
          </div>

          {/* Portfolio summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Revenue",  value: `$${totalRevenue.toLocaleString()}/mo`,             color: "#16a34a" },
              { label: "Total Expenses", value: totalExp ? `$${Math.round(totalExp).toLocaleString()}/mo` : "Not set", color: "#dc2626" },
              { label: "Net P&L",        value: totalExp ? `$${Math.round(totalRevenue - totalExp).toLocaleString()}/mo` : "—", color: totalRevenue > totalExp ? "#16a34a" : "#dc2626" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Per-property tables */}
          {data.map(({ property, tenants: ts, detail: d }) => {
            const rev = ts.reduce((s, t) => s + (t.monthlyRent || 0), 0);
            const taxMo = (d?.taxes_annual || 0) / 12;
            const insMo = (d?.insurance_annual || 0) / 12;
            const exp = taxMo + insMo + (d?.electric_monthly || 0) + (d?.water_monthly || 0) + (d?.other_monthly || 0);
            const profit = rev - exp;
            const totalUnits = d?.total_units || ts.length;
            const occ = totalUnits ? Math.round((ts.length / totalUnits) * 100) : 0;
            const trend = d?.trend || "stable";
            const trendLabel = TRENDS.find(t => t.value === trend)?.label || "Stable";

            return (
              <div key={property.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <h2 className="font-black text-gray-900 text-sm">{property.name}</h2>
                    <p className="text-xs text-gray-500">{property.city} · {property.type}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold" style={{ color: occ >= 100 ? "#16a34a" : occ > 0 ? "#ca8a04" : "#9ca3af" }}>
                      {ts.length}/{totalUnits} units ({occ}%)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border font-bold"
                      style={{ color: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#ca8a04", borderColor: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#ca8a04" }}>
                      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
                    </span>
                  </div>
                </div>

                {/* Financials row */}
                <div className="grid grid-cols-4 divide-x divide-gray-100 text-center">
                  {[{ l: "Revenue", v: rev ? `$${rev.toLocaleString()}/mo` : "—" },
                    { l: "Expenses", v: exp ? `$${Math.round(exp).toLocaleString()}/mo` : "—" },
                    { l: "Net P&L", v: exp ? `${profit >= 0 ? "+" : ""}$${Math.round(profit).toLocaleString()}/mo` : "—" },
                    { l: "Avg Rent", v: ts.length ? `$${Math.round(rev / ts.length).toLocaleString()}/mo` : "—" },
                  ].map(({ l, v }) => (
                    <div key={l} className="py-3 px-2">
                      <p className="text-[10px] text-gray-400">{l}</p>
                      <p className="text-sm font-bold text-gray-800">{v}</p>
                    </div>
                  ))}
                </div>

                {/* Tenant list */}
                {ts.length > 0 && (
                  <table className="w-full text-xs border-t border-gray-100">
                    <thead><tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Tenant</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Unit</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-semibold">Rent/mo</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-semibold">Lease End</th>
                    </tr></thead>
                    <tbody>
                      {ts.map(t => (
                        <tr key={t.id} className="border-t border-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">{t.name}</td>
                          <td className="px-4 py-2 text-gray-500">{t.unit || "—"}</td>
                          <td className="px-4 py-2 text-right text-gray-800">{t.monthlyRent ? `$${t.monthlyRent.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{t.leaseEnd || t.renewalDate || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {d?.notes && <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 italic">{d.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── PropertyCard ──────────────────────────────────────────────────────────────

function PropertyCard({ property, tenants, detail, onSave }: {
  property: typeof PROPERTIES[number];
  tenants: Tenant[];
  detail: PropDetail | undefined;
  onSave: (id: string, form: DetailForm) => Promise<void>;
}) {
  const trend: Trend = detail?.trend || "stable";
  const trendItem = TRENDS.find(t => t.value === trend)!;
  const TrendIcon = trendItem.icon;
  const propTenants = tenants.filter(t => {
    const b = (t.building || "").toLowerCase();
    const n = property.name.toLowerCase();
    return buildingMatch(t.building || "", property.name);
  });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<DetailForm>({
    totalUnits: String(detail?.total_units || ""),
    taxesAnnual: String(detail?.taxes_annual || ""),
    insuranceAnnual: String(detail?.insurance_annual || ""),
    electricMonthly: String(detail?.electric_monthly || ""),
    waterMonthly: String(detail?.water_monthly || ""),
    otherMonthly: String(detail?.other_monthly || ""),
    trend: detail?.trend || "stable",
    notes: detail?.notes || "",
  });

  // Sync form if detail loads after initial render
  useEffect(() => {
    if (detail) setForm({
      totalUnits: String(detail.total_units || ""),
      taxesAnnual: String(detail.taxes_annual || ""),
      insuranceAnnual: String(detail.insurance_annual || ""),
      electricMonthly: String(detail.electric_monthly || ""),
      waterMonthly: String(detail.water_monthly || ""),
      otherMonthly: String(detail.other_monthly || ""),
      trend: detail.trend || "stable",
      notes: detail.notes || "",
    });
  }, [detail]);

  const set = (k: keyof DetailForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  // Financial calcs
  const rented = propTenants.length;
  const totalUnits = n(form.totalUnits) || rented;
  const revenue = propTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);
  const taxMo = n(form.taxesAnnual) / 12;
  const insMo = n(form.insuranceAnnual) / 12;
  const expenses = taxMo + insMo + n(form.electricMonthly) + n(form.waterMonthly) + n(form.otherMonthly);
  const profit = revenue - expenses;
  const occupancy = pct(rented, totalUnits);
  const occColor = rented === 0 ? "#6B7280" : occupancy >= 100 ? "#4ADE80" : "#FACC15";

  const expiring = propTenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d >= 0 && d <= 90; });
  const expired  = propTenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d < 0; });

  const handleSave = async () => {
    setSaving(true);
    await onSave(property.id, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">

      {/* Card header */}
      <div className="flex items-center gap-4 p-5 border-b border-[rgba(255,255,255,0.05)]">
        <Ring value={occupancy} color={occColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white leading-tight truncate">{property.name}</h3>
            <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${trendItem.color}15`, color: trendItem.color, border: `1px solid ${trendItem.color}30` }}>
              <TrendIcon size={9} />{trendItem.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{property.city} · {property.type}</p>
          <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${occColor}18`, color: occColor, border: `1px solid ${occColor}30` }}>
            {rented}/{totalUnits} units · {occupancy}% occupied
          </span>
        </div>
        {revenue > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-600 mb-0.5">Revenue</p>
            <p className="text-base font-black text-[#4ADE80]">${revenue.toLocaleString()}/mo</p>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
        <Pill icon={Users}       label="Tenants"    value={rented}                                            color="#60A5FA" />
        <Pill icon={Home}        label="Sq Ft"      value={property.sqft}                                    color="#A78BFA" />
        <Pill icon={DollarSign}  label="Avg Rent"   value={rented ? `$${Math.round(revenue / rented).toLocaleString()}/mo` : "—"} color="#4ADE80" />
        {expenses > 0 && <Pill icon={Receipt}      label="Expenses"  value={`$${Math.round(expenses).toLocaleString()}/mo`}   color="#F97316" />}
        {expenses > 0 && (
          <Pill
            icon={profit >= 0 ? TrendingUp : AlertTriangle}
            label="Net P&L"
            value={`${profit >= 0 ? "+" : ""}$${Math.round(profit).toLocaleString()}/mo`}
            color={profit >= 0 ? "#4ADE80" : "#EF4444"}
          />
        )}
        {expiring.length > 0 && <Pill icon={Clock}         label="Expiring"  value={`${expiring.length} soon`}                         color="#FACC15" />}
        {expired.length  > 0 && <Pill icon={AlertTriangle} label="Expired"   value={`${expired.length} lease${expired.length > 1 ? "s":""}`} color="#EF4444" />}
      </div>

      {/* Tenant mini-list */}
      {propTenants.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.04)] px-4 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-3 mb-2">Tenants</p>
          <div className="space-y-1.5">
            {propTenants.map(t => {
              const d = daysUntil(t.leaseEnd || t.renewalDate);
              const isExp = d !== null && d < 0;
              const isSoon = d !== null && d >= 0 && d <= 90;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 border"
                  style={{ background: isExp ? "rgba(239,68,68,0.04)" : isSoon ? "rgba(250,204,21,0.04)" : "rgba(255,255,255,0.02)", borderColor: isExp ? "rgba(239,68,68,0.15)" : isSoon ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}>
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-gray-600 truncate">{t.unit ? `Unit ${t.unit} · ` : ""}{t.monthlyRent ? `$${t.monthlyRent.toLocaleString()}/mo` : ""}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {isExp  ? <span className="text-[10px] font-bold text-red-400">Expired</span>
                    : isSoon ? <span className="text-[10px] font-bold text-yellow-400">{d}d left</span>
                    : d !== null ? <span className="text-[10px] text-gray-600">{d}d</span>
                    : <CheckCircle2 size={12} className="text-green-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {propTenants.length === 0 && (
        <div className="px-4 pb-3 flex items-center gap-2 text-gray-700 text-xs">
          <Building2 size={12} /> No tenants linked yet
        </div>
      )}

      {/* Financials accordion */}
      <div className="border-t border-[rgba(255,255,255,0.05)]">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-gray-400 hover:text-white transition-colors">
          <span className="flex items-center gap-1.5"><MoreHorizontal size={12} /> Property Financials</span>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Total Units"        value={form.totalUnits}       onChange={set("totalUnits")}       prefix="#" />
              <Field label="Annual Taxes ($)"   value={form.taxesAnnual}      onChange={set("taxesAnnual")} />
              <Field label="Annual Insurance"   value={form.insuranceAnnual}  onChange={set("insuranceAnnual")} />
              <Field label="Electric / mo"      value={form.electricMonthly}  onChange={set("electricMonthly")} />
              <Field label="Water / mo"         value={form.waterMonthly}     onChange={set("waterMonthly")} />
              <Field label="Other / mo"         value={form.otherMonthly}     onChange={set("otherMonthly")} />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Vacancy Trend</label>
              <TrendSelector value={form.trend} onChange={v => setForm(f => ({ ...f, trend: v }))} />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => set("notes")(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-white px-3 py-2 outline-none resize-none"
                placeholder="Any notes about this property…" />
            </div>

            {/* Expense summary */}
            {expenses > 0 && (
              <div className="rounded-xl p-3 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs space-y-1">
                {taxMo > 0          && <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1"><Receipt size={10}/> Taxes</span><span>{fmt(taxMo)}/mo</span></div>}
                {insMo > 0          && <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1"><ShieldCheck size={10}/> Insurance</span><span>{fmt(insMo)}/mo</span></div>}
                {n(form.electricMonthly) > 0 && <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1"><Zap size={10}/> Electric</span><span>{fmt(n(form.electricMonthly))}/mo</span></div>}
                {n(form.waterMonthly)    > 0 && <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1"><Droplets size={10}/> Water</span><span>{fmt(n(form.waterMonthly))}/mo</span></div>}
                {n(form.otherMonthly)    > 0 && <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1"><MoreHorizontal size={10}/> Other</span><span>{fmt(n(form.otherMonthly))}/mo</span></div>}
                <div className="border-t border-[rgba(255,255,255,0.06)] pt-1 mt-1 flex justify-between font-bold">
                  <span className="text-gray-400">Total Expenses</span><span className="text-orange-400">{fmt(expenses)}/mo</span>
                </div>
                <div className="flex justify-between font-black">
                  <span className="text-gray-300">Net P&amp;L</span>
                  <span style={{ color: profit >= 0 ? "#4ADE80" : "#EF4444" }}>{profit >= 0 ? "+" : ""}{fmt(profit)}/mo</span>
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${saved ? "bg-[#4ADE80] text-black" : "bg-[rgba(74,222,128,0.15)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.25)]"}`}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
               : saved ? <><CheckCircle2 size={12} /> Saved!</>
               : <><Save size={12} /> Save Financials</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PropDetailsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [details, setDetails] = useState<PropDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationSql, setMigrationSql] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showPrint, setShowPrint] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, dRes] = await Promise.all([
      fetch("/api/tenants").catch(() => null),
      fetch("/api/property-details").catch(() => null),
    ]);
    if (tRes?.ok) { const d = await tRes.json(); if (Array.isArray(d.tenants)) setTenants(d.tenants); }
    if (dRes?.ok) {
      const d = await dRes.json();
      if (d.needsMigration) setMigrationSql(d.sql || "Run migration SQL in Supabase.");
      if (Array.isArray(d.details)) setDetails(d.details);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  const handleSave = async (propertyId: string, form: DetailForm) => {
    const res = await fetch("/api/property-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, ...form }),
    });
    if (res.ok) {
      // Refresh details silently
      const d = await res.json();
      if (d.error === "migration_required") { setMigrationSql(d.sql); return; }
      setTick(t => t + 1);
    }
  };

  const detailMap = useMemo(() =>
    Object.fromEntries(details.map(d => [d.property_id, d])), [details]);

  const totalRevenue = useMemo(() => tenants.reduce((s, t) => s + (t.monthlyRent || 0), 0), [tenants]);
  const totalExpenses = useMemo(() => details.reduce((s, d) =>
    s + d.electric_monthly + d.water_monthly + d.other_monthly + d.taxes_annual / 12 + d.insurance_annual / 12, 0), [details]);
  const alerts = useMemo(() => tenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d <= 90; }).length, [tenants]);

  const printData = useMemo(() => PROPERTIES.map(p => ({
    property: p,
    tenants: tenants.filter(t => {
      return buildingMatch(t.building || "", p.name);
    }),
    detail: detailMap[p.id],
  })), [tenants, detailMap]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-5 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#A78BFA]" />
            Property Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">Occupancy, P&amp;L, and financials per property — live from Tenant data.</p>
        </div>
        <button onClick={() => setTick(t => t + 1)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button onClick={() => setShowPrint(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#A78BFA] px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.25)] hover:bg-[rgba(167,139,250,0.1)] transition-all">
          <Printer size={12} /> Print Report
        </button>
      </div>

      {/* Migration banner */}
      {migrationSql && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-4">
          <p className="text-xs font-bold text-yellow-400 mb-2">⚠️ One-time setup required — run this SQL in Supabase:</p>
          <pre className="text-[10px] text-yellow-300 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{migrationSql}</pre>
        </div>
      )}

      {/* CEO Overview Card */}
      {!loading && (
        <PortfolioOverviewCard tenants={tenants} details={details} />
      )}

      {/* Portfolio KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Building2,     label: "Properties",  value: PROPERTIES.length,                                    color: "#A78BFA" },
          { icon: Users,         label: "Tenants",     value: tenants.length,                                       color: "#60A5FA" },
          { icon: DollarSign,    label: "Revenue",     value: `$${totalRevenue.toLocaleString()}/mo`,               color: "#4ADE80" },
          { icon: TrendingUp,    label: "Net P&L",     value: totalExpenses ? `$${Math.round(totalRevenue - totalExpenses).toLocaleString()}/mo` : "—", color: totalRevenue > totalExpenses ? "#4ADE80" : "#EF4444" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-[rgba(255,255,255,0.06)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-gray-600">{label}</p>
              <p className="text-sm font-black text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* P&L History Chart */}
      {!loading && (
        <PortfolioHistoryChart />
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-[#A78BFA]" />
          <span className="ml-3 text-sm text-gray-500">Loading…</span>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PROPERTIES.map(p => (
            <PropertyCard key={p.id} property={p} tenants={tenants} detail={detailMap[p.id]} onSave={handleSave} />
          ))}
        </div>
      )}

      {alerts > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-yellow-900/40 bg-yellow-950/20 text-yellow-400 text-xs">
          <AlertTriangle size={14} /> <span><strong>{alerts} lease{alerts > 1 ? "s" : ""}</strong> expiring within 90 days — check Tenants tab for details.</span>
        </div>
      )}

      {showPrint && <PrintReport data={printData} onClose={() => setShowPrint(false)} />}
    </div>
  );
}
