"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2, Users, DollarSign, TrendingUp, AlertTriangle,
  Clock, CheckCircle2, Home, Loader2, RefreshCw, Save,
  ChevronDown, ChevronUp, Zap, Droplets, ShieldCheck, Receipt,
  MoreHorizontal, TrendingDown, Minus, Printer, X, Pencil, Plus, Trash2,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import { type Tenant, rowToTenant } from "./TenantsTab";
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
  display_name: string | null;
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
  displayName: string;
};

// Unified shape used by PropertyCard — works for both static (data.ts) and DB properties
interface PropertyItem {
  id: string;
  name: string;
  type: string;
  city: string;
  address?: string;
  sqft: string;
  status?: string;
  isDynamic?: boolean; // true if from Supabase properties table
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function fmt(n: number) { return n ? `$${n.toLocaleString()}` : "—"; }
function n(s: string) { return parseFloat(s) || 0; }

// Exact property name map — matches the dropdown values used in tenant forms
const PROPERTY_DROPDOWN_NAMES: Record<string, string[]> = {
  "city-centre": ["City Centre Professional Suites", "City Centre"],
  "bristol-cowork": ["Bristol CoWork"],
  "the-executive": ["The Executive"],
  "centre-point-suites": ["Centre Point"],
  "foundation-event-facility": ["Foundation Event Facility"],
  "commercial-warehouse": ["Commercial Warehouse"],
  "west-state-commons": ["West State Commons"],
  "815-shelby-street": ["Jamestown at Shelby"],
  "250-commonwealth-ave": ["250 Commonwealth Ave"],
  "628-state-street": ["628 State Street"],
};

function exactBuildingMatch(tenantBuilding: string, propertyId: string, displayName: string): boolean {
  if (!tenantBuilding) return false;
  const b = tenantBuilding.trim().toLowerCase();
  // Match against display name (custom rename)
  if (displayName && b === displayName.trim().toLowerCase()) return true;
  // Match against known dropdown values for this property
  const names = PROPERTY_DROPDOWN_NAMES[propertyId];
  if (names && names.some(n => b === n.toLowerCase())) return true;
  // Also match dynamic properties by exact name
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
  property: PropertyItem;
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-4 sm:py-8 px-2 sm:px-4">
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
        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-200 pb-5 gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">Portfolio Report</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Generated {now}</p>
            </div>
            <div className="sm:text-right text-sm">
              <p className="font-bold text-gray-900">{data.length} Properties</p>
              <p className="text-gray-500">{data.reduce((s, d) => s + d.tenants.length, 0)} Active Tenants</p>
            </div>
          </div>

          {/* Portfolio summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 gap-1 sm:gap-0">
                  <div>
                    <h2 className="font-black text-gray-900 text-sm">{d?.display_name || property.name}</h2>
                    <p className="text-xs text-gray-500">{property.city} · {property.type}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-sm mt-1 sm:mt-0">
                    <span className="font-bold text-xs sm:text-sm" style={{ color: occ >= 100 ? "#16a34a" : occ > 0 ? "#ca8a04" : "#9ca3af" }}>
                      {ts.length}/{totalUnits} units ({occ}%)
                    </span>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full border font-bold"
                      style={{ color: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#ca8a04", borderColor: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#ca8a04" }}>
                      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
                    </span>
                  </div>
                </div>

                {/* Financials row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 text-center">
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

function PropertyCard({ property, tenants, detail, onSave, onDelete }: {
  property: PropertyItem;
  tenants: Tenant[];
  detail: PropDetail | undefined;
  onSave: (id: string, form: DetailForm) => Promise<void>;
  onDelete?: (id: string) => void;
}) {
  const trend: Trend = detail?.trend || "stable";
  const trendItem = TRENDS.find(t => t.value === trend)!;
  const TrendIcon = trendItem.icon;
  const displayName = detail?.display_name || property.name;
  const propTenants = tenants.filter(t => {
    return exactBuildingMatch(t.building || "", property.id, displayName);
  });

  const [collapsed, setCollapsed] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [form, setForm] = useState<DetailForm>({
    totalUnits: String(detail?.total_units || ""),
    taxesAnnual: String(detail?.taxes_annual || ""),
    insuranceAnnual: String(detail?.insurance_annual || ""),
    electricMonthly: String(detail?.electric_monthly || ""),
    waterMonthly: String(detail?.water_monthly || ""),
    otherMonthly: String(detail?.other_monthly || ""),
    trend: detail?.trend || "stable",
    notes: detail?.notes || "",
    displayName: detail?.display_name || "",
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
      displayName: detail.display_name || "",
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
    setEditingName(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">

      {/* Card header — always visible, clickable to expand/collapse */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer select-none hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <Ring value={occupancy} color={occColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={form.displayName || displayName}
                onChange={e => set("displayName")(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") setEditingName(false); if (e.key === "Enter") handleSave(); }}
                onClick={e => e.stopPropagation()}
                className="text-sm font-black text-white leading-tight bg-[rgba(255,255,255,0.06)] border border-[rgba(167,139,250,0.4)] rounded-lg px-2 py-1 outline-none w-full max-w-[260px]"
                placeholder={property.name}
              />
            ) : (
              <h3 className="text-sm font-black text-white leading-tight truncate">{displayName}</h3>
            )}
            <button onClick={(e) => { e.stopPropagation(); setEditingName(ed => !ed); }} title="Rename property"
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-[#A78BFA] hover:bg-[rgba(167,139,250,0.1)] transition-all">
              <Pencil size={10} />
            </button>
            <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${trendItem.color}15`, color: trendItem.color, border: `1px solid ${trendItem.color}30` }}>
              <TrendIcon size={9} />{trendItem.label}
            </span>
          </div>
          {form.displayName && form.displayName !== property.name && (
            <p className="text-[9px] text-gray-700 mt-0.5 truncate italic">System: {property.name}</p>
          )}
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{property.city} · {property.type}</p>
          <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${occColor}18`, color: occColor, border: `1px solid ${occColor}30` }}>
            {rented}/{totalUnits} units · {occupancy}% occupied
          </span>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 flex-shrink-0 w-full sm:w-auto">
          {revenue > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-600 mb-0.5">Revenue</p>
              <p className="text-base font-black text-[#4ADE80]">${revenue.toLocaleString()}/mo</p>
            </div>
          )}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <ChevronDown size={13} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {/* Delete button for dynamic props (outside click area) */}
          {property.isDynamic && onDelete && (
            <div className="px-4 pb-1 flex justify-end">
              <button onClick={() => { if (confirm(`Delete "${displayName}"? This cannot be undone.`)) onDelete(property.id); }}
                className="flex items-center gap-1 text-[9px] text-red-500/50 hover:text-red-400 transition-colors" title="Delete property">
                <Trash2 size={9} /> Remove
              </button>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border-t border-[rgba(255,255,255,0.05)]">
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
        </>
      )}
    </div>
  );
}

