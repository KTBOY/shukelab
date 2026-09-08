<template>
	<!-- 占位节点：fixed 模式下撑起同高空间，避免 tabBar 遮挡页面内容 -->
	<view v-if="fixed && placeholder" class="sk-tab-bar__placeholder" :style="{ height: height }" />
	<view
		class="sk-tab-bar"
		:class="{
			'sk-tab-bar--fixed': fixed,
			'sk-tab-bar--plain': mode !== 'concave',
			'sk-tab-bar--filter': mode === 'filter',
			'sk-tab-bar--canvas': mode === 'canvas',
			'is-degraded': canvasDegraded
		}"
		:style="rootStyle"
	>
		<!-- canvas 模式：画布绘制栏色融合轮廓（真透明，任意背景可用）；
		     深色圆钮/图标/文字仍用 view 叠在其上，canvas 不重绘它们 -->
		<canvas
			v-if="mode === 'canvas' && list.length"
			class="sk-tab-bar__canvas"
			type="2d"
			:id="canvasId"
			:canvas-id="canvasId"
		/>
		<!-- filter 模式：blur+contrast 融合层，同色矩形与圆钮经滤镜融合出内凹平滑圆角；
		     融合层须铺实底色（--color，需与页面背景一致）供 contrast 硬化边缘 -->
		<view v-if="mode === 'filter' && list.length" class="sk-tab-bar__goo">
			<view class="sk-tab-bar__goo-bar" />
			<view class="sk-tab-bar__goo-knob" />
		</view>
		<view
			v-for="(item, index) in list"
			:key="item.text || index"
			class="sk-tab-bar__item"
			:class="{
				'sk-tab-bar__item--active': index === activeIndex,
				'sk-tab-bar__item--disabled': item.disabled
			}"
			@click="onItemClick(item, index)"
		>
			<slot name="item" :item="item" :index="index" :active="index === activeIndex">
				<!-- 图标与角标同属一个上浮容器，选中时角标跟随图标浮入圆钮右上角 -->
				<view class="sk-tab-bar__icon-wrap">
					<text
						v-if="item.iconType === 'font'"
						class="sk-tab-bar__icon sk-tab-bar__icon--font"
						:class="index === activeIndex ? item.active : item.icon"
						:style="item.width ? { fontSize: item.width } : ''"
					/>
					<image
						v-else
						class="sk-tab-bar__icon"
						mode="aspectFit"
						:src="index === activeIndex ? item.active : item.icon"
						:style="{ width: item.width || ICON_SIZE, height: item.height || ICON_SIZE }"
					/>
					<view v-if="item.dot" class="sk-tab-bar__badge sk-tab-bar__badge--dot" />
					<view v-else-if="getBadgeText(item)" class="sk-tab-bar__badge">
						{{ getBadgeText(item) }}
					</view>
				</view>
				<text class="sk-tab-bar__text">{{ item.text }}</text>
			</slot>
		</view>
			<!-- 凹陷弧形滑块，随选中项平移；--n 由根节点下发，与 filter 融合凸起共用 -->
			<view v-if="list.length" class="sk-tab-bar__bump" />
	</view>
</template>

