"use client";
import React, { useState, useId } from "react";
import {
  ArrowRight, DollarSign, Users, Wrench, Sparkles,
  Building2, TrendingUp, Coins, FileCheck, Brush,
  UserCheck, BarChart3, ShieldCheck
} from "lucide-react";

// ── Domain definitions ────────────────────────────────────────────────────────

interface Domain {
  id: string;
  label: string;
  color: string;
  emoji: string;
}

const DOMAINS: Domain[] = [
  { id: "leads",      label: "Leads & AI Integration", color: "#4ADE80", emoji: "🟢" },
  { id: "leasing",    label: "Leasing & Revenue Flow", color: "#60A5FA", emoji: "🔵" },
  { id: "maintenance",label: "Maintenance & Repairs",  color: "#EF4444", emoji: "🔴" },
  { id: "cleaning",   label: "Cleaning & Turnover",    color: "#FACC15", emoji: "🟡" },
  { id: "investor",   label: "Returns & NOI",          color: "#F97316", emoji: "🟠" },
];

// ── Node definitions ──────────────────────────────────────────────────────────

type NodeType = "actor" | "operation" | "financial" | "outcome";

interface FlowNode {
  id: string;
  label: string;
  type: NodeType;
  domain: string;
  x: number;
  y: number;
  sub?: string;
}

// viewBox = 1320 x 780
const NODES: FlowNode[] = [
  // ─── Column 1: Actors & Input (x=60) ─────────────────────────────────────────
  { id: "act-lead",    label: "Prospective Tenant",   type: "actor",     domain: "leads",       x: 60,  y: 100, sub: "submits lead via bot" },
  { id: "act-tenant",  label: "Active Tenants",       type: "actor",     domain: "leasing",     x: 60,  y: 260, sub: "commercial & residential" },
  { id: "act-staff",   label: "Maintenance & Cleaning",type: "actor",    domain: "maintenance", x: 60,  y: 420, sub: "operational field staff" },
  { id: "act-owner",   label: "J. Alex Harrison (Owner)",type: "actor",   domain: "investor",    x: 60,  y: 580, sub: "stewardship & investment" },

  // ─── Column 2: Operations & Events (x=370) ───────────────────────────────────
  { id: "op-chatbot",   label: "AI Lease-Bot Parsing",  type: "operation", domain: "leads",       x: 370, y: 70,  sub: "scores budgets & timelines" },
  { id: "op-lease",     label: "Lease Contract",        type: "operation", domain: "leasing",     x: 370, y: 230, sub: "defines rent, deposit & NNN" },
  { id: "op-ticket",    label: "Maintenance Ticket",    type: "operation", domain: "maintenance", x: 370, y: 390, sub: "priority 1-4 response check" },
  { id: "op-cleanup",   label: "Unit Cleaning prep",    type: "operation", domain: "cleaning",    x: 370, y: 550, sub: "move-in / move-out prep" },

  // ─── Column 3: Financial Transactions (x=710) ────────────────────────────────
  { id: "fin-escrow",   label: "Security Deposits",     type: "financial", domain: "leasing",     x: 710, y: 150, sub: "refundable escrow account" },
  { id: "fin-rent",     label: "Monthly Rent + Fees",   type: "financial", domain: "leasing",     x: 710, y: 270, sub: "includes NNN, CAM, utility" },
  { id: "fin-expense",  label: "Repair & Materials Cost",type: "financial",domain: "maintenance", x: 710, y: 390, sub: "invoice cost vs tenant rent" },
  { id: "fin-clean-cost",label: "Housekeeping Labor Cost",type: "financial",domain: "cleaning",    x: 710, y: 510, sub: "hourly cleaning overhead" },

  // ─── Column 4: Assets & Outcomes (x=1060) ───────────────────────────────────
  { id: "out-occupancy", label: "Occupancy Rate %",     type: "outcome",   domain: "leads",       x: 1060,y: 110, sub: "optimized by quick lease-up" },
  { id: "out-noi",       label: "Net Operating Income",  type: "outcome",   domain: "investor",    x: 1060,y: 270, sub: "Rent minus operational cost" },
  { id: "out-portfolio", label: "Historic Stewardship",  type: "outcome",   domain: "investor",    x: 1060,y: 430, sub: "Bristol TN/VA portfolio value" },
  { id: "out-brief",     label: "AI Market Report",     type: "outcome",   domain: "leads",       x: 1060,y: 590, sub: "Gemini analytics digest" }
];