// ── AddPropertyForm ───────────────────────────────────────────────────────────

const EMPTY_ADD = { name: "", type: "Office", city: "Bristol, TN", address: "", sqft: "" };

function AddPropertyForm({ onAdd, onClose }: { onAdd: (p: typeof EMPTY_ADD) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_ADD });
  const [saving, setSaving] = useState(false);
  const s = (k: keyof typeof EMPTY_ADD) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length >= 2 && form.city.trim().length >= 2;
  const handle = async () => { setSaving(true); await onAdd(form); setSaving(false); };
  const F = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white px-3 py-2.5 outline-none focus:border-[rgba(167,139,250,0.5)] transition-colors";
  const L = "text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl border border-[rgba(167,139,250,0.2)] w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Plus size={14} className="text-[#A78BFA]" /> Add New Property
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-colors">
            <X size={12} className="text-gray-500" />
          </button>
        </div>

        <div>
          <label className={L}>Property Name *</label>
          <input value={form.name} onChange={s("name")} placeholder="e.g. Warehouse 14B" className={F} autoFocus />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={L}>Type</label>
            <select value={form.type} onChange={s("type")} className={F}>
              {["Office", "Retail", "Warehouse", "Industrial", "Mixed-Use", "Event Space", "CoWorking", "Residential", "Land", "Other"].map(t => (
                <option key={t} value={t} className="bg-gray-900">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={L}>City *</label>
            <input value={form.city} onChange={s("city")} placeholder="Bristol, TN" className={F} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={L}>Address</label>
            <input value={form.address} onChange={s("address")} placeholder="123 Main St" className={F} />
          </div>
          <div>
            <label className={L}>Sq Ft</label>
            <input value={form.sqft} onChange={s("sqft")} placeholder="5,000" className={F} />
          </div>
        </div>

        <button onClick={handle} disabled={!valid || saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${valid ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.3)] border border-[rgba(167,139,250,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-gray-700 border border-[rgba(255,255,255,0.05)] cursor-not-allowed"}`}>
          {saving ? <><Loader2 size={12} className="animate-spin" /> Adding…</> : <><Plus size={12} /> Add Property</>}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PropDetailsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [details, setDetails] = useState<PropDetail[]>([]);
  const [dynProps, setDynProps] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationSql, setMigrationSql] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showPrint, setShowPrint] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, dRes, pRes] = await Promise.all([
      fetch("/api/tenants").catch(() => null),
      fetch("/api/property-details").catch(() => null),
      fetch("/api/properties-dynamic?admin=1").catch(() => null),
    ]);
    if (tRes?.ok) { const d = await tRes.json(); if (Array.isArray(d.tenants)) setTenants(d.tenants.map(rowToTenant)); }
    if (dRes?.ok) {
      const d = await dRes.json();
      if (d.needsMigration) setMigrationSql(d.sql || "Run migration SQL in Supabase.");
      if (Array.isArray(d.details)) setDetails(d.details);
    }
    if (pRes?.ok) {
      const d = await pRes.json();
      if (Array.isArray(d.properties)) {
        setDynProps(d.properties.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          name: (p.name as string) || "Untitled",
          type: (p.type as string) || "Other",
          city: (p.city as string) || "",
          address: (p.address as string) || "",
          sqft: (p.sqft as string) || "TBD",
          isDynamic: true,
        })));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  // Merge static + dynamic properties (deduplicate by id)
  const allProperties: PropertyItem[] = useMemo(() => {
    const staticProps: PropertyItem[] = PROPERTIES.map(p => ({
      id: p.id, name: p.name, type: p.type, city: p.city, address: p.address, sqft: p.sqft,
    }));
    const staticIds = new Set(staticProps.map(p => p.id));
    const uniqueDyn = dynProps.filter(p => !staticIds.has(p.id));
    return [...staticProps, ...uniqueDyn];
  }, [dynProps]);

  const handleSave = async (propertyId: string, form: DetailForm) => {
    const res = await fetch("/api/property-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, ...form }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.error === "migration_required") { setMigrationSql(d.sql); return; }
      setTick(t => t + 1);
    }
  };

  const handleAddProperty = async (form: typeof EMPTY_ADD) => {
    const res = await fetch("/api/properties-dynamic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, published: false }),
    });
    if (res.ok) {
      setShowAdd(false);
      setTick(t => t + 1);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    // Delete from properties-dynamic (Supabase)
    await fetch(`/api/properties-dynamic?id=${id}`, { method: "DELETE" }).catch(() => null);
    setTick(t => t + 1);
  };

  const detailMap = useMemo(() =>
    Object.fromEntries(details.map(d => [d.property_id, d])), [details]);

  const totalRevenue = useMemo(() => tenants.reduce((s, t) => s + (t.monthlyRent || 0), 0), [tenants]);
  const totalExpenses = useMemo(() => details.reduce((s, d) =>
    s + d.electric_monthly + d.water_monthly + d.other_monthly + d.taxes_annual / 12 + d.insurance_annual / 12, 0), [details]);
  const alerts = useMemo(() => tenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d <= 90; }).length, [tenants]);

  const printData = useMemo(() => allProperties.map(p => ({
    property: p,
    tenants: tenants.filter(t => {
      const displayName = detailMap[p.id]?.display_name || p.name;
      return exactBuildingMatch(t.building || "", p.id, displayName);
    }),
    detail: detailMap[p.id],
  })), [allProperties, tenants, detailMap]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#A78BFA]" />
            Property Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">Occupancy, P&amp;L, and financials per property — live from Tenant data.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#4ADE80] px-3 py-2 rounded-lg border border-[rgba(74,222,128,0.25)] hover:bg-[rgba(74,222,128,0.1)] transition-all">
            <Plus size={12} /> Add Property
          </button>
          <button onClick={() => setTick(t => t + 1)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setShowPrint(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#A78BFA] px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.25)] hover:bg-[rgba(167,139,250,0.1)] transition-all">
            <Printer size={12} /> Print Report
          </button>
        </div>
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
          { icon: Building2,     label: "Properties",  value: allProperties.length,                                    color: "#A78BFA" },
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

      {alerts > 0 && (
        <a href="/admin?tab=tenants"
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-yellow-900/40 bg-yellow-950/20 text-yellow-400 text-xs hover:bg-yellow-950/40 hover:border-yellow-800/60 transition-all cursor-pointer group">
          <AlertTriangle size={14} /> <span><strong>{alerts} lease{alerts > 1 ? "s" : ""}</strong> expiring within 90 days — <span className="underline underline-offset-2 group-hover:text-yellow-300">go to Tenants tab →</span></span>
        </a>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {allProperties.map(p => (
            <PropertyCard key={p.id} property={p} tenants={tenants} detail={detailMap[p.id]} onSave={handleSave} onDelete={handleDeleteProperty} />
          ))}
        </div>
      )}

      {/* Unassigned tenants */}
      {!loading && (() => {
        const assignedIds = new Set(
          allProperties.flatMap(p => {
            const dn = detailMap[p.id]?.display_name || p.name;
            return tenants.filter(t => exactBuildingMatch(t.building || "", p.id, dn)).map(t => t.id);
          })
        );
        const unassigned = tenants.filter(t => !assignedIds.has(t.id));
        if (unassigned.length === 0) return null;
        return (
          <div className="glass rounded-2xl border border-[rgba(249,115,22,0.2)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-orange-400" />
              <h3 className="text-sm font-black text-orange-400">Unassigned Tenants ({unassigned.length})</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">These tenants don&apos;t match any property. Edit them in the Tenants tab and select the correct property from the dropdown.</p>
            <div className="space-y-1.5">
              {unassigned.map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 border border-[rgba(249,115,22,0.15)] bg-[rgba(249,115,22,0.04)]">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: "rgba(249,115,22,0.15)", color: "#F97316" }}>
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-gray-600 truncate">
                      {t.building ? `Building: "${t.building}"` : "No building set"}
                      {t.unit ? ` · Unit ${t.unit}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-orange-400 font-bold">Unassigned</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}



      {showPrint && <PrintReport data={printData} onClose={() => setShowPrint(false)} />}
      {showAdd && <AddPropertyForm onAdd={handleAddProperty} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