<script lang="ts" setup>
/**
 * SkTabBar 自定义 tabBar
 * @description 组件形式的凹陷弧形 tabBar，支持受控选中（v-model:current）、
 * item 级角标/红点、切换守卫、路由联动、字体图标与插槽自定义。
 * @tutorial https://ext.dcloud.net.cn/plugin?name=sk-tab-bar
 *
	 * @property {SkTabBarItem[]} data tab 数据源
	 * @property {String} mode 形态：concave 伪类凹陷弧形（默认，光圈需与页面背景同色）/ canvas 画布绘制融合内凹（真实透明轮廓，任意背景可用；小程序需基础库 2.9.0+，background 仅纯色，失败自动回退 plain 观感；开发者工具模拟器不支持 canvas 同层渲染，自动回退 plain 观感，真机不受影响）/ plain 纯净模式。注：filter 融合为内部保留形态，暂不开放
 * @property {Number} current 当前选中下标，支持 v-model:current
 * @property {String} outerApertureBorderColor 弧形外光圈颜色，需与页面背景一致（默认 #f2f3f7）
 * @property {String} iconBackgroundColor 选中圆形按钮背景色（默认 rgb(3, 3, 3)）
 * @property {String} background tabBar 背景色（默认 #fff）
 * @property {String} textColor 文字颜色（默认 #222）
 * @property {String} activeTextColor 选中文字颜色（默认 #222）
 * @property {String} fontSize 文字字号（默认 26rpx）
 * @property {String} height tabBar 高度，同时决定圆形按钮直径（默认 120rpx）
 * @property {Number} zIndex 层级（默认 10）
 * @property {Number} duration 切换动画时长，单位 ms（默认 500）
 * @property {Boolean} fixed 是否固定在底部（默认 true）
 * @property {Boolean} placeholder fixed 时是否生成同高占位（默认 false）
 * @property {Number} badgeMax 数字角标上限，超出显示 badgeMax+（默认 99）
 * @property {Boolean} autoRoute 点击后是否按 item.pagePath 自动跳转（默认 false）
 * @property {Function} beforeChange 切换守卫，返回 false / Promise<false> 时阻止切换
 * @property {String|Number} corner 角标内容 @deprecated 请使用 item.badge
 *
 * @event {Function} change tab 切换后触发，参数为 SkTabBarChangeEvent
 * @event {Function} update:current 选中下标变化，配合 v-model:current 使用
 */
