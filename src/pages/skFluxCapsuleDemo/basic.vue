<template>
	<view class="page">
		<view class="section">
			<view class="section__title">基础用法</view>
			<view class="section__desc">colors 传入颜色数组，组件自动渲染 WebGL 流体效果。</view>
			<sk-flux-capsule
				:ref="collectCapsule"
				:colors="['#ff4f9e', '#ff8c40', '#b83dff']"
				title="FLUX"
				subtitle="基础三色"
				:seed="1"
			/>
		</view>

		<view class="section">
			<view class="section__title">单色字符串派生</view>
			<view class="section__desc">colors="#5b8cff"，单色自动派生明暗邻近色凑成三色调色板。</view>
			<sk-flux-capsule
				:ref="collectCapsule"
				colors="#5b8cff"
				title="MONO"
				subtitle="#5b8cff 单色派生"
				:seed="2"
			/>
		</view>

		<view class="section">
			<view class="section__title">6 色调色板</view>
			<view class="section__desc">支持最多 6 个颜色，超出部分等距重采样到 6 色。</view>
			<sk-flux-capsule
				:ref="collectCapsule"
				:colors="['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de']"
				title="HEXA"
				subtitle="6色全光谱"
				:seed="4"
			/>
		</view>

		<view class="section">
			<view class="section__title">更多案例</view>
			<view class="nav-list">
				<view class="nav-item" v-for="nav in demoNavs" :key="nav.path" @click="goDemo(nav.path)">
					{{ nav.name }}
				</view>
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { onBeforeUpdate } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'

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

const demoNavs = [
	{ name: 'Props 演示', path: '/pages/skFluxCapsuleDemo/props' },
	{ name: '事件与插槽', path: '/pages/skFluxCapsuleDemo/events' },
]

function goDemo(url: string) {
	uni.navigateTo({ url })
}
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

.nav-list {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.nav-item {
	padding: 14rpx 30rpx;
	background: #fff;
	border-radius: 30rpx;
	font-size: 24rpx;
	color: #333;
	border: 1rpx solid #e5e5e5;
}
</style>
