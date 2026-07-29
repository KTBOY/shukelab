/**
 * sk-linkage-menu 案例集共享 mock 数据
 */
import type { MenuDataItem } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'

/** 本地测试图池：按下标伪随机分配，保证多次渲染结果稳定 */
const GOODS_IMAGES = [
	'/static/test/663.jpg',
	'/static/test/test1.jpg',
	'/static/test/test2.jpg',
	'/static/test/test3.jpg'
]

const GROUP_NAMES = ['热销爆款', '新品上市', '折扣专区', '经典奶茶', '果茶鲜萃', '咖啡特调', '小食甜品', '面包烘焙']

/** 生成联动菜单 mock 数据 */
export function createMenuList(groupCount = 30, itemCount = 4) : MenuDataItem[] {
	const list : MenuDataItem[] = []
	for (let i = 0; i < groupCount; i++) {
		const groupName = `${GROUP_NAMES[i % GROUP_NAMES.length]}${Math.floor(i / GROUP_NAMES.length) + 1}`
		const data = []
		for (let j = 0; j < itemCount; j++) {
			data.push({
				id: `${i}-${j}`,
				goodsName: `${groupName}·商品${j + 1}`,
				desc: '模拟商品描述文案，用于演示右侧内容区渲染',
				price: ((i * itemCount + j) % 50) + 9.9,
				image: GOODS_IMAGES[(i * 7 + j * 3) % GOODS_IMAGES.length],
			})
		}
		list.push({ id: i, name: groupName, data })
	}
	return list
}

/** 模拟接口延时 */
export function delay(ms : number) : Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 获取内容区可用高度（px），offset 为页面内其他元素占用高度 */
export function getContentHeight(offset = 0) : number {
	const info = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : uni.getSystemInfoSync()
	return info.windowHeight - offset
}
