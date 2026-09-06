<!--
 * @Author: sk
 * @Description: sk-scroll-list 滚动列表容器（下拉刷新 + 上拉加载 + 状态 UI）
 *
 * 实现要点：
 * 1. 内聚 scroll-view：下拉头用原生 refresher（refresher-enabled），仅当列表
 *    滚动到顶部时下拉手势才会激活（原生行为），无需自行判断；上拉用
 *    scrolltolower 触发，组件内置守卫（loading / finished / refreshing 中不外发）。
 * 2. 组件不持有数据：refreshing / loading / finished / error 全部由外部
 *    （推荐同目录 usePagedList）提供，@refresh / @load-more / @retry 外发。
 * 3. 内置下拉头始终自绘（refresher-default-style 固定 none）：chevron 箭头按下拉
 *    进度旋转、到位翻向，刷新时切为旋转圆环。全部用 CSS border 实现，不依赖 SVG
 *    与字体字形，小程序端可编译。#refresher 插槽可整体替换。
 * 4. 刷新结束走 settling 收合态：内容在 200ms 内淡出，与 uni 原生 refresher 的
 *    height 0.3s 收合同步，避免「内容先消失、空盒再缩」的两段式跳变；圆环保持
 *    旋转只降透明度，不骤停。loosing 阈值取 refresherThreshold * 0.9，略低于原生
 *    触发点，保证「松手立即刷新」提示在松手前可见。
 * 5. 内置 footer 状态机：error-点击重试 > loading-加载中（刷新期间不重复展示）
 *    > finished-没有更多了；插槽 #footer 可整体替换，#empty / #error 替换空态与错误态。
 * 6. scrollToTop 供「再次点击当前 tab 回到顶部」等场景使用。
 * 7. 刷新期间保留旧内容（数据层 usePagedList.reload 原地替换），列表不清空。
-->
<template>
  <scroll-view
    class="sk-scroll-list"
    :scroll-y="true"
    :show-scrollbar="false"
    :style="[{ height: props.height }, props.customStyle]"
    :refresher-enabled="props.refresherEnabled"
    :refresher-triggered="props.refreshing"
    refresher-default-style="none"
    :refresher-threshold="props.refresherThreshold"
    :refresher-background="props.refresherBackground"
    :lower-threshold="props.lowerThreshold"
    :scroll-top="scrollState.top"
    :scroll-with-animation="scrollState.animate"
    @scroll="onScroll"
    @scrolltolower="onScrollToLower"
    @refresherrefresh="onRefresherRefresh"
    @refresherpulling="onRefresherPulling"
    @refresherrestore="onRefresherRestore"
    @refresherabort="onRefresherAbort"
  >
    <!-- 下拉头：默认自绘，#refresher 插槽可整体替换（作用域 { state, dy, progress }） -->
    <template #refresher>
      <view class="sk-scroll-list__refresher" :style="{ height: props.refresherThreshold + 'px' }">
        <slot name="refresher" :state="refresherState" :dy="pullDy" :progress="pullProgress">
          <view class="sk-refresh" :class="`sk-refresh--${refresherState}`">
            <view class="sk-refresh__indicator">
              <view class="sk-refresh__arrow" :style="{ transform: `rotate(${arrowRotate}deg)` }"></view>
              <view class="sk-refresh__ring"></view>
            </view>
            <text class="sk-refresh__text">{{ refresherText }}</text>
          </view>
        </slot>
      </view>
    </template>
    <!-- 首屏加载：列表尚无任何数据时的页面级加载态，#loading 插槽可整体替换（通常放骨架屏）。
         必须排在 error / empty 之前，否则 footer 的「加载中」会贴在空白内容区顶部，
         视觉上与下拉刷新指示器无法区分 -->
    <view v-if="props.empty && props.loading" class="sk-scroll-list__loading">
      <slot name="loading">
        <view class="sk-scroll-list__loading-inner">
          <view class="sk-scroll-list__spinner"></view>
          <text class="sk-scroll-list__footer-text">{{ props.loadingText }}</text>
        </view>
      </slot>
    </view>
    <!-- 首屏失败且无数据：错误态（点击重试），#error 插槽可整体替换 -->
    <view v-else-if="props.empty && props.error" class="sk-scroll-list__error">
      <slot name="error">
        <text class="sk-scroll-list__error-text" @click="emits('retry')">{{ props.errorText }}</text>
      </slot>
    </view>
    <!-- 空态：列表为空且不在加载中 -->
    <view v-else-if="props.empty" class="sk-scroll-list__empty">
      <slot name="empty">
        <text class="sk-scroll-list__empty-text">{{ props.emptyText }}</text>
      </slot>
    </view>
    <template v-else>
      <!-- 业务列表项 -->
      <slot></slot>

      <!-- footer：传入 #footer 插槽（作用域 loading/finished/error/refreshing）则完全接管，否则用内置状态机 -->
      <view v-if="$slots.footer || footerVisible" class="sk-scroll-list__footer">
        <slot
          name="footer"
          :loading="props.loading"
          :finished="props.finished"
          :error="props.error"
          :refreshing="props.refreshing"
        >
          <text
            v-if="props.error"
            class="sk-scroll-list__footer-text sk-scroll-list__footer-text--error"
            @click="emits('retry')"
          >
            {{ props.errorText }}
          </text>
          <view v-else-if="props.loading" class="sk-scroll-list__footer-loading">
            <view class="sk-scroll-list__spinner"></view>
            <text class="sk-scroll-list__footer-text">{{ props.loadingText }}</text>
          </view>
          <view v-else-if="props.finished" class="sk-scroll-list__footer-finished">
            <view class="sk-scroll-list__footer-line"></view>
            <text class="sk-scroll-list__footer-text">{{ props.finishedText }}</text>
            <view class="sk-scroll-list__footer-line"></view>
          </view>
        </slot>
      </view>
    </template>
  </scroll-view>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { SkScrollListExpose, SkScrollListRefresherState } from './sk-scroll-list.types'

