export const SITE_NAME = "MatchKeeper";

export const SITE_TAGLINE = "Every match deserves a real keeper";

export const SITE_DESCRIPTION =
  "Find a goalkeeper for your amateur football match in London. A community project connecting teams with available goalkeepers so no game gets cancelled.";

// Dominio de producción. Preview usa APP_URL (https://staging.matchkeeperuk.com) para los enlaces de pagos y emails.
export const SITE_URL = "https://matchkeeperuk.com";

export const CITY = "London";

// Buzón público (footer, páginas legales, emails). Cloudflare Email Routing lo reenvía a Gmail.
export const CONTACT_EMAIL = "hello@matchkeeperuk.com";

// The three Google Forms used in the UK (London) validation phase.
export const FORMS = {
  teams: "https://forms.gle/c7HqnwWLMjvY6KRz8",
  goalkeepers: "https://forms.gle/GjnP3poE6GTkQyNB6",
  goalkeeperRegistration: "https://forms.gle/dPBqbu7D3QNBh9XS8",
} as const;

// MatchKeeper UK social accounts.
export const SOCIALS = {
  instagram: "https://www.instagram.com/matchkeeper.uk/",
  facebook: "https://www.facebook.com/profile.php?id=61594915130066",
} as const;
