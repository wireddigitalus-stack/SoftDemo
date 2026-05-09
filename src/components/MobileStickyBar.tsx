"use client";
import { usePathname } from "next/navigation";
import { Phone, MessageSquare } from "lucide-react";
import { COMPANY } from "@/lib/data";

/**
 * MobileStickyBar
 * Shown only on mobile/tablet (hidden on lg+). Provides a persistent
 * "Call Now" and "Ask VISION" bar at the bottom of the screen —
 * the two highest-intent actions for mobile visitors.
 * Hidden on admin and staff dashboards which have their own UI.
 */
export default function MobileStickyBar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/staff")) return null;
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      role="complementary"
      aria-label="Quick contact actions"
    >
      {/* Gradient fade above the bar so content doesn't hard-cut */}
      <div className="h-6 bg-gradient-to-t from-[#080B0F] to-transparent pointer-events-none" />

      <div className="bg-[#080B0F]/95 backdrop-blur-xl border-t border-[rgba(74,222,128,0.15)] px-4 py-3 flex gap-3">
        {/* Primary: Call Now */}
        <a
          href={COMPANY.phoneHref}
          id="mobile-sticky-call"
          className="flex-1 flex items-center justify-center gap-2 bg-[#4ADE80] text-[#080B0F] font-bold text-sm rounded-xl py-3.5 hover:bg-[#6EF4A0] transition-colors active:scale-95"
          aria-label={`Call Vision LLC at ${COMPANY.phone}`}
        >
          <Phone size={16} />
          Call Now · {COMPANY.phone}
        </a>

        {/* Secondary: Open AI Chat */}
        <button
          id="mobile-sticky-chat"
          onClick={() =>
            (document.getElementById("lease-bot-toggle") as HTMLButtonElement)?.click()
          }
          className="flex items-center justify-center gap-2 border border-[rgba(74,222,128,0.3)] text-[#4ADE80] font-bold text-sm rounded-xl px-4 py-3.5 hover:bg-[rgba(74,222,128,0.08)] transition-colors active:scale-95"
          aria-label="Open VISION AI chat"
        >
          <MessageSquare size={16} />
          Ask VISION
        </button>
      </div>
    </div>
  );
}
