<!--
 * @Author: sk
 * @Description: sk-linkage-menu 左右联动菜单
 *
 * 实现要点：
 * 1. 联动机制：挂载/数据变更后测量右侧各分组的位置（topArrList），
 *    右侧滚动时反查下标联动左侧高亮，左侧点击时驱动右侧 scroll-top。
 * 2. 分组级虚拟渲染（virtual，默认开启）：可视区 ± 一屏缓冲之外的分组
 *    以等高占位符渲染，保证滚动条与锚点稳定的同时大幅减少节点数。
 * 3. 程序化滚动锁：点击左侧菜单触发的动画滚动过程中，屏蔽 scroll 事件
 *    对高亮的反向修改，避免滑块逐格抖动。
 * 4. 精确落点：跳转前将当前位置到目标之间的分组整段渲染并测量，
 *    以实测锚点换算目标位置（与估算高度无关）；着陆后再静默校正兜底，
 *    长距离跳转也不会出现左右两侧错位。
-->
<template>
  <view class="sk-linkage-menu virtual-menu-ganged">
    <view class="menu-vessel">
      <view class="vessel-info">
        <!-- 左侧菜单区：无数据时整列不渲染，避免首屏加载态被挤到右半区 -->
        <view v-if="list.length" class="left-vessel" :style="{ width: menuWidth }">
          <scroll-view
            :scroll-y="true"
            class="left-scroll"
            :scroll-top="leftScrollTop"
            :show-scrollbar="false"
            scroll-with-animation
            :style="{ height: `${virtualMenuHeight}px` }"
          >
            <view class="info">
              <!-- 选中滑块：绝对定位 + translateY 过渡 -->
              <view class="item-active" :style="activeBarStyle">
                <text class="active-name">{{ activeName }}</text>
              </view>
              <view
                v-for="(item, index) in list"
                :id="`left-${index}`"
                :key="item.id !== undefined ? item.id : index"
                class="item"
                :style="[{ width: menuWidth }, leftBarUnStyle || {}]"
                @click="onMenuClick(index, item)"
              >
                <!-- 菜单项插槽：可自定义图标 / 角标，默认渲染名称 -->
                <slot name="menu" :item="item" :index="index" :active="index === leftState.currentIndex">
                  <text class="name">{{ item.name }}</text>
                </slot>
              </view>
            </view>
          </scroll-view>
        </view>
        <!-- 右侧内容区 -->
        <view class="right-vessel">
          <scroll-view
            :scroll-y="true"
            class="right-scroll"
            :show-scrollbar="false"
            :style="{ height: `${virtualMenuHeight}px` }"
            :scroll-top="rightState.scrollTop"
            :scroll-with-animation="scrollWithAnimation && !state.silentFix"
            @scroll="onRightScroll"
            @scrolltolower="onScrollToLower"
          >
            <view class="info">
              <!-- 加载态：异步拉数据（loading）或首帧未就绪阶段，可用 loading 插槽自定义 -->
              <slot v-if="loading || (!state.booted && list.length)" name="loading">
                <view class="menu-loading" :style="{ height: `${virtualMenuHeight}px` }">
                  <view class="menu-loading__spinner"></view>
                  <text class="menu-loading__text">加载中...</text>
                </view>
              </slot>
              <template v-else>
                <!-- 空数据插槽 -->
                <slot v-if="!list.length" name="empty"></slot>
                <template v-for="(item, index) in list" :key="item.id !== undefined ? item.id : index">
                  <!-- 虚拟渲染占位符：与分组等高（实测或估算）的空白块，保证 tops 始终有效 -->
                  <view
                    v-if="isPlaceholder(index)"
                    class="item-parent item-placeholder"
                    :style="{ height: `${virtualState.groupHeights[index]}px` }"
                  ></view>
                  <view v-else :id="`right-${index}`" class="item-parent">
                    <!-- 分组吸顶标题：showTitle 开启后生效，支持 title 插槽自定义 -->
                    <view v-if="showTitle" class="item-sticky-title">
                      <slot name="title" :item="item" :index="index">
                        <text class="item-title-text">{{ item.name }}</text>
                      </slot>
                    </view>
                    <block v-for="(item1, index2) in item.data" :key="item1.id !== undefined ? item1.id : index2">
                      <slot :data="{ ...item, ...item1 }"></slot>
                    </block>
                  </view>
                </template>
              </template>
            </view>

            <!-- 末尾占位：保证最后一个分组可完整滚动至锚点 -->
            <view class="fill-last" :style="{ height: `${state.fillHeight}px` }"></view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { reactive, computed, nextTick, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import type { PropType } from 'vue'
import type { MenuDataItem, ChangeSource, ChangePayload, RectInfo } from './sk-linkage-menu.types'

/** 滚动定位判定容差（px） */
const SCROLL_TOLERANCE = 2
/** 程序化滚动锁的兜底释放时长（ms），略大于 scroll-with-animation 动画时长 */
const SCROLL_LOCK_TIMEOUT = 600
/** 数据变更后重新测量的防抖时长（ms） */
const REFRESH_DEBOUNCE = 50
/** 左侧菜单项高度兜底值（px），测量失败时使用 */
const FALLBACK_ITEM_HEIGHT = 50

const instance = getCurrentInstance()

const props = defineProps({
  /** 组件可视高度（px），默认为窗口高度减导航栏 */
  virtualMenuHeight: {
    type: Number,
    default: () => {
      const info = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : uni.getSystemInfoSync()
      return info.windowHeight - 44
    },
  },
  /** 菜单数据，结构见 MenuDataItem */
  list: {
    type: Array as PropType<MenuDataItem[]>,
    default: () => [],
  },
  /** @deprecated 分组高度已改为自动测量，保留仅为兼容 1.0.x */
  itemHeight: {
    type: Number,
    default: 130,
  },
  /** 左侧选中滑块样式 */
  leftBarStyle: {
    type: Object,
    default: null,
  },
  /** 左侧未选中菜单项样式 */
  leftBarUnStyle: {
    type: Object,
    default: null,
  },
  /** 当前选中菜单下标，支持 v-model:current */
  current: {
    type: Number,
    default: 0,
  },
  /** 分组级虚拟渲染开关，默认开启 */
  virtual: {
    type: Boolean,
    default: true,
  },
  /** 左侧菜单宽度 */
  menuWidth: {
    type: String,
    default: '180rpx',
  },
  /** 是否显示右侧分组吸顶标题 */
  showTitle: {
    type: Boolean,
    default: false,
  },
  /** 右侧程序化滚动是否使用动画 */
  scrollWithAnimation: {
    type: Boolean,
    default: true,
  },
  /** 分组高度估算值（px）：未测量分组用它撑高，进入渲染窗口测量后回填真实值 */
  estimatedGroupHeight: {
    type: Number,
    default: 300,
  },
  /** 异步加载数据中：右侧展示 loading 插槽（默认居中转圈 + 文字）；首帧测量完成前也会自动展示 */
  loading: {
    type: Boolean,
    default: false,
  },
})

const emits = defineEmits<{
  change: [payload: ChangePayload]
  'update:current': [index: number]
  scrolltolower: [event: any]
}>()

// ==================== 状态 ====================

const state = reactive({
  /** 末尾占位高度（px） */
  fillHeight: 0,
  /** 首帧（首次测量+渲染）是否就绪 */
  booted: false,
  /** 着陆静默补滚进行中：临时关闭右侧滚动动画 */
  silentFix: false,
})

const leftState = reactive({
  /** 当前选中菜单下标 */
  currentIndex: props.current,
  /** 单个菜单项高度兜底值（px） */
  itemHeight: FALLBACK_ITEM_HEIGHT,
  /** 左侧菜单项测量结果 */
  itemRects: [] as RectInfo[],
})

const rightState = reactive({
  /** 传给 scroll-view 的受控 scroll-top */
  scrollTop: 0,
  /** 右侧实际滚动位置（来自 scroll 事件） */
  realScrollTop: 0,
  /** 各分组顶部相对内容区起点的偏移（px） */
  topArrList: [] as number[],
})

const virtualState = reactive({
  /** 测量完成且虚拟渲染生效 */
  ready: false,
  /** 当前渲染窗口起始分组下标 */
  start: 0,
  /** 当前渲染窗口结束分组下标 */
  end: 0,
  /** 各分组高度（px），供占位符使用 */
  groupHeights: [] as number[],
})

/**
 * 分组实测高度缓存：以 item.id 为键（无 id 时退化按下标），
 * 分组动态插入 / 删除 / 排序后仍能正确对号入座。
 * 注意：动态增删分组的场景必须为数据项提供唯一 id。
 */
const groupHeightCache = new Map<string, number>()

/** 分组高度缓存键：id 与下标分属两个命名空间，避免数值 id 与下标碰撞 */
const heightKeyOf = (index: number): string => {
  const id = props.list[index]?.id
  return id !== undefined ? `id:${id}` : `idx:${index}`
}

/**
 * 最近一次布局测量结果（非响应式）：
 * 滚动视口的视口相对 top + 各已渲染分组的视口相对位置，
 * 供 computeExactGroupTop 换算内容区绝对坐标。
 */
const lastMeasure = {
  /** 滚动视口（.right-scroll）的视口相对 top */
  svTop: 0,
  /** 已渲染分组下标 -> 视口相对位置与尺寸 */
  rects: new Map<number, { top: number; height: number }>(),
}

/** 程序化滚动锁（非响应式即可） */
const scrollLock = {
  locked: false,
  target: 0,
  /** 锁定期间需钉住的目标分组下标，-1 表示无 */
  targetIndex: -1,
  timer: 0 as ReturnType<typeof setTimeout> | 0,
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null
/** 等待 refresh 完成的 resolver 队列：被防抖取代的调用顺延到下一轮完成时统一兑现 */
let refreshResolvers: Array<() => void> = []
let firstMeasured = false

// ==================== 计算属性 ====================

/** 当前选中菜单名称（含越界保护） */
const activeName = computed(() => props.list[leftState.currentIndex]?.name ?? '')

/** 滑块位移：基于实测坐标累计，支持不等高菜单项 */
const sliderOffsetY = computed(() => {
  const rects = leftState.itemRects
  const current = rects[leftState.currentIndex]
  if (current && rects[0]) return current.top - rects[0].top
  return leftState.currentIndex * leftState.itemHeight
})

/** 选中滑块样式：位移 + 尺寸自适应 + 用户自定义样式 */
const activeBarStyle = computed(() => {
  const rect = leftState.itemRects[leftState.currentIndex]
  const style: Record<string, string> = {
    transform: `translateY(${sliderOffsetY.value}px)`,
    width: props.menuWidth,
    ...(props.leftBarStyle || {}),
  }
  if (rect) style.height = `${rect.height}px`
  return style
})

/** 左侧菜单滚动位置：让选中项尽量垂直居中 */
const leftScrollTop = computed(() => {
  const rects = leftState.itemRects
  const rect = rects[leftState.currentIndex]
  if (!rect || !rects[0]) return 0
  return Math.max(0, rect.top + rect.height / 2 - props.virtualMenuHeight / 2 - rects[0].top)
})

// ==================== 虚拟渲染 ====================

/** 该分组是否渲染为占位符 */
const isPlaceholder = (index: number): boolean => {
  if (!props.virtual || !virtualState.ready) return false
  return index < virtualState.start || index > virtualState.end
}

/** 依据各组高度（实测或估算）以前缀和重算分组顶部偏移 */
const recomputeTops = () => {
  const heights = virtualState.groupHeights
  const tops: number[] = new Array(heights.length)
  let acc = 0
  for (let i = 0; i < heights.length; i++) {
    tops[i] = acc
    acc += heights[i] || props.estimatedGroupHeight
  }
  rightState.topArrList = tops
}

/**
 * 将 groupHeights 对齐到 list：按当前顺序从 id 键缓存重建，
 * 未测量的分组用估算值；已移除分组的缓存项同步淘汰，避免长期累积。
 */
const syncGroupHeights = () => {
  const n = props.list.length
  const heights: number[] = new Array(n)
  const alive = new Set<string>()
  for (let i = 0; i < n; i++) {
    const key = heightKeyOf(i)
    alive.add(key)
    heights[i] = groupHeightCache.get(key) ?? props.estimatedGroupHeight
  }
  for (const key of groupHeightCache.keys()) {
    if (!alive.has(key)) groupHeightCache.delete(key)
  }
  virtualState.groupHeights = heights
  recomputeTops()
}

/** 依据滚动位置更新渲染窗口：可视区上下各扩展一屏缓冲 */
const updateRenderRange = (scrollTop: number) => {
  const tops = rightState.topArrList
  const heights = virtualState.groupHeights
  if (!tops.length || tops.length !== heights.length) return

  const min = scrollTop - props.virtualMenuHeight
  const max = scrollTop + props.virtualMenuHeight * 2
  let start = 0
  let end = tops.length - 1
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] + heights[i] >= min) {
      start = i
      break
    }
  }
  for (let i = tops.length - 1; i >= 0; i--) {
    if (tops[i] <= max) {
      end = i
      break
    }
  }
  if (scrollLock.locked && scrollLock.targetIndex >= 0) {
    start = Math.min(start, scrollLock.targetIndex)
    end = Math.max(end, scrollLock.targetIndex)
  }
  if (start !== virtualState.start || end !== virtualState.end) {
    virtualState.start = start
    virtualState.end = end
  }
}

