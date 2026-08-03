<template>
  <view
    class="sk-flux-capsule"
    :class="{ 'sk-flux-capsule--pressed': pressed }"
    :style="rootStyle"
    @tap="onTap"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <!-- #ifdef MP-WEIXIN -->
    <canvas
      class="sk-flux-capsule__canvas"
      type="webgl"
      :id="canvasId"
      :canvas-id="canvasId"
    />
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <!-- uni-h5 的 canvas 组件会预占 2d 上下文，故用挂载点动态创建原生 canvas -->
    <view
      class="sk-flux-capsule__canvas"
      :id="canvasId"
      @mousedown="onTouchStart"
      @mousemove="onMouseMove"
      @mouseleave="onTouchEnd"
      @mouseup="onTouchEnd"
    />
    <!-- #endif -->
    <!-- 玻璃高光层 -->
    <view v-if="gloss" class="sk-flux-capsule__gloss" :style="glossStyle" />
    <!-- 内容：默认插槽优先，否则回退渲染 title/subtitle -->
    <view class="sk-flux-capsule__content">
      <slot>
        <view v-if="title" class="sk-flux-capsule__title">{{ title }}</view>
        <view v-if="subtitle" class="sk-flux-capsule__subtitle">{{ subtitle }}</view>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * SkFluxCapsule — 跨端 WebGL 流体色彩胶囊
 *
 * 用法（colors 支持字符串/数组，1~6 个颜色）：
 *   <sk-flux-capsule colors="#5b8cff" title="FLUX" />
 *   <sk-flux-capsule :colors="['#ff4f9e', '#ff8c40']" :height="160" />
 *
 * 平台差异收敛在 setupCanvas()：
 * - H5：挂载点动态创建原生 canvas，window.requestAnimationFrame 驱动
 * - 微信小程序：SelectorQuery 取 canvas node，node.requestAnimationFrame 驱动
 *
 * 性能约定：
 * - DPR 上限 2；dt 钳制 100ms；卸载停帧并 dispose GPU 资源
 * - 默认懒激活：进入视口附近才初始化/恢复，离开视口暂停，多实例不并发
 * - paused prop 受控暂停；页面 onHide 可调 pause()/resume()
 */
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { normalizePalette } from './core/color'
import { SkFluxMotion } from './core/motion'
import { createSkFluxRenderer, type SkFluxRenderer, type RGB } from './core/renderer'

interface Props {
  /** 调色板：颜色字符串（可逗号分隔）或数组，1~6 个 */
  colors?: string | readonly string[]
  /** 标题（默认插槽优先） */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 宽度：数字按 rpx，字符串原样 */
  width?: number | string
  /** 高度：数字按 rpx，字符串原样，默认 120 */
  height?: number | string
  /** 圆角：缺省保持药丸形（高度一半） */
  radius?: number | string
  /** 基础流速 */
  speed?: number
  /** iOS 玻璃高光层，默认关闭以降低多实例合成开销 */
  gloss?: boolean
  /** 懒激活：进入视口附近才初始化/恢复渲染，离开视口暂停（多实例场景显著降耗） */
  lazy?: boolean
  /** 触摸按压/搅动交互 */
  interactive?: boolean
  /** 受控暂停 */
  paused?: boolean
  /** 噪声种子，多实例传不同值保证纹理唯一 */
  seed?: number
}

const props = withDefaults(defineProps<Props>(), {
  colors: undefined,
  title: '',
  subtitle: '',
  width: '100%',
  height: 120,
  radius: undefined,
  speed: 0.22,
  gloss: false,
  lazy: true,
  interactive: true,
  paused: false,
  seed: undefined,
})

const emit = defineEmits<{
  (e: 'press'): void
  (e: 'release'): void
  (e: 'tap'): void
}>()

/** 微信小程序 canvas node 最小接口（避免依赖 wx 全量类型） */
interface MpCanvasNode {
  width: number
  height: number
  getContext(type: 'webgl'): WebGLRenderingContext | null
  requestAnimationFrame(cb: (ts: number) => void): number
  cancelAnimationFrame(id: number): void
}

const MAX_DPR = 2
let uid = 0
const canvasId = `sk-flux-capsule-${++uid}-${Date.now() % 1e6}-${Math.floor(Math.random() * 1e4)}`