// ── Connections ───────────────────────────────────────────────────────────────

interface Connection {
  from: string;
  to: string;
  domain: string;
}

const CONNECTIONS: Connection[] = [
  // Leads Flow
  { from: "act-lead",     to: "op-chatbot",     domain: "leads" },
  { from: "op-chatbot",   to: "op-lease",       domain: "leads" },
  { from: "op-chatbot",   to: "out-brief",      domain: "leads" },
  { from: "out-brief",    to: "act-owner",      domain: "leads" },

  // Leasing and Deposits
  { from: "op-lease",     to: "fin-escrow",     domain: "leasing" },
  { from: "op-lease",     to: "fin-rent",       domain: "leasing" },
  { from: "act-tenant",   to: "fin-rent",       domain: "leasing" },
  { from: "fin-rent",     to: "out-noi",        domain: "leasing" },
  { from: "fin-escrow",   to: "out-noi",        domain: "leasing" },

  // Maintenance Tickets
  { from: "act-tenant",   to: "op-ticket",      domain: "maintenance" },
  { from: "op-ticket",    to: "fin-expense",    domain: "maintenance" },
  { from: "act-staff",    to: "op-ticket",      domain: "maintenance" },
  { from: "fin-expense",  to: "out-noi",        domain: "maintenance" },

  // Cleaning Work Orders
  { from: "op-lease",     to: "op-cleanup",     domain: "cleaning" }, // turnover trigger
  { from: "act-staff",    to: "op-cleanup",     domain: "cleaning" },
  { from: "op-cleanup",   to: "fin-clean-cost", domain: "cleaning" },
  { from: "fin-clean-cost",to: "out-noi",       domain: "cleaning" },

  // Outcomes to Owner & Stewardship
  { from: "out-occupancy", to: "act-owner",     domain: "investor" },
  { from: "out-noi",       to: "act-owner",     domain: "investor" },
  { from: "out-portfolio", to: "act-owner",     domain: "investor" },
  { from: "op-lease",      to: "out-occupancy", domain: "leasing" },
  { from: "out-noi",       to: "out-portfolio", domain: "investor" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const NODE_W = 190;
const NODE_H = 52;

function nodeCenter(n: FlowNode): { cx: number; cy: number } {
  return { cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2 };
}

function domainColor(id: string): string {
  return DOMAINS.find(d => d.id === id)?.color || "#94A3B8";
}

function nodeIcon(type: NodeType) {
  switch (type) {
    case "actor":       return Users;
    case "operation":   return FileCheck;
    case "financial":   return Coins;
    case "outcome":     return TrendingUp;
  }
}

// Smooth bezier path between two nodes
function pathD(from: FlowNode, to: FlowNode): string {
  const { cx: x1, cy: y1 } = nodeCenter(from);
  const { cx: x2, cy: y2 } = nodeCenter(to);
  const dx = Math.abs(x2 - x1);

  if (dx < 50) {
    const exitX = from.x - 10;
    const entryX = to.x - 10;
    const arcX = from.x - 80;
    const midY = (y1 + y2) / 2;
    return `M${exitX},${y1} C${arcX},${y1} ${arcX},${midY} ${arcX},${midY} S${arcX},${y2} ${entryX},${y2}`;
  }

  // Right-to-left feedback loop back to Alex Harrison (Owner)
  if (from.x > to.x && to.id === "act-owner") {
    let index = 0;
    if (from.id === "out-noi") index = 1;
    if (from.id === "out-portfolio") index = 2;
    if (from.id === "out-brief") index = 3;

    const startX = from.x + NODE_W;
    const startY = from.y + NODE_H / 2;
    const endX = to.x;
    const endY = to.y + 12 + index * 8; // Spaced out on the left side of the owner card

    const channelX = 1275 + index * 7;
    const bottomY = 650 + index * 7;
    const leftChannelX = 35 - index * 7;
    const r = 10;

    return `M${startX},${startY} ` +
           `L${channelX - r},${startY} ` +
           `Q${channelX},${startY} ${channelX},${startY + r} ` +
           `L${channelX},${bottomY - r} ` +
           `Q${channelX},${bottomY} ${channelX - r},${bottomY} ` +
           `L${leftChannelX + r},${bottomY} ` +
           `Q${leftChannelX},${bottomY} ${leftChannelX},${bottomY - r} ` +
           `L${leftChannelX},${endY + r} ` +
           `Q${leftChannelX},${endY} ${leftChannelX + r},${endY} ` +
           `L${endX},${endY}`;
  }

  const cp = Math.max(dx * 0.45, 60);
  return `M${x1 + NODE_W / 2},${y1} C${x1 + NODE_W / 2 + cp},${y1} ${x2 - NODE_W / 2 - cp},${y2} ${x2 - NODE_W / 2},${y2}`;
}

// ── FlowPath ──────────────────────────────────────────────────────────────────

function FlowPath({ from, to, color, active, pathId }: {
  from: FlowNode; to: FlowNode; color: string; active: boolean; pathId: string;
}) {
  const d = pathD(from, to);
  const dur = 4;
  const dotDelays = [0, dur / 3, (dur * 2) / 3];
  const dotSizes = [2.8, 3.2, 2.5];

  return (
    <g style={{ opacity: active ? 1 : 0.06, transition: "opacity 0.5s ease" }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2.5 : 1.5}
        strokeOpacity={active ? 0.3 : 0.12}
        style={active ? { filter: `drop-shadow(0 0 6px ${color}60)` } : undefined}
      />
      <path
        id={pathId}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={active ? 1.5 : 0.8}
        strokeOpacity={active ? 0.6 : 0.25}
        strokeDasharray={active ? "none" : "4 4"}
      />
      {active && dotDelays.map((delay, i) => (
        <circle key={i} r={dotSizes[i]} fill={color} opacity="0.85" style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.42 0 0.58 1"
          >
            <mpath href={`#${pathId}`} xlinkHref={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  );
}

// ── GlassNode ─────────────────────────────────────────────────────────────────

function GlassNode({ node, active }: { node: FlowNode; active: boolean }) {
  const color = domainColor(node.domain);
  const Icon = nodeIcon(node.type);

  // Custom node icons for better semantics
  const customIcons: Record<string, React.ElementType> = {
    "act-owner": UserCheck,
    "op-chatbot": Sparkles,
    "op-cleanup": Brush,
    "op-ticket": Wrench,
    "fin-rent": DollarSign,
    "out-portfolio": Building2,
    "out-noi": Coins,
    "out-occupancy": BarChart3,
    "out-brief": ShieldCheck
  };
  const ResolvedIcon = customIcons[node.id] || Icon;

  return (
    <foreignObject x={node.x} y={node.y} width={NODE_W} height={NODE_H}
      style={{ opacity: active ? 1 : 0.12, transition: "opacity 0.5s ease" }}
    >
      <div
        style={{
          width: NODE_W,
          height: NODE_H,
          background: active
            ? `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${active ? color + "40" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 12,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: active ? `0 0 16px ${color}18, inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
          backdropFilter: "blur(8px)",
          cursor: "default",
        }}
      >
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <ResolvedIcon size={11} style={{ color }} />
        </div>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <p style={{
            fontSize: 10,
            fontWeight: 900,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            fontFamily: "inherit",
          }}>
            {node.label}
          </p>
          {node.sub && (
            <p style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.35)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
              marginTop: 1,
              fontFamily: "inherit",
            }}>
              {node.sub}
            </p>
          )}
        </div>
      </div>
    </foreignObject>
  );
}

// ── Column Headers ────────────────────────────────────────────────────────────

function ColumnHeader({ x, label, icon: Icon }: { x: number; label: string; icon: React.ElementType }) {
  return (
    <foreignObject x={x} y={10} width={NODE_W} height={30}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingLeft: 4,
      }}>
        <Icon size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
        <span style={{
          fontSize: 9,
          fontWeight: 900,
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          fontFamily: "inherit",
        }}>
          {label}
        </span>
      </div>
    </foreignObject>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RealEstateOperationsMap() {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const uid = useId().replace(/:/g, "");

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  const isActive = (domain: string) => !activeDomain || activeDomain === domain;

  const activeNodeIds = new Set<string>();
  if (activeDomain) {
    CONNECTIONS.filter(c => c.domain === activeDomain).forEach(c => {
      activeNodeIds.add(c.from);
      activeNodeIds.add(c.to);
    });
  }
  const isNodeActive = (node: FlowNode) => {
    if (!activeDomain) return true;
    return node.domain === activeDomain || activeNodeIds.has(node.id);
  };

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveDomain(null)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
            !activeDomain
              ? "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-white"
              : "bg-transparent border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.15)]"
          }`}
        >
          All Flows
        </button>
        {DOMAINS.map(d => (
          <button
            key={d.id}
            onClick={() => setActiveDomain(activeDomain === d.id ? null : d.id)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border"
            style={{
              background: activeDomain === d.id ? `${d.color}18` : "transparent",
              borderColor: activeDomain === d.id ? `${d.color}50` : "rgba(255,255,255,0.06)",
              color: activeDomain === d.id ? d.color : "rgba(255,255,255,0.4)",
              boxShadow: activeDomain === d.id ? `0 0 12px ${d.color}20` : "none",
            }}
          >
            {d.emoji} {d.label}
          </button>
        ))}
      </div>

      {/* Flow direction indicator */}
      <div className="flex items-center gap-2 text-[9px] text-gray-600 px-1">
        <span>Operational and cash flows left → right</span>
        <ArrowRight size={10} />
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          Animated dots show flow direction
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] overflow-x-auto"
        style={{ backdropFilter: "blur(12px)" }}
      >
        <svg
          viewBox="0 0 1320 680"
          className="w-full"
          style={{ minWidth: 900, minHeight: 400 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid background */}
          <defs>
            <pattern id={`op-grid-${uid}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.6" fill="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#op-grid-${uid})`} />

          {/* Column headers */}
          <ColumnHeader x={60} label="Actors" icon={Users} />
          <ColumnHeader x={370} label="Contracts & Work" icon={FileCheck} />
          <ColumnHeader x={710} label="Financial Flow" icon={Coins} />
          <ColumnHeader x={1060} label="Assets & NOI" icon={TrendingUp} />

          {/* Separators */}
          {[290, 640, 990].map(x => (
            <line key={x} x1={x} y1={40} x2={x} y2={640} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
          ))}

          {/* Connections */}
          {CONNECTIONS.map((conn, i) => {
            const from = nodeMap[conn.from];
            const to = nodeMap[conn.to];
            if (!from || !to) return null;
            return (
              <FlowPath
                key={i}
                from={from}
                to={to}
                color={domainColor(conn.domain)}
                active={isActive(conn.domain)}
                pathId={`op-path-${uid}-${i}`}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map(node => (
            <GlassNode key={node.id} node={node} active={isNodeActive(node)} />
          ))}
        </svg>
      </div>

      {/* Stats footer */}
      <div className="flex flex-wrap gap-4 text-[10px] text-gray-600 px-1">
        <span>Rent payments</span>
        <span>·</span>
        <span>Escrow accounts</span>
        <span>·</span>
        <span>Maintenance ticket costs</span>
        <span>·</span>
        <span>Overhead cleaning calculations</span>
        <span>·</span>
        <span className="text-gray-500 italic">Financial logic simulated locally in mock-db.json</span>
      </div>
    </div>
  );
}
