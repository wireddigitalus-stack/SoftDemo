"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Wrench, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Loader2, Plus, X, Send, ArrowLeft, Building2, Flame,
  MessageSquare, Package,
} from "lucide-react";
import CompletionSheet from "@/components/crew/CompletionSheet";


// ─── Types ───────────────────────────────────────────────────────────────────

interface Ticket {
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
  estimatedHours: number;
  scheduledDate: string | null;
  notes: string;
  createdAt: string;
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: string }> = {
  1: { label: "EMERGENCY", color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.5)", icon: "🔴" },
  2: { label: "URGENT",    color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.45)", icon: "🟠" },
  3: { label: "SCHEDULED", color: "#FACC15", bg: "rgba(250,204,21,0.1)",  border: "rgba(250,204,21,0.35)", icon: "🟡" },
  4: { label: "COSMETIC",  color: "#4ADE80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.3)", icon: "🟢" },
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
    estimatedHours: Number(r.estimated_hours) || 0,
    scheduledDate: (r.scheduled_date as string) || null,
    notes: (r.notes as string) || "",
    createdAt: (r.created_at as string) || new Date().toISOString(),
  };
}

// ─── Report New Issue Modal ───────────────────────────────────────────────────

const CATEGORIES = ["HVAC", "Plumbing", "Electrical", "Door/Lock", "Appliance", "Structural", "Damage", "Other"];

