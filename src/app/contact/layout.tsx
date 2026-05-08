import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Vision LLC | Lease Inquiries & Property Tours | Bristol, TN",
  description:
    "Contact Vision LLC for commercial real estate in Bristol TN, Kingsport, Johnson City & the Tri-Cities. Call (423) 573-1022 or fill out our form to schedule a tour of office suites, retail space, or coworking memberships.",
  keywords: [
    "contact Vision LLC Bristol TN",
    "commercial real estate inquiry Bristol Tennessee",
    "office space tour Bristol TN",
    "leasing inquiry Tri-Cities CRE",
    "schedule property tour Bristol",
    "Vision LLC leasing contact",
    "Bristol TN coworking inquiry",
    "executive advisement contact",
    "commercial property Bristol Virginia",
    "423-573-1022 Vision LLC",
  ],
  alternates: {
    canonical: "https://www.teamvisionllc.com/contact",
  },
  openGraph: {
    title: "Contact Vision LLC | Commercial Real Estate Experts — Bristol, TN",
    description:
      "Reach out to schedule a tour of office suites, retail space, or coworking memberships in Downtown Bristol. Vision LLC — the Tri-Cities' leading commercial property firm.",
    url: "https://www.teamvisionllc.com/contact",
    siteName: "Vision LLC",
    type: "website",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=Contact+Vision+LLC&subtitle=Schedule+a+Tour+%C2%B7+Bristol%2C+TN+37620&tag=Get+In+Touch&type=default",
        width: 1200,
        height: 630,
        alt: "Contact Vision LLC — Commercial Real Estate Bristol TN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Vision LLC | Commercial Real Estate | Bristol, TN",
    description:
      "Schedule a tour or ask about available commercial space in the Tri-Cities TN/VA. (423) 573-1022 | leasing@teamvisionllc.com",
    images: [
      "https://www.teamvisionllc.com/api/og?title=Contact+Vision+LLC&subtitle=Schedule+a+Tour+%C2%B7+Bristol%2C+TN+37620&tag=Get+In+Touch&type=default",
    ],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact Vision LLC",
            url: "https://www.teamvisionllc.com/contact",
            mainEntity: {
              "@type": "RealEstateAgent",
              name: "Vision LLC",
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
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:00",
                closes: "17:00",
              },
            },
          }),
        }}
      />
      {children}
    </>
  );
}
