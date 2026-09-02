<!--
 * @Author: sk
 * @Description: sk-scroll-tabs 顶部滚动标签栏
 *
 * 实现要点：
 * 1. scroll-view scroll-x 承载标签，选中滑块绝对定位 + translateX 过渡
 *    （sk-linkage-menu 左侧滑块的横版），测量各标签宽度支持不等宽标签。
 * 2. current 变化（点击或外部受控）自动把选中标签滚入可视区并水平居中。
 * 3. 与 sk-swipe-page 等内容容器零耦合：通过 v-model:current + change 事件联动，
 *    change.source 区分 click/method，页面可据此决定是否驱动内容区滚动。
 * 4. 标签项支持 badge 数字角标 / dot 红点 / disabled 禁用；再次点击当前标签
 *    外发 re-click 事件（配合列表回顶）；beforeChange 可拦截点击切换。
-->
<template>
  <view class="sk-scroll-tabs">
    <scroll-view
      class="sk-scroll-tabs__scroll"
      :scroll-x="true"
      :show-scrollbar="false"
      :scroll-left="state.scrollLeft"
      :scroll-with-animation="props.scrollWithAnimation"
      @scroll="onScroll"
    >
      <view class="sk-scroll-tabs__content">
        <!-- 选中滑块：测量完成前隐藏，避免首帧落点跳动 -->
        <view v-if="state.ready" class="sk-scroll-tabs__slider" :style="sliderStyle"></view>
        <view
          v-for="(tab, index) in props.tabs"
          :id="`sk-scroll-tab-${index}`"
          :key="tab?.id !== undefined ? tab.id : index"
          class="sk-scroll-tabs__item"
          :class="{
            'sk-scroll-tabs__item--active': index === state.current,
            'sk-scroll-tabs__item--disabled': !!tab?.disabled,
          }"
          :style="index === state.current && !tab?.disabled ? { color: props.activeColor } : {}"
          @click="onTabClick(index)"
        >
          <slot :item="tab" :index="index" :active="index === state.current">
            <text class="sk-scroll-tabs__text">{{ tab?.name ?? tab }}</text>
            <view v-if="tab?.dot" class="sk-scroll-tabs__dot"></view>
            <view v-else-if="tab?.badge" class="sk-scroll-tabs__badge">{{ tab.badge > 99 ? '99+' : tab.badge }}</view>
          </slot>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import type { PropType } from 'vue'
import type {
  ChangeSource,
  ChangePayload,
  RectInfo,
  ReClickPayload,
  SkScrollTabsExpose,
  SkScrollTabsItem,
} from './sk-scroll-tabs.types'

defineOptions({ name: 'SkScrollTabs' })

/** 滚动定位判定容差（px） */
const SCROLL_TOLERANCE = 2
/** 数据变更后重新测量的防抖时长（ms） */
const REFRESH_DEBOUNCE = 50

const instance = getCurrentInstance()

const props = defineProps({
  /** 标签数据，结构见 SkScrollTabsItem */
  tabs: {
    type: Array as PropType<SkScrollTabsItem[]>,
    default: () => [],
  },
  /** 当前选中标签下标，支持 v-model:current */
  current: {
    type: Number,
    default: 0,
  },
  /** 选中态文字颜色，同时作为滑块默认背景色 */
  activeColor: {
    type: String,
    default: '#111111',
  },
  /** 选中滑块样式（覆盖默认下划线样式） */
  sliderStyle: {
    type: Object,
    default: null,
  },
  /** 程序化滚动是否使用动画 */
  scrollWithAnimation: {
    type: Boolean,
    default: true,
  },
  /** 切换拦截：点击时调用，返回 false（或 resolve false 的 Promise）阻止本次切换 */
  beforeChange: {
    type: Function as PropType<(index: number) => boolean | Promise<boolean>>,
    default: null,
  },
})

const emits = defineEmits<{
  change: [payload: ChangePayload]
  'update:current': [index: number]
  /** 再次点击当前已选中的标签（配合列表回到顶部等场景） */
  're-click': [payload: ReClickPayload]
}>()

// ==================== 状态 ====================

const state = reactive({
  /** 当前选中标签下标 */
  current: props.current,
  /** 传给 scroll-view 的受控 scroll-left */
  scrollLeft: 0,
  /** 测量完成（滑块开始显示） */
  ready: false,
  /** 各标签左边缘相对内容区起点的偏移（px） */
  tabLefts: [] as number[],
  /** 各标签宽度（px） */
  tabWidths: [] as number[],
})

/** 非响应式内部状态 */
let containerWidth = 0
let realScrollLeft = 0
let refreshTimer: ReturnType<typeof setTimeout> | null = null

// ==================== 滑块与滚动 ====================

