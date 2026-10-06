export const SITE_NAME = "MatchKeeper";

export const SITE_TAGLINE = "Every match deserves a real keeper";

export const SITE_DESCRIPTION =
  "Find a goalkeeper for your amateur football match in London. A community project connecting teams with available goalkeepers so no game gets cancelled.";

// Dominio de producción actual en Vercel. Cambiar cuando se compre el dominio propio (p. ej. matchkeeper.co.uk).
export const SITE_URL = "https://matchkeeperservice.vercel.app";

export const CITY = "London";

// Punto de contacto publicado en el footer y las paginas legales. Cambiar en
// cuanto se de de alta el dominio/buzon definitivo.
export const CONTACT_EMAIL = "matchkeeperuk@gmail.com";

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