defineOptions({ name: 'SkScrollList' })

const props = defineProps({
  /** 刷新中状态（受控）：下拉刷新请求进行中为 true，结束后置 false */
  refreshing: {
    type: Boolean,
    default: false,
  },
  /** 加载更多请求进行中 */
  loading: {
    type: Boolean,
    default: false,
  },
  /** 是否已全部加载（无更多数据） */
  finished: {
    type: Boolean,
    default: false,
  },
  /** 最近一次加载是否失败（footer 展示重试，点击外发 retry） */
  error: {
    type: Boolean,
    default: false,
  },
  /** 列表是否没有任何数据。直接传 list.length === 0 即可，无需自行排除加载中：
   *  组件内部以 empty && loading 展示首屏加载态（#loading 插槽），empty 且非 loading 才展示空态 */
  empty: {
    type: Boolean,
    default: false,
  },
  /** 容器高度。注意 customStyle 中的 height 会覆盖此属性 */
  height: {
    type: String,
    default: '100%',
  },
  /** 空态提示文案 */
  emptyText: {
    type: String,
    default: '暂无数据',
  },
  /** 加载更多提示文案 */
  loadingText: {
    type: String,
    default: '加载中...',
  },
  /** 全部加载完提示文案 */
  finishedText: {
    type: String,
    default: '没有更多了',
  },
  /** 加载失败提示文案（点击重试） */
  errorText: {
    type: String,
    default: '加载失败，点击重试',
  },
  /** 是否开启下拉刷新（纯展示列表可关闭） */
  refresherEnabled: {
    type: Boolean,
    default: true,
  },
  /** 触发自建下拉头的下拉距离（px），同时作为原生 refresher-threshold 与下拉头容器高度 */
  refresherThreshold: {
    type: Number,
    default: 60,
  },
  /** 下拉中提示文案 */
  pullingText: {
    type: String,
    default: '下拉刷新',
  },
  /** 下拉到位、松手即刷新的提示文案 */
  loosingText: {
    type: String,
    default: '松手立即刷新',
  },
  /** 刷新中提示文案 */
  refreshingText: {
    type: String,
    default: '正在刷新...',
  },
  /** 自定义样式（合并到容器；其中的 height 会覆盖 height 属性） */
  customStyle: {
    type: Object,
    default: () => ({}),
  },
  /** 下拉刷新区域背景色 */
  refresherBackground: {
    type: String,
    default: '#fff',
  },
  /** 触底阈值（px） */
  lowerThreshold: {
    type: Number,
    default: 50,
  },
})

