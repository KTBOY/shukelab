<!-- 案例：分组吸顶标题（showTitle + title 插槽自定义） -->
<template>
	<view class="demo-page">
		<sk-linkage-menu :list="menuList" :virtual-menu-height="menuHeight" :show-title="true">
			<!-- title 插槽：自定义吸顶标题样式，不传则渲染默认分组名 -->
			<template #title="{ item, index }">
				<view class="group-title">
					<view class="group-title__mark"></view>
					<text class="group-title__name">{{ item.name }}</text>
					<text class="group-title__count">共 {{ item.data.length }} 件 · 第 {{ index + 1 }} 组</text>
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
	const menuList = ref<MenuDataItem[]>(createMenuList(40, 5))
</script>

<style lang="scss" scoped>
	.demo-page {
		min-height: 100vh;
		background: #fff;
	}

	.group-title {
		display: flex;
		align-items: center;

		&__mark {
			width: 6rpx;
			height: 28rpx;
			border-radius: 4rpx;
			background: #ff5339;
			margin-right: 12rpx;
		}

		&__name {
			font-size: 28rpx;
			font-weight: 600;
			color: #222;
		}

		&__count {
			margin-left: auto;
			font-size: 22rpx;
			color: #bbb;
		}
	}
</style>
