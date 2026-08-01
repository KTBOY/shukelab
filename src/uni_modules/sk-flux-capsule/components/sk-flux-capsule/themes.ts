/**
 * SK-FLUX Capsule — 预设主题配色
 *
 * colors 为 CSS 颜色字符串（传给 SkFluxCapsule 的 colors prop），
 * accent 为强调色（可用于外部 UI 配色参考）。
 *
 * 此文件作为预设配色参考，组件本身不强制依赖，
 * 用户可直接将 colors 数组传入组件，无需引入此文件。
 */

export interface SkFluxTheme {
  /** 唯一标识 */
  readonly id: string
  /** 英文名 */
  readonly name: string
  /** 中文名 */
  readonly label: string
  /** 强调色(CSS) */
  readonly accent: string
  /** 调色板(CSS 颜色字符串，1~6 个) */
  readonly colors: readonly string[]
}

export const SK_FLUX_THEMES: readonly SkFluxTheme[] = [
  {
    id: 'original',
    name: 'ORIGINAL',
    label: '原始版本',
    accent: '#f0679e',
    colors: ['#ff4f9e', '#ff8c40', '#b83dff'],
  },
  {
    id: 'aurora',
    name: 'AURORA',
    label: '极光',
    accent: '#2fbf8f',
    colors: ['#14e094', '#2e7aff', '#8c40f2'],
  },
  {
    id: 'klein',
    name: 'KLEIN',
    label: '克莱因',
    accent: '#e08a3c',
    colors: ['#002ea6', '#2140d9', '#ff5c1f'],
  },
  {
    id: 'ultraviolet',
    name: 'ULTRAVIOLET',
    label: '超紫',
    accent: '#7a52d6',
    colors: ['#7a3dff', '#b8d43d', '#4d2ba1'],
  },
  {
    id: 'chrome',
    name: 'CHROME',
    label: '铬',
    accent: '#8a8a8a',
    colors: ['#212121', '#8c8c8c', '#d1d1d1'],
  },
  {
    id: 'sunset',
    name: 'SUNSET',
    label: '落日',
    accent: '#e0a030',
    colors: ['#ffb82e', '#ff5747', '#9e2470'],
  },
]
