/**
 * Excel (.xlsx) ֆայլի պարզ ընթերցիչ՝ առանց արտաքին գրադարանների (նախատիպը աշխատում է offline, ԿԿՀ ներքին ցանց)։
 * xlsx-ը ZIP արխիվ է. կարդացվում են xl/sharedStrings.xml և առաջին թերթը։ Սեղմումը (deflate) բացվում է
 * DecompressionStream('deflate-raw')-ով (ժամանակակից բրաուզերներ և Node 18+)։
 * Վերադարձնում է տողերի զանգված. ամեն տող՝ բջիջների արժեքների զանգված (string), դատարկ բջիջը՝ ''։
 */

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** ZIP-ի կենտրոնական կատալոգ → { անուն: { method, offset, size } } */
function zipEntries(bytes) {
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Ֆայլը xlsx (ZIP) ձևաչափի չէ');
  const count = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  const entries = {};
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error('ZIP կատալոգը վնասված է');
    const method = u16(bytes, p + 10);
    const size = u32(bytes, p + 20);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const offset = u32(bytes, p + 42);
    entries[dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))] = { method, size, offset };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(bytes, entry) {
  const o = entry.offset;
  if (u32(bytes, o) !== 0x04034b50) throw new Error('ZIP տարրը վնասված է');
  const start = o + 30 + u16(bytes, o + 26) + u16(bytes, o + 28);
  const data = bytes.subarray(start, start + entry.size);
  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new Error(`Սեղմման անծանոթ եղանակ (${entry.method})`);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const textOf = (xml) => unescapeXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));
const colIndex = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** @param {ArrayBuffer|Uint8Array} buffer */
export async function readXlsx(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const entries = zipEntries(bytes);
  const shared = entries['xl/sharedStrings.xml'] ? [...(await readEntry(bytes, entries['xl/sharedStrings.xml'])).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const sheetName = entries['xl/worksheets/sheet1.xml'] ? 'xl/worksheets/sheet1.xml' : Object.keys(entries).find((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n));
  if (!sheetName) throw new Error('Ֆայլում թերթ չի գտնվել');
  const sheet = await readEntry(bytes, entries[sheetName]);
  const rows = [];
  for (const r of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(c[1])?.[1];
      const type = /\bt="(\w+)"/.exec(c[1])?.[1];
      const body = c[2] || '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (v !== undefined) value = unescapeXml(v);
      const idx = ref ? colIndex(ref) : row.length;
      while (row.length < idx) row.push('');
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows;
}
