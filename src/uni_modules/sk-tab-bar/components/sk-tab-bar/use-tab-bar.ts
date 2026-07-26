import { ref } from 'vue'
import type { SkTabBarItem } from './sk-tab-bar.type'

// 模块级单例：小程序/H5 均为单一 JS 上下文，可跨页面共享 tabBar 数据与选中态。
// 适用于 autoRoute 多页面场景，各页面挂载各自的 sk-tab-bar 时选中态保持同步。
const current = ref(0)
const items = ref<SkTabBarItem[]>([])

/**
 * 跨页面共享 tabBar 状态
 * @param defaultItems 首次调用时初始化的 tab 数据（后续调用忽略）
 */
export function useTabBar(defaultItems?: SkTabBarItem[]) {
	if (defaultItems && !items.value.length) {
		items.value = defaultItems
	}
	const setCurrent = (index: number) => {
		current.value = index
	}
	return { current, items, setCurrent }
}
