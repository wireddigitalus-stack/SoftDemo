"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Building2, Users, DollarSign, TrendingUp, AlertTriangle,
  Clock, CheckCircle2, Home, Loader2, RefreshCw,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import type { Tenant } from "./TenantsTab";

// ── helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function pct(num: number, denom: number) {
  if (!denom) return 0;
  return Math.round((num / denom) * 100);
}

// ── OccupancyRing ─────────────────────────────────────────────────────────────

function OccupancyRing({ value, color }: { value: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <circle
        cx={36} cy={36} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={36} y={41} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">
        {value}%
      </text>
    </svg>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
      style={{ background: `${color}08`, borderColor: `${color}20` }}>
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={11} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-600 leading-none mb-0.5">{label}</p>
        <p className="text-xs font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

// ── PropertyCard ─────────────────────────────────────────────────────────────

function PropertyCard({ property, tenants }: {
  property: typeof PROPERTIES[number];
  tenants: Tenant[];
}) {
  // Tenants for this property — match on building name (case-insensitive partial)
  const propTenants = tenants.filter(t =>
    t.building?.toLowerCase().includes(property.name.toLowerCase()) ||
    property.name.toLowerCase().includes(t.building?.toLowerCase() || "___")
  );

  const totalUnits = propTenants.length > 0 ? Math.max(propTenants.length, 1) : null;
  const rented = propTenants.length;
  const monthlyRevenue = propTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);

  // Lease health
  const expiring = propTenants.filter(t => {
    const days = daysUntil(t.leaseEnd || t.renewalDate);
    return days !== null && days >= 0 && days <= 90;
  });
  const expired = propTenants.filter(t => {
    const days = daysUntil(t.leaseEnd || t.renewalDate);
    return days !== null && days < 0;
  });

  const occupancyColor =
    rented === 0 ? "#6B7280"
    : rented >= (totalUnits ?? 1) ? "#4ADE80"
    : rented > 0 ? "#FACC15"
    : "#EF4444";

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-[rgba(255,255,255,0.05)]">
        <OccupancyRing value={totalUnits ? pct(rented, totalUnits) : 0} color={occupancyColor} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-white leading-tight truncate">{property.name}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{property.city} · {property.type}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${occupancyColor}18`,
                color: occupancyColor,
                border: `1px solid ${occupancyColor}30`,
              }}>
              {rented === 0 ? "Vacant" : rented === totalUnits ? "Full" : "Partial"}
            </span>
            <span className="text-[10px] text-gray-600">{property.status}</span>
          </div>
        </div>
        {monthlyRevenue > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-600 mb-0.5">Monthly Revenue</p>
            <p className="text-base font-black text-[#4ADE80]">
              ${monthlyRevenue.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
        <StatPill icon={Users}       label="Tenants"        value={rented}                          color="#60A5FA" />
        <StatPill icon={Home}        label="Sq Ft"          value={property.sqft}                   color="#A78BFA" />
        <StatPill icon={DollarSign}  label="Avg Rent"       value={rented ? `$${Math.round(monthlyRevenue / rented).toLocaleString()}` : "—"} color="#4ADE80" />
        {expiring.length > 0 && (
          <StatPill icon={Clock} label="Expiring Soon" value={`${expiring.length} lease${expiring.length > 1 ? "s" : ""}`} color="#FACC15" />
        )}
        {expired.length > 0 && (
          <StatPill icon={AlertTriangle} label="Expired" value={`${expired.length} lease${expired.length > 1 ? "s" : ""}`} color="#EF4444" />
        )}
        {rented === 0 && (
          <StatPill icon={TrendingUp} label="Status" value="Available to Lease" color="#4ADE80" />
        )}
      </div>

      {/* Tenant list (if any) */}
      {propTenants.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.04)] px-4 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-3 mb-2">Tenants</p>
          <div className="space-y-1.5">
            {propTenants.map(t => {
              const days = daysUntil(t.leaseEnd || t.renewalDate);
              const isExpired = days !== null && days < 0;
              const isExpiring = days !== null && days >= 0 && days <= 90;
              return (
                <div key={t.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 border"
                  style={{
                    background: isExpired ? "rgba(239,68,68,0.04)" : isExpiring ? "rgba(250,204,21,0.04)" : "rgba(255,255,255,0.02)",
                    borderColor: isExpired ? "rgba(239,68,68,0.15)" : isExpiring ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)",
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}>
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-gray-600 truncate">
                      {t.unit ? `Unit ${t.unit} · ` : ""}{t.monthlyRent ? `$${t.monthlyRent.toLocaleString()}/mo` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isExpired ? (
                      <span className="text-[10px] font-bold text-red-400">Expired</span>
                    ) : isExpiring ? (
                      <span className="text-[10px] font-bold text-yellow-400">{days}d left</span>
                    ) : days !== null ? (
                      <span className="text-[10px] text-gray-600">{days}d</span>
                    ) : (
                      <CheckCircle2 size={12} className="text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {propTenants.length === 0 && (
        <div className="px-4 pb-4 flex items-center gap-2 text-gray-700 text-xs mt-1">
          <Building2 size={12} /> No tenants linked to this property yet
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PropDetailsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (Array.isArray(data.tenants)) setTenants(data.tenants);
    } catch {/* silent */} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, [lastRefresh]);

  // Portfolio-level summary stats
  const totalRevenue = useMemo(() => tenants.reduce((s, t) => s + (t.monthlyRent || 0), 0), [tenants]);
  const expiringCount = useMemo(() => tenants.filter(t => {
    const d = daysUntil(t.leaseEnd || t.renewalDate);
    return d !== null && d >= 0 && d <= 90;
  }).length, [tenants]);
  const expiredCount = useMemo(() => tenants.filter(t => {
    const d = daysUntil(t.leaseEnd || t.renewalDate);
    return d !== null && d < 0;
  }).length, [tenants]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-5 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#60A5FA]" />
            Property Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Live occupancy &amp; tenant stats per property — updates when Tenants tab changes.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); setLastRefresh(Date.now()); }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Portfolio summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Building2,     label: "Properties",     value: PROPERTIES.length,             color: "#60A5FA" },
          { icon: Users,         label: "Active Tenants", value: tenants.length,                color: "#4ADE80" },
          { icon: DollarSign,    label: "Total Revenue",  value: `$${totalRevenue.toLocaleString()}/mo`, color: "#FACC15" },
          { icon: AlertTriangle, label: "Lease Alerts",   value: expiringCount + expiredCount,  color: expiredCount > 0 ? "#EF4444" : expiringCount > 0 ? "#FACC15" : "#4ADE80" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-[rgba(255,255,255,0.06)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-gray-600">{label}</p>
              <p className="text-sm font-black text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-property cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-[#60A5FA]" />
          <span className="ml-3 text-sm text-gray-500">Loading tenant data…</span>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PROPERTIES.map(p => (
            <PropertyCard key={p.id} property={p} tenants={tenants} />
          ))}
        </div>
      )}

      {/* Phase 2 teaser */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] text-gray-600 text-xs">
        <TrendingUp size={14} />
        <span><strong className="text-gray-400">Phase 2 coming:</strong> Per-property financials — taxes, utilities, insurance, and profit/loss tracking.</span>
      </div>
    </div>
  );
}
