"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, ChevronDown, ChevronRight, Building2, MapPin,
  Star, Trash2, Upload, ImageIcon, Plus,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface PropertyImages {
  property_id: string;
  hero_url: string | null;
  all_urls: string[];
  updated_at: string;
}

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
  // ── Image management state ──
  const [propImages, setPropImages] = useState<Record<string, PropertyImages>>({});
  const [imgUploading, setImgUploading] = useState<string | null>(null);
  const [imgDeleting, setImgDeleting] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement>>({});

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/site-content");
      const data = await res.json();
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

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/property-images");
      const d = await res.json();
      const map: Record<string, PropertyImages> = {};
      if (Array.isArray(d.overrides)) {
        for (const row of d.overrides) {
          map[row.property_id] = {
            property_id: row.property_id,
            hero_url: row.hero_url || row.image_url || null,
            all_urls: Array.isArray(row.all_urls) ? row.all_urls : (row.image_url ? [row.image_url] : []),
            updated_at: row.updated_at,
          };
        }
      }
      setPropImages(map);
    } catch { console.warn("Failed to fetch images"); }
  }, []);

  useEffect(() => { fetchContent(); fetchImages(); }, [fetchContent, fetchImages]);

  // ── Image helpers ──
  function getImgRecord(propId: string, fallback?: string[]): PropertyImages {
    const ex = propImages[propId];
    if (ex) return ex;
    const prop = PROPERTIES.find(p => p.id === propId);
    const imgs: string[] = (prop as any)?.images || ((prop as any)?.image ? [(prop as any).image] : []);
    return { property_id: propId, hero_url: fallback?.[0] || imgs[0] || null, all_urls: fallback || imgs, updated_at: "" };
  }

  async function patchImages(propId: string, heroUrl: string | null, allUrls: string[]) {
    await fetch("/api/property-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: propId, heroUrl, allUrls }),
    });
  }

  async function handleImgUpload(propId: string, files: FileList) {
    setImgUploading(propId);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("propertyId", propId);
      const res = await fetch("/api/property-images", { method: "POST", body: form });
      const d = await res.json();
      if (d.url) newUrls.push(d.url);
    }
    if (newUrls.length) {
      const ex = getImgRecord(propId);
      const merged = [...ex.all_urls, ...newUrls];
      const hero = ex.hero_url || newUrls[0];
      setPropImages(prev => ({ ...prev, [propId]: { ...ex, all_urls: merged, hero_url: hero, updated_at: new Date().toISOString() } }));
      await patchImages(propId, hero, merged);
    }
    setImgUploading(null);
  }

  async function handleSetHero(propId: string, url: string) {
    const ex = getImgRecord(propId);
    setPropImages(prev => ({ ...prev, [propId]: { ...ex, hero_url: url } }));
    await patchImages(propId, url, ex.all_urls);
  }

  async function handleRemoveImg(propId: string, url: string) {
    setImgDeleting(url);
    const ex = getImgRecord(propId);
    const next = ex.all_urls.filter(u => u !== url);
    const newHero = ex.hero_url === url ? (next[0] || null) : ex.hero_url;
    setPropImages(prev => ({ ...prev, [propId]: { ...ex, all_urls: next, hero_url: newHero } }));
    await fetch("/api/property-images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: propId, url }) });
    setImgDeleting(null);
  }

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
          className={`relative flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-300 ${
            saveSuccess
              ? "bg-[#4ADE80] text-black"
              : totalDirty > 0
              ? "bg-[#4ADE80] hover:bg-[#22C55E] text-black"
              : "bg-[rgba(255,255,255,0.06)] text-gray-600 cursor-not-allowed"
          }`}
          style={totalDirty > 0 && !saveSuccess ? {
            boxShadow: "0 0 0 0 rgba(74,222,128,0.7)",
            animation: "savePulse 2s infinite",
          } : {}}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving…</>
          ) : saveSuccess ? (
            <><CheckCircle2 size={16} /> Saved!</>
          ) : (
            <><Save size={16} /> Save {totalDirty > 0 && `(${totalDirty})`}</>
          )}
        </button>
      </div>

      {/* Sticky floating save bar */}
      {totalDirty > 0 && (
        <div className="sticky top-16 z-30 -mx-1">
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.35)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-[#FACC15] flex-shrink-0" />
              <p className="text-xs text-[#FACC15] font-semibold">
                <strong>{totalDirty} unsaved change{totalDirty > 1 ? "s" : ""}</strong> — don't forget to save!
              </p>
            </div>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-black text-xs font-black transition-all shadow-lg"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving…" : "Save Now"}
            </button>
          </div>
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
              <div className="border-t border-[rgba(255,255,255,0.05)] p-5 space-y-5">
                {/* ── Image Gallery ── */}
                {(() => {
                  const rec = getImgRecord(prop.id, (prop as any).images || ((prop as any).image ? [(prop as any).image] : []));
                  const hero = rec.hero_url;
                  const urls = rec.all_urls;
                  const isUp = imgUploading === prop.id;
                  return (
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">📷 Gallery</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {urls.map((url, i) => {
                          const isHero = url === hero;
                          const isDel = imgDeleting === url;
                          return (
                            <div key={url + i} className={`relative rounded-xl overflow-hidden border-2 ${isHero ? "border-[#FACC15]" : "border-[rgba(255,255,255,0.08)]"}` }>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`${prop.name} ${i}`} className={`w-full h-16 object-cover ${isDel ? "opacity-30" : ""}`} />
                              {isHero && (
                                <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-[#FACC15] text-black text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-md">
                                  <Star size={6} fill="currentColor" /> HERO
                                </div>
                              )}
                              <div className="flex items-center justify-between px-1.5 py-1 bg-[rgba(0,0,0,0.55)]">
                                {isHero ? (
                                  <span className="text-[8px] font-black text-[#FACC15] flex items-center gap-0.5"><Star size={7} fill="currentColor" /> HERO</span>
                                ) : (
                                  <button onClick={() => handleSetHero(prop.id, url)} className="text-[#FACC15] p-0.5" title="Set hero"><Star size={11} /></button>
                                )}
                                <button
                                  onClick={() => { if (window.confirm("Remove this image?")) handleRemoveImg(prop.id, url); }}
                                  disabled={isDel}
                                  className="text-red-400 hover:text-red-300 p-0.5 disabled:opacity-40"
                                >
                                  {isDel ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={11} />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => fileRefs.current[prop.id]?.click()}
                          disabled={isUp}
                          className="h-[88px] rounded-xl border-2 border-dashed border-[rgba(96,165,250,0.3)] text-[#60A5FA] hover:border-[rgba(96,165,250,0.5)] hover:bg-[rgba(96,165,250,0.05)] transition-all flex flex-col items-center justify-center gap-1 text-[10px]"
                        >
                          {isUp ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} /><span>Add</span></>}
                        </button>
                      </div>
                      <input
                        ref={el => { if (el) fileRefs.current[prop.id] = el; }}
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={e => { if (e.target.files?.length) { handleImgUpload(prop.id, e.target.files); e.target.value = ""; } }}
                      />
                    </div>
                  );
                })()}

                <div className="border-t border-[rgba(255,255,255,0.05)] pt-4 space-y-4">
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
                </div>{/* end text fields */}
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
