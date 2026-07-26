<!-- 案例：异步与分页加载（empty 插槽 + scrolltolower 触底加载更多） -->
<template>
	<view class="demo-page">
		<sk-linkage-menu :list="menuList" :virtual-menu-height="menuHeight" @scrolltolower="onLoadMore">
			<!-- empty 插槽：数据加载完成前的占位 -->
			<template #empty>
				<view class="empty-box">
					<text class="empty-box__text">数据加载中...</text>
				</view>
			</template>
			<template v-slot="{ data }">
				<goods-item :data="data"></goods-item>
			</template>
		</sk-linkage-menu>
	</view>
</template>

<script lang="ts" setup>
	import { ref, onMounted } from 'vue'
	import type { MenuDataItem } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
	import GoodsItem from './components/goods-item.vue'
	import { createMenuList, delay, getContentHeight } from './mock'

	/** 每页分组数 */
	const PAGE_SIZE = 10
	/** 最大分组数（模拟数据总量） */
	const MAX_GROUP = 40

	const menuHeight = getContentHeight()
	const menuList = ref<MenuDataItem[]>([])
	const allData = createMenuList(MAX_GROUP, 3)

	let loading = false

	// 首屏：模拟接口延时后返回第一页
	onMounted(async () => {
		await delay(800)
		menuList.value = allData.slice(0, PAGE_SIZE)
	})

	// 触底加载下一页：追加数据后组件自动重新测量
	const onLoadMore = async () => {
		if (loading || menuList.value.length >= MAX_GROUP) return
		loading = true
		uni.showLoading({ title: '加载中' })

		await delay(500)
		const nextPage = allData.slice(menuList.value.length, menuList.value.length + PAGE_SIZE)
		menuList.value = [...menuList.value, ...nextPage]

		uni.hideLoading()
		const finished = menuList.value.length >= MAX_GROUP
		uni.showToast({
			title: finished ? '已全部加载' : `已加载 ${menuList.value.length}/${MAX_GROUP} 组`,
			icon: 'none',
		})
		loading = false
	}
</script>

<style lang="scss" scoped>
	.demo-page {
		min-height: 100vh;
		background: #fff;
	}

	.empty-box {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 120rpx 0;

		&__text {
			font-size: 26rpx;
			color: #999;
		}
	}
</style>
