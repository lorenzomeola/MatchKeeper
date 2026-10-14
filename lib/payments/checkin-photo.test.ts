import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { canAddCheckInPhoto } from "./checkin-photo.ts";
import { normalizeCheckInPhoto } from "./checkin-photo-image.ts";

const endsAt = new Date("2026-10-14T18:00:00Z");
const base = { status: "confirmed", checkedIn: true, hasPhoto: false, now: new Date("2026-10-14T17:00:00Z"), endsAt };

test("la foto solo se puede añadir con check-in, una vez y antes de que acabe el partido", () => {
  assert.equal(canAddCheckInPhoto(base), true);
  assert.equal(canAddCheckInPhoto({ ...base, checkedIn: false }), false);
  assert.equal(canAddCheckInPhoto({ ...base, hasPhoto: true }), false);
  assert.equal(canAddCheckInPhoto({ ...base, status: "cancelled" }), false);
  assert.equal(canAddCheckInPhoto({ ...base, status: "completed" }), false);
  assert.equal(canAddCheckInPhoto({ ...base, now: new Date("2026-10-14T18:00:01Z") }), false);
});

test("la foto se recodifica sin EXIF y con la orientación aplicada", async () => {
  const src = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#808080" } })
    .jpeg()
    .withExif({ IFD0: { ImageDescription: "secret location" } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
  assert.ok((await sharp(src).metadata()).exif, "la entrada trae EXIF");

  const out = await normalizeCheckInPhoto(src);
  assert.ok(out);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.exif, undefined);
  assert.equal(meta.orientation, undefined);
  assert.deepEqual([meta.width, meta.height], [100, 200]);
});

test("las fotos grandes se reducen y lo que no es foto se rechaza", async () => {
  const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#336699" } }).png().toBuffer();
  const out = await normalizeCheckInPhoto(big);
  assert.ok(out);
  const meta = await sharp(out).metadata();
  assert.equal(Math.max(meta.width ?? 0, meta.height ?? 0), 1280);

  assert.equal(await normalizeCheckInPhoto(Buffer.from("not an image")), null);
  assert.equal(await normalizeCheckInPhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')), null);
  const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).gif().toBuffer();
  assert.equal(await normalizeCheckInPhoto(gif), null);
});