function ReportModal({ workerName, onClose, onSubmit }: { workerName: string; onClose: () => void; onSubmit: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(3);
  const [building, setBuilding] = useState("");
  const [unit, setUnit] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, category, priority, building, unit,
        description: desc, reportedBy: workerName, status: "open", source: "staff",
      }),
    });
    setSaving(false);
    onSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-[#0D1117] border-t border-[rgba(250,204,21,0.25)] rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-white">Report New Issue</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center"><X size={18} /></button>
        </div>

        {/* Priority */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Priority</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {([1, 2, 3, 4] as const).map(p => {
            const cfg = PRIORITY_CONFIG[p];
            return (
              <button key={p} onClick={() => setPriority(p)}
                className="flex items-center gap-2 px-4 py-3.5 rounded-2xl border text-sm font-bold transition-all"
                style={{
                  backgroundColor: priority === p ? cfg.bg : "rgba(255,255,255,0.03)",
                  borderColor: priority === p ? cfg.border : "rgba(255,255,255,0.08)",
                  color: priority === p ? cfg.color : "#6B7280",
                }}>
                <span className="text-xl">{cfg.icon}</span> {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Issue */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">What&apos;s the issue? *</p>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. HVAC not cooling in Suite 301"
          className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3.5 text-base text-white outline-none focus:border-[rgba(250,204,21,0.5)] mb-4 placeholder:text-gray-600" />

        {/* Category */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${category === c ? "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.4)] text-[#FACC15]" : "border-[rgba(255,255,255,0.08)] text-gray-500"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Building</p>
            <input value={building} onChange={e => setBuilding(e.target.value)} placeholder="The Executive"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)] placeholder:text-gray-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Unit / Suite</p>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="301"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)] placeholder:text-gray-600" />
          </div>
        </div>

        {/* Details */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Details (optional)</p>
        <textarea spellCheck={true} value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Any extra details…"
          className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)] placeholder:text-gray-600 resize-none mb-6" />

        <button onClick={submit} disabled={saving || !title.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-base font-black flex items-center justify-center gap-2 disabled:opacity-40">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {saving ? "Submitting…" : "Submit Issue"}
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Card (field view) ─────────────────────────────────────────────────

function FieldTicketCard({
  ticket, onUpdate,
}: {
  ticket: Ticket;
  onUpdate: (id: string, status: Ticket["status"], meta?: { notes?: string; minutes?: number }) => Promise<void>;
}) {
  const [expanding, setExpanding] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<"complete" | "parts">("complete");
  const p = PRIORITY_CONFIG[ticket.priority];
  const isComplete = ticket.status === "complete";
  const isInProgress = ticket.status === "in_progress";
  const needsParts = ticket.status === "scheduled" && ticket.notes?.includes("[PARTS NEEDED]");

  const openComplete = () => { setSheetMode("complete"); setShowSheet(true); };
  const openParts = () => { setSheetMode("parts"); setShowSheet(true); };

  const handleSheetSubmit = async (data: { notes: string; minutes?: number }) => {
    if (sheetMode === "complete") {
      await onUpdate(ticket.id, ticket.status === "open" || ticket.status === "scheduled" ? "in_progress" : "complete", data);
    } else {
      // Flag as needing parts — set status back to scheduled with a note prefix
      await onUpdate(ticket.id, "scheduled", { notes: `[PARTS NEEDED] ${data.notes}`.trim() });
    }
    setShowSheet(false);
  };

  const advance = async () => {
    if (isComplete) return;
    if (ticket.status === "open" || ticket.status === "scheduled") {
      // Start work — no sheet needed
      await onUpdate(ticket.id, "in_progress");
    } else {
      // Mark complete — open sheet
      openComplete();
    }
  };

  const nextLabel = ticket.status === "open" || ticket.status === "scheduled"
    ? "🚀 Start Work"
    : ticket.status === "in_progress"
    ? "✅ Mark Done"
    : "";

  return (
    <>
      <div className={`rounded-3xl border p-5 transition-all ${isComplete ? "opacity-50 border-[rgba(74,222,128,0.2)]" : ""}`}
        style={{ backgroundColor: p.bg, borderColor: p.border }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{p.icon}</span>
          <div>
            <span className="text-xs font-black tracking-widest" style={{ color: p.color }}>{p.label}</span>
            <span className="text-xs text-gray-600 ml-2">{ticket.category}</span>
          </div>
          {isComplete && <CheckCircle2 size={18} className="text-[#4ADE80] ml-auto" />}
          {needsParts && <Package size={16} className="text-orange-400 ml-auto" />}
        </div>

        <h3 className="text-white font-bold text-lg leading-snug mb-2">{ticket.title}</h3>

        {(ticket.building || ticket.unit) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
            <Building2 size={13} />
            {[ticket.building, ticket.unit].filter(Boolean).join(" · ")}
          </div>
        )}

        {ticket.scheduledDate && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <Clock size={13} /> Scheduled {fmtDate(ticket.scheduledDate)}
          </div>
        )}

        {ticket.description && (
          <button onClick={() => setExpanding(e => !e)} className="text-xs text-gray-500 mb-3 flex items-center gap-1 text-left">
            {expanding ? ticket.description : ticket.description.slice(0, 80) + (ticket.description.length > 80 ? "…" : "")}
          </button>
        )}

        {ticket.notes && !ticket.notes.startsWith("[PARTS NEEDED]") && (
          <div className="text-xs text-gray-500 bg-[rgba(255,255,255,0.04)] rounded-xl px-3 py-2 mb-3 italic">
            {ticket.notes}
          </div>
        )}
        {needsParts && (
          <div className="text-xs text-orange-400 bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.3)] rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <Package size={12} /> Parts needed — {ticket.notes.replace("[PARTS NEEDED]", "").trim() || "awaiting parts"}
          </div>
        )}

        {!isComplete && (
          <div className="flex gap-2 mt-2">
            {/* Primary advance button */}
            <button onClick={advance}
              className="flex-1 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: p.color, color: ticket.priority <= 2 ? "#fff" : "#000" }}>
              <ChevronRight size={18} />
              {nextLabel}
            </button>

            {/* Add note / need parts */}
            {isInProgress && (
              <button onClick={openParts}
                title="Flag parts needed"
                className="w-14 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.35)" }}>
                <Package size={18} className="text-orange-400" />
              </button>
            )}
            <button onClick={() => { setSheetMode("complete"); setShowSheet(true); }}
              title="Add comment"
              className="w-14 rounded-2xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <MessageSquare size={18} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>

      <CompletionSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        onSubmit={handleSheetSubmit}
        showTime={sheetMode === "complete" && isInProgress}
        accentColor={sheetMode === "parts" ? "#F97316" : p.color}
        title={sheetMode === "parts" ? "🔧 Flag Parts Needed" : isInProgress ? "✅ Mark Job Done" : "📝 Add Note"}
        subtitle={ticket.title}
        submitLabel={sheetMode === "parts" ? "⚙️ Flag — Awaiting Parts" : isInProgress ? "✅ Complete Job" : "💾 Save Note"}
      />
    </>
  );
}

// ─── PIN Keypad ───────────────────────────────────────────────────────────────

function PinKeypad({ onAuth }: { onAuth: (name: string) => void }) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [welcome, setWelcome] = useState("");

  const handleDigit = (d: string) => {
    if (digits.length >= 6) return;
    const next = digits + d;
    setDigits(next);
    setError("");
    if (next.length === 6) submitPin(next);
  };

  const handleBackspace = () => {
    setDigits(d => d.slice(0, -1));
    setError("");
  };

  const submitPin = async (pin: string) => {
    setChecking(true);
    try {
      const res = await fetch("/api/staff-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWelcome(data.name);
        setTimeout(() => onAuth(data.name), 1200);
      } else {
        setShake(true);
        setError("Invalid PIN");
        setDigits("");
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("Network error");
      setDigits("");
    } finally {
      setChecking(false);
    }
  };

  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  // Welcome state
  if (welcome) {
    return (
      <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center mb-6 animate-bounce">
          <Wrench size={36} className="text-black" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Welcome, {welcome}!</h1>
        <p className="text-gray-500">Loading your portal…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center mb-6">
        <Wrench size={28} className="text-black" />
      </div>
      <h1 className="text-3xl font-black text-white text-center mb-1">Maintenance Portal</h1>
      <p className="text-gray-500 text-center mb-8">Enter your 6-digit PIN</p>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-8 ${shake ? "animate-shake" : ""}`}
        style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              backgroundColor: i < digits.length ? "#FACC15" : "rgba(255,255,255,0.1)",
              boxShadow: i < digits.length ? "0 0 12px rgba(250,204,21,0.4)" : "none",
              transform: i < digits.length ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm font-bold mb-4 animate-pulse">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "⌫") {
            return (
              <button key={i} onClick={handleBackspace} disabled={checking || digits.length === 0}
                className="h-16 rounded-2xl flex items-center justify-center text-2xl text-gray-500 active:bg-[rgba(255,255,255,0.05)] transition-all disabled:opacity-30">
                <ArrowLeft size={24} />
              </button>
            );
          }
          return (
            <button key={i} onClick={() => handleDigit(k)} disabled={checking}
              className="h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white active:scale-90 transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
              {k}
            </button>
          );
        })}
      </div>

      {checking && (
        <div className="mt-6 flex items-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Verifying…</span>
        </div>
      )}

      {/* Shake keyframe */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaintenanceStaffPage() {
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAll, setShowAll] = useState(true); // default to All Open
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vision_staff_name");
    if (saved) setWorkerName(saved);
  }, []);

  const handleSelectName = (name: string) => {
    localStorage.setItem("vision_staff_name", name);
    setWorkerName(name);
  };

  const fetchTickets = useCallback(async () => {
    if (!workerName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance");
      const data = await res.json();
      if (Array.isArray(data.tickets)) {
        const all = data.tickets.map(rowToTicket) as Ticket[];
        const nonCancelled = all.filter(t => t.status !== "cancelled");
        if (showAll) {
          setTickets(nonCancelled);
        } else {
          // My Tickets — case-insensitive trimmed match, includes() as fallback
          const myName = workerName.trim().toLowerCase();
          setTickets(nonCancelled.filter(t => {
            const assigned = t.assignedTo.trim().toLowerCase();
            return assigned === myName || assigned.includes(myName) || myName.includes(assigned);
          }));
        }
      }
    } finally { setLoading(false); }
  }, [workerName, showAll]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleUpdate = async (id: string, status: Ticket["status"], meta?: { notes?: string; minutes?: number }) => {
    const patch: Record<string, unknown> = { status };
    if (status === "complete") patch.completedDate = new Date().toISOString().split("T")[0];
    if (meta?.notes) patch.notes = meta.notes;
    if (meta?.minutes) patch.actualMinutes = meta.minutes;
    await fetch(`/api/maintenance?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, notes: meta?.notes ?? t.notes } : t));
  };

  if (!workerName) return <PinKeypad onAuth={handleSelectName} />;

  const open = tickets.filter(t => t.status !== "complete");
  const done = tickets.filter(t => t.status === "complete");
  const emergency = open.filter(t => t.priority === 1);

  return (
    <div className="min-h-screen bg-[#080C14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[rgba(8,12,20,0.95)] backdrop-blur-sm border-b border-[rgba(255,255,255,0.06)] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center">
            <Wrench size={18} className="text-black" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Maintenance</p>
            <p className="text-sm font-black text-white">{workerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { localStorage.removeItem("vision_staff_name"); setWorkerName(null); }}
            className="text-xs text-gray-600 px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.07)]">Switch</button>
        </div>
      </div>

      {/* Emergency banner */}
      {emergency.length > 0 && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.5)] flex items-center gap-3">
          <Flame size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-red-400">{emergency.length} Emergency Ticket{emergency.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-red-400/70">Requires immediate attention</p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {[
          { label: "Open", value: open.length, color: "#FACC15" },
          { label: "Done Today", value: done.length, color: "#4ADE80" },
          { label: "Emergency", value: emergency.length, color: emergency.length > 0 ? "#EF4444" : "#6B7280" },
        ].map(s => (
          <div key={s.label} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-3 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toggle: mine / all unassigned */}
      <div className="px-4 mt-4 flex items-center gap-2">
        <button onClick={() => setShowAll(false)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${!showAll ? "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.4)] text-[#FACC15]" : "border-[rgba(255,255,255,0.08)] text-gray-500"}`}>
          My Tickets
        </button>
        <button onClick={() => setShowAll(true)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${showAll ? "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.4)] text-[#FACC15]" : "border-[rgba(255,255,255,0.08)] text-gray-500"}`}>
          All Open
        </button>
      </div>

      {/* Ticket list */}
      <div className="px-4 mt-4 pb-32 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#FACC15]" />
          </div>
        ) : open.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 size={48} className="text-[#4ADE80] mx-auto mb-3" />
            <p className="text-white font-bold text-lg">{showAll ? "Queue is clear!" : "All caught up!"}</p>
            <p className="text-gray-600 text-sm mt-1">
              {showAll ? "No open tickets in the system." : "No open tickets assigned to you. Switch to \"All Open\" to see the full queue."}
            </p>
          </div>
        ) : (
          <>
            {/* Open tickets */}
            {open.sort((a, b) => a.priority - b.priority).map(t => (
              <FieldTicketCard key={t.id} ticket={t} onUpdate={handleUpdate} />
            ))}
            {/* Completed */}
            {done.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest pt-4">Completed today</p>
                {done.map(t => <FieldTicketCard key={t.id} ticket={t} onUpdate={handleUpdate} />)}
              </>
            )}
          </>
        )}
      </div>

      {/* Submitted toast */}
      {submitted && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-[#4ADE80] text-black rounded-2xl px-5 py-3 font-bold text-center text-sm">
          ✅ Issue submitted to maintenance queue
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[rgba(8,12,20,0.97)] border-t border-[rgba(255,255,255,0.07)] p-4 pb-8 flex gap-3">
        <button onClick={fetchTickets}
          className="flex-1 py-4 rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white font-bold flex items-center justify-center gap-2">
          <Loader2 size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button onClick={() => setShowReport(true)}
          className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-base font-black flex items-center justify-center gap-2">
          <Plus size={18} /> Report Issue
        </button>
      </div>

      {showReport && (
        <ReportModal workerName={workerName} onClose={() => setShowReport(false)} onSubmit={() => {
          setSubmitted(true);
          setTimeout(() => setSubmitted(false), 3000);
          fetchTickets();
        }} />
      )}
    </div>
  );
}