/**
 * 计算目标分组的精确锚点位置（px）：
 * 以渲染窗口首组为参照，其内容区绝对位置由本次实测 rect 换算（与估算高度无关），
 * 再累加参照组到目标之间各组的实测高度。长距离跳转也能精确落点。
 * 数据不足时返回 undefined，调用方回退到估算 tops。
 */
const computeExactGroupTop = (index: number): number | undefined => {
  const anchor = virtualState.start
  const aRect = lastMeasure.rects.get(anchor)
  if (!aRect || index < 0 || index >= virtualState.groupHeights.length) return undefined
  const anchorAbsTop = aRect.top - lastMeasure.svTop + rightState.realScrollTop
  let delta = 0
  if (index >= anchor) {
    for (let i = anchor; i < index; i++) delta += virtualState.groupHeights[i] || props.estimatedGroupHeight
    return anchorAbsTop + delta
  }
  for (let i = index; i < anchor; i++) delta += virtualState.groupHeights[i] || props.estimatedGroupHeight
  return Math.max(anchorAbsTop - delta, 0)
}

// ==================== 联动核心 ====================

/** 更新选中项并对外派发事件 */
const setCurrent = (index: number, source: ChangeSource, forceEmit = false) => {
  // 越界下标直接丢弃：list 变短的防抖窗口内，旧 tops 反查可能得到非法下标，
  // 必须先守卫再赋值，避免对外 emit 非法的 update:current
  if (index < 0 || index >= props.list.length) return

  const changed = index !== leftState.currentIndex
  if (!changed && !forceEmit) return

  leftState.currentIndex = index
  if (changed) emits('update:current', index)

  const item = props.list[index]
  if (item) {
    emits('change', { ...item, currenIndex: index, index, source })
  }
}

