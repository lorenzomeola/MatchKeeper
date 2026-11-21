import type { Metadata } from "next";
import { ProductHome } from "@/components/platform/product-home";
import { getPaymentMode } from "@/lib/payments/mode";
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIALS } from "@/lib/site";

const TITLE = "Find a goalkeeper for your football match in London";
const DESCRIPTION =
  "Post your match and nearby goalkeepers apply, or join as a goalkeeper and play more matches. Free during the London beta.";

// Landing pública de la beta: los enlaces de redes apuntan aquí.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/home" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/home`,
    siteName: SITE_NAME,
    locale: "en_GB",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/social-uk/matchkeeper-profile-orange.png`,
      email: CONTACT_EMAIL,
      sameAs: [SOCIALS.instagram, SOCIALS.facebook],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/home`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en-GB",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

// El texto depende del interruptor de pagos: se regenera cada minuto para reflejar un cambio.
export const revalidate = 60;

export default async function HomePreview() {
  const mode = await getPaymentMode();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductHome payments={mode === "paid"} modeUnavailable={mode === "unavailable"} />
    </>
  );
}
