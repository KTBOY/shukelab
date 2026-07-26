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
-->
<template>
	<view class="sk-linkage-menu virtual-menu-ganged">
		<view class="menu-vessel">
			<view class="vessel-info">
				<!-- 左侧菜单区 -->
				<view class="left-vessel" :style="{ width: menuWidth }">
					<scroll-view :scroll-y="true" class="left-scroll" :scroll-top="leftScrollTop"
						scroll-with-animation :style="{ height: `${virtualMenuHeight}px` }">
						<view v-if="list.length" class="info">
							<!-- 选中滑块：绝对定位 + translateY 过渡 -->
							<view class="item-active" :style="activeBarStyle">
								<text class="active-name">{{ activeName }}</text>
							</view>
							<view v-for="(item, index) in list" :key="item.id !== undefined ? item.id : index"
								:id="`left-${index}`" class="item"
								:style="[{ width: menuWidth }, leftBarUnStyle || {}]"
								@click="onMenuClick(index, item)">
								<!-- 菜单项插槽：可自定义图标 / 角标，默认渲染名称 -->
								<slot name="menu" :item="item" :index="index"
									:active="index === leftState.currentIndex">
									<text class="name">{{ item.name }}</text>
								</slot>
							</view>
						</view>
					</scroll-view>
				</view>
				<!-- 右侧内容区 -->
				<view class="right-vessel">
					<scroll-view :scroll-y="true" class="right-scroll" :style="{ height: `${virtualMenuHeight}px` }"
						:scroll-top="rightState.scrollTop" :scroll-with-animation="scrollWithAnimation"
						@scroll="onRightScroll" @scrolltolower="onScrollToLower">
						<view class="info">
							<!-- 空数据插槽 -->
							<slot v-if="!list.length" name="empty"></slot>
							<template v-for="(item, index) in list" :key="item.id !== undefined ? item.id : index">
								<!-- 虚拟渲染占位符：与真实分组等高，保证 topArrList 始终有效 -->
								<view v-if="isPlaceholder(index)" class="item-parent item-placeholder"
									:style="{ height: `${virtualState.groupHeights[index]}px` }"></view>
								<view v-else :id="`right-${index}`" class="item-parent">
									<!-- 分组吸顶标题：showTitle 开启后生效，支持 title 插槽自定义 -->
									<view v-if="showTitle" class="item-sticky-title">
										<slot name="title" :item="item" :index="index">
											<text class="item-title-text">{{ item.name }}</text>
										</slot>
									</view>
									<block v-for="(item1, index2) in item.data"
										:key="item1.id !== undefined ? item1.id : index2">
										<slot :data="{ ...item, ...item1 }"></slot>
									</block>
								</view>
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
	})

	const emits = defineEmits<{
		change : [payload : ChangePayload]
		'update:current' : [index : number]
		scrolltolower : [event : any]
	}>()

	// ==================== 状态 ====================

	const state = reactive({
		/** 末尾占位高度（px） */
		fillHeight: 0,
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

	/** 程序化滚动锁（非响应式即可） */
	const scrollLock = {
		locked: false,
		target: 0,
		/** 锁定期间需钉住的目标分组下标，-1 表示无 */
		targetIndex: -1,
		timer: 0 as ReturnType<typeof setTimeout> | 0,
	}

	let refreshTimer : ReturnType<typeof setTimeout> | null = null
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
		const style : Record<string, string> = {
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
	const isPlaceholder = (index : number) : boolean => {
		// 新追加、尚未测量高度的分组必须渲染真实内容，避免出现 0 高占位符
		if (index >= virtualState.groupHeights.length) return false
		return props.virtual && virtualState.ready &&
			(index < virtualState.start || index > virtualState.end)
	}

	/** 依据滚动位置更新渲染窗口：可视区上下各扩展一屏缓冲 */
	const updateRenderRange = (scrollTop : number) => {
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
		// 程序化滚动期间钉住目标分组，避免动画途中被移出渲染窗口导致落点空白
		if (scrollLock.locked && scrollLock.targetIndex >= 0) {
			start = Math.min(start, scrollLock.targetIndex)
			end = Math.max(end, scrollLock.targetIndex)
		}
		if (start !== virtualState.start || end !== virtualState.end) {
			virtualState.start = start
			virtualState.end = end
		}
	}

	// ==================== 联动核心 ====================

	/** 更新选中项并对外派发事件 */
	const setCurrent = (index : number, source : ChangeSource, forceEmit = false) => {
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

	/** 驱动右侧滚动到指定分组 */
	const scrollRightTo = async (index : number) => {
		const target = rightState.topArrList[index]
		if (target === undefined) return
		// 目标已在当前位置：不会产生 scroll 事件，无需加锁与滚动
		if (Math.abs(target - rightState.realScrollTop) < SCROLL_TOLERANCE) return

		scrollLock.locked = true
		scrollLock.target = target
		scrollLock.targetIndex = index

		// 提前把目标分组纳入渲染窗口，避免跳转落点出现占位空白
		if (props.virtual && virtualState.ready) {
			updateRenderRange(rightState.realScrollTop)
		}

		// 先重置为当前实际位置，保证 scroll-top 赋相同值时也能触发滚动
		rightState.scrollTop = rightState.realScrollTop
		await nextTick()
		rightState.scrollTop = target

		if (scrollLock.timer) clearTimeout(scrollLock.timer)
		scrollLock.timer = setTimeout(() => {
			unlockScroll()
			// 兜底解锁后收回跳转期间多渲染的分组
			if (props.virtual && virtualState.ready) updateRenderRange(rightState.realScrollTop)
		}, SCROLL_LOCK_TIMEOUT)
	}

	/** 左侧菜单点击 */
	const onMenuClick = (index : number, _item : MenuDataItem) => {
		setCurrent(index, 'click', true)
		scrollRightTo(index)
	}

	/** 右侧滚动：更新渲染窗口 + 反查当前分组联动左侧 */
	const onRightScroll = (e : any) => {
		const scrollTop : number = e.detail.scrollTop
		rightState.realScrollTop = scrollTop

		// 到达目标后先解锁，随后的窗口更新即可收回跳转期间多渲染的分组
		if (scrollLock.locked && Math.abs(scrollTop - scrollLock.target) < SCROLL_TOLERANCE) {
			unlockScroll()
		}

		if (props.virtual && virtualState.ready) updateRenderRange(scrollTop)

		// 程序化滚动期间不反向修改高亮，避免滑块逐格抖动
		if (scrollLock.locked) return

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
	const onScrollToLower = (e : any) => {
		emits('scrolltolower', e)
	}

	// ==================== 布局测量 ====================

	/**
	 * 测量左侧菜单项与右侧分组尺寸。
	 * 以右侧滚动容器自身 top 为基准并叠加当前滚动偏移，
	 * 保证组件不在页面顶部、或非零滚动位置重测时定位依然正确。
	 */
	const measureLayout = () : Promise<void> => {
		return new Promise((resolve) => {
			const query = uni.createSelectorQuery().in(instance?.proxy)
			query.selectAll('.item').boundingClientRect()
			query.select('.right-scroll').boundingClientRect()
			query.selectAll('.item-parent').boundingClientRect()
			query.select('.right-scroll').scrollOffset()
			query.exec((res : any[]) => {
				const [itemRects, containerRect, groupRects, scrollOffset] = res || []

				if (itemRects?.length) {
					leftState.itemRects = itemRects
					leftState.itemHeight = itemRects[0].height || FALLBACK_ITEM_HEIGHT
				}
				if (containerRect && groupRects?.length) {
					const baseTop : number = containerRect.top
					const scrollTop : number = scrollOffset?.scrollTop || 0
					rightState.topArrList = groupRects.map((rect : RectInfo) => rect.top - baseTop + scrollTop)
					virtualState.groupHeights = groupRects.map((rect : RectInfo) => rect.height)

					const lastHeight : number = groupRects[groupRects.length - 1].height
					state.fillHeight = Math.max(props.virtualMenuHeight - lastHeight, 0)
				}
				resolve()
			})
		})
	}

	/**
	 * 重新测量布局（防抖）。
	 * 流程：退出虚拟渲染以渲染全部分组 -> 等待渲染 -> 测量 -> 恢复虚拟渲染。
	 * 数据异步更新后组件自动调用；插槽内容高度变化等场景可通过 ref 手动调用。
	 */
	const refresh = () => {
		if (refreshTimer) clearTimeout(refreshTimer)
		refreshTimer = setTimeout(async () => {
			if (!props.list.length) return

			// list 变短后的下标越界保护
			if (leftState.currentIndex >= props.list.length) {
				setCurrent(0, 'method')
			}

			virtualState.ready = false
			await nextTick()
			await measureLayout()

			if (props.virtual) {
				updateRenderRange(rightState.realScrollTop)
				virtualState.ready = true
			}

			// 首次测量完成后，若初始下标非 0 则定位到对应分组
			if (!firstMeasured) {
				firstMeasured = true
				if (leftState.currentIndex > 0) scrollRightTo(leftState.currentIndex)
			}
		}, REFRESH_DEBOUNCE)
	}

	// ==================== 对外方法 ====================

	/** 程序化跳转到指定菜单下标 */
	const scrollToIndex = (index : number) => {
		if (index < 0 || index >= props.list.length) return
		setCurrent(index, 'method')
		scrollRightTo(index)
	}

	defineExpose({ refresh, scrollToIndex })

	// ==================== 监听与生命周期 ====================

	// 数据变更自动重新测量，解决异步加载数据不联动的问题
	watch(() => props.list, () => refresh(), { deep: true })

	// 关闭虚拟渲染立即回退全量渲染；重新开启则重测后生效
	watch(() => props.virtual, (enabled) => {
		if (!enabled) {
			virtualState.ready = false
		} else {
			refresh()
		}
	})

	// v-model:current 外部受控
	watch(() => props.current, (index) => {
		if (index !== leftState.currentIndex) scrollToIndex(index)
	})

	onMounted(() => {
		refresh()
	})

	onBeforeUnmount(() => {
		if (refreshTimer) clearTimeout(refreshTimer)
		if (scrollLock.timer) clearTimeout(scrollLock.timer)
	})
</script>

<style scoped>
	@import './sk-linkage-menu.css';
</style>
