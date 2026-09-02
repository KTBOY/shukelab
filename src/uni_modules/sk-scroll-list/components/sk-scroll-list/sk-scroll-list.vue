<!--
 * @Author: sk
 * @Description: sk-scroll-list 滚动列表容器（下拉刷新 + 上拉加载 + 状态 UI）
 *
 * 实现要点：
 * 1. 内聚 scroll-view：下拉头用原生 refresher（refresher-enabled），仅当列表
 *    滚动到顶部时下拉手势才会激活（原生行为），无需自行判断；上拉用
 *    scrolltolower 触发，组件内置守卫（loading / finished / refreshing 中不外发）。
 * 2. 组件不持有数据：refreshing / loading / finished / error 全部由外部
 *    （推荐 usePagedList composable）提供，@refresh / @load-more / @retry 外发。
 * 3. 内置 footer 状态机：error-点击重试 > loading-加载中（刷新期间不重复展示）
 *    > finished-没有更多了；插槽 #footer 可整体替换，#empty / #error 替换空态与错误态。
 * 4. scrollToTop 供「再次点击当前 tab 回到顶部」等场景使用。
 * 5. 刷新期间保留旧内容（数据层 usePagedList.reload 原地替换），列表不清空。
-->
<template>
  <scroll-view
    class="sk-scroll-list"
    :scroll-y="true"
    :show-scrollbar="false"
    :style="[{ height: props.height }, props.customStyle]"
    :refresher-enabled="props.refresherEnabled"
    :refresher-triggered="props.refreshing"
    :refresher-default-style="$slots.refresher ? 'none' : props.refresherDefaultStyle"
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
    <!-- 自定义下拉头：作用域 { state: idle/pulling/loosing/refreshing, dy: 下拉距离 }；传入后自动关闭系统默认样式 -->
    <template v-if="$slots.refresher" #refresher>
      <view class="sk-scroll-list__refresher">
        <slot name="refresher" :state="refresherState" :dy="pullDy"></slot>
      </view>
    </template>
    <!-- 首屏失败且无数据：错误态（点击重试），#error 插槽可整体替换 -->
    <view v-if="props.empty && props.error" class="sk-scroll-list__error">
      <slot name="error">
        <text class="sk-scroll-list__error-text" @click="emits('retry')">{{ props.errorText }}</text>
      </slot>
    </view>
    <!-- 空态：列表为空且不在加载中 -->
    <view v-else-if="props.empty" class="sk-scroll-list__empty">
      <slot name="empty">
        <text class="sk-scroll-list__empty-text">暂无数据</text>
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
          <text v-else-if="props.loading" class="sk-scroll-list__footer-text">{{ props.loadingText }}</text>
          <text v-else-if="props.finished" class="sk-scroll-list__footer-text">{{ props.finishedText }}</text>
        </slot>
      </view>
    </template>
  </scroll-view>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { SkScrollListExpose } from './sk-scroll-list.types'

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
  /** 列表是否为空（为空且不在加载中时展示 empty 插槽） */
  empty: {
    type: Boolean,
    default: false,
  },
  /** 容器高度 */
  height: {
    type: String,
    default: '100%',
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
  /** 自定义样式（合并到容器） */
  customStyle: {
    type: Object,
    default: () => ({}),
  },
  /** 下拉刷新区域背景色 */
  refresherBackground: {
    type: String,
    default: '#fff',
  },
  /** 下拉刷新默认样式：black / white / none */
  refresherDefaultStyle: {
    type: String,
    default: 'black',
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

// ==================== 状态 ====================

const scrollState = reactive({
  /** 受控 scroll-top（scrollToTop 使用） */
  top: 0,
  /** 回顶是否带动画 */
  animate: false,
})

/** 实际滚动位置（来自 scroll 事件） */
let realTop = 0

// #ifdef H5
/** H5 端真实滚动层元素（uni scroll-view 内部 overflow 为 auto 的 div） */
let scrollerEl: HTMLElement | null = null
/** rAF 动画帧句柄 */
let rafId = 0
/** 动画序号：新动画/用户接管后使旧动画帧失效 */
let animSeq = 0

const instance = getCurrentInstance()

onMounted(() => {
  const rootEl = (instance?.proxy?.$el as HTMLElement | null) || null
  scrollerEl =
    (rootEl?.querySelector('.uni-scroll-view-scrollbar-hidden') as HTMLElement | null) ||
    ([...(rootEl?.querySelectorAll('div') ?? [])].find((el) => {
      const overflowY = getComputedStyle(el).overflowY
      return overflowY === 'auto' || overflowY === 'scroll'
    }) as HTMLElement | undefined) ||
    null
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
// #endif

// ==================== footer 状态机 ====================

const footerVisible = computed(() => props.error || (props.loading && !props.refreshing) || props.finished)

// ==================== 事件 ====================

const onScroll = (e: any) => {
  realTop = e.detail.scrollTop
}

/** 触底：状态守卫后外发（组件内不判断数据） */
const onScrollToLower = (e: any) => {
  if (props.loading || props.finished || props.refreshing) return
  emits('load-more', e)
}

/** 下拉刷新触发 */
const onRefresherRefresh = (e: any) => {
  emits('refresh', e)
}

// ==================== 自定义下拉头状态机 ====================

/** 触发自定义刷新头的最小下拉距离（px） */
const REFRESH_LOOSING_THRESHOLD = 80

const pullState = ref<'idle' | 'pulling' | 'loosing'>('idle')
const pullDy = ref(0)

/** 作用域插槽可见的刷新状态（受控 refreshing 优先） */
const refresherState = computed(() => (props.refreshing ? 'refreshing' : pullState.value))

const onRefresherPulling = (e: any) => {
  pullDy.value = e.detail.dy || 0
  if (pullState.value !== 'refreshing') {
    pullState.value = pullDy.value >= REFRESH_LOOSING_THRESHOLD ? 'loosing' : 'pulling'
  }
}

const onRefresherRestore = () => {
  pullState.value = 'idle'
  pullDy.value = 0
}

/** 刷新被中断（如下拉后未达阈值松手直接回弹） */
const onRefresherAbort = () => {
  pullState.value = 'idle'
  pullDy.value = 0
}

// 受控刷新结束（refreshing -> false）后复位下拉状态
watch(
  () => props.refreshing,
  (val) => {
    if (!val) {
      pullState.value = 'idle'
      pullDy.value = 0
    }
  }
)

// ==================== 对外方法 ====================

// #ifdef H5
/** H5 端 rAF 平滑回顶。uni 的 scroll-with-animation 在 H5 上以 transform 模拟动画，
 *  不产生真实滚动事件且 transitionend 时机不可靠，故直接驱动滚动层 scrollTop */
const animateTop = () => {
  const el = scrollerEl
  if (!el) return false
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
  return true
}
// #endif

/** 列表回到顶部（配合「再次点击当前 tab 回顶」等场景） */
const scrollToTop = (smooth = false) => {
  // #ifdef H5
  if (scrollerEl) {
    if (smooth) {
      animateTop()
    } else {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      scrollerEl.scrollTop = 0
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

defineExpose({ scrollToTop } as SkScrollListExpose)
</script>

<style scoped>
@import './sk-scroll-list.css';
</style>
