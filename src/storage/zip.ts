/**
 * Minimal zip writer and reader ("stored", no compression — photos are
 * already compressed JPEGs). Entries are built from Blob slices, so large
 * backups are assembled without holding every photo in memory at once.
 * Limits: 4 GB per archive, no zip64.
 */

const enc = new TextEncoder();

let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

export function crc32(data: Uint8Array, crc = 0): number {
  const t = crcTable();
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** DOS date/time for zip headers. */
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export interface ZipInput {
  name: string;
  data: Blob | string;
}

export async function writeZip(entries: ZipInput[], onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const parts: BlobPart[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const blob = typeof e.data === 'string' ? new Blob([e.data]) : e.data;
    const bytes = new Uint8Array(await blob.arrayBuffer()); // one entry in memory at a time, for the checksum
    const crc = crc32(bytes);
    const name = enc.encode(e.name);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, name as Uint8Array<ArrayBuffer>, blob);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, bytes.length, true);
    cd.setUint32(24, bytes.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    const rec = new Uint8Array(new ArrayBuffer(46 + name.length));
    rec.set(new Uint8Array(cd.buffer), 0);
    rec.set(name, 46);
    central.push(rec);
    offset += 30 + name.length + bytes.length;
    onProgress?.(i + 1, entries.length);
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

export class NotABackupError extends Error {}

/** Reads a stored (uncompressed) zip into name → Blob slices. */
export async function readZip(file: Blob): Promise<Map<string, Blob>> {
  const tailSize = Math.min(file.size, 65_557);
  const tail = new DataView(await file.slice(file.size - tailSize).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new NotABackupError('This file isn’t a backup made by this app.');
  const count = tail.getUint16(eocd + 10, true);
  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const out = new Map<string, Blob>();
  let p = 0;
  for (let i = 0; i < count; i++) {
    if (cd.getUint32(p, true) !== 0x02014b50) throw new NotABackupError('This backup file is damaged.');
    const method = cd.getUint16(p + 10, true);
    const size = cd.getUint32(p + 20, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const localOffset = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    if (method !== 0) throw new NotABackupError('This zip uses compression; only backups made by this app can be restored.');
    const lh = new DataView(await file.slice(localOffset, localOffset + 30).arrayBuffer());
    const start = localOffset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    out.set(name, file.slice(start, start + size));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
