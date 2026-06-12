/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.teamvisionllc.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase storage — property gallery images
      { protocol: "https", hostname: "jjbswcdsssthqecrcafl.supabase.co" },
    ],
    unoptimized: false,
  },

  // ── Security headers applied to every response ─────────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking — only our own domain can frame the site
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop browsers from MIME-sniffing the content-type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer info: send origin on same-site, only origin on cross-site HTTPS
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features we don't need
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Enable browser XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // DNS prefetch for performance without leaking
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      // ── No-cache for API routes — never serve stale auth responses ──────────
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
  // ── Legacy Wix URL redirects (301 permanent) ───────────────────────────────
  // Old site URLs still indexed by Google — redirect to new equivalents
  async redirects() {
    return [
      // Old Wix property pages → new property pages
      { source: "/citycentre",                    destination: "/properties/city-centre",              permanent: true },
      { source: "/CityCenter",                    destination: "/properties/city-centre",              permanent: true },
      { source: "/city-centre",                   destination: "/properties/city-centre",              permanent: true },
      { source: "/CommercialLeasingbySquareFoot",  destination: "/commercial-real-estate",             permanent: true },
      { source: "/commercialleasingbysquarefoot",  destination: "/commercial-real-estate",             permanent: true },
      { source: "/theexecutive",                   destination: "/properties/the-executive",           permanent: true },
      { source: "/TheExecutive",                   destination: "/properties/the-executive",           permanent: true },
      { source: "/the-executive",                  destination: "/properties/the-executive",           permanent: true },
      { source: "/bristolcowork",                  destination: "/properties/bristol-cowork",          permanent: true },
      { source: "/BristolCoWork",                  destination: "/properties/bristol-cowork",          permanent: true },
      { source: "/bristol-cowork",                 destination: "/properties/bristol-cowork",          permanent: true },
      { source: "/cowork",                         destination: "/properties/bristol-cowork",          permanent: true },
      { source: "/centrepoint",                    destination: "/properties/centre-point-suites",     permanent: true },
      { source: "/CentrePoint",                    destination: "/properties/centre-point-suites",     permanent: true },
      { source: "/centre-point-suites",            destination: "/properties/centre-point-suites",     permanent: true },
      { source: "/foundation",                     destination: "/properties/foundation-event-facility", permanent: true },
      { source: "/Foundation",                     destination: "/properties/foundation-event-facility", permanent: true },
      { source: "/foundation-event-facility",      destination: "/properties/foundation-event-facility", permanent: true },
      { source: "/warehouse",                      destination: "/properties/warehouse",               permanent: true },
      { source: "/west-state-commons",             destination: "/properties/west-state-commons",       permanent: true },
      { source: "/815-shelby-street",              destination: "/properties/815-shelby-street",        permanent: true },
      { source: "/250-commonwealth-ave",           destination: "/properties/250-commonwealth-ave",     permanent: true },
      { source: "/628-state-street",               destination: "/properties/628-state-street",         permanent: true },
      { source: "/628StateStreet",                 destination: "/properties/628-state-street",         permanent: true },
      { source: "/628statestreet",                 destination: "/properties/628-state-street",         permanent: true },
      // Old Wix general pages
      { source: "/about-us",                       destination: "/about",                              permanent: true },
      { source: "/contact-us",                     destination: "/contact",                            permanent: true },
      { source: "/home",                           destination: "/",                                   permanent: true },
      { source: "/Home",                           destination: "/",                                   permanent: true },
    ];
  },
};

module.exports = nextConfig;
