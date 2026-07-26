<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<view class="tab-demo">
			<view class="uni-title uni-common-mt">item 级角标：badge 数字 / dot 红点 / badgeMax 上限</view>

			<view class="row">
				<button size="mini" @click="addMsg">消息 +10</button>
				<button size="mini" @click="clearMsg">清空消息</button>
				<button size="mini" @click="toggleDot">切换红点</button>
			</view>
			<view class="tips">当前消息数：{{ msgCount }}（超过 99 显示 99+，为 0 自动隐藏）</view>
		</view>

		<sk-tab-bar :data="list" :badge-max="99" :outerApertureBorderColor="outerApertureBorderColor" />
	</view>
</template>

<script lang="ts" setup>
	import { computed, ref } from 'vue';
	import type { SkTabBarItem } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type';
	import icon1Active from "@/static/icon1.png"
	import icon1 from "@/static/66.png"
	import icon2Active from "@/static/icon2.png"
	import icon2 from "@/static/77.png"
	import car from "@/static/car.png"

	const outerApertureBorderColor = ref('#f2f3f7')

	const msgCount = ref(5)
	const showDot = ref(true)

	const list = computed<SkTabBarItem[]>(() => [
		{
			icon: icon1,
			active: icon1Active,
			text: '首页',
		},
		{
			icon: icon2,
			active: icon2Active,
			text: '消息',
			badge: msgCount.value,
		},
		{
			icon: car,
			active: car,
			text: '购物车',
			width: '32px',
			height: '32px',
			dot: showDot.value,
		},
	])

	const addMsg = () => {
		msgCount.value += 10
	}
	const clearMsg = () => {
		msgCount.value = 0
	}
	const toggleDot = () => {
		showDot.value = !showDot.value
	}
</script>

<style>
	page {
		background-color: var(--bg)
	}
</style>
<style lang="scss" scoped>
	.bg {
		background-color: var(--bg);
		height: 100%;
		padding: 15rpx;
	}

	.tab-demo {
		background-color: #f2f3f7;
		padding: 10rpx;
	}

	.row {
		display: flex;
		gap: 10rpx;
		margin: 20rpx 0;
	}

	.tips {
		font-size: 24rpx;
		color: #666;
	}
</style>
