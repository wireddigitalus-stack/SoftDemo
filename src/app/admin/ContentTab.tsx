"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, Image as ImageIcon, Hash, Pencil, ChevronDown, ChevronRight,
  Eye, Building2, BarChart3, Briefcase, Phone, Mail, MapPin,
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
    card_1_desc: { label: "Card 1 — Full Description", value: "From intimate storefronts to large-format warehouse space, Vision LLC offers the most diverse commercial leasing portfolio in downtown Bristol. Our team matches tenants with the right space, the right terms, and the right market positioning.", type: "textarea" },
    card_2_title: { label: "Card 2 — Title", value: "Development & Construction", type: "text" },
    card_2_short: { label: "Card 2 — Short Description", value: "Adaptive reuse and ground-up commercial development", type: "text" },
    card_2_desc: { label: "Card 2 — Full Description", value: "Vision specializes in historic adaptive reuse — restoring Bristol's architectural heritage while creating modern, functional commercial spaces. Our vertically integrated model means we control strategy, design, construction, and leasing under one roof.", type: "textarea" },
    card_3_title: { label: "Card 3 — Title", value: "Executive Advisement", type: "text" },
    card_3_short: { label: "Card 3 — Short Description", value: "Strategic leadership consulting for C-suite and corporate teams", type: "text" },
    card_3_desc: { label: "Card 3 — Full Description", value: "CEO J. Allen Hurley brings 30+ years of executive experience to provide unfiltered, results-driven advisement for corporations, government agencies, and emerging businesses. Not coaching — real strategy.", type: "textarea" },
  },
  cta: {
    badge_text: { label: "Badge Text", value: "Serving the Tri-Cities Since 2002", type: "text" },
    heading_1: { label: "Heading (line 1)", value: "Ready to Find Your Space", type: "text" },
    heading_2: { label: "Heading (highlighted)", value: "in the Tri-Cities?", type: "text" },
    subtext: { label: "Subtext", value: "Whether you're looking for a downtown office, retail storefront, or want to talk commercial strategy — the Vision team is ready.", type: "textarea" },
    cta_button: { label: "CTA Button Text", value: "Schedule a Tour", type: "text" },
  },
  testimonials: {
    section_heading_1: { label: "Section Heading (before highlight)", value: "What Our ", type: "text" },
    section_heading_2: { label: "Section Heading (highlighted)", value: "Clients Say", type: "text" },
    section_subtext: { label: "Section Subtext", value: "Businesses across the Tri-Cities trust Vision LLC to put them in the right space and set them up for long-term success.", type: "textarea" },
    quote_1: { label: "Testimonial 1 — Quote", value: "Vision LLC transformed our understanding of the Bristol market. Allen's team didn't just find us a space — they positioned us for long-term success in the region. Exceptional advisement.", type: "textarea" },
    author_1: { label: "Testimonial 1 — Author", value: "Regional Business Owner", type: "text" },
    location_1: { label: "Testimonial 1 — Location", value: "Bristol, TN", type: "text" },
    quote_2: { label: "Testimonial 2 — Quote", value: "Bristol CoWork gave our startup the professional environment we needed without the overhead of a traditional lease. The team at Vision is genuinely invested in your success.", type: "textarea" },
    author_2: { label: "Testimonial 2 — Author", value: "Tech Startup Founder", type: "text" },
    location_2: { label: "Testimonial 2 — Location", value: "Tri-Cities, TN/VA", type: "text" },
    quote_3: { label: "Testimonial 3 — Quote", value: "The executive advisement division is unlike anything I've experienced. J. Allen Hurley brings 30 years of real leadership to the table — strategy, not just platitudes.", type: "textarea" },
    author_3: { label: "Testimonial 3 — Author", value: "C-Suite Executive", type: "text" },
    location_3: { label: "Testimonial 3 — Location", value: "Johnson City, TN", type: "text" },
    review_score: { label: "Google Review Score", value: "5.0 stars", type: "text" },
    review_tagline: { label: "Review Tagline", value: "Trusted by Tri-Cities businesses since 2002", type: "text" },
  },
  faq: {
    section_badge: { label: "Section Badge", value: "Common Questions", type: "text" },
    section_heading_1: { label: "Section Heading (before highlight)", value: "Commercial Real Estate in the ", type: "text" },
    section_heading_2: { label: "Section Heading (highlighted)", value: "Tri-Cities — FAQ", type: "text" },
    section_subtext: { label: "Section Subtext", value: "Everything you need to know about leasing commercial space with Vision LLC in Bristol, Kingsport, and Johnson City, TN.", type: "textarea" },
    q_1: { label: "FAQ 1 — Question", value: "How much does it cost to rent office space in Bristol, TN?", type: "text" },
    a_1: { label: "FAQ 1 — Answer", value: "Office space in Downtown Bristol, TN typically ranges from $8–$22/sqft annually depending on location, size, and finish level. Vision LLC offers flexible lease terms for suites from 500 to 18,000+ sqft. Contact us for current availability and pricing.", type: "textarea" },
    q_2: { label: "FAQ 2 — Question", value: "Is coworking space available in Bristol, TN?", type: "text" },
    a_2: { label: "FAQ 2 — Answer", value: "Yes — Bristol CoWork at 620 State Street is Downtown Bristol's premier coworking facility. We offer hot desks, dedicated desks, and private offices with all-inclusive monthly memberships including gigabit Wi-Fi, coffee, conference rooms, and 24/7 access.", type: "textarea" },
    q_3: { label: "FAQ 3 — Question", value: "What commercial real estate is available in the Tri-Cities region?", type: "text" },
    a_3: { label: "FAQ 3 — Answer", value: "Vision LLC is the largest private commercial real estate owner in Downtown Bristol, TN/VA. Our active portfolio includes office suites, retail storefronts, coworking space, event venues, and industrial/warehouse space across Bristol, Kingsport, and Johnson City.", type: "textarea" },
    q_4: { label: "FAQ 4 — Question", value: "How do I find retail space for lease in Bristol, TN?", type: "text" },
    a_4: { label: "FAQ 4 — Answer", value: "Vision LLC manages high-traffic retail storefronts on State Street and throughout Downtown Bristol. Units range from 800 to 5,000 sqft with excellent foot traffic, prominent signage, and flexible lease terms. Call 423-573-1022 or submit an inquiry online.", type: "textarea" },
    q_5: { label: "FAQ 5 — Question", value: "Does Vision LLC serve Johnson City and Kingsport?", type: "text" },
    a_5: { label: "FAQ 5 — Answer", value: "Yes. While our primary portfolio is centered in Downtown Bristol, Vision LLC provides commercial real estate leasing, executive advisement, and development consulting across the entire Tri-Cities region including Kingsport, Johnson City, and Sullivan and Washington counties.", type: "textarea" },
    q_6: { label: "FAQ 6 — Question", value: "What is the minimum lease term for commercial space with Vision LLC?", type: "text" },
    a_6: { label: "FAQ 6 — Answer", value: "Vision LLC offers flexible lease structures including short-term arrangements. CoWorking memberships start month-to-month. Traditional commercial leases typically run 1–5 years with customizable terms. Contact our team to discuss your specific timeline and requirements.", type: "textarea" },
  },
  about: {
    hero_heading_1: { label: "Hero Heading (line 1)", value: "20+ Years Building", type: "text" },
    hero_heading_2: { label: "Hero Heading (highlighted)", value: "Downtown Bristol", type: "text" },
    hero_subtext: { label: "Hero Subtext", value: "Vision LLC is the largest private commercial property owner in Downtown Bristol, TN — and the most integrated commercial real estate firm in the Tri-Cities.", type: "textarea" },
    leader_heading: { label: "Leadership Heading", value: "J. Allen Hurley II", type: "text" },
    leader_bio_1: { label: "Leadership Bio (paragraph 1)", value: "J. Allen Hurley II is the CEO of Vision LLC and one of the most respected commercial real estate leaders in the Tri-Cities region. With 30+ years of executive experience spanning development, construction, and corporate strategy, Allen has shaped the commercial landscape of Downtown Bristol more than any other private individual.", type: "textarea" },
    leader_bio_2: { label: "Leadership Bio (paragraph 2)", value: "Under his leadership, Vision LLC has reactivated millions of square feet of dormant commercial space, preserved some of Bristol's most iconic historic buildings, and delivered measurable economic impact across Northeast Tennessee and Southwest Virginia.", type: "textarea" },
    leader_bio_3: { label: "Leadership Bio (paragraph 3)", value: "Beyond real estate, Allen serves as an executive advisor to C-suite leaders, boards, and government entities — bringing the same strategic rigor to Fortune 500 challenges that he applies to Main Street development.", type: "textarea" },
    leader_quote: { label: "Leadership Quote", value: "We don't just own buildings. We invest in communities. Every block we restore is a statement that Downtown Bristol has a future worth fighting for.", type: "textarea" },
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
  hero: { label: "Hero Section", icon: <Eye size={18} />, description: "Main headline, subtext, CTA buttons, and trust stats at the top of the homepage." },
  stats: { label: "Stats Bar", icon: <BarChart3 size={18} />, description: "The animated statistics strip below the hero section." },
  services: { label: "Services Cards", icon: <Briefcase size={18} />, description: "The three service division cards — Leasing, Development, Advisement." },
  cta: { label: "CTA Section", icon: <Phone size={18} />, description: "The bottom-of-page call-to-action banner with heading, subtext, and buttons." },
  testimonials: { label: "Testimonials", icon: <Building2 size={18} />, description: "Client reviews and the Google review prompt on the homepage." },
  faq: { label: "FAQ", icon: <Hash size={18} />, description: "All 6 frequently asked questions and answers on the homepage." },
  about: { label: "About Page", icon: <Eye size={18} />, description: "Hero, leadership bio, quote, and CTA on the About page." },
  footer: { label: "Footer", icon: <MapPin size={18} />, description: "Footer tagline and social media links." },
};

