<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<view class="tab-demo">
			<view class="uni-title uni-common-mt">v-model:current 受控切换</view>
			<view class="row">
				<button size="mini" @click="current = 0">选中首页</button>
				<button size="mini" @click="tabBarRef?.switchTo(1)">switchTo(1)</button>
			</view>
			<view class="tips">当前选中：{{ current }}（v-model 直接切换不走守卫，switchTo 走守卫）</view>

			<view class="uni-title uni-common-mt">beforeChange 切换守卫</view>
			<view class="row">
				<switch :checked="isLogin" @change="onLoginChange" />
				<text class="tips">{{ isLogin ? '已登录' : '未登录（点击"我的"会被拦截）' }}</text>
			</view>

			<view class="uni-title uni-common-mt">disabled 禁用项</view>
			<view class="tips">"购物车" 已禁用，点击无响应</view>
		</view>

		<sk-tab-bar
			ref="tabBarRef"
			v-model:current="current"
			:data="list"
			:before-change="beforeChange"
			:outerApertureBorderColor="outerApertureBorderColor"
			@change="onChange"
		/>
	</view>
</template>

<script lang="ts" setup>
	import { ref } from 'vue';
	import type { SkTabBarChangeEvent, SkTabBarItem } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type';
	import icon1Active from "@/static/icon1.png"
	import icon1 from "@/static/66.png"
	import icon2Active from "@/static/icon2.png"
	import icon2 from "@/static/77.png"
	import car from "@/static/car.png"
	import airec from "@/static/airec.png"

	const outerApertureBorderColor = ref('#f2f3f7')
	const tabBarRef = ref<{ switchTo: (index: number) => void }>()

	// 初始选中第二项，验证受控能力
	const current = ref(1)
	const isLogin = ref(false)

	const list = ref<SkTabBarItem[]>([
		{
			icon: icon1,
			active: icon1Active,
			text: '首页',
		},
		{
			icon: icon2,
			active: icon2Active,
			text: '资源列表',
		},
		{
			icon: car,
			active: car,
			text: '购物车',
			width: '32px',
			height: '32px',
			disabled: true,
		},
		{
			icon: airec,
			active: airec,
			text: '我的',
		},
	])

	// 未登录时拦截"我的"，模拟登录校验场景
	const beforeChange = async (index: number, item: SkTabBarItem) => {
		if (item.text === '我的' && !isLogin.value) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return false
		}
		return true
	}

	const onLoginChange = (e: any) => {
		isLogin.value = e.detail.value
	}

	const onChange = (e: SkTabBarChangeEvent) => {
		uni.showToast({ title: `切换到 ${e.text}（${e.currentIndex}）`, icon: 'none' })
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
		align-items: center;
		gap: 10rpx;
		margin: 20rpx 0;
	}

	.tips {
		font-size: 24rpx;
		color: #666;
	}
</style>