import { computed, ref, watch, getCurrentInstance, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { PropType, CSSProperties } from 'vue'
import type { SkTabBarBeforeChange, SkTabBarChangeEvent, SkTabBarItem, SkTabBarMode } from './sk-tab-bar.type'
import {
	CANVAS_CONST,
	createFrameDriver,
	drawSilhouette,
	knobCxFor,
	makeCssEase,
	type FrameDriver,
	type SilhouetteGeometry
} from './sk-tab-bar-canvas'

defineOptions({ name: 'SkTabBar' })

/** 图标默认尺寸 */
const ICON_SIZE = '36px'

const props = defineProps({
	/** tab 数据源 */
	data: {
		type: Array as PropType<SkTabBarItem[]>,
		default: () => []
	},
	/** 当前选中下标，支持 v-model:current */
	current: {
		type: Number,
		default: 0
	},
	/** 形态：concave 伪类凹陷弧形（默认，光圈需与页面背景同色）；canvas 画布绘制融合内凹，真实透明轮廓、任意背景可用（小程序需基础库 2.9.0+，background 仅纯色，取节点失败自动回退 plain 观感；开发者工具模拟器 canvas 非同层会遮挡 tab 项，自动回退 plain 观感）；plain 纯净模式，实心栏 + 圆钮悬浮，不依赖背景色。filter 融合为内部保留形态，暂不开放 */
	mode: {
		type: String as PropType<SkTabBarMode>,
		default: 'concave'
	},
	/** 弧形外光圈颜色，需与页面背景一致 */
	outerApertureBorderColor: {
		type: String,
		default: '#f2f3f7'
	},
	/** 选中圆形按钮背景色 */
	iconBackgroundColor: {
		type: String,
		default: 'rgb(3, 3, 3)'
	},
	/** tabBar 背景色 */
	background: {
		type: String,
		default: '#fff'
	},
	/** 文字颜色 */
	textColor: {
		type: String,
		default: '#222'
	},
	/** 选中文字颜色 */
	activeTextColor: {
		type: String,
		default: '#222'
	},
	/** 文字字号 */
	fontSize: {
		type: String,
		default: '26rpx'
	},
	/** tabBar 高度，同时决定圆形按钮直径 */
	height: {
		type: String,
		default: '120rpx'
	},
	/** 层级 */
	zIndex: {
		type: Number,
		default: 10
	},
	/** 切换动画时长，单位 ms */
	duration: {
		type: Number,
		default: 500
	},
	/** 是否固定在底部 */
	fixed: {
		type: Boolean,
		default: true
	},
	/** fixed 时是否生成同高占位，避免遮挡页面内容 */
	placeholder: {
		type: Boolean,
		default: false
	},
	/** 数字角标上限，超出显示 badgeMax+ */
	badgeMax: {
		type: Number,
		default: 99
	},
	/** 点击后是否按 item.pagePath 自动跳转 */
	autoRoute: {
		type: Boolean,
		default: false
	},
	/** 切换守卫，返回 false / Promise<false> 时阻止切换 */
	beforeChange: {
		type: Function as PropType<SkTabBarBeforeChange>,
		default: null
	},
	/** @deprecated 请使用 item.badge，保留用于兼容 1.0.3 及之前的用法 */
	corner: {
		type: [String, Number],
		default: ''
	}
})

const emit = defineEmits<{
	(e: 'update:current', index: number): void
	(e: 'change', payload: SkTabBarChangeEvent): void
}>()

const list = computed<SkTabBarItem[]>(() => props.data ?? [])

/** 内部选中态：未绑定 current 时自行维护，绑定后跟随外部（受控） */
const activeIndex = ref(0)

// 受控同步：current 变化时跟随外部。仅依赖 current，避免 data 数组重建（如角标更新）时误重置选中项
watch(
	() => props.current,
	(current) => {
		activeIndex.value = clampIndex(current)
	},
	{ immediate: true }
)

// 数据长度变化（增删 tab / 异步加载）时仅将选中项收敛到合法范围，不覆盖用户已选项
watch(
	() => list.value.length,
	() => {
		activeIndex.value = clampIndex(activeIndex.value)
	}
)

/** 根节点样式：通过 CSS 变量向下传递主题配置；--n 为选中下标，bump 平移与 filter 融合凸起平移共用 */
const rootStyle = computed<CSSProperties>(() => ({
	'--length': list.value.length || 1,
	'--n': activeIndex.value,
	'--color': props.outerApertureBorderColor,
	'--bg': props.iconBackgroundColor,
	'--bar-bg': props.background,
	'--text-color': props.textColor,
	'--active-text-color': props.activeTextColor,
	'--font-size': props.fontSize,
	'--c': props.height,
	'--duration': `${props.duration}ms`,
	zIndex: props.zIndex
}))

/* ---------- canvas 形态：画布绘制真透明融合轮廓 ---------- */
const instance = getCurrentInstance()
/** 实例级唯一 canvas id，避免 useTabBar 多页面多实例冲突 */
const canvasId = `sk-tab-bar-canvas-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
/** 取节点/绘制失败时降级为 plain 观感，保证任何端都不丢 tabBar */
const canvasDegraded = ref(false)

let canvasNode: any = null
let canvasCtx: any = null
let frameDriver: FrameDriver | null = null
let silhouette: SilhouetteGeometry | null = null
let currentCx = 0
let animId: number | null = null
let canvasDpr = 1
let resizeTimer: any = null
let degradeWarned = false
const cssEase = makeCssEase()

function degrade(reason: 'init' | 'devtools' = 'init') {
	if (!degradeWarned) {
		degradeWarned = true
		console.warn(
			reason === 'devtools'
				? '[sk-tab-bar] 开发者工具模拟器不支持 canvas 2d 同层渲染，画布会盖住 tab 项，已降级为 plain 观感；真机不受影响。'
				: '[sk-tab-bar] canvas 形态初始化失败，已降级为 plain 观感（实心栏）。小程序需基础库 2.9.0+。'
		)
	}
	canvasDegraded.value = true
}

/** 开发者工具模拟器检测：模拟器里 canvas（含 2d）非同层、恒盖在 view 之上，真机无此问题 */
function isDevtoolsSimulator(): boolean {
	// #ifdef MP-WEIXIN
	try {
		const sys: any = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : (uni as any).getSystemInfoSync()
		return sys?.platform === 'devtools'
	} catch (_) {
		/* 取系统信息失败按真机处理 */
	}
	// #endif
	return false
}

/** 单帧绘制：分端设置 transform 后清空并重画轮廓。坐标一律 CSS px */
function drawAt(cx: number) {
	if (!canvasCtx || !silhouette) return
	// #ifdef MP-WEIXIN
	canvasCtx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0)
	// #endif
	// #ifndef MP-WEIXIN
	// H5 的 uni-h5 hidpi 已自动按 pixelRatio 缩放坐标，切勿再 scale，否则双重缩放
	canvasCtx.setTransform(1, 0, 0, 1, 0, 0)
	// #endif
	canvasCtx.clearRect(0, 0, silhouette.width, silhouette.height)
	drawSilhouette(canvasCtx, silhouette, cx, props.background)
	currentCx = cx
}

/** 切 tab 时平移凸包；缓动对齐 __bump 的 CSS ease，避免中途错位露缝 */
function animateKnobTo(target: number) {
	if (!frameDriver || !silhouette) {
		drawAt(target)
		return
	}
	if (animId !== null) frameDriver.cancel(animId)
	const from = currentCx
	const t0 = Date.now()
	const dur = Math.max(props.duration, 1)
	const step = () => {
		const t = Math.min((Date.now() - t0) / dur, 1)
		const cx = t < 1 ? from + (target - from) * cssEase(t) : target
		drawAt(cx)
		if (t < 1) animId = frameDriver ? frameDriver.request(step) : null
		else animId = null
	}
	animId = frameDriver.request(step)
}

function teardownCanvas() {
	if (animId !== null && frameDriver) frameDriver.cancel(animId)
	animId = null
	canvasNode = null
	canvasCtx = null
	frameDriver = null
	silhouette = null
}

/** 查询节点与几何并画首帧；尺寸未就绪时重试，仍失败则降级 */
function initCanvas(retry = 0) {
	/* 模拟器里 canvas 恒盖在 view 之上（非同层），tab 项会被白色栏体挡住，直接走 plain 观感 */
	if (isDevtoolsSimulator()) {
		degrade('devtools')
		return
	}
	teardownCanvas()
	const query = uni.createSelectorQuery().in(instance?.proxy ?? null)
	query.select(`#${canvasId}`).fields({ node: true, size: true }, () => undefined)
	query.select('.sk-tab-bar__canvas').boundingClientRect()
	query.select('.sk-tab-bar').boundingClientRect()
	query.select('.sk-tab-bar__bump').boundingClientRect()
	query.exec((res: any[]) => {
		const retryOrDegrade = () => {
			if (retry < 3) setTimeout(() => initCanvas(retry + 1), 100)
			else degrade()
		}
		try {
			const nodeField = res?.[0]
			const canvasRect = res?.[1]
			const rootRect = res?.[2]
			const bumpRect = res?.[3]
			const node = nodeField?.node
			const cssW = canvasRect?.width || nodeField?.width || 0
			const cssH = canvasRect?.height || nodeField?.height || 0
			if (!node || typeof node.getContext !== 'function' || !cssW || !cssH || !rootRect || !bumpRect) {
				retryOrDegrade()
				return
			}
			const ctx = node.getContext('2d')
			if (!ctx) {
				retryOrDegrade()
				return
			}
			canvasNode = node
			canvasCtx = ctx
			// #ifdef MP-WEIXIN
			const sys: any = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : (uni as any).getSystemInfoSync()
			canvasDpr = Math.min(sys?.pixelRatio || 1, CANVAS_CONST.maxDpr)
			node.width = Math.round(cssW * canvasDpr)
			node.height = Math.round(cssH * canvasDpr)
			// #endif
			silhouette = {
				width: cssW,
				height: cssH,
				barTop: rootRect.top - canvasRect.top,
				knobCy: bumpRect.top + bumpRect.height / 2 - canvasRect.top,
				/* 凹口半径贴住圆钮元素边缘（内收 0.5px 防抗锯齿发丝线），
				   缝隙 = 圆钮 10rpx 透明边框，透出页面背景呈均匀半圆环 */
				knobR: bumpRect.width / 2 - 0.5,
				filletR: uni.upx2px(CANVAS_CONST.filletRpx),
				cornerR: uni.upx2px(CANVAS_CONST.cornerRpx)
			}
			frameDriver = createFrameDriver(
				typeof node.requestAnimationFrame === 'function' ? node.requestAnimationFrame.bind(node) : undefined,
				typeof node.cancelAnimationFrame === 'function' ? node.cancelAnimationFrame.bind(node) : undefined
			)
			canvasDegraded.value = false
			currentCx = knobCxFor(activeIndex.value, list.value.length, cssW)
			drawAt(currentCx)
		} catch (e) {
			retryOrDegrade()
		}
	})
}

