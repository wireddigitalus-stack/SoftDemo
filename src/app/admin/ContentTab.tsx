"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, Hash, Pencil, ChevronDown, ChevronRight,
  Eye, Building2, BarChart3, Briefcase, Phone, MapPin,
} from "lucide-react";

// ── Default values (mirrors what's hardcoded in components) ──────────────────

const DEFAULTS: Record<string, Record<string, { label: string; value: string; type: "text" | "textarea" | "number" }>> = {
  hero: {
    trust_badge: { label: "Trust Badge Text", value: "#1 Commercial Property Owner in Downtown Bristol", type: "text" },
    headline_before: { label: "Headline (before highlight)", value: "The Tri-Cities' ", type: "text" },
    headline_highlight: { label: "Headline (highlighted word)", value: "Commercial", type: "text" },
    headline_after: { label: "Headline (after highlight)", value: " Real Estate Leader", type: "text" },
    subtext: { label: "Subtext / Description", value: "Vision LLC has been building Downtown Bristol — and serving businesses across the entire Tri-Cities region — for over 20 years. Office. Retail. Warehouse. Development. Executive Advisement.\nOne team. One vision.", type: "textarea" },
    cta_primary: { label: "Primary CTA Button Text", value: "Schedule a Tour", type: "text" },
    cta_secondary: { label: "Secondary CTA Button Text", value: "423-573-1022", type: "text" },
    micro_stat_1_value: { label: "Micro Stat 1 — Value", value: "20+", type: "text" },
    micro_stat_1_label: { label: "Micro Stat 1 — Label", value: "Years Invested in the Tri-Cities", type: "text" },
    micro_stat_2_value: { label: "Micro Stat 2 — Value", value: "50+", type: "text" },
    micro_stat_2_label: { label: "Micro Stat 2 — Label", value: "Commercial Properties", type: "text" },
    micro_stat_3_value: { label: "Micro Stat 3 — Value", value: "3", type: "text" },
    micro_stat_3_label: { label: "Micro Stat 3 — Label", value: "Integrated Divisions", type: "text" },
    micro_stat_4_value: { label: "Micro Stat 4 — Value", value: "Award-Winning", type: "text" },
    micro_stat_4_label: { label: "Micro Stat 4 — Label", value: "Historic Developer", type: "text" },
  },
  stats: {
    stat_1_value: { label: "Stat 1 — Value", value: "20+", type: "text" },
    stat_1_label: { label: "Stat 1 — Label", value: "Years in the Tri-Cities", type: "text" },
    stat_2_value: { label: "Stat 2 — Value", value: "#1", type: "text" },
    stat_2_label: { label: "Stat 2 — Label", value: "Largest Private CRE Owner in Downtown Bristol", type: "text" },
    stat_3_value: { label: "Stat 3 — Value", value: "50+", type: "text" },
    stat_3_label: { label: "Stat 3 — Label", value: "Commercial Properties Managed", type: "text" },
    stat_4_value: { label: "Stat 4 — Value", value: "3", type: "text" },
    stat_4_label: { label: "Stat 4 — Label", value: "Integrated Business Divisions", type: "text" },
  },
  services: {
    section_heading_1: { label: "Heading (line 1)", value: "Three Integrated Divisions.", type: "text" },
    section_heading_2: { label: "Heading (highlighted)", value: "One Hands-On Philosophy.", type: "text" },
    section_subtext: { label: "Section Description", value: "Vision operates through three complementary divisions — from initial strategy through leasing, development, construction, and long-term advisory. No hand-offs. No silos. Just results.", type: "textarea" },
    card_1_title: { label: "Card 1 — Title", value: "Commercial Leasing", type: "text" },
    card_1_short: { label: "Card 1 — Short Description", value: "Office, retail, warehouse & coworking across the Tri-Cities", type: "text" },
    card_1_desc: { label: "Card 1 — Full Description", value: "From intimate storefronts to large-format warehouse space, Vision LLC offers the most diverse commercial leasing portfolio in downtown Bristol.", type: "textarea" },
    card_2_title: { label: "Card 2 — Title", value: "Development & Construction", type: "text" },
    card_2_short: { label: "Card 2 — Short Description", value: "Adaptive reuse and ground-up commercial development", type: "text" },
    card_2_desc: { label: "Card 2 — Full Description", value: "Vision specializes in historic adaptive reuse — restoring Bristol's architectural heritage while creating modern, functional commercial spaces.", type: "textarea" },
    card_3_title: { label: "Card 3 — Title", value: "Executive Advisement", type: "text" },
    card_3_short: { label: "Card 3 — Short Description", value: "Strategic leadership consulting for C-suite and corporate teams", type: "text" },
    card_3_desc: { label: "Card 3 — Full Description", value: "CEO J. Allen Hurley brings 30+ years of executive experience to provide unfiltered, results-driven advisement for corporations, government agencies, and emerging businesses.", type: "textarea" },
  },
  cta: {
    badge_text: { label: "Badge Text", value: "Serving the Tri-Cities Since 2002", type: "text" },
    heading_1: { label: "Heading (line 1)", value: "Ready to Find Your Space", type: "text" },
    heading_2: { label: "Heading (highlighted)", value: "in the Tri-Cities?", type: "text" },
    subtext: { label: "Subtext", value: "Whether you're looking for a downtown office, retail storefront, or want to talk commercial strategy — the Vision team is ready.", type: "textarea" },
    cta_button: { label: "CTA Button Text", value: "Schedule a Tour", type: "text" },
  },
  testimonials: {
    section_heading_1: { label: "Section Heading", value: "What Our ", type: "text" },
    section_heading_2: { label: "Section Heading (highlighted)", value: "Clients Say", type: "text" },
    section_subtext: { label: "Section Subtext", value: "Businesses across the Tri-Cities trust Vision LLC to put them in the right space and set them up for long-term success.", type: "textarea" },
    quote_1: { label: "Review 1 — Quote", value: "Vision LLC transformed our understanding of the Bristol market. Allen's team didn't just find us a space — they positioned us for long-term success in the region.", type: "textarea" },
    author_1: { label: "Review 1 — Name", value: "Regional Business Owner", type: "text" },
    location_1: { label: "Review 1 — Location", value: "Bristol, TN", type: "text" },
    quote_2: { label: "Review 2 — Quote", value: "Bristol CoWork gave our startup the professional environment we needed without the overhead of a traditional lease. The team at Vision is genuinely invested in your success.", type: "textarea" },
    author_2: { label: "Review 2 — Name", value: "Tech Startup Founder", type: "text" },
    location_2: { label: "Review 2 — Location", value: "Tri-Cities, TN/VA", type: "text" },
    quote_3: { label: "Review 3 — Quote", value: "The executive advisement division is unlike anything I've experienced. J. Allen Hurley brings 30 years of real leadership to the table — strategy, not just platitudes.", type: "textarea" },
    author_3: { label: "Review 3 — Name", value: "C-Suite Executive", type: "text" },
    location_3: { label: "Review 3 — Location", value: "Johnson City, TN", type: "text" },
    review_score: { label: "Google Review Score", value: "5.0 stars", type: "text" },
    review_tagline: { label: "Review Tagline", value: "Trusted by Tri-Cities businesses since 2002", type: "text" },
  },
  faq: {
    section_badge: { label: "Section Badge", value: "Common Questions", type: "text" },
    section_heading_1: { label: "Section Heading", value: "Commercial Real Estate in the ", type: "text" },
    section_heading_2: { label: "Section Heading (highlighted)", value: "Tri-Cities — FAQ", type: "text" },
    section_subtext: { label: "Section Subtext", value: "Everything you need to know about leasing commercial space with Vision LLC in Bristol, Kingsport, and Johnson City, TN.", type: "textarea" },
    q_1: { label: "FAQ 1 — Question", value: "How much does it cost to rent office space in Bristol, TN?", type: "text" },
    a_1: { label: "FAQ 1 — Answer", value: "Office space in Downtown Bristol, TN typically ranges from $8–$22/sqft annually depending on location, size, and finish level.", type: "textarea" },
    q_2: { label: "FAQ 2 — Question", value: "Is coworking space available in Bristol, TN?", type: "text" },
    a_2: { label: "FAQ 2 — Answer", value: "Yes — Bristol CoWork at 620 State Street is Downtown Bristol's premier coworking facility.", type: "textarea" },
    q_3: { label: "FAQ 3 — Question", value: "What commercial real estate is available in the Tri-Cities region?", type: "text" },
    a_3: { label: "FAQ 3 — Answer", value: "Vision LLC is the largest private commercial real estate owner in Downtown Bristol, TN/VA.", type: "textarea" },
    q_4: { label: "FAQ 4 — Question", value: "How do I find retail space for lease in Bristol, TN?", type: "text" },
    a_4: { label: "FAQ 4 — Answer", value: "Vision LLC manages high-traffic retail storefronts on State Street and throughout Downtown Bristol.", type: "textarea" },
    q_5: { label: "FAQ 5 — Question", value: "Does Vision LLC serve Johnson City and Kingsport?", type: "text" },
    a_5: { label: "FAQ 5 — Answer", value: "Yes. While our primary portfolio is centered in Downtown Bristol, Vision LLC provides services across the entire Tri-Cities region.", type: "textarea" },
    q_6: { label: "FAQ 6 — Question", value: "What is the minimum lease term for commercial space with Vision LLC?", type: "text" },
    a_6: { label: "FAQ 6 — Answer", value: "Vision LLC offers flexible lease structures including short-term arrangements. CoWorking memberships start month-to-month.", type: "textarea" },
  },
  about: {
    hero_heading_1: { label: "Hero Heading (line 1)", value: "20+ Years Building", type: "text" },
    hero_heading_2: { label: "Hero Heading (highlighted)", value: "Downtown Bristol", type: "text" },
    hero_subtext: { label: "Hero Subtext", value: "Vision LLC is the largest private commercial property owner in Downtown Bristol, TN — and the most integrated commercial real estate firm in the Tri-Cities.", type: "textarea" },
    leader_heading: { label: "Leadership Name", value: "J. Allen Hurley II", type: "text" },
    leader_bio_1: { label: "Leadership Bio (paragraph 1)", value: "J. Allen Hurley II is the CEO of Vision LLC and one of the most respected commercial real estate leaders in the Tri-Cities region.", type: "textarea" },
    leader_bio_2: { label: "Leadership Bio (paragraph 2)", value: "Under his leadership, Vision LLC has reactivated millions of square feet of dormant commercial space.", type: "textarea" },
    leader_bio_3: { label: "Leadership Bio (paragraph 3)", value: "Beyond real estate, Allen serves as an executive advisor to C-suite leaders, boards, and government entities.", type: "textarea" },
    leader_quote: { label: "Leadership Quote", value: "We don't just own buildings. We invest in communities.", type: "textarea" },
    cta_heading: { label: "About CTA Heading", value: "Ready to Work With Vision?", type: "text" },
    cta_subtext: { label: "About CTA Subtext", value: "Whether you need a lease, a development partner, or an executive advisor — our team is ready.", type: "textarea" },
  },
  footer: {
    tagline: { label: "Footer Tagline", value: "The Tri-Cities' premier commercial real estate, development & executive advisement firm — rooted in Bristol for 20+ years.", type: "textarea" },
    facebook_url: { label: "Facebook URL", value: "https://www.facebook.com/teamvisionllc", type: "text" },
    linkedin_url: { label: "LinkedIn URL", value: "https://www.linkedin.com/company/vision-llc", type: "text" },
    youtube_url: { label: "YouTube URL", value: "https://www.youtube.com/@teamvisionllc", type: "text" },
  },
};