/** 释放程序化滚动锁 */
const unlockScroll = () => {
  scrollLock.locked = false
  scrollLock.targetIndex = -1
  if (scrollLock.timer) {
    clearTimeout(scrollLock.timer)
    scrollLock.timer = 0
  }
}

/**
 * 跳动着陆收尾（修复长跳转落点偏移后左右长期错位）：
 * 长距离跳转途径的分组可能仍是估算高度，导致落点偏离目标分组真实位置。
 * 着陆后重测渲染窗口内的分组并重算 tops，偏差超容差则以无动画方式静默补滚，
 * 并手动同步位置与高亮（无动画补滚在部分端不触发 scroll 事件）。
 */
const finalizeLanding = async (targetIndex: number) => {
  if (scrollLock.locked) unlockScroll()
  if (!props.virtual || !virtualState.ready) return
  if (targetIndex < 0 || targetIndex >= props.list.length) return

  const landedTop = rightState.realScrollTop
  updateRenderRange(landedTop)
  // 保证目标分组留在渲染窗口内，否则无法取得它的真实高度
  if (targetIndex < virtualState.start) virtualState.start = targetIndex
  if (targetIndex > virtualState.end) virtualState.end = targetIndex
  await nextTick()
  await measureLayout()

  // 校正期间用户已手动滚动：放弃补滚，交给正常滚动联动
  if (Math.abs(rightState.realScrollTop - landedTop) >= SCROLL_TOLERANCE) return

  const target = computeExactGroupTop(targetIndex) ?? rightState.topArrList[targetIndex]
  if (target === undefined || Math.abs(target - landedTop) < SCROLL_TOLERANCE) return

  state.silentFix = true
  rightState.scrollTop = landedTop
  await nextTick()
  rightState.scrollTop = target
  await nextTick()
  state.silentFix = false

  rightState.realScrollTop = target
  setCurrent(targetIndex, 'method')
  // 无动画补滚在部分端不触发 scroll 事件，手动校正渲染窗口
  updateRenderRange(target)
}