function handleWindowResize() {
	if (props.mode !== 'canvas') return
	clearTimeout(resizeTimer)
	resizeTimer = setTimeout(() => initCanvas(), 150)
}

// 选中变化：仅平移凸包（不重建几何）
watch(activeIndex, (index) => {
	if (props.mode === 'canvas' && silhouette) animateKnobTo(knobCxFor(index, list.value.length, silhouette.width))
})
// 栏色变化：仅重绘
watch(
	() => props.background,
	() => {
		if (props.mode === 'canvas') drawAt(currentCx)
	}
)
// 尺寸/数量/形态变化：全量重建或卸载
watch(
	[() => props.height, () => list.value.length, () => props.mode],
	() => {
		if (props.mode === 'canvas') nextTick(() => setTimeout(() => initCanvas(), 50))
		else teardownCanvas()
	}
)

onMounted(() => {
	uni.onWindowResize?.(handleWindowResize)
	if (props.mode === 'canvas') nextTick(() => setTimeout(() => initCanvas(), 50))
})

onBeforeUnmount(() => {
	uni.offWindowResize?.(handleWindowResize)
	clearTimeout(resizeTimer)
	teardownCanvas()
})

/** 下标越界保护 */
function clampIndex(index: number): number {
	if (!list.value.length) return 0
	return Math.min(Math.max(0, index), list.value.length - 1)
}

