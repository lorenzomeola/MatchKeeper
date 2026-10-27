import assert from "node:assert/strict";
import test from "node:test";
import { searchPlaces } from "./geocode.ts";

test("permanent geocoding request and result handling", async (t) => {
  const previousToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";
  t.after(() => {
    if (previousToken === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = previousToken;
  });

  await t.test("uses v6 permanent lookup once, without autocomplete or POI types", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0]) => {
      const url = new URL(String(input));
      assert.equal(url.origin + url.pathname, "https://api.mapbox.com/search/geocode/v6/forward");
      for (const [key, value] of Object.entries({
        q: "E95PF",
        permanent: "true",
        autocomplete: "false",
        country: "gb",
        limit: "5",
        bbox: "-0.6,51.2,0.4,51.75",
        proximity: "-0.1278,51.5074",
        language: "en",
        access_token: "test-token",
      })) assert.equal(url.searchParams.get(key), value);
      assert.equal(url.searchParams.get("types")?.split(",").includes("poi"), false);
      return Response.json({
        features: [
          {
            geometry: { coordinates: [-0.03, 51.55] },
            properties: { mapbox_id: "postcode", name: "E9 5PF", place_formatted: "London, United Kingdom" },
          },
          {
            geometry: { coordinates: [-0.03, 51.55] },
            properties: { name: "Duplicate" },
          },
        ],
      });
    });
    assert.deepEqual(await searchPlaces("E95PF"), [{
      id: "postcode", name: "E9 5PF", detail: "London",
      label: "E9 5PF, London", lat: 51.55, lng: -0.03,
    }]);
    assert.equal(fetch.mock.callCount(), 1);
  });

  await t.test("keeps the full address and coordinate order", async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({
      features: [{
        geometry: { coordinates: [-0.12, 51.5] },
        properties: { name: "10 Example Street", full_address: "10 Example Street, London, United Kingdom" },
      }],
    }));
    const [place] = await searchPlaces("10 Example Street");
    assert.equal(place.label, "10 Example Street, London");
    assert.equal(place.lat, 51.5);
    assert.equal(place.lng, -0.12);
  });

  await t.test("empty results are not errors", async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({ features: [] }));
    assert.deepEqual(await searchPlaces("Unknown pitch"), []);
  });

  await t.test("provider failure is surfaced without retrying temporary/Search Box APIs", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 403 }));
    await assert.rejects(searchPlaces("London"), /Search failed with 403/);
    assert.equal(fetch.mock.callCount(), 1);
  });

  await t.test("malformed results are not treated as an empty successful search", async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({ message: "Invalid response" }));
    await assert.rejects(searchPlaces("London"), /Invalid geocoding response/);
  });

  await t.test("missing token fails before any billable request", async (t) => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ features: [] }));
    await assert.rejects(searchPlaces("London"), /not configured/);
    assert.equal(fetch.mock.callCount(), 0);
  });
});
