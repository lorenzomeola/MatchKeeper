// Plantillas de email: HTML sencillo con estilos en línea (los clientes de correo no cargan CSS externo).
// Todo texto que venga de un usuario pasa por `escapeHtml`.
import { BOOKING_BUILDERS, type BookingTemplateData } from "./booking-templates.ts";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Rendered = { subject: string; html: string; text: string };

export type LayoutInput = {
  title: string;
  /** Asunto del email; por defecto el título. */
  subject?: string;
  /** Párrafos en texto plano; se escapan. */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Texto pequeño bajo el contenido. */
  note?: string;
};

const ACCENT = "#ff7a1a";
const INK = "#1a1005";

// Los enlaces de los botones solo pueden ser http(s): una URL con otro esquema se descarta.
function safeUrl(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

export function layout(input: LayoutInput, ctx: { siteUrl: string; contactEmail: string }): Rendered {
  const cta = input.cta && safeUrl(input.cta.url) ? input.cta : null;
  const paragraphs = input.paragraphs.map(
    (p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1a1a1a;">${escapeHtml(p)}</p>`,
  );
  const button = cta
    ? `<p style="margin:24px 0 8px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${ACCENT};color:${INK};font-weight:700;font-size:16px;text-decoration:none;padding:13px 22px;border-radius:8px;">${escapeHtml(cta.label)}</a></p>`
    : "";
  const note = input.note
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b6b6b;">${escapeHtml(input.note)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="background:${INK};padding:18px 28px;"><span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">Match<span style="color:${ACCENT};">Keeper</span></span></td></tr>
<tr><td style="height:4px;background:${ACCENT};line-height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#1a1a1a;">${escapeHtml(input.title)}</h1>
${paragraphs.join("\n")}
${button}${note}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #eeeae4;font-size:12px;line-height:1.5;color:#8a8a8a;">MatchKeeper &middot; London<br>Questions? Write to <a href="mailto:${escapeHtml(ctx.contactEmail)}" style="color:#8a8a8a;">${escapeHtml(ctx.contactEmail)}</a>.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    input.title,
    "",
    ...input.paragraphs,
    ...(cta ? ["", `${cta.label}: ${cta.url}`] : []),
    ...(input.note ? ["", input.note] : []),
    "",
    "MatchKeeper, London",
    `Questions? ${ctx.contactEmail}`,
  ].join("\n");

  return { subject: input.subject ?? input.title, html, text };
}

/** Datos que lleva cada plantilla en `email_outbox.payload`. */
export type TemplateData = BookingTemplateData & {
  test: { message: string; url?: string };
};
export type TemplateName = keyof TemplateData;

type Builder<K extends TemplateName> = (data: TemplateData[K], ctx: { siteUrl: string }) => LayoutInput;

const BUILDERS: { [K in TemplateName]: Builder<K> } = {
  ...BOOKING_BUILDERS,
  test: (d, ctx) => ({
    title: "MatchKeeper email test",
    paragraphs: [d.message],
    cta: { label: "Open MatchKeeper", url: d.url ?? ctx.siteUrl },
    note: "This is a test message. You can ignore it.",
  }),
};

export function renderEmail<K extends TemplateName>(
  template: K,
  data: TemplateData[K],
  ctx: { siteUrl: string; contactEmail: string },
): Rendered {
  const builder = BUILDERS[template] as Builder<K> | undefined;
  if (!builder) throw new Error(`Unknown email template: ${template}`);
  return layout(builder(data, ctx), ctx);
}
