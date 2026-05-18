"use client";
import React, { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Building2, DollarSign, Users, BarChart3,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import type { Tenant } from "./TenantsTab";

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

interface Props {
  tenants: Tenant[];
  details: PropDetail[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(s: string) { return s.toLowerCase().replace(/[^a-z]/g, ""); }
function buildingMatch(b: string, propName: string) {
  const nb = norm(b), np = norm(propName);
  if (!nb || !np) return false;
  const pre = Math.min(6, nb.length, np.length);
  return nb === np || nb.includes(np.slice(0, pre)) || np.includes(nb.slice(0, pre));
}
function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtK(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return v ? `$${Math.round(v)}` : "—";
}

const TREND_MAP = {
  up:     { label: "Improving", icon: TrendingUp,   color: "#4ADE80" },
  stable: { label: "Stable",    icon: Minus,        color: "#FACC15" },
  down:   { label: "Declining", icon: TrendingDown, color: "#EF4444" },
};

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

interface BarDatum {
  label: string;
  revenue: number;
  expenses: number;
}

function BarChart({ data }: { data: BarDatum[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; d: BarDatum } | null>(null);
  const H = 140, BAR_W = 14, GROUP_GAP = 28, SIDE = 48;

  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expenses]), 1);
  const totalW = SIDE + data.length * (BAR_W * 2 + GROUP_GAP) + 16;

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: H - f * H,
    label: fmtK(f * maxVal),
  }));

  return (
    <div className="relative w-full overflow-x-auto">
      <svg width={Math.max(totalW, 320)} height={H + 48} className="min-w-full">
        {/* Grid lines */}
        {yLabels.map(({ y, label }) => (
          <g key={y}>
            <line x1={SIDE} y1={y} x2={totalW} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={SIDE - 4} y={y + 4} textAnchor="end"
              fontSize={9} fill="#6b7280">{label}</text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = SIDE + i * (BAR_W * 2 + GROUP_GAP) + 8;
          const rh = (d.revenue / maxVal) * H;
          const eh = (d.expenses / maxVal) * H;

          return (
            <g key={d.label}
              onMouseEnter={e => setTip({ x: x + BAR_W, y: 10, d })}
              onMouseLeave={() => setTip(null)}
              style={{ cursor: "pointer" }}>
              {/* Revenue bar */}
              <rect x={x} y={H - rh} width={BAR_W} height={Math.max(rh, 2)}
                rx={3} fill={d.revenue > d.expenses ? "#4ADE80" : "#22c55e"}
                opacity={0.85} />
              {/* Expenses bar */}
              <rect x={x + BAR_W + 2} y={H - eh} width={BAR_W} height={Math.max(eh, 2)}
                rx={3} fill="#F97316" opacity={eh > 0 ? 0.75 : 0.15} />
              {/* X label */}
              <text x={x + BAR_W + 1} y={H + 14} textAnchor="middle"
                fontSize={8} fill="#9ca3af" className="select-none">
                {d.label.length > 8 ? d.label.slice(0, 8) + "…" : d.label}
              </text>
            </g>
          );
        })}

        {/* Y axis line */}
        <line x1={SIDE} y1={0} x2={SIDE} y2={H}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      </svg>

      {/* Tooltip */}
      {tip && (
        <div className="pointer-events-none absolute z-10 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#0f1623] shadow-xl px-3 py-2.5 text-xs"
          style={{ left: tip.x + 8, top: tip.y }}>
          <p className="font-black text-white mb-1">{tip.d.label}</p>
          <p className="text-[#4ADE80]">Revenue: ${tip.d.revenue.toLocaleString()}/mo</p>
          <p className="text-[#F97316]">Expenses: {tip.d.expenses ? `$${Math.round(tip.d.expenses).toLocaleString()}/mo` : "Not set"}</p>
          <p className="font-bold mt-0.5" style={{ color: tip.d.revenue >= tip.d.expenses ? "#4ADE80" : "#EF4444" }}>
            P&L: {tip.d.revenue >= tip.d.expenses ? "+" : ""}${Math.round(tip.d.revenue - tip.d.expenses).toLocaleString()}/mo
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 pl-12">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#4ADE80]" /> Revenue
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#F97316]" /> Expenses
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PortfolioOverviewCard({ tenants, details }: Props) {
  const detailMap = useMemo(() =>
    Object.fromEntries(details.map(d => [d.property_id, d])), [details]);

  // Per-property derived data
  const propData = useMemo(() => PROPERTIES.map(p => {
    const pts = tenants.filter(t => buildingMatch(t.building || "", p.name));
    const d = detailMap[p.id];
    const revenue = pts.reduce((s, t) => s + (t.monthlyRent || 0), 0);
    const taxMo = (d?.taxes_annual || 0) / 12;
    const insMo = (d?.insurance_annual || 0) / 12;
    const expenses = taxMo + insMo + (d?.electric_monthly || 0) + (d?.water_monthly || 0) + (d?.other_monthly || 0);
    const totalUnits = d?.total_units || pts.length || 1;
    const occupancy = Math.min(100, Math.round((pts.length / totalUnits) * 100));
    const alerts = pts.filter(t => {
      const days = daysUntil(t.leaseEnd || t.renewalDate);
      return days !== null && days <= 90;
    }).length;
    return { property: p, pts, revenue, expenses, profit: revenue - expenses, occupancy, alerts, trend: (d?.trend || "stable") as "up" | "stable" | "down" };
  }), [tenants, detailMap]);

  // Portfolio KPIs
  const totalRevenue  = propData.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = propData.reduce((s, p) => s + p.expenses, 0);
  const netPL         = totalRevenue - totalExpenses;
  const totalTenants  = tenants.length;
  const avgOccupancy  = Math.round(propData.reduce((s, p) => s + p.occupancy, 0) / Math.max(propData.length, 1));
  const totalAlerts   = propData.reduce((s, p) => s + p.alerts, 0);

  const kpis = [
    { label: "Portfolio Revenue",  value: `$${totalRevenue.toLocaleString()}/mo`,  color: "#4ADE80", icon: DollarSign  },
    { label: "Total Expenses",     value: totalExpenses ? `$${Math.round(totalExpenses).toLocaleString()}/mo` : "Not set", color: "#F97316", icon: BarChart3   },
    { label: "Net P&L",            value: totalExpenses ? `${netPL >= 0 ? "+" : ""}$${Math.round(netPL).toLocaleString()}/mo` : "—", color: netPL >= 0 ? "#4ADE80" : "#EF4444", icon: TrendingUp  },
    { label: "Avg Occupancy",      value: `${avgOccupancy}%`,                       color: avgOccupancy >= 80 ? "#4ADE80" : avgOccupancy >= 50 ? "#FACC15" : "#EF4444", icon: Building2  },
    { label: "Active Tenants",     value: totalTenants,                             color: "#60A5FA", icon: Users       },
  ];

  const chartData: BarDatum[] = propData.map(p => ({
    label: p.property.name.split(" ")[0], // first word as short label
    revenue: p.revenue,
    expenses: p.expenses,
  }));

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <BarChart3 size={17} className="text-[#A78BFA]" /> Executive Overview
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Portfolio-wide snapshot · live data</p>
        </div>
        {totalAlerts > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-950/30 border border-yellow-900/40 px-3 py-1.5 rounded-full">
            <AlertTriangle size={11} /> {totalAlerts} lease alert{totalAlerts > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[rgba(255,255,255,0.04)]">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center justify-center py-5 px-3 bg-[#080C14] text-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-base font-black text-white leading-none">{value}</p>
            <p className="text-[10px] text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="px-6 pt-5 pb-4 border-t border-[rgba(255,255,255,0.04)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-4">Revenue vs Expenses by Property</p>
        <BarChart data={chartData} />
      </div>

      {/* Property Health Strip */}
      <div className="border-t border-[rgba(255,255,255,0.04)] px-6 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Property Health</p>
        <div className="space-y-2.5">
          {propData.map(({ property, occupancy, profit, trend, alerts, expenses }) => {
            const trendCfg = TREND_MAP[trend];
            const TrendIcon = trendCfg.icon;
            const occColor = occupancy >= 80 ? "#4ADE80" : occupancy >= 40 ? "#FACC15" : "#EF4444";

            return (
              <div key={property.id} className="flex items-center gap-3">
                {/* Name + trend */}
                <div className="w-40 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                  <TrendIcon size={10} style={{ color: trendCfg.color, flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-white truncate">{property.name}</span>
                </div>

                {/* Occupancy bar */}
                <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${occupancy}%`, background: occColor }} />
                </div>

                {/* Occ % */}
                <span className="w-9 text-right text-[10px] font-bold flex-shrink-0" style={{ color: occColor }}>
                  {occupancy}%
                </span>

                {/* P&L chip */}
                <span className="w-24 text-right text-[10px] font-bold flex-shrink-0"
                  style={{ color: expenses === 0 ? "#6b7280" : profit >= 0 ? "#4ADE80" : "#EF4444" }}>
                  {expenses === 0 ? "No data" : `${profit >= 0 ? "+" : ""}${fmtK(profit)}/mo`}
                </span>

                {/* Alert badge */}
                {alerts > 0 ? (
                  <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-yellow-400">
                    <AlertTriangle size={9} />{alerts}
                  </span>
                ) : (
                  <span className="w-5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
