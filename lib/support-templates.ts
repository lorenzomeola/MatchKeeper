// Plantillas del chat con porteros. Las {variables} se rellenan solas; lo que va entre [corchetes] lo completa el admin.

export type SupportVar = "name" | "missing" | "profileLink" | "browseLink" | "openMatches" | "pitch" | "when" | "matchLink";
export type SupportVars = Partial<Record<SupportVar, string>>;

export type SupportTemplate = {
  id:
    | "complete_profile"
    | "question"
    | "welcome"
    | "open_matches"
    | "urgent_match"
    | "inactive"
    | "community_thanks"
    | "no_applications";
  label: string;
  stage: "review" | "approved" | "player";
  body: string;
};

export const SUPPORT_TEMPLATES: readonly SupportTemplate[] = [
  {
    id: "complete_profile",
    label: "Complete your profile",
    stage: "review",
    body: "Hi {name}, thanks for signing up to MatchKeeper. Your profile is almost ready, but we need a bit more before we can approve it: {missing}. You can update it here: {profileLink}. Reply here if you have any questions.",
  },
  {
    id: "question",
    label: "Ask a question",
    stage: "review",
    body: "Hi {name}, a quick question before we approve your profile: [your question]. You can just reply here.",
  },
  {
    id: "welcome",
    label: "Welcome",
    stage: "approved",
    body: "Welcome aboard, {name}! Your profile is approved and you can now apply to matches. New matches are posted regularly, so keep an eye on {browseLink}. If you ever have a question, write to us here.",
  },
  {
    id: "open_matches",
    label: "Open matches",
    stage: "approved",
    body: "Hi {name}, {openMatches} looking for a keeper right now. Have a look and apply to the ones that suit you: {browseLink}",
  },
  {
    id: "urgent_match",
    label: "Urgent match",
    stage: "approved",
    body: "Hi {name}, a team needs a keeper at short notice: {pitch}, {when}. If you're free, apply here: {matchLink}",
  },
  {
    id: "inactive",
    label: "Haven't seen you",
    stage: "approved",
    body: "Hi {name}, we haven't seen you apply for a while. Is there anything that's stopping you, like the area, the times or the rate? Tell us and we'll try to help.",
  },
  {
    id: "community_thanks",
    label: "Thank you",
    stage: "player",
    body: "Hi {name}, thank you for being part of MatchKeeper and for trusting us while we're still just getting started. Every match you post helps us grow a community of players and keepers. If you have a question, an idea or something that isn't working, write to us here. We read everything.",
  },
  {
    id: "no_applications",
    label: "No applications yet",
    stage: "player",
    body: "Hi {name}, your match at {pitch}, {when}, hasn't had keeper applications yet. We're still growing the keeper community and we're reaching out to keepers nearby. It can help to check the budget and level, or tell us anything that would make it easier for a keeper to say yes: {matchLink}",
  },
];

/** Sustituye las variables conocidas; las que no tienen valor se quedan tal cual para que el admin las vea. */
export function fillTemplate(body: string, vars: SupportVars): string {
  return body.replace(/\{(\w+)\}/g, (whole, key: string) => vars[key as SupportVar] ?? whole);
}

/** "there are 3 open matches" / "there is 1 open match". */
export function openMatchesPhrase(count: number): string {
  if (count === 1) return "there is 1 open match";
  return `there are ${count === 0 ? "no" : count} open matches`;
}

/** Lo que falta del perfil en una frase; si no falta nada, un hueco para que el admin lo escriba. */
export function missingPhrase(labels: string[]): string {
  if (labels.length === 0) return "[what is missing]";
  const items = labels.map((l) => l.toLowerCase());
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Trozos de un mensaje: los enlaces a la propia app se pueden pulsar, cualquier otro texto se queda como texto. */
export function linkifyOwn(text: string, origin: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  const re = /https?:\/\/[^\s]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    // Un punto o una coma pegados al final cierran la frase, no forman parte del enlace.
    const url = m[0].replace(/[.,;:!?)]+$/, "");
    const start = m.index ?? 0;
    const own = url === origin || url.startsWith(`${origin}/`);
    if (!own) continue;
    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ text: url, href: url });
    last = start + url.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
