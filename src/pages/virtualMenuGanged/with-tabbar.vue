<!-- 案例：搭配 sk-tab-bar 底部导航。sk-linkage-menu 作为页面主体，高度需扣除
	 顶部状态条与底部 tabBar；切换 tab 时替换左侧菜单数据集，组件自动重测联动 -->
<template>
	<view class="demo-page">
		<view class="load-status">
			<text class="load-status__text">当前页签：{{ tabList[current].text }} · 共 {{ menuList.length }} 个分组</text>
		</view>
		<sk-linkage-menu
			:list="menuList"
			:virtual-menu-height="menuHeight"
			:show-title="true"
		>
			<template v-slot="{ data }">
				<goods-item :data="data"></goods-item>
			</template>
		</sk-linkage-menu>

		<sk-tab-bar v-model:current="current" :data="tabList" :placeholder="false"></sk-tab-bar>
	</view>
</template>

<script lang="ts" setup>
	import { computed, ref } from 'vue'
	import type { MenuDataItem } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
	import type { SkTabBarItem } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type'
	import GoodsItem from './components/goods-item.vue'
	import { createMenuList, getContentHeight } from './mock'
	import icon1Active from '@/static/icon1.png'
	import icon1 from '@/static/66.png'
	import icon2Active from '@/static/icon2.png'
	import icon2 from '@/static/77.png'
	import gameActive from '@/static/fighting-game2.png'
	import game from '@/static/fighting-game.png'

	/** 顶部状态条高度（px），需与样式一致 */
	const STATUS_BAR_HEIGHT = 32
	/** tabBar 高度（rpx），与 sk-tab-bar 的 height 属性保持一致 */
	const TAB_BAR_HEIGHT_RPX = 120

	const windowInfo = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : uni.getSystemInfoSync()
	/** rpx -> px，按窗口宽度换算 */
	const rpx2px = (rpx: number) => (windowInfo.windowWidth / 750) * rpx
	/** 联动菜单可用高度 = 窗口高度 - 状态条 - tabBar */
	const menuHeight = getContentHeight(STATUS_BAR_HEIGHT + rpx2px(TAB_BAR_HEIGHT_RPX))

	/** 底部导航数据：切换页签替换菜单数据集，演示组件数据变更后自动重测 */
	const tabList: SkTabBarItem[] = [
		{ text: '奶茶点单', icon: icon1, active: icon1Active, width: '32px', height: '32px' },
		{ text: '咖啡特调', icon: game, active: gameActive, width: '32px', height: '32px' },
		{ text: '小食烘焙', icon: icon2, active: icon2Active, width: '32px', height: '32px' },
	]

	const current = ref(0)

	/** 三个页签各自的数据集：分组数 / 每组条数不同，体现重测能力 */
	const datasets = [
		createMenuList(8, 5),
		createMenuList(12, 4),
		createMenuList(6, 7),
	]

	const menuList = computed<MenuDataItem[]>(() => datasets[current.value])
</script>

<style lang="scss" scoped>
	.demo-page {
		min-height: 100vh;
		background: #fff;
	}

	.load-status {
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f7f8fa;

		&__text {
			font-size: 24rpx;
			color: #666;
		}
	}
</style>
