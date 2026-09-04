<!--
 * @Author: sk
 * @Description: sk-scroll-list 滚动列表容器（首屏 loading + 下拉刷新四态 + 触底加载 + 空/错误态）
 *
 * 实现要点：
 * 1. 三种加载指示按触发源严格互斥，同一时刻至多出现一个：
 *    首屏区（empty && loading → 居中圆圈）｜refresher（用户下拉手势 → 菱形指示器四态）
 *    ｜footer（已有内容且触底加载更多 → 菱形指示器，小一档）。
 * 2. 组件不持有数据：empty 只表达「当前有没有内容」，无内容时展示 loading / 错误 / 空态由组件判定；
 *    refreshing / loading / finished / error 全部受控传入，推荐配合 usePagedList composable。
 * 3. refresher-triggered 绑内部 triggered 而非 props.refreshing：刷新结束后先驻留
 *    success / failed 态（Vant 四态），到 successDuration 再收起回弹。
 * 4. 手势仲裁：下拉与横滑互斥。uni-app H5 的 refresher 在 scrollTop===0 时不判断方向就会撑开，
 *    且下拉阶段的 touchmove 会冒泡给祖先 swiper，故组件自行锁轴：横向短路 refresher-enabled，
 *    纵向 stopPropagation 不交给 swiper。小程序端另用原生 refresher-max-angle 兜底。
 * 5. 刷新期间保留旧内容（数据层 usePagedList.reload 原地替换），列表不清空。
-->
<template>
  <scroll-view
    class="sk-scroll-list"
    :scroll-y="true"
    :show-scrollbar="false"
    :style="[{ height: props.height }, props.customStyle]"
    :refresher-enabled="refresherActive"
    :refresher-threshold="props.refresherThreshold"
    :refresher-max-angle="props.refresherMaxAngle"
    :refresher-triggered="state.triggered"
    :refresher-default-style="props.refresherDefaultStyle"
    :refresher-background="props.refresherBackground"
    :lower-threshold="props.lowerThreshold"
    :scroll-top="scrollState.top"
    :scroll-with-animation="scrollState.animate"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
    @scroll="onScroll"
    @scrolltolower="onScrollToLower"
    @refresherrefresh="onRefresherRefresh"
    @refresherpulling="onRefresherPulling"
    @refresherrestore="onRefresherRestore"
    @refresherabort="onRefresherAbort"
  >
    <!-- 下拉头：refresher-default-style 为 none（默认）时启用内置菱形指示器，#refresher 插槽可整体接管 -->
    <template v-if="builtInRefresher" #refresher>
      <view class="sk-scroll-list__refresher">
        <slot name="refresher" :state="refresherState" :dy="pullDy" :progress="pullProgress">
          <view class="sk-indicator sk-indicator--refresher" :class="`sk-indicator--${refresherState}`">
            <view class="sk-indicator__spin">
              <image class="sk-indicator__icon" :src="props.indicatorIcon" :style="iconStyle" mode="aspectFit" />
            </view>
            <text class="sk-indicator__text">{{ refresherText }}</text>
          </view>
        </slot>
      </view>
    </template>

    <!-- 无内容状态区：首屏 loading / 错误 / 空态三者互斥，共用居中容器 -->
    <view v-if="props.empty" class="sk-scroll-list__state">
      <view v-if="isInitialLoading" class="sk-scroll-list__initial">
        <view class="sk-loading"></view>
        <text v-if="props.initialLoadingText" class="sk-scroll-list__initial-text">
          {{ props.initialLoadingText }}
        </text>
      </view>
      <slot v-else-if="props.error" name="error">
        <text class="sk-scroll-list__state-text sk-scroll-list__state-text--error" @click="emits('retry')">
          {{ props.errorText }}
        </text>
      </slot>
      <slot v-else name="empty">
        <text class="sk-scroll-list__state-text">{{ props.emptyText }}</text>
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
          <view v-else-if="props.loading && !props.refreshing" class="sk-indicator sk-indicator--footer sk-indicator--refreshing">
            <view class="sk-indicator__spin">
              <image class="sk-indicator__icon" :src="props.indicatorIcon" mode="aspectFit" />
            </view>
            <text class="sk-indicator__text">{{ props.loadingText }}</text>
          </view>
          <text v-else-if="props.finished" class="sk-scroll-list__footer-text">{{ props.finishedText }}</text>
        </slot>
      </view>
    </template>
  </scroll-view>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { SkScrollListExpose, SkScrollListRefresherState } from './sk-scroll-list.types'
import indicatorIconSrc from './66.png'

defineOptions({ name: 'SkScrollList' })

