"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, Pencil, ChevronDown, ChevronRight, Building2, MapPin,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

// ── Build defaults from the hardcoded PROPERTIES array ───────────────────────

type FieldMeta = { label: string; value: string; type: "text" | "textarea" };

function buildPropertyDefaults(): Record<string, Record<string, FieldMeta>> {
  const sections: Record<string, Record<string, FieldMeta>> = {};
  for (const p of PROPERTIES) {
    const key = `property:${p.id}`;
    sections[key] = {
      name:        { label: "Property Name", value: p.name, type: "text" },
      type:        { label: "Property Type", value: p.type, type: "text" },
      address:     { label: "Address", value: (p as any).address || "", type: "text" },
      city:        { label: "City / Market", value: p.city, type: "text" },
      sqft:        { label: "Square Footage", value: p.sqft, type: "text" },
      status:      { label: "Availability Status", value: p.status, type: "text" },
      badge:       { label: "Badge Text", value: p.badge || "", type: "text" },
      description: { label: "Description", value: p.description, type: "textarea" },
      features:    { label: "Features (one per line)", value: p.features.join("\n"), type: "textarea" },
      imageAlt:    { label: "Image Alt Text (SEO)", value: (p as any).imageAlt || p.name, type: "text" },
    };
  }
  return sections;
}

const DEFAULTS = buildPropertyDefaults();

interface ContentItem { section: string; key: string; value: string }

