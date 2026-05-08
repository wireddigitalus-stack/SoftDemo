import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import NavigationConditional from "@/components/NavigationConditional";
import FooterConditional from "@/components/FooterConditional";
import AIChatWidgetConditional from "@/components/AIChatWidgetConditional";
import MobileStickyBar from "@/components/MobileStickyBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.teamvisionllc.com"),
  title: {
    default: "Vision LLC | Downtown Bristol's #1 Commercial Real Estate Company",
    template: "%s | Vision LLC",
  },
  description:
    "Vision LLC — Downtown Bristol's premier commercial real estate firm. Office space, retail, coworking & executive consulting across the Tri-Cities TN/VA region.",
  keywords: [
    "commercial real estate Bristol TN",
    "commercial property Bristol Virginia",
    "office space downtown Bristol",
    "Tri-Cities commercial real estate",
    "Kingsport commercial property",
    "Johnson City office space",
    "Abingdon VA commercial real estate",
    "Elizabethton TN office space",
    "Gate City VA commercial property",
    "Blountville TN commercial real estate",
    "Greeneville TN office space",
    "Bristol CoWork",
    "executive advisement Tennessee",
    "Vision LLC Bristol",
    "Sullivan County commercial real estate",
    "Washington County commercial property",
    "Carter County office space",
    "37620", "37660", "37601", "24210", "37643", "24251", "37617", "37743",
    "downtown Bristol TN office",
    "State Street Bristol commercial property",
    "Tri-Cities MSA commercial real estate",
  ],
  authors: [{ name: "Vision LLC" }],
  creator: "Vision LLC",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.teamvisionllc.com",
    siteName: "Vision LLC",
    title: "Vision LLC | Tri-Cities Commercial Real Estate Leader",
    description:
      "The largest private commercial property owner in Downtown Bristol, TN/VA. Serving the entire Tri-Cities region.",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=Vision+LLC&subtitle=Commercial+Real+Estate+%C2%B7+Bristol%2C+TN+%E2%80%94+Tri-Cities+CRE+Leader&tag=Tri-Cities+CRE+Leader&type=default",
        width: 1200,
        height: 630,
        alt: "Vision LLC — Commercial Real Estate Bristol TN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vision LLC | Commercial Real Estate Leader in the Tri-Cities",
    description:
      "Award-winning commercial real estate, development & executive consulting across Bristol, Kingsport, Johnson City & the Tri-Cities.",
    images: [
      "https://www.teamvisionllc.com/api/og?title=Vision+LLC&subtitle=Commercial+Real+Estate+%C2%B7+Bristol%2C+TN+%E2%80%94+Tri-Cities+CRE+Leader&tag=Tri-Cities+CRE+Leader&type=default",
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#080C14" />
        <meta name="msapplication-TileColor" content="#080C14" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              name: "Vision LLC",
              alternateName: "Team Vision LLC",
              url: "https://www.teamvisionllc.com",
              logo: "https://www.teamvisionllc.com/logo.png",
              telephone: "+14235731022",
              email: "leasing@teamvisionllc.com",
              address: {
                "@type": "PostalAddress",
                streetAddress: "100 5th St., Suite 2W",
                addressLocality: "Bristol",
                addressRegion: "TN",
                postalCode: "37620",
                addressCountry: "US",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: "36.5951",
                longitude: "-82.1887",
              },
              areaServed: [
                { "@type": "City", name: "Bristol", containedIn: "Tennessee" },
                { "@type": "City", name: "Bristol", containedIn: "Virginia" },
                { "@type": "City", name: "Kingsport", containedIn: "Tennessee" },
                { "@type": "City", name: "Johnson City", containedIn: "Tennessee" },
                { "@type": "City", name: "Abingdon", containedIn: "Virginia" },
                { "@type": "City", name: "Gate City", containedIn: "Virginia" },
                { "@type": "City", name: "Elizabethton", containedIn: "Tennessee" },
                { "@type": "City", name: "Blountville", containedIn: "Tennessee" },
              ],
              description:
                "Vision LLC is the largest private commercial property owner in Downtown Bristol and an award-winning developer specializing in historic adaptive reuse across the Tri-Cities region.",
              foundingDate: "2002",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "47",
                bestRating: "5",
              },
              priceRange: "$$",
              currenciesAccepted: "USD",
              paymentAccepted: "Cash, Check, Wire Transfer",
              sameAs: [
                "https://www.facebook.com/teamvisionllc",
                "https://www.linkedin.com/company/vision-llc",
              ],
              hasMap: "https://maps.google.com/?q=100+5th+St+Bristol+TN+37620",
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:00",
                closes: "17:00",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Vision LLC",
              url: "https://www.teamvisionllc.com",
              description: "Commercial real estate, development & executive advisement across the Tri-Cities TN/VA region.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.teamvisionllc.com/commercial-real-estate?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="bg-mesh antialiased">
        <NavigationConditional />
        <main className="pb-20 lg:pb-0">{children}</main>
        <FooterConditional />
        <AIChatWidgetConditional />
        <MobileStickyBar />
      </body>
    </html>
  );
}
