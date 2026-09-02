<!--
 * @Author: sk
 * @Description: sk-swipe-page 整页横滑容器（仿小黑盒频道页）
 *
 * 实现要点：
 * 1. 基于原生 swiper 封装：跟手滑动、边界回弹，H5 / 微信小程序一致的整页翻页体验。
 * 2. 页面级懒挂载（lazyBuffer，默认 1）：仅激活页左右各 n 页内的页面挂载内容，
 *    keepAlive（默认 true）挂载后常驻、滑回不重建（滚动位置保留）；
 *    关闭 keepAlive 则收回缓冲区外页面，节点数与已浏览页面解耦。
 * 3. 与 sk-scroll-tabs 零耦合：两个组件 v-model:current 绑定同一状态即完成双向联动
 *    （点 tab 翻页、滑页面 tab 跟随）。
 * 4. change 事件以 source 区分 swipe（用户滑动）/ method（外部受控）。
-->
<template>
  <swiper
    class="sk-swipe-page"
    :current="state.current"
    :duration="props.duration"
    :autoplay="props.autoplay"
    :interval="props.interval"
    :circular="props.circular"
    :style="{ height: props.height }"
    @change="onSwiperChange"
    @transition="onSwiperTransition"
  >
    <swiper-item v-for="index in pageIndexes" :key="index">
      <slot name="page" :index="index" :active="index === state.current" :mounted="state.mounted.has(index)"></slot>
    </swiper-item>
  </swiper>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import type { PropType } from 'vue'
import type { ChangePayload, TransitionPayload } from './sk-swipe-page.types'

defineOptions({ name: 'SkSwipePage' })

/** 程序化翻页来源标记的兜底复位时长（ms），略大于翻页动画时长 */
const PROGRAMMATIC_RESET_TIMEOUT = 400

const props = defineProps({
  /** 页面总数 */
  count: {
    type: Number,
    default: 0,
  },
  /** 当前页下标，支持 v-model:current */
  current: {
    type: Number,
    default: 0,
  },
  /** 懒挂载缓冲：激活页左右各 n 页内的页面才挂载内容 */
  lazyBuffer: {
    type: Number,
    default: 1,
  },
  /** 已挂载页面是否常驻（false 时滑出缓冲区的页面被卸载，滚动位置丢失） */
  keepAlive: {
    type: Boolean,
    default: true,
  },
  /** 常驻页数上限（LRU 淘汰最久未挂载的窗口外页面），0 表示不限制 */
  maxAlive: {
    type: Number,
    default: 0,
  },
  /** 是否自动轮播（透传 swiper） */
  autoplay: {
    type: Boolean,
    default: false,
  },
  /** 自动轮播间隔（ms），透传 swiper */
  interval: {
    type: Number,
    default: 5000,
  },
  /** 是否循环播放（透传 swiper，无缝衔接） */
  circular: {
    type: Boolean,
    default: false,
  },
  /** 翻页动画时长（ms） */
  duration: {
    type: Number,
    default: 300,
  },
  /** 容器高度 */
  height: {
    type: String,
    default: '100%',
  },
})

const emits = defineEmits<{
  change: [payload: ChangePayload]
  'update:current': [index: number]
  /** 翻页手势/动画进行中实时外发（用于标题栏渐变、视差等联动效果） */
  transition: [payload: TransitionPayload]
}>()

// ==================== 状态 ====================

const state = reactive({
  /** 当前页下标 */
  current: props.current,
  /** 已挂载页面下标集合（keepAlive 开启时只增不减） */
  mounted: new Set<number>(),
})

/** 外部受控标记：区分 swiper change 由用户滑动还是程序赋值触发 */
let programmatic = false
let programmaticTimer: ReturnType<typeof setTimeout> | null = null

/** 容器宽度（px），transition 进度按页宽归一化 */
let containerWidth = 0

/** 页面挂载顺序（LRU 淘汰依据，非响应式） */
const mountOrder: number[] = []

const instance = getCurrentInstance()

const pageIndexes = computed(() => Array.from({ length: props.count }, (_, i) => i))

// ==================== 懒挂载 ====================

/** 把激活页 ± buffer 内的页面加入挂载集合；keepAlive 关闭或超 maxAlive 时按 LRU 收回 */
const updateMounted = () => {
  const buffer = Math.max(props.lazyBuffer, 0)
  for (let i = state.current - buffer; i <= state.current + buffer; i++) {
    if (i >= 0 && i < props.count && !state.mounted.has(i)) {
      state.mounted.add(i)
      mountOrder.push(i)
    }
  }
  if (!props.keepAlive) {
    for (const i of state.mounted) {
      if (i < state.current - buffer || i > state.current + buffer) state.mounted.delete(i)
    }
  }
  // 常驻页数超限：从最久挂载的窗口外页面开始淘汰（窗口内的页面保证存活）
  if (props.maxAlive > 0) {
    const inWindow = (i: number) => i >= state.current - buffer && i <= state.current + buffer
    let guard = state.mounted.size
    while (state.mounted.size > props.maxAlive && guard-- > 0) {
      const oldest = mountOrder.find((i) => state.mounted.has(i) && !inWindow(i))
      if (oldest === undefined) break
      state.mounted.delete(oldest)
      const at = mountOrder.indexOf(oldest)
      if (at >= 0) mountOrder.splice(at, 1)
    }
  }
}

/** 翻页手势/动画进行中：把位移归一化为页面进度后外发 */
const onSwiperTransition = (e: any) => {
  const dx: number = e.detail.dx || 0
  const dy: number = e.detail.dy || 0
  const progress = containerWidth > 0 ? dx / containerWidth : 0
  emits('transition', { dx, dy, progress })
}

/** 测量容器宽度（transition 进度归一化用），窗口尺寸变化时重测 */
const measureWidth = () => {
  const query = uni.createSelectorQuery().in(instance)
  query.select('.sk-swipe-page').boundingClientRect()
  query.exec((res: any[]) => {
    const [rect] = res || []
    if (rect?.width) containerWidth = rect.width
  })
}

// ==================== 联动核心 ====================

/** 用户滑动翻页（swiper 在滑动越过切换点时触发） */
const onSwiperChange = (e: any) => {
  const index: number = e.detail.current
  if (index === state.current) {
    programmatic = false
    return
  }
  const source = programmatic ? 'method' : 'swipe'
  programmatic = false
  state.current = index
  updateMounted()
  emits('update:current', index)
  emits('change', { index, source })
}

// ==================== 监听与生命周期 ====================

// v-model:current 外部受控（点击 tab 等场景驱动翻页）
watch(
  () => props.current,
  (index) => {
    if (index === state.current) return
    programmatic = true
    state.current = index
    updateMounted()
    emits('change', { index, source: 'method' })
    // swiper 的 change 事件可能异步触发，超时兜底复位来源标记
    if (programmaticTimer) clearTimeout(programmaticTimer)
    programmaticTimer = setTimeout(() => {
      programmatic = false
    }, PROGRAMMATIC_RESET_TIMEOUT)
  }
)

// 页面总数变化：剪除越界的挂载记录后重算
watch(
  () => props.count,
  () => {
    for (const i of state.mounted) {
      if (i >= props.count) state.mounted.delete(i)
    }
    updateMounted()
  }
)

updateMounted()

onMounted(() => {
  measureWidth()
})

onBeforeUnmount(() => {
  if (programmaticTimer) clearTimeout(programmaticTimer)
})
</script>

<style scoped>
@import './sk-swipe-page.css';
</style>
