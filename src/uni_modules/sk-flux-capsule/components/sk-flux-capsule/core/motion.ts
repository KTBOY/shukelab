/**
 * SK-FLUX Capsule — 交互动力学模型
 *
 * 将触摸/指针输入转换为烟雾流动参数，与渲染层完全解耦：
 * - press：按压状态，smoothstep 缓动渐入渐出(约 0.6s)
 * - stir：搅动能量，由滑动距离累积、指数衰减(约 1s 半衰)
 * - flowTime：逐帧积分的流动时间 —— 变速瞬间画面依然连续，不跳变
 *
 * 纯 TS 无平台依赖，可独立单元测试。
 */

export interface SkFluxMotionSnapshot {
  /** 累积流动时间，传给着色器 uTime */
  readonly flowTime: number
  /** 缓动后的按压强度 0~1，传给着色器 uActive */
  readonly active: number
  /** 当前流速(调试用) */
  readonly speed: number
}

export interface SkFluxMotionConfig {
  /** 静止基础流速 */
  baseSpeed: number
  /** 按压附加流速 */
  pressBoost: number
  /** 搅动满能量附加流速 */
  stirBoost: number
  /** 滑动像素 → 能量转换系数 */
  stirGain: number
  /** 搅动能量衰减速率(越大回落越快) */
  stirDecay: number
  /** 按压缓动速率 */
  pressEase: number
}

export const DEFAULT_MOTION_CONFIG: SkFluxMotionConfig = {
  baseSpeed: 0.22,
  pressBoost: 0.08,
  stirBoost: 0.55,
  stirGain: 0.012,
  stirDecay: 1.6,
  pressEase: 2.2,
}

/** smoothstep 缓动：起步慢-中段快-收尾慢，与 iOS 动效手感一致 */
function smoothstep01(x: number): number {
  return x * x * (3 - 2 * x)
}

export class SkFluxMotion {
  private press = 0
  private pressTarget = 0
  private stir = 0
  private flowTime: number
  private readonly config: SkFluxMotionConfig

  constructor(config: Partial<SkFluxMotionConfig> = {}) {
    this.config = { ...DEFAULT_MOTION_CONFIG, ...config }
    /* 随机初相位：多实例纹理错开，永不同步 */
    this.flowTime = Math.random() * 100
  }

  /** 按下(touchstart / mouseenter) */
  pressDown(): void {
    this.pressTarget = 1
  }

  /** 松开(touchend / mouseleave) */
  pressUp(): void {
    this.pressTarget = 0
  }

  /** 滑动注入搅动能量，movement 为像素距离 */
  addStir(movement: number): void {
    this.stir = Math.min(1, this.stir + movement * this.config.stirGain)
  }

  /** 每帧推进，dt 单位秒；返回当前快照 */
  tick(dt: number): SkFluxMotionSnapshot {
    const { baseSpeed, pressBoost, stirBoost, stirDecay, pressEase } = this.config
    this.press += (this.pressTarget - this.press) * Math.min(1, dt * pressEase)
    this.stir *= Math.exp(-dt * stirDecay)
    const active = smoothstep01(this.press)
    const speed = baseSpeed + active * pressBoost + this.stir * stirBoost
    this.flowTime += dt * speed
    return { flowTime: this.flowTime, active, speed }
  }
}