/**
 * 滚动锚定补偿：当前滚动位置上方的分组回填真实高度后，
 * 视口内容会被推/拉（估算值与实测值偏差越大跳动越明显），
 * 按累计差值无动画调整滚动位置，保持视口稳定。
 */
const compensateAnchor = async (delta: number) => {
  // 程序化滚动期间不补偿，落点由着陆收尾负责
  if (scrollLock.locked) return
  state.silentFix = true
  rightState.scrollTop = rightState.realScrollTop
  await nextTick()
  rightState.scrollTop = Math.max(rightState.realScrollTop + delta, 0)
  await nextTick()
  state.silentFix = false
  rightState.realScrollTop = rightState.scrollTop
  if (props.virtual && virtualState.ready) updateRenderRange(rightState.realScrollTop)
}

/** 驱动右侧滚动到指定分组 */
const scrollRightTo = async (index: number) => {
  // 先把当前位置到目标之间的分组整段纳入渲染窗口并渲染、测量：
  // 长跳转途经的分组可能还是估算高度，实测后目标落点才精确
  scrollLock.locked = true
  scrollLock.targetIndex = index
  if (props.virtual && virtualState.ready) updateRenderRange(rightState.realScrollTop)
  await nextTick()
  await measureLayout()

  // 优先使用实测推算的精确落点；数据不足（如尚未测量）时回退估算 tops
  const target = computeExactGroupTop(index) ?? rightState.topArrList[index]
  if (target === undefined) {
    unlockScroll()
    return
  }
  // 目标已在当前位置：不会产生 scroll 事件，无需滚动
  if (Math.abs(target - rightState.realScrollTop) < SCROLL_TOLERANCE) {
    unlockScroll()
    return
  }
  scrollLock.target = target

  // 先重置为当前实际位置，保证 scroll-top 赋相同值时也能触发滚动
  rightState.scrollTop = rightState.realScrollTop
  await nextTick()
  rightState.scrollTop = target

  if (scrollLock.timer) clearTimeout(scrollLock.timer)
  scrollLock.timer = setTimeout(() => {
    // 兜底：动画未在预期内到达目标（或被中断），直接做着陆收尾校正
    finalizeLanding(scrollLock.targetIndex)
  }, SCROLL_LOCK_TIMEOUT)
}