const emits = defineEmits<{
  /** 下拉刷新触发（列表须在顶部，原生 refresher 保证） */
  refresh: []
  /** 滚动触底（loading / finished / refreshing 中组件自行拦截不外发） */
  'load-more': []
  /** footer 失败重试点击 */
  retry: []
}>()

// ==================== 滚动状态 ====================

const scrollState = reactive({
  /** 受控 scroll-top（scrollToTop 使用） */
  top: 0,
  /** 回顶是否带动画 */
  animate: false,
})

/** 实际滚动位置（来自 scroll 事件） */
let realTop = 0

// ==================== footer 状态机 ====================

const footerVisible = computed(() => props.error || (props.loading && !props.refreshing) || props.finished)

// ==================== 下拉头状态机 ====================

/** loosing 触发比例：略低于 1，使「松手立即刷新」在原生触发刷新前就可见 */
const LOOSING_RATIO = 0.9

/** 收合时长（ms）：内容淡出需落在 uni 原生 refresher height 0.3s 收合窗口内 */
const SETTLE_DURATION = 200

/** 下拉阶段状态；refreshing 由 props.refreshing 决定，不在此列 */
type PullPhase = 'idle' | 'pulling' | 'loosing' | 'settling'

const pullPhase = ref<PullPhase>('idle')

/** 下拉距离（px，整数）：整像素变化才提交，避免每帧事件在小程序端产生逐帧 setData */
const pullDy = ref(0)

/** 收合定时器 */
let settleTimer: ReturnType<typeof setTimeout> | null = null

/** 对外可见的刷新头状态 */
const refresherState = computed<SkScrollListRefresherState>(() =>
  props.refreshing ? 'refreshing' : pullPhase.value
)

/** 归一化下拉进度 0~1 */
const pullProgress = computed(() => Math.min(Math.max(pullDy.value / props.refresherThreshold, 0), 1))

/** chevron 旋转角：45deg 朝下，进度拉满时 225deg 朝上 */
const arrowRotate = computed(() => 45 + pullProgress.value * 180)

const refresherText = computed(() => {
  switch (refresherState.value) {
    case 'refreshing':
    case 'settling':
      return props.refreshingText
    case 'loosing':
      return props.loosingText
    default:
      return props.pullingText
  }
})

/** 复位下拉状态（幂等） */
const resetPull = () => {
  if (settleTimer) {
    clearTimeout(settleTimer)
    settleTimer = null
  }
  pullPhase.value = 'idle'
  pullDy.value = 0
}

/** 进入收合：SETTLE_DURATION 内淡出后再复位；重复调用不重启定时器（restore 与 refreshing 可能都触发） */
const settle = () => {
  if (pullPhase.value === 'settling') return
  pullPhase.value = 'settling'
  settleTimer = setTimeout(() => {
    settleTimer = null
    resetPull()
  }, SETTLE_DURATION)
}

// ==================== 事件 ====================

const onScroll = (e: any) => {
  realTop = e.detail.scrollTop
}

/** 触底：状态守卫后外发（组件内不判断数据） */
const onScrollToLower = () => {
  if (props.loading || props.finished || props.refreshing) return
  emits('load-more')
}

/** 下拉刷新触发 */
const onRefresherRefresh = () => {
  emits('refresh')
}