/** 选中滑块样式：位移 + 宽度自适应 + 用户自定义样式 */
const sliderStyle = computed<Record<string, string>>(() => {
  const left = state.tabLefts[state.current] ?? 0
  const width = state.tabWidths[state.current] ?? 0
  return {
    transform: `translateX(${left}px)`,
    width: `${width}px`,
    backgroundColor: props.activeColor,
    ...(props.sliderStyle || {}),
  }
})

/** 更新选中项并对外派发事件 */
const setCurrent = (index: number, source: ChangeSource) => {
  const changed = index !== state.current
  if (!changed) return

  state.current = index
  emits('update:current', index)

  const item = props.tabs[index]
  if (item) {
    emits('change', { ...item, index, source })
  }
}

/** 把指定标签滚入可视区并水平居中 */
const scrollTabTo = (index: number) => {
  const left = state.tabLefts[index]
  const width = state.tabWidths[index]
  if (left === undefined || width === undefined || !containerWidth) return

  const totalWidth =
    (state.tabLefts[state.tabLefts.length - 1] ?? 0) + (state.tabWidths[state.tabWidths.length - 1] ?? 0)
  const target = Math.min(Math.max(left + width / 2 - containerWidth / 2, 0), Math.max(totalWidth - containerWidth, 0))
  if (Math.abs(target - realScrollLeft) < SCROLL_TOLERANCE) return

  // 先重置为当前实际位置，保证 scroll-left 赋相同值时也能触发滚动
  state.scrollLeft = realScrollLeft
  nextTick(() => {
    state.scrollLeft = target
  })
}

/** 用户手动滚动时同步真实滚动位置（realScrollLeft 为非响应式，不触发渲染） */
const onScroll = (e: any) => {
  const left = e?.detail?.scrollLeft
  if (typeof left === 'number') realScrollLeft = left
}

/** 切换前拦截：返回 false 阻止本次切换 */
const ensureBeforeChange = async (index: number): Promise<boolean> => {
  if (!props.beforeChange) return true
  const allowed = await props.beforeChange(index)
  return allowed !== false
}

/** 点击标签 */
const onTabClick = async (index: number) => {
  const tab = props.tabs[index]
  // 禁用标签不响应
  if (tab?.disabled) return
  // 再次点击已选中的标签：外发 re-click（配合列表回顶），不重复派发 change
  if (index === state.current) {
    if (tab) emits('re-click', { index, item: tab })
    return
  }
  if (!(await ensureBeforeChange(index))) return
  setCurrent(index, 'click')
  scrollTabTo(index)
}

// ==================== 布局测量 ====================

/**
 * 测量各标签位置与尺寸。
 * 以滚动容器自身 left 为基准并叠加当前滚动偏移，
 * 保证组件不在页面顶部、或非零滚动位置重测时滑块定位依然正确。
 */
const measureLayout = (): Promise<void> => {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery().in(instance?.proxy)
    query.select('.sk-scroll-tabs__scroll').boundingClientRect()
    query.selectAll('.sk-scroll-tabs__item').boundingClientRect()
    query.select('.sk-scroll-tabs__scroll').scrollOffset()
    query.exec((res: any[]) => {
      const [containerRect, tabRects, scrollOffset] = res || []
      if (containerRect?.width) containerWidth = containerRect.width
      if (scrollOffset?.scrollLeft !== undefined) realScrollLeft = scrollOffset.scrollLeft
      if (containerRect && tabRects?.length) {
        const baseLeft: number = containerRect.left
        state.tabLefts = tabRects.map((rect: RectInfo) => rect.left - baseLeft + realScrollLeft)
        state.tabWidths = tabRects.map((rect: RectInfo) => rect.width)
        state.ready = true
      }
      resolve()
    })
  })
}

/** 重新测量布局（防抖） */
const refresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(async () => {
    if (!props.tabs.length) {
      state.ready = false
      state.tabLefts = []
      state.tabWidths = []
      return
    }

    // current 越界保护
    if (state.current >= props.tabs.length) setCurrent(0, 'method')

    state.ready = false
    await nextTick()
    await measureLayout()
    scrollTabTo(state.current)
  }, REFRESH_DEBOUNCE)
}

// ==================== 对外方法 ====================

/** 切换到指定标签（更新高亮并把该标签滚入可视区居中） */
const scrollToIndex = (index: number) => {
  if (index < 0 || index >= props.tabs.length) return
  setCurrent(index, 'method')
  scrollTabTo(index)
}

defineExpose({ refresh, scrollToIndex })

// ==================== 监听与生命周期 ====================

// tabs 数据变更自动重新测量
watch([() => props.tabs, () => props.tabs.length], () => refresh())

// v-model:current 外部受控
watch(
  () => props.current,
  (index) => {
    if (index !== state.current) {
      setCurrent(index, 'method')
      scrollTabTo(index)
    }
  }
)

onMounted(() => {
  refresh()
})

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

<style scoped>
@import './sk-scroll-tabs.css';
</style>