/** 左侧菜单点击 */
const onMenuClick = (index: number, _item: MenuDataItem) => {
  setCurrent(index, 'click', true)
  scrollRightTo(index)
}

/** 右侧滚动：更新渲染窗口 + 反查当前分组联动左侧 */
const onRightScroll = (e: any) => {
  const scrollTop: number = e.detail.scrollTop
  rightState.realScrollTop = scrollTop

  // 到达目标：解锁并做着陆收尾；本次事件不再反向修改高亮，避免滑块闪动
  if (scrollLock.locked && Math.abs(scrollTop - scrollLock.target) < SCROLL_TOLERANCE) {
    const targetIndex = scrollLock.targetIndex
    unlockScroll()
    if (props.virtual && virtualState.ready) updateRenderRange(scrollTop)
    finalizeLanding(targetIndex)
    return
  }

  if (props.virtual && virtualState.ready) updateRenderRange(scrollTop)

  // 程序化滚动期间不反向修改高亮，避免滑块逐格抖动
  if (scrollLock.locked) return

  // 占位符随滚动替换为真实内容：节流回填真实高度并锚定补偿，避免视口跳动
  if (props.virtual && virtualState.ready) scheduleScrollMeasure()

  const tops = rightState.topArrList
  let index = 0
  for (let i = tops.length - 1; i >= 0; i--) {
    if (scrollTop + SCROLL_TOLERANCE >= tops[i]) {
      index = i
      break
    }
  }
  setCurrent(index, 'scroll')
}

