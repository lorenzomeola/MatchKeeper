import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import { CONTACT_EMAIL } from "./site.ts";

function renderLegalPage(name: "privacy" | "terms" | "safety", payments: boolean): string {
  const source = readFileSync(new URL(`../app/(legal)/${name}/page.tsx`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: { default?: () => ReactNode } = {};
  runInNewContext(compiled, {
    exports,
    require(id: string) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "@/lib/site") return { CONTACT_EMAIL };
      if (id === "@/components/platform/legal-shell") {
        return {
          LegalShell: ({ children, updated }: {
            children: (paid: boolean) => ReactNode;
            updated: string;
          }) => createElement("article", { "data-updated": updated }, children(payments)),
        };
      }
      throw new Error(`Unexpected legal page dependency: ${id}`);
    },
  });
  assert.ok(exports.default);
  return renderToStaticMarkup(createElement(exports.default));
}

for (const payments of [false, true]) {
  const mode = payments ? "paid" : "free beta";

  test(`${mode}: privacy discloses searches, public photos and manual rights handling`, () => {
    const html = renderLegalPage("privacy", payments);
    assert.match(html, /data-updated="2026-10-27"/);
    assert.match(html, /pitch or address search terms/);
    assert.match(html, /store its address and coordinates/);
    assert.match(html, /Permanent Geocoding/);
    assert.match(html, /we do not send them to Mapbox for address lookup/);
    assert.match(html, /anyone with the image URL can view them/);
    assert.match(html, /Cloudflare Email Routing and Google Gmail/);
    assert.match(html, /normally one month/);
    assert.match(html, /no self-service/);
    assert.match(html, /There is no automatic|there is no automatic/);
    assert.match(html, /not covered by the exact-coordinate purge/);
    assert.match(html, /seven-day retention window/);
    assert.match(html, /do not maintain a\s+separate image backup/);
    assert.match(html, /mailto:hello@matchkeeperuk.com/);
    assert.doesNotMatch(html, /This draft|must be\s+confirmed before/);
    assert.equal(html.includes("Stripe"), payments);
  });

  test(`${mode}: terms explain closure separately from bookings and support deadlines`, () => {
    const html = renderLegalPage("terms", payments);
    assert.match(html, /acting as an individual based in Belgium/);
    assert.match(html, /Closing an account does not by itself cancel/);
    assert.match(html, /legal deadlines for data-protection requests/);
    assert.doesNotMatch(html, /draft terms|solicitor must review/);
    if (payments) {
      assert.match(html, /15% platform fee/);
      assert.match(html, /Payments are processed through Stripe/);
    } else {
      assert.match(html, /does not take payments during the beta/);
      assert.doesNotMatch(html, /15% platform fee|Payments are processed through Stripe/);
    }
  });

  test(`${mode}: safety avoids verification guarantees and explains report handling`, () => {
    const html = renderLegalPage("safety", payments);
    assert.match(html, /not a criminal-record check/);
    assert.match(html, /review a report or strike/);
    assert.match(html, /not monitored continuously/);
    assert.match(html, /call 999/);
    assert.match(html, /mailto:hello@matchkeeperuk.com/);
    assert.equal(html.includes("Stripe Connect"), payments);
  });
}