const onRefresherPulling = (e: any) => {
  const dy = Math.round(e.detail?.dy || 0)
  if (dy === pullDy.value) return
  // 收合期间用户重新下拉：取消收合，回到跟手状态
  if (settleTimer) {
    clearTimeout(settleTimer)
    settleTimer = null
  }
  pullDy.value = dy
  pullPhase.value = dy >= props.refresherThreshold * LOOSING_RATIO ? 'loosing' : 'pulling'
}

/** 刷新结束、下拉头回弹 */
const onRefresherRestore = () => {
  settle()
}

/** 下拉未达阈值松手，直接回弹 */
const onRefresherAbort = () => {
  settle()
}

// 受控刷新结束后进入收合
watch(
  () => props.refreshing,
  (val) => {
    if (!val) settle()
  }
)

// ==================== 对外方法 ====================

// #ifdef H5
/** H5 端真实滚动层元素（uni scroll-view 内部 overflow 为 auto 的 div） */
let scrollerEl: HTMLElement | null = null
/** rAF 动画帧句柄 */
let rafId = 0
/** 动画序号：新动画开始时使旧动画帧失效 */
let animSeq = 0

const instance = getCurrentInstance()

/** 惰性解析滚动层并缓存；解析失败不缓存，下次调用可自愈。
 *  依赖 uni 内部 DOM 结构，uni 大版本升级可能需要适配 */
const resolveScroller = (): HTMLElement | null => {
  // 缓存的元素可能已被 uni 重建而脱离文档，此时赋值 scrollTop 会静默无效，需重找
  if (scrollerEl && scrollerEl.isConnected) return scrollerEl
  scrollerEl = null
  const rootEl = (instance?.proxy?.$el as HTMLElement | null) || null
  if (!rootEl) return null
  scrollerEl =
    (rootEl.querySelector('.uni-scroll-view-scrollbar-hidden') as HTMLElement | null) ||
    ([...rootEl.querySelectorAll('div')].find((el) => {
      const overflowY = getComputedStyle(el).overflowY
      return overflowY === 'auto' || overflowY === 'scroll'
    }) as HTMLElement | undefined) ||
    null
  return scrollerEl
}

/** H5 端 rAF 平滑回顶。uni 的 scroll-with-animation 在 H5 上以 transform 模拟动画，
 *  不产生真实滚动事件且 transitionend 时机不可靠，故直接驱动滚动层 scrollTop。
 *  动画期间用户滚动会被后续帧覆盖（组件未做手势中断） */
const animateTop = (el: HTMLElement) => {
  if (rafId) cancelAnimationFrame(rafId)
  const seq = ++animSeq
  const from = el.scrollTop
  const start = performance.now()
  const step = (now: number) => {
    if (seq !== animSeq) return
    const progress = Math.min((now - start) / 300, 1)
    const eased = 1 - (1 - progress) * (1 - progress)
    el.scrollTop = from * (1 - eased)
    if (progress < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      rafId = 0
      el.scrollTop = 0
    }
  }
  rafId = requestAnimationFrame(step)
}
// #endif

onBeforeUnmount(() => {
  if (settleTimer) clearTimeout(settleTimer)
  // #ifdef H5
  if (rafId) cancelAnimationFrame(rafId)
  // #endif
})

/** 列表回到顶部（配合「再次点击当前 tab 回顶」等场景） */
const scrollToTop = (smooth = false) => {
  // #ifdef H5
  const el = resolveScroller()
  if (el) {
    if (smooth) {
      animateTop(el)
    } else {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      el.scrollTop = 0
    }
    return
  }
  // #endif
  // 小程序端：先重置为当前实际位置，保证 scroll-top 赋相同值时也能触发滚动
  scrollState.animate = smooth
  scrollState.top = realTop
  nextTick(() => {
    scrollState.top = 0
  })
}

const expose: SkScrollListExpose = { scrollToTop }
defineExpose(expose)
</script>

<style scoped>
@import './sk-scroll-list.css';
</style>