/** 右侧触底：透传给使用方做分页加载 */
const onScrollToLower = (e: any) => {
  emits('scrolltolower', e)
}

// ==================== 布局测量 ====================

/**
 * 滚动期间的测量调度：占位符随滚动替换为真实内容后其真实高度需要及时回填，
 * 否则 tops 失准、视口随分组"塌缩"跳动。滚动中节流执行，停止后兜底补一次。
 */
let scrollMeasureTimer: ReturnType<typeof setTimeout> | null = null
let lastScrollMeasure = 0
const scheduleScrollMeasure = () => {
  const now = Date.now()
  if (now - lastScrollMeasure >= 150) {
    lastScrollMeasure = now
    measureLayout()
  }
  if (scrollMeasureTimer) clearTimeout(scrollMeasureTimer)
  scrollMeasureTimer = setTimeout(() => {
    scrollMeasureTimer = null
    lastScrollMeasure = Date.now()
    measureLayout()
  }, 200)
}

/**
 * 测量左侧菜单项与"当前渲染窗口内"的右侧分组尺寸。
 * 分组顶部偏移不靠全量测量，而由 recomputeTops 前缀和得出；
 * 这里只把已渲染分组的真实高度回填，避免大数据量下全量渲染/全量测量卡顿。
 */
const measureLayout = (): Promise<void> => {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery().in(instance?.proxy)
    query.selectAll('.item').boundingClientRect()
    query.selectAll('.item-parent').boundingClientRect()
    query.select('.right-scroll').boundingClientRect()
    query.exec((res: any[]) => {
      const [itemRects, groupRects, svRect] = res || []

      // 记录本次测量的视口基准与各分组视口相对位置，供精确落点推算
      lastMeasure.rects.clear()
      if (svRect && !Array.isArray(svRect) && svRect.top !== undefined) {
        lastMeasure.svTop = svRect.top
      }

      if (itemRects?.length) {
        leftState.itemRects = itemRects
        leftState.itemHeight = itemRects[0].height || FALLBACK_ITEM_HEIGHT
      }
      if (groupRects?.length) {
        let changed = false
        /** 当前滚动位置上方的分组高度差累计，用于锚定补偿 */
        let anchorDelta = 0
        const prevTops = rightState.topArrList
        for (const rect of groupRects) {
          // 占位符无 id；仅回填真实渲染的分组
          const id: string = (rect as RectInfo & { id?: string }).id || ''
          if (!id.startsWith('right-')) continue
          const index = Number(id.slice('right-'.length))
          const height = rect.height
          if (height <= 0 || index < 0 || index >= props.list.length) continue
          if (index >= virtualState.groupHeights.length) continue
          lastMeasure.rects.set(index, { top: rect.top, height })
          // 同步写入 id 键缓存：分组顺序变化后 syncGroupHeights 仍能取回该值
          groupHeightCache.set(heightKeyOf(index), height)
          if (virtualState.groupHeights[index] !== height) {
            const oldHeight = virtualState.groupHeights[index] || props.estimatedGroupHeight
            // 完整处于当前滚动位置上方的分组高度变化会推/拉视口内容，记录差值
            if (prevTops[index] !== undefined && prevTops[index] + oldHeight <= rightState.realScrollTop) {
              anchorDelta += height - oldHeight
            }
            virtualState.groupHeights[index] = height
            changed = true
          }
        }
        if (changed) recomputeTops()
        if (anchorDelta !== 0) compensateAnchor(anchorDelta)
        const lastHeight = virtualState.groupHeights[props.list.length - 1] || props.estimatedGroupHeight
        state.fillHeight = Math.max(props.virtualMenuHeight - lastHeight, 0)
      }
      resolve()
    })
  })
}