const SECTION_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  hero: { label: "Hero Section", icon: <Eye size={18} />, description: "Main banner at the top of the homepage" },
  stats: { label: "Stats Bar", icon: <BarChart3 size={18} />, description: "Statistics strip below the hero" },
  services: { label: "Services Cards", icon: <Briefcase size={18} />, description: "Three service division cards" },
  cta: { label: "CTA Banner", icon: <Phone size={18} />, description: "Bottom call-to-action section" },
  testimonials: { label: "Testimonials", icon: <Building2 size={18} />, description: "Client reviews on the homepage" },
  faq: { label: "FAQ", icon: <Hash size={18} />, description: "Frequently asked questions" },
  about: { label: "About Page", icon: <Eye size={18} />, description: "About page content & leadership bio" },
  footer: { label: "Footer", icon: <MapPin size={18} />, description: "Footer tagline & social links" },
};

interface ContentItem { section: string; key: string; value: string }

export default function ContentTab() {
  const [overrides, setOverrides] = useState<ContentItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ hero: true });
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/site-content");
      const data = await res.json();
      setOverrides(data.items || []);
    } catch {
      console.warn("Failed to fetch site content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  // Get current value: edited → override → default
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

  // Count ALL dirty fields across all sections
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

  // ── SAVE ALL — one button saves everything ──
  const saveAll = async () => {
    const dirty = allDirtyFields();
    if (dirty.length === 0) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      for (const { section, key } of dirty) {
        const value = editedValues[`${section}:${key}`] ?? getValue(section, key);
        const res = await fetch("/api/site-content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, key, value }),
        });
        if (!res.ok) throw new Error(`Failed to save ${section}/${key}`);

        // Update local overrides
        setOverrides(prev => {
          const filtered = prev.filter(o => !(o.section === section && o.key === key));
          return [...filtered, { section, key, value }];
        });
      }

      // Clear all edited values
      setEditedValues({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Revert a single field to its original default
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
        <span className="ml-3 text-gray-400 text-sm">Loading content editor…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Top Bar: Title + Save Button ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-5 sm:p-6 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Pencil size={20} className="text-[#4ADE80]" />
            Content Editor
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Edit any text on your website. Make changes below, then click <strong className="text-gray-300">Save Changes</strong>.
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

      {/* Unsaved changes warning */}
      {totalDirty > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[rgba(250,204,21,0.06)] border border-[rgba(250,204,21,0.2)]">
          <AlertCircle size={15} className="text-[#FACC15] flex-shrink-0" />
          <p className="text-xs text-[#FACC15]">
            You have <strong>{totalDirty} unsaved change{totalDirty > 1 ? "s" : ""}</strong>. Click <strong>Save Changes</strong> above to publish them to the live site.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-950/40 border border-red-900/50">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── Section Editors ── */}
      {Object.entries(SECTION_META).map(([sectionKey, meta]) => {
        const fields = DEFAULTS[sectionKey];
        if (!fields) return null;
        const isExpanded = expandedSections[sectionKey];
        const dirtyCount = sectionDirtyCount(sectionKey);
        const customized = Object.keys(fields).filter(k => isOverridden(sectionKey, k)).length;

        return (
          <div key={sectionKey} className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[#4ADE80]">
                  {meta.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {meta.label}
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
                  <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                </div>
              </div>
              <div className="text-gray-600">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>

            {/* Fields */}
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
                          rows={3}
                          className={`${inputClass} resize-none ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      ) : (
                        <input
                          type={fieldMeta.type}
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          className={`${inputClass} ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom Summary */}
      <div className="text-center pt-2 pb-4">
        <p className="text-xs text-gray-600">
          {overrides.length} field{overrides.length !== 1 ? "s" : ""} customized · Changes appear on the live site within 60 seconds after saving
        </p>
      </div>
    </div>
  );
}
