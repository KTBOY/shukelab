<!-- 案例：右侧分页加载（左侧菜单全量传入，右侧内容按页追加，点击未加载分组自动补载） -->
<template>
	<view class="demo-page">
		<view class="load-status">
			<text class="load-status__text">
				左侧菜单全量渲染 · 右侧已加载 {{ loadedCount }}/{{ TOTAL_ITEMS }} 条{{ finished ? '（已全部加载）' : '' }}
			</text>
		</view>
		<sk-linkage-menu
			ref="menuRef"
			:list="menuList"
			:virtual-menu-height="menuHeight"
			:show-title="true"
			@scrolltolower="onLoadMore"
			@change="onChange"
		>
			<template v-slot="{ data }">
				<goods-item :data="data"></goods-item>
			</template>
		</sk-linkage-menu>
	</view>
</template>

<script lang="ts" setup>
	import { computed, onMounted, ref } from 'vue'
	import type { MenuDataItem, ChangePayload, SkLinkageMenuExpose } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
	import GoodsItem from './components/goods-item.vue'
	import { createMenuList, delay, getContentHeight } from './mock'

	/** 右侧每页条数 */
	const PAGE_SIZE = 12
	/** 分组数 */
	const GROUP_COUNT = 12
	/** 每组条数 */
	const GROUP_ITEM_COUNT = 6
	/** 内容总条数 */
	const TOTAL_ITEMS = GROUP_COUNT * GROUP_ITEM_COUNT
	/** 顶部状态条高度（px），需与样式一致 */
	const STATUS_BAR_HEIGHT = 32

	const menuHeight = getContentHeight(STATUS_BAR_HEIGHT)
	const menuRef = ref<SkLinkageMenuExpose>()

	// 完整数据源：模拟服务端，分页接口按扁平下标截取
	const allData = createMenuList(GROUP_COUNT, GROUP_ITEM_COUNT)

	// 左侧菜单全量传入（分类接口一次返回全部分组名），右侧内容置空等待分页填充
	const menuList = ref<MenuDataItem[]>(
		allData.map((group) => ({ id: group.id, name: group.name, data: [] }))
	)

	const loadedCount = ref(0)
	const finished = computed(() => loadedCount.value >= TOTAL_ITEMS)

	let loading = false

	/** 模拟分页接口：按扁平下标返回 [start, start+count) 区间的条目及其归属分组 */
	async function fetchPage(start : number, count : number) {
		await delay(400)
		const end = Math.min(start + count, TOTAL_ITEMS)
		const result : Array<{ groupIndex : number; item : Record<string, any> }> = []
		for (let flat = start; flat < end; flat++) {
			const groupIndex = Math.floor(flat / GROUP_ITEM_COUNT)
			result.push({ groupIndex, item: allData[groupIndex].data[flat % GROUP_ITEM_COUNT] })
		}
		return result
	}

	/** 加载下一页并按归属分组追加，组件监听到 list 变化后自动重新测量 */
	async function loadNext(count = PAGE_SIZE) {
		if (loading || finished.value) return
		loading = true
		const page = await fetchPage(loadedCount.value, count)
		page.forEach(({ groupIndex, item }) => {
			menuList.value[groupIndex].data.push(item)
		})
		loadedCount.value += page.length
		loading = false
	}

	// 首屏仅右侧内容异步加载第一页，左侧菜单已全量渲染
	onMounted(() => {
		loadNext()
	})

	/** 右侧触底：加载下一页 */
	const onLoadMore = async () => {
		if (finished.value) {
			uni.showToast({ title: '已全部加载', icon: 'none' })
			return
		}
		await loadNext()
	}

	/** 点击左侧菜单：目标分组内容未加载时，一次性补载到该分组并重新定位 */
	const onChange = async (payload : ChangePayload) => {
		if (payload.source !== 'click') return
		const needed = (payload.index + 1) * GROUP_ITEM_COUNT
		if (loadedCount.value >= needed || loading) return

		uni.showLoading({ title: '加载中' })
		await loadNext(needed - loadedCount.value)
		uni.hideLoading()

		// 等待组件完成重新测量后，把右侧重新定位到目标分组
		await delay(300)
		menuRef.value?.scrollToIndex(payload.index)
	}
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