const props = defineProps({
  /** 刷新中状态（受控）：下拉刷新请求进行中为 true，结束后置 false */
  refreshing: {
    type: Boolean,
    default: false,
  },
  /** 加载请求进行中：无内容时即首屏 loading（居中圆圈），有内容时为触底加载更多（footer 指示器） */
  loading: {
    type: Boolean,
    default: false,
  },
  /** 是否已全部加载（无更多数据） */
  finished: {
    type: Boolean,
    default: false,
  },
  /** 最近一次加载是否失败（footer / 状态区展示重试，点击外发 retry） */
  error: {
    type: Boolean,
    default: false,
  },
  /** 当前有没有内容。为空时展示什么（loading / 错误 / 空态）由组件内部判定，调用方不要排除 loading 态 */
  empty: {
    type: Boolean,
    default: false,
  },
  /** 容器高度 */
  height: {
    type: String,
    default: '100%',
  },
  /** 触底加载文案（footer 指示器下方） */
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
  /** 空态文案（#empty 插槽可替换） */
  emptyText: {
    type: String,
    default: '暂无数据',
  },
  /** 首屏 loading 文案，留空则只显示圆圈 */
  initialLoadingText: {
    type: String,
    default: '',
  },
  /** 是否开启下拉刷新（纯展示列表可关闭） */
  refresherEnabled: {
    type: Boolean,
    default: true,
  },
  /** 自定义样式（合并到容器，可用于覆盖 --sk-* 主题变量） */
  customStyle: {
    type: Object,
    default: () => ({}),
  },
  /** 下拉刷新区域背景色 */
  refresherBackground: {
    type: String,
    default: '#fff',
  },
  /** 下拉头样式：none-内置菱形指示器（默认，可被 #refresher 插槽接管）/ black / white-原生三点样式 */
  refresherDefaultStyle: {
    type: String,
    default: 'none',
  },
  /** 菱形指示器图标资源，默认组件内置 66.png（PNG 无法改色，深色容器用 --sk-indicator-filter 反白） */
  indicatorIcon: {
    type: String,
    default: indicatorIconSrc,
  },
  /** 下拉刷新触发阈值（px）：同时传给原生 refresher-threshold 与内部 loosing 判定。内置头高度约 40px，调小于 45 会裁掉文案 */
  refresherThreshold: {
    type: Number,
    default: 45,
  },
  /** 下拉手势最大角度阈值（度）：微信小程序原生生效，H5 端由组件锁轴代替 */
  refresherMaxAngle: {
    type: Number,
    default: 45,
  },
  /** pulling 态文案（未达阈值） */
  pullingText: {
    type: String,
    default: '下拉刷新',
  },
  /** loosing 态文案（已达阈值，松手即刷新） */
  loosingText: {
    type: String,
    default: '松开立即刷新',
  },
  /** refreshing 态文案 */
  refreshingText: {
    type: String,
    default: '正在刷新...',
  },
  /** success 态文案 */
  successText: {
    type: String,
    default: '更新成功',
  },
  /** failed 态文案（刷新时 error 为真） */
  failedText: {
    type: String,
    default: '刷新失败',
  },
  /** success / failed 态驻留时长（ms），0 关闭驻留、刷新结束立即收起 */
  successDuration: {
    type: Number,
    default: 600,
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
  /** footer / 状态区失败重试点击 */
  retry: []
}>()

// ==================== 状态 ====================

const scrollState = reactive({
  /** 受控 scroll-top（setScrollTop 使用） */
  top: 0,
  /** 滚动是否带动画 */
  animate: false,
})

/** 实际滚动位置（来自 scroll 事件） */
let realTop = 0

const state = reactive({
  /** 绑定原生 refresher-triggered：不直接用 props.refreshing，以便驻留 success/failed 后再收起 */
  triggered: false,
  /** 刷新结果驻留态，空串表示当前无驻留 */
  result: '' as '' | 'success' | 'failed',
})

/** success/failed 驻留定时器 */
let resultTimer: ReturnType<typeof setTimeout> | null = null

const clearResultTimer = () => {
  if (resultTimer !== null) {
    clearTimeout(resultTimer)
    resultTimer = null
  }
}

// ==================== 手势仲裁 ====================

type AxisLock = 'pending' | 'vertical' | 'horizontal'

/** 方向判定死区（px）：小于该位移不定终身，避免手指起手的抖动误判 */
const AXIS_DEAD_ZONE = 10

/** 本次手势锁定的方向，touchstart / touchend 复位 */
let axisLock: AxisLock = 'pending'
let touchStartX = 0
let touchStartY = 0

/** 仲裁结果：非响应式布尔会让下拉头在手势中途突变，故用 reactive 驱动 refresher-enabled */
const gesture = reactive({ refresherEnabled: true })

const refresherActive = computed(() => props.refresherEnabled && gesture.refresherEnabled)

const onTouchStart = (e: any) => {
  const touch = e.touches && e.touches[0]
  axisLock = 'pending'
  touchStartX = touch ? touch.pageX : 0
  touchStartY = touch ? touch.pageY : 0
  // #ifdef H5
  // 用户接管滚动后取消在途回顶动画，否则 rAF 会把列表拽回目标位置
  cancelAnim()
  // #endif
}

const onTouchMove = (e: any) => {
  if (axisLock === 'vertical') {
    // 已锁纵向：手势独占给下拉刷新，不冒泡给祖先 swiper（uni 在下拉阶段并不拦截冒泡）
    e.stopPropagation && e.stopPropagation()
    return
  }
  if (axisLock !== 'pending') return
  const touch = e.touches && e.touches[0]
  if (!touch) return
  const dx = touch.pageX - touchStartX
  const dy = touch.pageY - touchStartY
  if (Math.abs(dx) < AXIS_DEAD_ZONE && Math.abs(dy) < AXIS_DEAD_ZONE) return
  axisLock = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
  if (axisLock === 'horizontal') {
    // 短路原生 refresher：H5 端列表在顶部时任何单指移动都会撑开下拉头（不判方向）
    gesture.refresherEnabled = false
  } else {
    e.stopPropagation && e.stopPropagation()
  }
}

const onTouchEnd = () => {
  axisLock = 'pending'
  gesture.refresherEnabled = true
}

// ==================== footer / 状态区 ====================

const footerVisible = computed(() => props.error || (props.loading && !props.refreshing) || props.finished)

/** 首屏 loading：无内容且正在请求（含刷新驻留期，避免驻留期间空态文案闪现） */
const isInitialLoading = computed(() => props.loading || props.refreshing || !!state.result)

// #ifdef H5
/** H5 端真实滚动层元素（uni scroll-view 内部 overflow 为 auto 的 div） */
let scrollerEl: HTMLElement | null = null
/** rAF 动画帧句柄 */
let rafId = 0
/** 动画序号：新动画或用户接管后使旧动画帧失效 */
let animSeq = 0

const instance = getCurrentInstance()

/** 逐帧跟手开关：小程序端逐帧更新响应式值会每帧 setData 掉帧，故只在 H5 跟手 */
let followGesture = true

const onWheelCancel = () => {
  cancelAnim()
}

onMounted(() => {
  const rootEl = (instance?.proxy?.$el as HTMLElement | null) || null
  scrollerEl =
    (rootEl?.querySelector('.uni-scroll-view-scrollbar-hidden') as HTMLElement | null) ||
    ([...(rootEl?.querySelectorAll('div') ?? [])].find((el) => {
      const overflowY = getComputedStyle(el).overflowY
      return overflowY === 'auto' || overflowY === 'scroll'
    }) as HTMLElement | undefined) ||
    null
  scrollerEl?.addEventListener('wheel', onWheelCancel, { passive: true })
})

onBeforeUnmount(() => {
  scrollerEl?.removeEventListener('wheel', onWheelCancel)
  cancelAnim()
})
// #endif
// #ifndef H5
/** 逐帧跟手开关：小程序端逐帧更新响应式值会每帧 setData 掉帧，故只在 H5 跟手 */
const followGesture = false
// #endif

// ==================== 下拉头状态机 ====================

/** 内置下拉头生效：仅 refresher-default-style 为 none 时原生才把 #refresher 插槽渲染出来 */
const builtInRefresher = computed(() => props.refresherDefaultStyle === 'none')

const pullState = ref<'idle' | 'pulling' | 'loosing'>('idle')
const pullDy = ref(0)
/** 小程序端 pullDy 节流计时（H5 逐帧，无需节流） */
let lastPullSync = 0

/** 下拉进度：归一化到 0~1，达阈值即 1 */
const pullProgress = computed(() => {
  const threshold = props.refresherThreshold > 0 ? props.refresherThreshold : 45
  return Math.min(Math.max(pullDy.value, 0) / threshold, 1)
})

/** 对外状态：驻留结果 > 受控刷新中 > 下拉阶段 */
const refresherState = computed<SkScrollListRefresherState>(() => {
  if (state.result) return state.result
  if (props.refreshing) return 'refreshing'
  return pullState.value
})

/** pulling 态图标跟手：旋转补满 90°、缩放 0.8→1、透明度 0.55→1。其余状态交给 CSS 动画（animation 优先级高于内联样式） */
const iconStyle = computed(() => {
  if (!followGesture || refresherState.value !== 'pulling') return {}
  const p = pullProgress.value
  return {
    transform: `rotate(${p * 90}deg) scale(${0.8 + 0.2 * p})`,
    opacity: String(0.55 + 0.45 * p),
  }
})

const refresherText = computed(() => {
  switch (refresherState.value) {
    case 'loosing':
      return props.loosingText
    case 'refreshing':
      return props.refreshingText
    case 'success':
      return props.successText
    case 'failed':
      return props.failedText
    default:
      return props.pullingText
  }
})

const resetPull = () => {
  pullState.value = 'idle'
  pullDy.value = 0
  lastPullSync = 0
}

const onRefresherPulling = (e: any) => {
  const dy = (e.detail && e.detail.dy) || 0
  const next = dy >= props.refresherThreshold ? 'loosing' : 'pulling'
  if (next !== pullState.value) pullState.value = next
  // #ifdef H5
  pullDy.value = dy
  // #endif
  // #ifndef H5
  // 小程序端 pullDy 节流至 40ms：只保证插槽 progress 可用，pulling 态不跑逐帧旋转
  const now = Date.now()
  if (now - lastPullSync >= 40) {
    lastPullSync = now
    pullDy.value = dy
  }
  // #endif
}

const onRefresherRestore = () => {
  if (!props.refreshing) resetPull()
}

/** 刷新被中断（如下拉后未达阈值松手回弹） */
const onRefresherAbort = () => {
  if (!props.refreshing) resetPull()
}

// 受控刷新：上升沿直接进入 refreshing；下降沿驻留 success/failed，到点再收起下拉头
watch(
  () => props.refreshing,
  (now, prev) => {
    clearResultTimer()
    if (now) {
      state.result = ''
      state.triggered = true
      return
    }
    if (!prev) return
    state.result = props.error ? 'failed' : 'success'
    if (props.successDuration > 0) {
      resultTimer = setTimeout(() => {
        resultTimer = null
        state.triggered = false
        state.result = ''
      }, props.successDuration)
    } else {
      state.triggered = false
      state.result = ''
      resetPull()
    }
  }
)

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

onBeforeUnmount(() => {
  clearResultTimer()
})

// ==================== 对外方法 ====================

// #ifdef H5
/** 中断在途 rAF 滚动动画 */
const cancelAnim = () => {
  animSeq++
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

/** H5 端 rAF 平滑滚动到指定位置。uni 的 scroll-with-animation 在 H5 上以 transform 模拟动画，
 *  不产生真实滚动事件且 transitionend 时机不可靠，故直接驱动滚动层 scrollTop */
const animateTo = (target: number) => {
  const el = scrollerEl
  if (!el) return
  cancelAnim()
  const seq = ++animSeq
  const from = el.scrollTop
  const start = performance.now()
  const step = (now: number) => {
    if (seq !== animSeq) return
    const progress = Math.min((now - start) / 300, 1)
    const eased = 1 - (1 - progress) * (1 - progress)
    el.scrollTop = from + (target - from) * eased
    if (progress < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      rafId = 0
      el.scrollTop = target
    }
  }
  rafId = requestAnimationFrame(step)
}
// #endif

/** 读取当前滚动位置（px），供页面层记录/恢复滚动位置 */
const getScrollTop = () => {
  // #ifdef H5
  // scroll 事件可能滞后于读取（页面不可见时甚至不派发），直接读真实滚动层，避免记录到过期位置
  if (scrollerEl) return scrollerEl.scrollTop
  // #endif
  return realTop
}

/** 滚动到指定位置（配合「再次点击当前 tab 回顶」、LRU 淘汰后回滑恢复位置等场景） */
const setScrollTop = (top: number, smooth = false) => {
  // #ifdef H5
  if (scrollerEl) {
    if (smooth) {
      animateTo(top)
    } else {
      cancelAnim()
      scrollerEl.scrollTop = top
    }
    return
  }
  // #endif
  // 小程序端：先重置为当前实际位置，保证 scroll-top 赋相同值时也能触发滚动
  scrollState.animate = smooth
  scrollState.top = realTop
  nextTick(() => {
    scrollState.top = top
  })
}

/** 列表回到顶部 */
const scrollToTop = (smooth = false) => {
  setScrollTop(0, smooth)
}

defineExpose({ scrollToTop, getScrollTop, setScrollTop } as SkScrollListExpose)
</script>

<style scoped>
@import './sk-scroll-list.css';
</style>