const pressed = ref(false)
const instance = getCurrentInstance()
const motion = new SkFluxMotion({ baseSpeed: props.speed })

/* ---------- 调色板与样式 ---------- */

const palette = computed<readonly RGB[]>(() => {
  if (props.colors !== undefined) return normalizePalette(props.colors)
  throw new Error('[sk-flux-capsule] 必须传入 colors')
})

function toCssSize(value: number | string): string {
  return typeof value === 'number' ? `${value}rpx` : value
}

const radiusCss = computed<string>(() => {
  if (props.radius !== undefined) return toCssSize(props.radius)
  /* 默认药丸形：数字高度取一半，其余场景用大圆角兜底 */
  return typeof props.height === 'number' ? `${props.height / 2}rpx` : '100rpx'
})

const rootStyle = computed(() => ({
  width: toCssSize(props.width),
  height: toCssSize(props.height),
  borderRadius: radiusCss.value,
}))

const glossStyle = computed(() => ({ borderRadius: radiusCss.value }))

/* ---------- 渲染循环 ---------- */

let renderer: SkFluxRenderer | null = null
let running = false
let rafId = 0
let lastTs = 0
/** 视口可见性（懒激活用；非懒模式始终视为可见） */
const inView = ref(true)
/** 平台视口观察器实例 */
let io: any = null
/** 平台注入的帧调度函数 */
let raf: (cb: (ts: number) => void) => number = () => 0
let caf: (id: number) => void = () => undefined

function frame(ts: number): void {
  if (!running || !renderer) return
  const dt = lastTs > 0 ? Math.min((ts - lastTs) / 1000, 0.1) : 0.016
  lastTs = ts
  const snapshot = motion.tick(dt)
  renderer.render(snapshot.flowTime, snapshot.active)
  rafId = raf(frame)
}

function resume(): void {
  if (running || !renderer || props.paused || !inView.value) return
  running = true
  lastTs = 0
  rafId = raf(frame)
}

function pause(): void {
  running = false
  if (rafId) caf(rafId)
  rafId = 0
}

defineExpose({ pause, resume })

watch(
  () => props.paused,
  (paused) => {
    if (paused) pause()
    else if (inView.value) resume()
  },
)

/* ---------- 触摸交互 ---------- */

interface Point {
  x: number
  y: number
}
let lastPoint: Point | null = null

function pointOf(e: TouchEvent | MouseEvent): Point | null {
  const touch = (e as TouchEvent).touches?.[0]
  if (touch) return { x: touch.clientX, y: touch.clientY }
  const mouse = e as MouseEvent
  if (typeof mouse.clientX === 'number') return { x: mouse.clientX, y: mouse.clientY }
  return null
}

function onTouchStart(e: TouchEvent | MouseEvent): void {
  if (!props.interactive) return
  pressed.value = true
  motion.pressDown()
  lastPoint = pointOf(e)
  emit('press')
}

function onTouchMove(e: TouchEvent | MouseEvent): void {
  if (!props.interactive) return
  const point = pointOf(e)
  if (point && lastPoint) {
    motion.addStir(Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y))
  }
  lastPoint = point
}

/** H5 桌面端：未按下时移动同样注入搅动能量（等价 hover 交互） */
function onMouseMove(e: MouseEvent): void {
  onTouchMove(e)
}

function onTouchEnd(): void {
  if (!props.interactive) return
  if (pressed.value) emit('release')
  pressed.value = false
  motion.pressUp()
  lastPoint = null
}

function onTap(): void {
  emit('tap')
}

/* ---------- 平台画布初始化 ---------- */

function setupRenderer(gl: WebGLRenderingContext): void {
  renderer = createSkFluxRenderer(gl, {
    colors: palette.value,
    seed: (props.seed ?? Math.random() * 100) * 13.7 + 1,
  })
  resume()
}

