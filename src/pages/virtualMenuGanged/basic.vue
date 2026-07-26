<!-- 案例：基础用法（异步数据 + 默认开启虚拟渲染） -->
<template>
	<view class="demo-page">
		<sk-linkage-menu :list="menuList" :virtual-menu-height="menuHeight" @change="onChange">
			<template v-slot="{ data }">
				<goods-item :data="data"></goods-item>
			</template>
		</sk-linkage-menu>
	</view>
</template>

<script lang="ts" setup>
	import { ref, onMounted } from 'vue'
	import type { MenuDataItem, ChangePayload } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
	import GoodsItem from './components/goods-item.vue'
	import { createMenuList, delay, getContentHeight } from './mock'

	const menuHeight = getContentHeight()
	const menuList = ref<MenuDataItem[]>([])

	// 模拟接口异步返回：组件监听 list 变化后会自动重新测量并联动
	onMounted(async () => {
		await delay(600)
		menuList.value = createMenuList(100, 3)
	})

	const onChange = (payload : ChangePayload) => {
		console.log(`[basic] 切换到第 ${payload.index} 组「${payload.name}」，来源：${payload.source}`)
	}
</script>

<style lang="scss" scoped>
	.demo-page {
		min-height: 100vh;
		background: #fff;
	}
</style>