interface ContentItem { section: string; key: string; value: string }

// ── Main Component ───────────────────────────────────────────────────────────

export default function ContentTab() {
  const [overrides, setOverrides] = useState<ContentItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ hero: true });
  const [loading, setLoading] = useState(true);

  // Fetch existing overrides
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

  // Get the current value for a field (override → default)
  const getValue = (section: string, key: string): string => {
    // Check edited (unsaved) values first
    const editKey = `${section}:${key}`;
    if (editKey in editedValues) return editedValues[editKey];
    // Check saved overrides
    const override = overrides.find(o => o.section === section && o.key === key);
    if (override) return override.value;
    // Fallback to hardcoded default
    return DEFAULTS[section]?.[key]?.value ?? "";
  };

  const isOverridden = (section: string, key: string): boolean => {
    return overrides.some(o => o.section === section && o.key === key);
  };

  const isDirty = (section: string, key: string): boolean => {
    const editKey = `${section}:${key}`;
    if (!(editKey in editedValues)) return false;
    const override = overrides.find(o => o.section === section && o.key === key);
    const currentSaved = override?.value ?? DEFAULTS[section]?.[key]?.value ?? "";
    return editedValues[editKey] !== currentSaved;
  };

  const handleChange = (section: string, key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [`${section}:${key}`]: value }));
  };

  // Save a single field
  const saveField = async (section: string, key: string) => {
    const editKey = `${section}:${key}`;
    const value = editedValues[editKey] ?? getValue(section, key);
    setSaving(prev => ({ ...prev, [editKey]: true }));
    setError(null);

    try {
      const res = await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, key, value }),
      });
      if (!res.ok) throw new Error("Save failed");

      // Update local state
      setOverrides(prev => {
        const filtered = prev.filter(o => !(o.section === section && o.key === key));
        return [...filtered, { section, key, value }];
      });
      setEditedValues(prev => { const next = { ...prev }; delete next[editKey]; return next; });
      setSaved(prev => ({ ...prev, [editKey]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [editKey]: false })), 2000);
    } catch {
      setError(`Failed to save ${section}/${key}`);
    } finally {
      setSaving(prev => ({ ...prev, [editKey]: false }));
    }
  };

  // Save all dirty fields in a section
  const saveSection = async (section: string) => {
    const fields = DEFAULTS[section];
    if (!fields) return;
    const dirtyKeys = Object.keys(fields).filter(k => isDirty(section, k));
    for (const key of dirtyKeys) {
      await saveField(section, key);
    }
  };

  // Revert a single field to default
  const revertField = async (section: string, key: string) => {
    const editKey = `${section}:${key}`;
    setEditedValues(prev => { const next = { ...prev }; delete next[editKey]; return next; });

    try {
      await fetch(`/api/site-content?section=${encodeURIComponent(section)}&key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      setOverrides(prev => prev.filter(o => !(o.section === section && o.key === key)));
    } catch {
      setError("Failed to revert field");
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const sectionHasDirtyFields = (section: string): boolean => {
    const fields = DEFAULTS[section];
    if (!fields) return false;
    return Object.keys(fields).some(k => isDirty(section, k));
  };

  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(74,222,128,0.5)] transition-all font-mono";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#4ADE80]" />
        <span className="ml-3 text-gray-400 text-sm">Loading content editor…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Pencil size={20} className="text-[#4ADE80]" />
            Content Editor
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Edit homepage text, stats, and footer content. Changes go live after saving and reloading the public site.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)]">
        <AlertCircle size={16} className="text-[#4ADE80] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-[#4ADE80] font-semibold">How it works:</span> Edit any field below and click Save.
          The public site will pick up changes within 60 seconds. Click the{" "}
          <RotateCcw size={11} className="inline text-gray-500" /> icon to revert a field to its original default.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-900/50">
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Section Editors */}
      {Object.entries(SECTION_META).map(([sectionKey, meta]) => {
        const fields = DEFAULTS[sectionKey];
        if (!fields) return null;
        const isExpanded = expandedSections[sectionKey];
        const hasDirty = sectionHasDirtyFields(sectionKey);
        const overrideCount = Object.keys(fields).filter(k => isOverridden(sectionKey, k)).length;

        return (
          <div
            key={sectionKey}
            className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden"
          >
            {/* Section header — clickable */}
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[rgba(255,255,255,0.02)] transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[#4ADE80]">
                  {meta.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {meta.label}
                    {overrideCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] font-semibold">
                        {overrideCount} customized
                      </span>
                    )}
                    {hasDirty && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                        unsaved changes
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                </div>
              </div>
              <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>

            {/* Expanded fields */}
            {isExpanded && (
              <div className="border-t border-[rgba(255,255,255,0.05)] p-5 sm:p-6 space-y-5">
                {Object.entries(fields).map(([fieldKey, fieldMeta]) => {
                  const editKey = `${sectionKey}:${fieldKey}`;
                  const currentValue = getValue(sectionKey, fieldKey);
                  const dirty = isDirty(sectionKey, fieldKey);
                  const overridden = isOverridden(sectionKey, fieldKey);
                  const isSaving = saving[editKey];
                  const isSaved = saved[editKey];

                  return (
                    <div key={fieldKey} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          {fieldMeta.type === "textarea" ? <Type size={12} /> : fieldMeta.type === "number" ? <Hash size={12} /> : <Type size={12} />}
                          {fieldMeta.label}
                          {overridden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(74,222,128,0.1)] text-[#4ADE80] font-semibold normal-case tracking-normal">
                              customized
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1.5">
                          {(overridden || dirty) && (
                            <button
                              onClick={() => revertField(sectionKey, fieldKey)}
                              className="text-gray-600 hover:text-gray-400 transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)]"
                              title="Revert to default"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                          {dirty && (
                            <button
                              onClick={() => saveField(sectionKey, fieldKey)}
                              disabled={isSaving}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.2)] transition-all disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Save
                            </button>
                          )}
                          {isSaved && (
                            <span className="flex items-center gap-1 text-xs text-[#4ADE80] font-semibold">
                              <CheckCircle2 size={13} /> Saved
                            </span>
                          )}
                        </div>
                      </div>

                      {fieldMeta.type === "textarea" ? (
                        <textarea
                          value={currentValue}
                          onChange={(e) => handleChange(sectionKey, fieldKey, e.target.value)}
                          rows={3}
                          className={`${inputClass} resize-none`}
                        />
                      ) : (
                        <input
                          type={fieldMeta.type}
                          value={currentValue}
                          onChange={(e) => handleChange(sectionKey, fieldKey, e.target.value)}
                          className={inputClass}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Save All button for section */}
                {hasDirty && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => saveSection(sectionKey)}
                      className="btn-primary py-2.5 px-6 text-sm"
                    >
                      <Save size={15} />
                      Save All {meta.label} Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      <div className="text-center pt-4">
        <p className="text-xs text-gray-600">
          {overrides.length} field{overrides.length !== 1 ? "s" : ""} customized across {new Set(overrides.map(o => o.section)).size} section{new Set(overrides.map(o => o.section)).size !== 1 ? "s" : ""}
          {overrides.length > 0 && " · Revert any field to restore its original default"}
        </p>
      </div>
    </div>
  );
}