export default function PropertyEditor() {
  const [overrides, setOverrides] = useState<ContentItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/site-content");
      const data = await res.json();
      // Only keep property-related overrides
      const items: ContentItem[] = (data.items || []).filter(
        (i: ContentItem) => i.section.startsWith("property:")
      );
      setOverrides(items);
    } catch {
      console.warn("Failed to fetch property content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const getValue = (section: string, key: string): string => {
    const editKey = `${section}:${key}`;
    if (editKey in editedValues) return editedValues[editKey];
    const override = overrides.find(o => o.section === section && o.key === key);
    if (override) return override.value;
    return DEFAULTS[section]?.[key]?.value ?? "";
  };

  const isDirty = (section: string, key: string): boolean => {
    const editKey = `${section}:${key}`;
    if (!(editKey in editedValues)) return false;
    const override = overrides.find(o => o.section === section && o.key === key);
    const saved = override?.value ?? DEFAULTS[section]?.[key]?.value ?? "";
    return editedValues[editKey] !== saved;
  };

  const isOverridden = (section: string, key: string): boolean =>
    overrides.some(o => o.section === section && o.key === key);

  const allDirtyFields = (): { section: string; key: string }[] => {
    const dirty: { section: string; key: string }[] = [];
    for (const [sec, fields] of Object.entries(DEFAULTS)) {
      for (const key of Object.keys(fields)) {
        if (isDirty(sec, key)) dirty.push({ section: sec, key });
      }
    }
    return dirty;
  };

  const totalDirty = allDirtyFields().length;

  const handleChange = (section: string, key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [`${section}:${key}`]: value }));
    setSaveSuccess(false);
  };

  const saveAll = async () => {
    const dirty = allDirtyFields();
    if (dirty.length === 0) return;
    setSaving(true); setError(null); setSaveSuccess(false);
    try {
      for (const { section, key } of dirty) {
        const value = editedValues[`${section}:${key}`] ?? getValue(section, key);
        const res = await fetch("/api/site-content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, key, value }),
        });
        if (!res.ok) throw new Error(`Failed to save ${section}/${key}`);
        setOverrides(prev => {
          const filtered = prev.filter(o => !(o.section === section && o.key === key));
          return [...filtered, { section, key, value }];
        });
      }
      setEditedValues({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const revertField = async (section: string, key: string) => {
    const editKey = `${section}:${key}`;
    setEditedValues(prev => { const n = { ...prev }; delete n[editKey]; return n; });
    if (isOverridden(section, key)) {
      try {
        await fetch(`/api/site-content?section=${encodeURIComponent(section)}&key=${encodeURIComponent(key)}`, { method: "DELETE" });
        setOverrides(prev => prev.filter(o => !(o.section === section && o.key === key)));
      } catch { setError("Failed to revert field"); }
    }
  };

  const toggleSection = (s: string) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  const sectionDirtyCount = (s: string): number =>
    Object.keys(DEFAULTS[s] || {}).filter(k => isDirty(s, k)).length;

  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(74,222,128,0.5)] focus:bg-[rgba(255,255,255,0.06)] transition-all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#4ADE80]" />
        <span className="ml-3 text-gray-400 text-sm">Loading property editor…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-5 sm:p-6 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#F97316]" />
            Property Editor
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Edit text for your <strong className="text-gray-300">{PROPERTIES.length} existing properties</strong>. Changes appear on the live site within 60 seconds.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={totalDirty === 0 || saving}
          className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all ${
            saveSuccess
              ? "bg-[#4ADE80] text-black"
              : totalDirty > 0
              ? "bg-[#4ADE80] hover:bg-[#22C55E] text-black shadow-lg shadow-[rgba(74,222,128,0.25)]"
              : "bg-[rgba(255,255,255,0.06)] text-gray-600 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving…</>
          ) : saveSuccess ? (
            <><CheckCircle2 size={16} /> All Changes Saved!</>
          ) : (
            <><Save size={16} /> Save Changes {totalDirty > 0 && `(${totalDirty})`}</>
          )}
        </button>
      </div>

      {totalDirty > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[rgba(250,204,21,0.06)] border border-[rgba(250,204,21,0.2)]">
          <AlertCircle size={15} className="text-[#FACC15] flex-shrink-0" />
          <p className="text-xs text-[#FACC15]">
            You have <strong>{totalDirty} unsaved change{totalDirty > 1 ? "s" : ""}</strong>. Click <strong>Save Changes</strong> above to publish.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-950/40 border border-red-900/50">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── Property Sections ── */}
      {PROPERTIES.map((prop) => {
        const sectionKey = `property:${prop.id}`;
        const fields = DEFAULTS[sectionKey];
        if (!fields) return null;
        const isExpanded = expandedSections[sectionKey];
        const dirtyCount = sectionDirtyCount(sectionKey);
        const customized = Object.keys(fields).filter(k => isOverridden(sectionKey, k)).length;

        return (
          <div key={sectionKey} className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {/* Property thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.08)]">
                  {(prop as any).image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(prop as any).image} alt={prop.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                      <Building2 size={18} className="text-gray-700" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {prop.name}
                    {customized > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] font-semibold">
                        {customized} edited
                      </span>
                    )}
                    {dirtyCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                        {dirtyCount} unsaved
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} /> {prop.city} · {prop.type} · {prop.sqft} sqft
                  </p>
                </div>
              </div>
              <div className="text-gray-600">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[rgba(255,255,255,0.05)] p-5 space-y-4">
                {Object.entries(fields).map(([fieldKey, fieldMeta]) => {
                  const val = getValue(sectionKey, fieldKey);
                  const dirty = isDirty(sectionKey, fieldKey);
                  const custom = isOverridden(sectionKey, fieldKey);

                  return (
                    <div key={fieldKey}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                          <Type size={11} className="text-gray-600" />
                          {fieldMeta.label}
                          {dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] inline-block" />}
                        </label>
                        {(custom || dirty) && (
                          <button
                            onClick={() => revertField(sectionKey, fieldKey)}
                            className="text-[10px] text-gray-600 hover:text-gray-300 flex items-center gap-1 transition-colors"
                            title="Reset to default"
                          >
                            <RotateCcw size={10} /> Reset
                          </button>
                        )}
                      </div>
                      {fieldMeta.type === "textarea" ? (
                        <textarea
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          rows={fieldKey === "description" ? 5 : fieldKey === "features" ? 6 : 3}
                          className={`${inputClass} resize-none ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          className={`${inputClass} ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      )}
                      {fieldKey === "features" && (
                        <p className="text-[10px] text-gray-600 mt-1">Enter one feature per line. These appear as bullet points on the property page.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-center pt-2 pb-4">
        <p className="text-xs text-gray-600">
          {overrides.length} property field{overrides.length !== 1 ? "s" : ""} customized · To add a <em>new</em> property, use the &quot;Add Property&quot; tab
        </p>
      </div>
    </div>
  );
}