/** 兑现所有等待中的 refresh Promise */
const flushRefreshResolvers = () => {
  const list = refreshResolvers
  refreshResolvers = []
  list.forEach((resolve) => resolve())
}

/**
 * 重新测量布局（防抖）。
 * 流程：对齐高度缓存 -> 渲染可视窗口 -> 测量 -> 校正渲染窗口。
 * 数据异步更新后组件自动调用；插槽内容高度变化等场景可通过 ref 手动调用。
 * 返回 Promise，在本轮重新测量完成后 resolve，便于数据变更后精确重定位。
 */
const refresh = (): Promise<void> => {
  return new Promise((resolve) => {
    refreshResolvers.push(resolve)
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(async () => {
      // list 清空：重置全部派生状态，避免残留脏数据
      //（旧 tops 反查出非法下标并误发 update:current、empty 插槽旁挂着可滚动空白等）
      if (!props.list.length) {
        unlockScroll()
        state.fillHeight = 0
        rightState.scrollTop = 0
        rightState.realScrollTop = 0
        rightState.topArrList = []
        groupHeightCache.clear()
        lastMeasure.svTop = 0
        lastMeasure.rects.clear()
        virtualState.groupHeights = []
        virtualState.ready = false
        virtualState.start = 0
        virtualState.end = 0
        leftState.currentIndex = 0
        flushRefreshResolvers()
        return
      }

      // list 变短后的下标越界保护
      if (leftState.currentIndex >= props.list.length) {
        setCurrent(0, 'method')
      }

      // 不再退出虚拟渲染做全量渲染：估算高度撑起全列表，只渲染可视窗口
      syncGroupHeights()
      virtualState.ready = true
      updateRenderRange(rightState.realScrollTop)
      await nextTick()
      await measureLayout()
      // 回填真实高度后窗口可能变化，再校正一次
      updateRenderRange(rightState.realScrollTop)
      state.booted = true

      // 首次测量完成后，若初始下标非 0 则定位到对应分组
      if (!firstMeasured) {
        firstMeasured = true
        if (leftState.currentIndex > 0) scrollRightTo(leftState.currentIndex)
      }
      flushRefreshResolvers()
    }, REFRESH_DEBOUNCE)
  })
}

// ==================== 对外方法 ====================

/** 程序化跳转到指定菜单下标 */
const scrollToIndex = (index: number) => {
  if (index < 0 || index >= props.list.length) return
  setCurrent(index, 'method')
  scrollRightTo(index)
}

defineExpose({ refresh, scrollToIndex })

// ==================== 监听与生命周期 ====================

// 数据变更自动重新测量，解决异步加载数据不联动的问题
watch(
  () => props.list,
  () => refresh(),
  { deep: true }
)

// 关闭虚拟渲染立即回退全量渲染；重新开启则重测后生效
watch(
  () => props.virtual,
  (enabled) => {
    if (!enabled) {
      virtualState.ready = false
    } else {
      refresh()
    }
  }
)

// v-model:current 外部受控
watch(
  () => props.current,
  (index) => {
    if (index !== leftState.currentIndex) scrollToIndex(index)
  }
)

onMounted(() => {
  refresh()
})

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
  if (scrollLock.timer) clearTimeout(scrollLock.timer)
  if (scrollMeasureTimer) clearTimeout(scrollMeasureTimer)
  flushRefreshResolvers()
})
</script>

<style scoped>
@import './sk-linkage-menu.css';
</style>
