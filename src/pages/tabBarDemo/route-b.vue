<template>
	<view class="bg">
		<view class="tab-demo">
			<view class="uni-title uni-common-mt">路由联动：autoRoute + useTabBar</view>
			<view class="tips">当前页面：页面 B</view>
			<view class="tips">从页面 A 跳转而来，选中态已自动同步为"页面B"</view>
		</view>

		<sk-tab-bar
			auto-route
			v-model:current="current"
			:data="items"
			@change="onChange"
		/>
	</view>
</template>

<script lang="ts" setup>
	import type { SkTabBarChangeEvent } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type';
	import { useTabBar } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/use-tab-bar';
	import { TAB_BAR_ITEMS } from './route-config';

	// 各页面共享同一份 tab 数据与选中态
	const { current, items, setCurrent } = useTabBar(TAB_BAR_ITEMS)

	const onChange = (e: SkTabBarChangeEvent) => {
		setCurrent(e.currentIndex)
	}
</script>

<style>
	page {
		background-color: #f2f3f7;
	}
</style>
<style lang="scss" scoped>
	.bg {
		min-height: 100vh;
		padding: 15rpx;
	}

	.tab-demo {
		background-color: #fff;
		padding: 10rpx;
		border-radius: 10rpx;
	}

	.tips {
		font-size: 24rpx;
		color: #666;
		margin-top: 10rpx;
	}
</style>
