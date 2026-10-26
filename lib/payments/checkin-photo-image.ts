import sharp from "sharp";

const MAX_SIDE = 1280;
const ACCEPTED = new Set(["jpeg", "png", "webp"]);

/** Valida que sea una foto de verdad y la recodifica: sin EXIF (ni GPS), orientada y de tamaño razonable. */
export async function normalizeCheckInPhoto(input: Buffer): Promise<Buffer | null> {
  try {
    const opts = { limitInputPixels: 50_000_000 };
    const meta = await sharp(input, opts).metadata();
    if (!meta.format || !ACCEPTED.has(meta.format)) return null;
    // sharp descarta los metadatos al recodificar salvo que se pida lo contrario.
    return await sharp(input, opts)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
  } catch {
    return null;
  }
}
