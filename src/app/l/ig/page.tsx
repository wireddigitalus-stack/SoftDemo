import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AIChatWidget from "@/components/AIChatWidget";

export const metadata: Metadata = {
  title: "Find Commercial Space in Bristol, TN | Vision LLC",
  description: "Looking for office, retail, or coworking space in the Tri-Cities area? Vision LLC has premium commercial spaces in Downtown Bristol, TN.",
  robots: { index: false, follow: false },
};

const PROPERTIES = [
  { label: "🏢 Executive Suites", sub: "The Executive · Downtown", href: "/properties/the-executive" },
  { label: "💼 City Centre Suites", sub: "Flexible offices · 1,200–18k sqft", href: "/properties/city-centre" },
  { label: "☕ Bristol CoWork", sub: "620 State St · All-inclusive", href: "/properties/bristol-cowork" },
  { label: "🏪 Centre Point", sub: "Retail & office · Downtown", href: "/properties/centre-point-suites" },
  { label: "🎉 Event Facility", sub: "Foundation Event Center", href: "/properties/foundation-event-facility" },
  { label: "🏭 Warehouse", sub: "2,000–25,000 sqft · Bristol Metro", href: "/properties/warehouse" },
];

export default function InstagramLandingPage() {
  return (
    <main className="min-h-screen bg-[#080C0F] flex flex-col">
      {/* Background glow effects — warmer/pink for Instagram */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#EC4899] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#4ADE80] opacity-[0.04] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12 text-center">



        {/* Source tag */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#F472B6] bg-[rgba(236,72,153,0.1)] border border-[rgba(236,72,153,0.25)] px-3 py-1.5 rounded-full mb-6">
          <span>📷</span> You came from Instagram
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 max-w-lg">
          Find Your Perfect<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ADE80] to-[#22C55E]">
            Commercial Space
          </span>
        </h1>

        <p className="text-gray-400 text-lg max-w-md mb-8 leading-relaxed">
          Office suites, coworking, and retail in Downtown Bristol, TN.
          Browse available spaces or chat with our AI advisor — no phone calls required.
        </p>

        {/* Primary CTA — properties page */}
        <Link
          href="/commercial-real-estate"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-black text-base hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(74,222,128,0.25)] mb-4"
        >
          Browse All Available Spaces →
        </Link>
        <p className="text-xs text-gray-600 mb-10">No obligation · No phone call required</p>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
          {[
            { icon: "🏢", label: "Premium Downtown Spaces" },
            { icon: "⚡", label: "AI-Matched to Your Needs" },
            { icon: "🔒", label: "No Obligation" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Property link grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
          {PROPERTIES.map(({ label, sub, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-start px-3 py-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] hover:bg-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.35)] transition-all text-left"
            >
              <span className="text-xs font-bold text-white leading-tight group-hover:text-[#4ADE80] transition-colors">{label}</span>
              <span className="text-[10px] text-gray-600 mt-0.5 leading-tight">{sub}</span>
            </Link>
          ))}
        </div>

        {/* Chat nudge */}
        <p className="text-xs text-gray-600 mt-8 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
          Or chat with our AI Space Advisor below
        </p>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-[11px] text-gray-700">
        Vision LLC · Downtown Bristol, TN · All rights reserved
      </footer>

      {/* Chat widget — auto-opens from ?utm_source=instagram */}
      <AIChatWidget />
    </main>
  );
}
