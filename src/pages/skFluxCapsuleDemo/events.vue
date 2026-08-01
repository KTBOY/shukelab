<template>
	<view class="page">
		<!-- 事件 -->
		<view class="section">
			<view class="section__title">press / release / tap 事件</view>
			<view class="section__desc">按下触发 press，松开触发 release，点击触发 tap。事件日志显示在下方。</view>
			<sk-flux-capsule
				:ref="collectCapsule"
				:colors="['#ff4f9e', '#ff8c40', '#b83dff']"
				title="点我试试"
				:seed="70"
				@press="addLog('press')"
				@release="addLog('release')"
				@tap="addLog('tap')"
			/>
			<view class="log-box">
				<view class="log-title">事件日志（最近 8 条）</view>
				<view v-for="(item, i) in eventLog" :key="i" class="log-item">
					<text class="log-badge" :class="'log-badge--' + item.type">{{ item.type }}</text>
					<text class="log-time">{{ item.time }}</text>
				</view>
				<view v-if="!eventLog.length" class="log-empty">暂无事件，请触摸上方胶囊</view>
			</view>
		</view>

		<!-- 默认插槽 -->
		<view class="section">
			<view class="section__title">默认插槽</view>
			<view class="section__desc">通过默认插槽可完全自定义胶囊内部内容，覆盖 title/subtitle。</view>
			<sk-flux-capsule
				:ref="collectCapsule"
				:colors="['#14e094', '#2e7aff', '#8c40f2']"
				:seed="71"
			>
				<view class="slot-content">
					<view class="slot-badge">CUSTOM SLOT</view>
					<view class="slot-title">自定义插槽内容</view>
					<view class="slot-sub">完全掌控内容区域布局</view>
				</view>
			</sk-flux-capsule>
		</view>

		<!-- 插槽 + 大尺寸 -->
		<view class="section">
			<view class="section__title">大尺寸插槽</view>
			<view class="section__desc">height=280 + 插槽，适合用作卡片封面或 Banner。</view>
			<sk-flux-capsule
				:ref="collectCapsule"
				:colors="['#002ea6', '#2140d9', '#ff5c1f']"
				:height="280"
				:seed="72"
			>
				<view class="banner-content">
					<view class="banner-tag">KLEIN BLUE</view>
					<view class="banner-title">克莱因蓝</view>
					<view class="banner-desc">一种无法被复制的蓝</view>
				</view>
			</sk-flux-capsule>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { onBeforeUpdate, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'

interface LogItem {
	type: string
	time: string
}

const eventLog = ref<LogItem[]>([])

function addLog(type: string): void {
	const now = new Date()
	const time = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0').slice(0, 2)}`
	eventLog.value.unshift({ type, time })
	if (eventLog.value.length > 8) eventLog.value.pop()
}

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

<style lang="scss" scoped>
page {
	background: #f7f8fa;
}

.page {
	padding: 40rpx 32rpx 80rpx;
}

.section {
	margin-bottom: 60rpx;

	&__title {
		font-size: 28rpx;
		font-weight: 700;
		color: #111;
		margin-bottom: 12rpx;
	}

	&__desc {
		font-size: 22rpx;
		color: #888;
		margin-bottom: 24rpx;
		line-height: 1.6;
	}
}

/* 事件日志 */
.log-box {
	margin-top: 24rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.log-title {
	font-size: 22rpx;
	color: #999;
	margin-bottom: 16rpx;
}

.log-item {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 10rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.log-item:last-child {
	border-bottom: none;
}

.log-badge {
	display: inline-block;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #fff;

	&--press { background: #007aff; }
	&--release { background: #34c759; }
	&--tap { background: #ff9500; }
}

.log-time {
	font-size: 22rpx;
	color: #bbb;
	font-family: monospace;
}

.log-empty {
	font-size: 22rpx;
	color: #ccc;
	text-align: center;
	padding: 20rpx 0;
}

/* 自定义插槽样式 */
.slot-content {
	padding-left: 64rpx;
}

.slot-badge {
	display: inline-block;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 8rpx;
	padding: 4rpx 14rpx;
	font-size: 18rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	color: rgba(255, 255, 255, 0.9);
	margin-bottom: 10rpx;
}

.slot-title {
	font-size: 36rpx;
	font-weight: 800;
	color: #fff;
	letter-spacing: 2rpx;
}

.slot-sub {
	margin-top: 8rpx;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.75);
}

/* Banner 插槽 */
.banner-content {
	padding-left: 64rpx;
}

.banner-tag {
	font-size: 18rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	color: rgba(255, 255, 255, 0.7);
	margin-bottom: 12rpx;
}

.banner-title {
	font-size: 56rpx;
	font-weight: 800;
	color: #fff;
	letter-spacing: -1rpx;
}

.banner-desc {
	margin-top: 10rpx;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.65);
}
</style>