function setupCanvas(): void {
  /* #ifdef MP-WEIXIN */
  uni
    .createSelectorQuery()
    .in(instance?.proxy ?? null)
    .select(`#${canvasId}`)
    .fields({ node: true, size: true }, () => undefined)
    .exec((res: Array<{ node?: MpCanvasNode; width?: number; height?: number }>) => {
      const field = res?.[0]
      const node = field?.node
      if (!node || !field.width || !field.height) return
      const dpr = Math.min(uni.getSystemInfoSync().pixelRatio ?? 1, MAX_DPR)
      node.width = Math.round(field.width * dpr)
      node.height = Math.round(field.height * dpr)
      const gl = node.getContext('webgl')
      if (!gl) return
      raf = (cb) => node.requestAnimationFrame(cb)
      caf = (id) => node.cancelAnimationFrame(id)
      setupRenderer(gl)
    })
  /* #endif */

  /* #ifdef H5 */
  const host = document.getElementById(canvasId)
  if (!host) return
  /* 在挂载点内创建原生 canvas，绕开 uni-h5 canvas 组件的 2d 上下文预占 */
  const rect = host.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  host.appendChild(canvas)
  const gl = canvas.getContext('webgl', { antialias: true })
  if (!gl) return
  raf = (cb) => window.requestAnimationFrame(cb)
  caf = (id) => window.cancelAnimationFrame(id)
  setupRenderer(gl)
  /* #endif */
}

/* ---------- 视口懒激活 ---------- */

/** 进入/离开视口回调：可见时初始化或恢复，不可见时暂停 */
function handleVisible(visible: boolean): void {
  inView.value = visible
  if (!visible) {
    pause()
    return
  }
  if (props.paused) return
  if (renderer) resume()
  else setupCanvas()
}

/** 建立视口观察器；平台不支持时兜底直接初始化 */
function setupObserver(): void {
  /* #ifdef H5 */
  const host = document.getElementById(canvasId)
  if (host && typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => handleVisible(entries[0]?.isIntersecting ?? false),
      { rootMargin: '200px 0px' },
    )
    io.observe(host)
    return
  }
  /* #endif */
  /* #ifdef MP-WEIXIN */
  try {
    const obs: any = uni.createIntersectionObserver(instance?.proxy as any, {
      thresholds: [0],
      observeAll: false,
    })
    obs.relativeToViewport({ top: 200, bottom: 200 })
    obs.observe('.sk-flux-capsule', (res: any) => {
      handleVisible((res?.intersectionRatio ?? 0) > 0)
    })
    io = obs
    return
  } catch (_) {
    /* 观察器创建失败，走兜底 */
  }
  /* #endif */
  /* 兜底：不支持视口观察时直接初始化 */
  setTimeout(setupCanvas, 50)
}

onMounted(() => {
  if (props.lazy) setupObserver()
  else setTimeout(setupCanvas, 50) /* 延迟一帧，确保布局完成后再取画布尺寸 */
})

onBeforeUnmount(() => {
  pause()
  io?.disconnect?.()
  io = null
  renderer?.dispose()
  renderer = null
})
</script>

<style scoped>
.sk-flux-capsule {
  position: relative;
  background: #ffffff;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.75);
  box-shadow:
    inset 0 2rpx 4rpx rgba(255, 255, 255, 0.95),
    inset 0 -22rpx 36rpx rgba(0, 0, 0, 0.07),
    0 40rpx 64rpx -28rpx rgba(0, 0, 0, 0.32),
    0 6rpx 14rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.35s cubic-bezier(0.22, 0.9, 0.3, 1.2);
  transform: translateZ(0); /* 独立合成层，动画不触发重排 */
}

/* 移动端按压反馈：轻微下陷，松手回弹 */
.sk-flux-capsule--pressed {
  transform: scale(0.97) translateZ(0);
}

.sk-flux-capsule__canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 顶部玻璃高光带（iOS 镜面反光） */
.sk-flux-capsule__gloss {
  position: absolute;
  z-index: 2;
  left: 3%;
  right: 3%;
  top: 5%;
  height: 44%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.55),
    rgba(255, 255, 255, 0.1) 70%,
    transparent
  );
  pointer-events: none;
}

.sk-flux-capsule__content {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 64rpx;
  pointer-events: none;
}

/* title/subtitle 回退渲染的默认样式 */
.sk-flux-capsule__title {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
  color: #555555;
}

.sk-flux-capsule__subtitle {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #9a9a9a;
}
</style>
