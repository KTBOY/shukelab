<!-- 案例：自定义样式（menuWidth / leftBarStyle / leftBarUnStyle / menu 插槽角标） -->
<template>
	<view class="demo-page">
		<sk-linkage-menu :list="menuList" :virtual-menu-height="menuHeight" menu-width="200rpx"
			:left-bar-style="leftBarStyle" :left-bar-un-style="leftBarUnStyle">
			<!-- menu 插槽：自定义菜单项，展示角标 -->
			<template #menu="{ item, index, active }">
				<view class="menu-cell">
					<text :class="['menu-cell__name', { 'menu-cell__name--active': active }]">{{ item.name }}</text>
					<view v-if="index % 4 === 0" class="menu-cell__badge">{{ item.data.length }}</view>
				</view>
			</template>
			<template v-slot="{ data }">
				<goods-item :data="data"></goods-item>
			</template>
		</sk-linkage-menu>
	</view>
</template>

<script lang="ts" setup>
	import { ref } from 'vue'
	import type { MenuDataItem } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
	import GoodsItem from './components/goods-item.vue'
	import { createMenuList, getContentHeight } from './mock'

	const menuHeight = getContentHeight()
	const menuList = ref<MenuDataItem[]>(createMenuList(30, 4))

	/** 选中滑块样式：品牌色圆角胶囊 */
	const leftBarStyle = {
		background: 'linear-gradient(135deg, #ff7a45, #ff5339)',
		borderRadius: '16rpx',
		zIndex: "1",
		color: '#fff',

	}

	/** 未选中菜单项样式 */
	const leftBarUnStyle = {
		color: '#666',
		background: '#f7f8fa',
	}
</script>

<style lang="scss" scoped>
	.demo-page {
		min-height: 100vh;
		background: #fff;
	}

	.menu-cell {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;

		&__name {
			font-size: 26rpx;

			&--active {
				font-weight: 600;
			}
		}

		&__badge {
			position: absolute;
			top: -14rpx;
			right: 10rpx;
			min-width: 28rpx;
			height: 28rpx;
			padding: 0 6rpx;
			border-radius: 14rpx;
			background: red;
			color: #fff;
			font-size: 20rpx;
			line-height: 28rpx;
			text-align: center;
			box-sizing: border-box;
			z-index: 1;
		}
	}
</style>