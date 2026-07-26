<template>
	<!-- 占位节点：fixed 模式下撑起同高空间，避免 tabBar 遮挡页面内容 -->
	<view v-if="fixed && placeholder" class="sk-tab-bar__placeholder" :style="{ height: height }" />
	<view class="sk-tab-bar" :class="{ 'sk-tab-bar--fixed': fixed }" :style="rootStyle">
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
		<!-- 凹陷弧形滑块，随选中项平移 -->
		<view v-if="list.length" class="sk-tab-bar__bump" :style="{ '--n': activeIndex }" />
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
import { computed, ref, watch } from 'vue'
import type { PropType, CSSProperties } from 'vue'
import type { SkTabBarBeforeChange, SkTabBarChangeEvent, SkTabBarItem } from './sk-tab-bar.type'

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

/** 根节点样式：通过 CSS 变量向下传递主题配置 */
const rootStyle = computed<CSSProperties>(() => ({
	'--length': list.value.length || 1,
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
