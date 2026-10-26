# MatchKeeper — Archived validation landing notes (UK pilot)

> Historical notes for the Google Forms validation landing. They do not describe the current product homepage or release status; see [README.md](README.md) and [PRODUCT_PLAN.md](PRODUCT_PLAN.md).

Landing page para validar la idea de "portero a demanda" para fútbol amateur.
Objetivo: explicar la propuesta, captar waitlist y llevar a los 3 Google Forms.

**Pivot de mercado (2026-09)**: el piloto pasó de Gante (Bélgica) a Londres
(UK). La versión trilingüe (EN/NL/FR) de Bélgica quedó archivada en
[archive/belgium-ghent/](archive/belgium-ghent/) — el sitio activo es ahora
solo en inglés. Los 3 Google Forms de UK **ya están creados y conectados**
en `lib/site.ts` (el borrador de preguntas usado para crearlos vive en
`research/surveys-uk-draft.md`).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- Fuentes vía `next/font/google` (Chakra Petch display, Geist, JetBrains Mono)
- Sin backend ni base de datos. Los CTA enlazan a los Google Forms.
- Deploy en **Vercel Hobby** (gratis). Único coste: el dominio.

## Ejecutar en local

```powershell
cd MatchKeeper
npm install
npm run dev
```

Abre http://localhost:3000

## Tema "Daylight Pitch"

Todo el tema está centralizado para poder cambiarlo fácil:

- **Colores**: variables CSS en `app/globals.css` (`--bg`, `--accent`, `--amber`…).
  Fondo blanco cálido + acento naranja. Cambia esos tokens y cambia toda la web.
- **Fuentes**: en un solo sitio, `app/layout.tsx`.
- **Fondo (textura de red + halo naranja)**: componente aislado
  `components/pitch-background.tsx`.
- **Foto del hero**: `public/hero-keeper.jpg` (Pexels, uso libre), difuminada
  hacia el fondo con una máscara CSS en `components/landing.tsx`.
- **Textos y enlaces de forms**: `lib/content.ts` (copy) y `lib/site.ts`
  (constantes + URLs de los 3 forms).

## Estructura de la landing (5 secciones)

1. **Hero** — propuesta de valor + foto + 2 CTAs.
2. **Benefits** — dos columnas (equipos vs. arqueros).
3. **Story** — sección honesta en vez de prueba social falsa (sin
   testimonios ni reseñas inventadas).
4. **How it works** — flujo tipo marketplace: el equipo publica, los
   arqueros se postulan, el equipo elige.
5. **Final CTA** — bloque a sangre negra con los 3 formularios.

```
app/
  layout.tsx        # fuentes + metadata
  page.tsx          # renderiza <Landing />
  globals.css       # tema Daylight Pitch (tokens CSS)
components/
  landing.tsx           # las 5 secciones de la landing
  pitch-background.tsx  # fondo decorativo
  cta-button.tsx         # botón CTA reutilizable (primary / ghost / invert)
  goal-frame.tsx         # ilustración SVG de la portería
  logo.tsx               # LogoMark + Logo (usa --accent)
lib/
  content.ts        # todo el copy de la landing
  site.ts           # constantes + URLs de los 3 forms
```

## Notas

- Copy provisional (la propuesta de valor se refinará).
- Posicionamiento honesto: proyecto en fase de validación en Londres, no un
  servicio ya operativo. Nada de buzzwords ni promesas exageradas — la
  sección "Story" de la landing lo dice explícitamente (sin testimonios ni
  reseñas inventadas).