/** 计算角标文案：item.badge 优先，兼容旧版 cornerMark + corner；0 或空不显示 */
function getBadgeText(item: SkTabBarItem): string {
	const value = item.badge ?? (item.cornerMark ? props.corner : '')
	if (value === '' || value === null || value === undefined || value === 0 || value === '0') return ''
	if (typeof value === 'number' && value > props.badgeMax) return `${props.badgeMax}+`
	return String(value)
}

/** 按 item 配置执行路由跳转 */
function navigate(item: SkTabBarItem) {
	if (!item.pagePath) return
	const url = item.pagePath.startsWith('/') ? item.pagePath : `/${item.pagePath}`
	switch (item.switchMode) {
		case 'switchTab':
			uni.switchTab({ url })
			break
		case 'navigateTo':
			uni.navigateTo({ url })
			break
		case 'redirectTo':
			uni.redirectTo({ url })
			break
		default:
			uni.reLaunch({ url })
	}
}

async function onItemClick(item: SkTabBarItem, index: number) {
	if (item.disabled || index === activeIndex.value) return
	if (props.beforeChange) {
		let allowed: boolean | void
		try {
			allowed = await props.beforeChange(index, item)
		} catch {
			allowed = false
		}
		if (allowed === false) return
	}
	activeIndex.value = index
	emit('update:current', index)
	// currenIndex 为 1.0.3 及之前版本的历史字段，保留以兼容存量用户
	emit('change', { ...item, currentIndex: index, currenIndex: index })
	if (props.autoRoute) navigate(item)
}

/**
 * 编程式切换，走完整的守卫与事件流程
 * @param index 目标 tab 下标
 */
function switchTo(index: number) {
	const item = list.value[index]
	if (!item) return
	return onItemClick(item, index)
}

defineExpose({ switchTo })
</script>

<style scoped>
	@import './sk-tab-bar.css';
</style>
