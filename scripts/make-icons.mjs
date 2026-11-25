import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const CRC_TABLE = new Uint32Array(256)
for (let index = 0; index < 256; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  CRC_TABLE[index] = value >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const TEAL = [15, 111, 115, 255]
const CREAM = [255, 250, 243, 255]
const SAND = [246, 226, 196, 255]

function rounded(size, radius, maskable) {
  const pixels = Buffer.alloc(size * size * 4)
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const offset = (y * size + x) * 4
    pixels[offset] = color[0]
    pixels[offset + 1] = color[1]
    pixels[offset + 2] = color[2]
    pixels[offset + 3] = color[3]
  }
  const inside = (x, y) => {
    if (maskable) return true
    const inset = Math.min(x, y, size - 1 - x, size - 1 - y)
    if (inset >= radius) return true
    const cx = x < radius ? radius : size - radius
    const cy = y < radius ? radius : size - radius
    const dx = x + 0.5 - cx
    const dy = y + 0.5 - cy
    return dx * dx + dy * dy <= radius * radius
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (inside(x, y)) set(x, y, TEAL)
    }
  }
  const scale = size / 32
  const stroke = Math.max(2, Math.round(2 * scale))
  const line = (x1, y1, x2, y2, color) => {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * scale)
    for (let step = 0; step <= steps; step += 1) {
      const t = steps === 0 ? 0 : step / steps
      const x = (x1 + (x2 - x1) * t) * scale
      const y = (y1 + (y2 - y1) * t) * scale
      for (let oy = -stroke; oy <= stroke; oy += 1) {
        for (let ox = -stroke; ox <= stroke; ox += 1) {
          if (ox * ox + oy * oy <= stroke * stroke) set(Math.round(x + ox), Math.round(y + oy), color)
        }
      }
    }
  }
  const arc = (cx, cy, radiusPx, start, end, color) => {
    const steps = Math.ceil(Math.abs(end - start) * radiusPx * scale * 2)
    for (let step = 0; step <= steps; step += 1) {
      const angle = start + ((end - start) * step) / steps
      const x = cx * scale + Math.cos(angle) * radiusPx * scale
      const y = cy * scale + Math.sin(angle) * radiusPx * scale
      for (let oy = -stroke; oy <= stroke; oy += 1) {
        for (let ox = -stroke; ox <= stroke; ox += 1) {
          if (ox * ox + oy * oy <= stroke * stroke) set(Math.round(x + ox), Math.round(y + oy), color)
        }
      }
    }
  }
  line(7, 16.5, 9.2, 16.5, CREAM)
  line(9.2, 16.5, 11.8, 12.3, CREAM)
  line(11.8, 12.3, 11.8, 20.7, CREAM)
  line(11.8, 20.7, 14.4, 16.5, CREAM)
  line(14.4, 16.5, 17, 16.5, CREAM)
  arc(18.2, 16.5, 2.4, -1.05, 1.05, SAND)
  arc(18.2, 16.5, 4.6, -1.05, 1.05, SAND)
  return png(size, size, pixels)
}

const directory = path.resolve(import.meta.dirname, "../public/icons")
mkdirSync(directory, { recursive: true })
writeFileSync(path.join(directory, "icon-192.png"), rounded(192, 42, false))
writeFileSync(path.join(directory, "icon-512.png"), rounded(512, 112, false))
writeFileSync(path.join(directory, "icon-maskable-512.png"), rounded(512, 0, true))
writeFileSync(path.join(directory, "apple-touch-icon.png"), rounded(180, 0, true))
console.log("wrote icons")
