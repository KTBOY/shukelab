/**
 * SK-FLUX Capsule — 颜色解析与调色板归一化
 *
 * 纯函数、零平台依赖。将用户传入的 CSS 颜色(字符串/数组)
 * 归一化为着色器可用的 RGB(0~1)调色板。
 */
import type { RGB } from './renderer'

/** 着色器支持的最大颜色数，与 shaders.ts 的 MAX_COLORS 保持一致 */
export const MAX_PALETTE_SIZE = 6

/**
 * 解析 CSS 颜色字符串为 RGB 三元组(0~1)。
 * 支持 #rgb / #rrggbb / rgb(r, g, b)。
 */
export function parseCssColor(input: string): RGB {
  const value = input.trim()

  /* #rgb / #rrggbb */
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (hex) {
    const body = hex[1]
    const full =
      body.length === 3
        ? body.split('').map((c) => c + c).join('')
        : body
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255,
    ]
  }

  /* rgb(r, g, b) */
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(value)
  if (rgb) {
    return [
      Math.min(255, Number(rgb[1])) / 255,
      Math.min(255, Number(rgb[2])) / 255,
      Math.min(255, Number(rgb[3])) / 255,
    ]
  }

  throw new Error(`[sk-flux-capsule] 无法解析颜色: "${input}"，支持 #rgb/#rrggbb/rgb()`)
}

/** RGB(0~1)按 HSL 亮度偏移，用于单色自动派生邻近色 */
function shiftLightness(color: RGB, delta: number): RGB {
  const [r, g, b] = color
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const target = Math.min(1, Math.max(0, l + delta))
  if (l === 0) return [target, target, target]
  const scale = target / l
  return [
    Math.min(1, r * scale),
    Math.min(1, g * scale),
    Math.min(1, b * scale),
  ]
}

/**
 * 归一化调色板：
 * - 字符串：先按逗号切分（支持 "#f00, #0f0" 写法）
 * - 1 色：派生亮(+0.18)/暗(-0.18)邻近色凑成 3 色，单色也有云雾层次
 * - 2~6 色：原样使用
 * - 超过 6 色：等距重采样为 6 色
 */
export function normalizePalette(input: string | readonly string[]): RGB[] {
  const raw = typeof input === 'string' ? input.split(',') : input
  const parsed = raw
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .map(parseCssColor)

  if (parsed.length === 0) {
    throw new Error('[sk-flux-capsule] colors 至少需要一个有效颜色')
  }
  if (parsed.length === 1) {
    const base = parsed[0]
    return [shiftLightness(base, 0.18), base, shiftLightness(base, -0.18)]
  }
  if (parsed.length <= MAX_PALETTE_SIZE) return parsed

  /* 等距重采样为 MAX_PALETTE_SIZE 个 */
  const step = (parsed.length - 1) / (MAX_PALETTE_SIZE - 1)
  return Array.from({ length: MAX_PALETTE_SIZE }, (_, i) => parsed[Math.round(i * step)])
}
