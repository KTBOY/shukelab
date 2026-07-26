<!-- 案例：受控模式与实例方法（v-model:current / scrollToIndex / refresh / virtual 开关） -->
<template>
	<view class="demo-page">
		<!-- 控制台 -->
		<view class="control-bar">
			<view class="control-bar__row">
				<view class="control-btn" @click="prev">上一组</view>
				<view class="control-btn" @click="next">下一组</view>
				<view class="control-btn" @click="jumpTo(19)">跳转第 20 组</view>
				<view class="control-btn" @click="handleRefresh">refresh</view>
			</view>
			<view class="control-bar__row">
				<text class="control-bar__label">虚拟渲染：{{ virtualEnabled ? '开启' : '关闭' }}</text>
				<switch :checked="virtualEnabled" color="#ff5339" style="transform: scale(0.7);"
					@change="onVirtualChange" />
				<text class="control-bar__label">当前：第 {{ currentIndex + 1 }} 组</text>
			</view>
			<view class="control-bar__log">最近事件：{{ lastEvent || '-' }}</view>
		</view>

		<sk-linkage-menu ref="menuRef" v-model:current="currentIndex" :list="menuList"
			:virtual-menu-height="menuHeight" :virtual="virtualEnabled" @change="onChange">
			<template v-slot="{ data }">
				<goods-item :data="data"></goods-item>
			</template>
		</sk-linkage-menu>
	</view>
</template>

<script lang="ts" setup>
	import { ref } from 'vue'
	import type { MenuDataItem, ChangePayload, SkLinkageMenuExpose } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
	import GoodsItem from './components/goods-item.vue'
	import { createMenuList, getContentHeight } from './mock'

	/** 控制台区域占用高度（px），从可视高度中扣除 */
	const CONTROL_BAR_HEIGHT = 140

	const menuHeight = getContentHeight(CONTROL_BAR_HEIGHT)
	const menuList = ref<MenuDataItem[]>(createMenuList(60, 3))
	const menuRef = ref<SkLinkageMenuExpose | null>(null)

	const currentIndex = ref(0)
	const virtualEnabled = ref(true)
	const lastEvent = ref('')

	// v-model:current 受控切换
	const prev = () => {
		if (currentIndex.value > 0) currentIndex.value--
	}
	const next = () => {
		if (currentIndex.value < menuList.value.length - 1) currentIndex.value++
	}

	// 实例方法：程序化跳转
	const jumpTo = (index : number) => {
		menuRef.value?.scrollToIndex(index)
	}

	// 实例方法：手动重新测量
	const handleRefresh = () => {
		menuRef.value?.refresh()
		uni.showToast({ title: '已重新测量', icon: 'none' })
	}

	// 运行时切换虚拟渲染开关
	const onVirtualChange = (e : any) => {
		virtualEnabled.value = e.detail.value
	}

	const onChange = (payload : ChangePayload) => {
		lastEvent.value = `index=${payload.index}「${payload.name}」source=${payload.source}`
	}
</script>

<style lang="scss" scoped>
	.demo-page {
		min-height: 100vh;
		background: #fff;
	}

	.control-bar {
		padding: 16rpx 20rpx;
		border-bottom: 2rpx solid #eee;
		box-sizing: border-box;

		&__row {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			margin-bottom: 12rpx;
		}

		&__label {
			font-size: 24rpx;
			color: #666;
			margin-right: 8rpx;
		}

		&__log {
			font-size: 22rpx;
			color: #999;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	}

	.control-btn {
		padding: 10rpx 24rpx;
		margin-right: 16rpx;
		border-radius: 8rpx;
		background: #000;
		color: #fff;
		font-size: 24rpx;

		&:active {
			opacity: 0.7;
		}
	}
</style>
