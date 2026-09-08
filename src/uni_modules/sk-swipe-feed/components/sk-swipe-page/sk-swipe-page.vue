<!--
 * @Author: sk
 * @Description: sk-swipe-page 整页横滑容器（频道页内容区）
 *
 * 实现要点：
 * 1. 基于原生 swiper 封装：跟手滑动、边界回弹，H5 / 微信小程序一致的整页翻页体验。
 * 2. 页面级懒挂载（lazyBuffer，默认 1）：仅激活页左右各 n 页内的页面挂载内容，
 *    keepAlive（默认 true）挂载后常驻、滑回不重建（滚动位置保留）；
 *    关闭 keepAlive 则收回缓冲区外页面，节点数与已浏览页面解耦。
 * 3. 与 sk-scroll-tabs 零耦合：两个组件 v-model:current 绑定同一状态即完成双向联动
 *    （点 tab 翻页、滑页面 tab 跟随）。
 * 4. change 事件以 source 区分 swipe（用户滑动）/ method（外部受控）；受控翻页以
 *    pendingTarget 过滤快速连点时 swiper 先到达的中间目标，避免状态被回写拉扯。
 * 5. circular 时挂载窗口按下标回绕补挂，避免克隆页在过渡期间闪现空白；
 *    容器宽度在挂载、补测与窗口 resize 时重测，保证 transition.progress 归一化准确。
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
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import type { ChangePayload, TransitionPayload } from './sk-swipe-page.types'

defineOptions({ name: 'SkSwipePage' })

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
  /** 常驻页数上限（LRU 淘汰最久未访问的窗口外页面），0 表示不限制 */
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
/** 受控翻页的最终目标页：用于过滤快速连点时 swiper 先到达的中间目标 */
let pendingTarget = -1
let programmaticTimer: ReturnType<typeof setTimeout> | null = null

/** 容器宽度（px），transition 进度按页宽归一化 */
let containerWidth = 0

/** 页面访问顺序（LRU 淘汰依据，队尾为最近访问；非响应式） */
const mountOrder: number[] = []

const instance = getCurrentInstance()

const pageIndexes = computed(() => Array.from({ length: props.count }, (_, i) => i))

// ==================== 懒挂载 ====================

/** 挂载记录的唯一写入者：Set 与 LRU 顺序数组同步维护，避免两套结构失同步 */
const mountPage = (i: number) => {
  if (i < 0 || i >= props.count || state.mounted.has(i)) return
  state.mounted.add(i)
  mountOrder.push(i)
}

/** 卸载记录的唯一写入者：同步从 LRU 数组摘除 */
const unmountPage = (i: number) => {
  if (!state.mounted.delete(i)) return
  const at = mountOrder.indexOf(i)
  if (at >= 0) mountOrder.splice(at, 1)
}

/** 标记为最近访问：移到 LRU 队尾，淘汰时优先保留（否则常用页会因最早挂载而被优先淘汰） */
const touchPage = (i: number) => {
  const at = mountOrder.indexOf(i)
  if (at < 0 || at === mountOrder.length - 1) return
  mountOrder.splice(at, 1)
  mountOrder.push(i)
}

/** 把激活页 ± buffer 内的页面加入挂载集合；keepAlive 关闭或超 maxAlive 时按 LRU 收回 */
const updateMounted = () => {
  const buffer = Math.max(props.lazyBuffer, 0)
  const count = props.count
  // circular 时 swiper 会克隆首尾页：窗口下标按模运算回绕补挂，
  // 否则从首页左滑时克隆出的末页未挂载，过渡期间闪现空白页
  const wrap = props.circular && count > buffer * 2 + 1
  // 不用 window 作变量名：H5 下会遮蔽全局 window
  const visibleWindow = new Set<number>()
  for (let i = state.current - buffer; i <= state.current + buffer; i++) {
    visibleWindow.add(wrap ? ((i % count) + count) % count : i)
  }
  for (const page of visibleWindow) mountPage(page)
  // 激活页标记为最近访问：淘汰时排在队尾，常用页不会被优先收回
  touchPage(state.current)
  if (!props.keepAlive) {
    for (const i of state.mounted) {
      if (!visibleWindow.has(i)) unmountPage(i)
    }
  }
  // 常驻页数超限：从最久未访问的窗口外页面开始淘汰（窗口内的页面保证存活）
  if (props.maxAlive > 0) {
    let guard = state.mounted.size
    while (state.mounted.size > props.maxAlive && guard-- > 0) {
      const oldest = mountOrder.find((i) => state.mounted.has(i) && !visibleWindow.has(i))
      if (oldest === undefined) break
      unmountPage(oldest)
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

/** 测量容器宽度（transition 进度归一化用） */
const measureWidth = () => {
  const query = uni.createSelectorQuery().in(instance?.proxy)
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
    // 受控翻页落地（或滑动回弹回当前页）：清除在途标记
    programmatic = false
    pendingTarget = -1
    if (programmaticTimer) {
      clearTimeout(programmaticTimer)
      programmaticTimer = null
    }
    return
  }
  // 受控翻页途中 swiper 先到达的中间目标（如快速连点 tab）：完全忽略，
  // 不写 state 不外发，swiper 会被 :current 绑定拉回最终目标页
  if (programmatic && index !== pendingTarget) return
  const source = programmatic ? 'method' : 'swipe'
  programmatic = false
  pendingTarget = -1
  if (programmaticTimer) {
    clearTimeout(programmaticTimer)
    programmaticTimer = null
  }
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
    pendingTarget = index
    state.current = index
    updateMounted()
    emits('change', { index, source: 'method' })
    // swiper 的 change 事件可能异步触发，超时兜底复位在途标记（时长与翻页动画联动）
    if (programmaticTimer) clearTimeout(programmaticTimer)
    programmaticTimer = setTimeout(() => {
      programmatic = false
      pendingTarget = -1
    }, props.duration + 100)
  }
)

// 页面总数变化：剪除越界的挂载记录、钳制当前页后重算
watch(
  () => props.count,
  () => {
    for (const i of [...state.mounted]) {
      if (i >= props.count) unmountPage(i)
    }
    state.current = Math.min(state.current, Math.max(props.count - 1, 0))
    updateMounted()
  }
)

updateMounted()

onMounted(() => {
  measureWidth()
  // 首测可能因布局未就绪拿不到宽度（小程序端常见），延后补测一次（有界，不轮询）
  setTimeout(() => {
    if (!containerWidth) measureWidth()
  }, 100)
  // 窗口尺寸变化时重测，保证 transition.progress 按新页宽归一化
  uni.onWindowResize?.(measureWidth)
})

onBeforeUnmount(() => {
  if (programmaticTimer) clearTimeout(programmaticTimer)
  uni.offWindowResize?.(measureWidth)
})
</script>

<style scoped>
@import './sk-swipe-page.css';
</style>
