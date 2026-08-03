<template>
	<view class="page">
		<!-- 主题筛选横向滚动 -->
		<scroll-view
			id="filter-scroll"
			class="filters"
			:scroll-x="true"
			:scroll-with-animation="true"
			:scroll-left="tabScrollLeft"
			:show-scrollbar="false"
			@scroll="onTabScroll"
		>
			<view class="filters__track">
				<view
					v-for="option in filterOptions"
					:key="option.id"
					:id="'chip-' + option.id"
					class="filters__chip"
					:class="{ 'filters__chip--active': activeFilter === option.id }"
					@tap="setFilter(option.id)"
				>
					<view class="filters__dot" :style="{ background: option.accent }" />
					<text class="filters__name">{{ option.name }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 主题卡片列表 -->
		<view class="cards">
			<view
				v-for="(theme, index) in visibleThemes"
				:key="`${activeFilter}-${theme.id}`"
				class="cards__cell"
				:style="{ animationDelay: index * 60 + 'ms' }"
			>
				<view class="cards__label">
					<text class="cards__label-en">{{ theme.name }}</text>
					<text class="cards__label-cn">{{ theme.label }}</text>
				</view>
				<sk-flux-capsule
					:ref="collectCapsule"
					:colors="theme.colors"
					:seed="index + 1"
				>
					<view class="card-title">FLUX</view>
					<view class="card-sub" :style="{ color: theme.accent }">{{ theme.label }}</view>
				</sk-flux-capsule>
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, onBeforeUpdate, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { SK_FLUX_THEMES, type SkFluxTheme } from '@/uni_modules/sk-flux-capsule/components/sk-flux-capsule/themes'

interface FilterOption {
	readonly id: string
	readonly name: string
	readonly accent: string
}

const ALL = 'all'
const instance = getCurrentInstance()

const filterOptions = computed<readonly FilterOption[]>(() => [
	{ id: ALL, name: 'ALL', accent: 'linear-gradient(135deg,#ff4fa0,#7c3fff)' },
	...SK_FLUX_THEMES.map((t) => ({ id: t.id, name: t.name, accent: t.accent })),
])

/** 实际渲染的分类：当前仅展示 ALL，其余分类隐藏（数据保留在 filterOptions，未删除，便于恢复） */
const displayFilterOptions = computed<readonly FilterOption[]>(() =>
	filterOptions.value.filter((o) => o.id === ALL),
)

const activeFilter = ref<string>(ALL)

const visibleThemes = computed<readonly SkFluxTheme[]>(() =>
	activeFilter.value === ALL
		? SK_FLUX_THEMES
		: SK_FLUX_THEMES.filter((t) => t.id === activeFilter.value),
)

/* ---------- Tab 平滑滚动居中 ---------- */

const tabScrollLeft = ref(0)
let currentScrollLeft = 0

interface ScrollDetail {
	detail: { scrollLeft: number }
}

function onTabScroll(e: ScrollDetail): void {
	currentScrollLeft = e.detail.scrollLeft
}

interface Rect {
	left: number
	width: number
}

function setFilter(id: string): void {
	activeFilter.value = id
	uni
		.createSelectorQuery()
		.in(instance?.proxy ?? null)
		.select(`#chip-${id}`)
		.boundingClientRect()
		.select('#filter-scroll')
		.boundingClientRect()
		.exec((res: Array<Rect | null>) => {
			const chip = res?.[0]
			const view = res?.[1]
			if (!chip || !view) return
			const target = Math.max(
				0,
				currentScrollLeft + chip.left - view.left - (view.width - chip.width) / 2,
			)
			tabScrollLeft.value = Math.abs(target - tabScrollLeft.value) < 1 ? target + 0.1 : target
		})
}

/* ---------- 页面生命周期 ---------- */

type CapsuleExposed = { pause(): void; resume(): void }
let capsules: CapsuleExposed[] = []

function collectCapsule(el: unknown): void {
	if (el) capsules.push(el as CapsuleExposed)
}

onBeforeUpdate(() => {
	capsules = []
})

onHide(() => capsules.forEach((c) => c.pause()))
onShow(() => capsules.forEach((c) => c.resume()))
</script>

<!-- page 样式需非 scoped 才能命中页面元素（与项目其他页面写法一致）：
     App.vue 全局给 page 设了 height:100% + overflow:hidden（锁定视口、禁止滚动），
     本页内容超出一屏，覆盖 overflow 恢复页面滚动 -->
<style lang="scss">
page {
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}
</style>

<style lang="scss" scoped>
.page {
	min-height: 100%;
	background: #f7f8fa;
	padding: 32rpx 32rpx 80rpx;
}

/* ---------- 筛选 ---------- */
.filters {
	white-space: nowrap;
	margin-bottom: 32rpx;
}

.filters__track {
	display: inline-flex;
	gap: 16rpx;
	padding: 8rpx 4rpx 16rpx;
}

.filters__chip {
	display: inline-flex;
	align-items: center;
	gap: 12rpx;
	background: #fff;
	border-radius: 100rpx;
	padding: 16rpx 28rpx;
	box-shadow: 0 8rpx 24rpx -12rpx rgba(0, 0, 0, 0.18);
	transition: background 0.25s ease;
}

.filters__chip--active {
	background: #111;
}

.filters__chip--active .filters__name {
	color: #fff;
}

.filters__dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	flex: none;
}

.filters__name {
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	color: #333;
	transition: color 0.25s ease;
}

/* ---------- 卡片 ---------- */
.cards {
	display: flex;
	flex-direction: column;
	gap: 44rpx;
}

.cards__cell {
	animation: card-in 0.45s cubic-bezier(0.22, 0.9, 0.32, 1.1) both;
}

@keyframes card-in {
	from {
		opacity: 0;
		transform: translateY(40rpx) scale(0.96);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.cards__label {
	display: flex;
	justify-content: center;
	align-items: baseline;
	gap: 10rpx;
	margin-bottom: 20rpx;
}

.cards__label-en {
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 3rpx;
	color: #222;
}

.cards__label-cn {
	font-size: 20rpx;
	color: #999;
}

.card-title {
	font-size: 40rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	color: #555;
}

.card-sub {
	margin-top: 8rpx;
	font-size: 20rpx;
	font-weight: 700;
	letter-spacing: 3rpx;
}
</style>
