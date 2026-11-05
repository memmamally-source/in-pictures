/**
 * (Shared with the Oursome app: src/features/albums/exif.ts.)
 *
 * Just enough of EXIF to sort photos by when they were taken: the capture
 * date and the orientation flag. Reads the first part of a JPEG; anything
 * unexpected returns {} rather than throwing.
 */
export type Exif = { takenAt?: string; orientation?: number };

const TAG_ORIENTATION = 0x0112;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;

export function readExif(buffer: ArrayBuffer): Exif {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return {};
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) return readTiff(view, offset + 10);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break; // start of image data: no EXIF
      offset += 2 + size;
    }
  } catch {
    // Corrupt or truncated: no metadata.
  }
  return {};
}

function readTiff(view: DataView, tiff: number): Exif {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  const ascii = (o: number, n: number) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = view.getUint8(o + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const entries = (ifd: number) => {
    const out = new Map<number, { type: number; count: number; valueOffset: number }>();
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      out.set(u16(e), { type: u16(e + 2), count: u32(e + 4), valueOffset: e + 8 });
    }
    return out;
  };
  const text = (e?: { count: number; valueOffset: number }) =>
    e ? ascii(e.count > 4 ? tiff + u32(e.valueOffset) : e.valueOffset, e.count) : undefined;

  const ifd0 = entries(tiff + u32(tiff + 4));
  const result: Exif = {};
  const o = ifd0.get(TAG_ORIENTATION);
  if (o) result.orientation = u16(o.valueOffset);
  let date = text(ifd0.get(TAG_DATETIME));
  const exifPtr = ifd0.get(TAG_EXIF_IFD);
  if (exifPtr) date = text(entries(tiff + u32(exifPtr.valueOffset)).get(TAG_DATETIME_ORIGINAL)) ?? date;
  const iso = date ? toIso(date) : undefined;
  if (iso) result.takenAt = iso;
  return result;
}

/** "2024:08:12 14:03:22" → "2024-08-12T14:03:22" (local time, as the camera recorded it). */
export function toIso(exifDate: string): string | undefined {
  const m = exifDate.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m || m[1] === '0000') return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

/** Orientations 5–8 are rotated a quarter turn, so width and height swap. */
export const swapsSides = (orientation?: number) => !!orientation && orientation >= 5 && orientation <= 8;
