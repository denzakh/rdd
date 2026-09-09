/**
 * Минимальный XLSX-райтер без зависимостей (stored ZIP + inlineStr).
 * Числа — numeric cells, шапка — inline strings, один лист dataset.
 */
import type { DeidentifiedDataset, DeidentifiedRow } from './types'

const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const colLetter = (i: number): string => {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (bytes: Uint8Array): number => {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** ZIP-архив методом store (без сжатия) — достаточно для .xlsx. */
function buildZipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const u16 = (a: number[], v: number): void => {
    a.push(v & 0xff, (v >>> 8) & 0xff)
  }
  const u32 = (a: number[], v: number): void => {
    a.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff)
  }
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local: number[] = []
    u32(local, 0x04034b50)
    u16(local, 20)
    u16(local, 0x0800)
    u16(local, 0)
    u16(local, 0)
    u16(local, 0)
    u32(local, crc)
    u32(local, f.data.length)
    u32(local, f.data.length)
    u16(local, name.length)
    u16(local, 0)
    const lh = new Uint8Array(local)
    chunks.push(lh, name, f.data)
    const ce: number[] = []
    u32(ce, 0x02014b50)
    u16(ce, 20)
    u16(ce, 20)
    u16(ce, 0x0800)
    u16(ce, 0)
    u16(ce, 0)
    u16(ce, 0)
    u32(ce, crc)
    u32(ce, f.data.length)
    u32(ce, f.data.length)
    u16(ce, name.length)
    u16(ce, 0)
    u16(ce, 0)
    u16(ce, 0)
    u16(ce, 0)
    u32(ce, 0)
    u32(ce, offset)
    central.push(new Uint8Array(ce), name)
    offset += lh.length + name.length + f.data.length
  }
  const centralSize = central.reduce((a, c) => a + c.length, 0)
  const end: number[] = []
  u32(end, 0x06054b50)
  u16(end, 0)
  u16(end, 0)
  u16(end, files.length)
  u16(end, files.length)
  u32(end, centralSize)
  u32(end, offset)
  u16(end, 0)
  const tail = new Uint8Array(end)
  const out = new Uint8Array(offset + centralSize + tail.length)
  let p = 0
  for (const c of [...chunks, ...central, tail]) {
    out.set(c, p)
    p += c.length
  }
  return out
}

const sheetXml = (columns: string[], rows: DeidentifiedRow[]): string => {
  const num = (ref: string, v: number | null | undefined): string =>
    v === null || v === undefined || Number.isNaN(v)
      ? `<c r="${ref}"/>`
      : `<c r="${ref}"><v>${v}</v></c>`
  const str = (ref: string, s: string): string =>
    `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(s)}</t></is></c>`
  let xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">`
  columns.forEach((c, i) => {
    xml += str(`${colLetter(i)}1`, c)
  })
  xml += `</row>`
  rows.forEach((r, ri) => {
    xml += `<row r="${ri + 2}">`
    columns.forEach((c, i) => {
      xml += num(`${colLetter(i)}${ri + 2}`, (r as Record<string, number | null>)[c] ?? null)
    })
    xml += `</row>`
  })
  return xml + `</sheetData></worksheet>`
}

/** XLSX: один лист dataset поверх нейтральных rows/columns. */
export function toXlsx(data: DeidentifiedDataset): Uint8Array {
  const enc = new TextEncoder()
  const b = (s: string): Uint8Array => enc.encode(s)
  return buildZipStore([
    {
      name: '[Content_Types].xml',
      data: b(
        `<?xml version="1.0" encoding="UTF-8"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `</Types>`
      ),
    },
    {
      name: '_rels/.rels',
      data: b(
        `<?xml version="1.0" encoding="UTF-8"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: b(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="dataset" sheetId="1" r:id="rId1"/></sheets></workbook>`
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: b(
        `<?xml version="1.0" encoding="UTF-8"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `</Relationships>`
      ),
    },
    { name: 'xl/worksheets/sheet1.xml', data: b(sheetXml(data.columns, data.rows)) },
  ])
}
