/**
 * sk-linkage-menu 公共类型定义
 *
 * 使用方可按需导入：
 * import type { MenuDataItem, ChangePayload } from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
 */

/** 左侧菜单（分组）数据项 */
export interface MenuDataItem {
	/** 菜单名称，用于左侧展示与右侧吸顶标题兜底 */
	name : string
	/** 该分组下的内容列表，通过默认插槽渲染 */
	data : Array<Record<string, any>>
	/** 唯一标识，将优先作为渲染 key，建议必传 */
	id ?: number | string
}

/** change 事件触发来源 */
export type ChangeSource = 'click' | 'scroll' | 'method'

/**
 * change 事件回调参数
 *
 * 注意：currenIndex 为历史字段（1.0.x 已发布 API），保留以兼容旧版本；
 * 新代码建议使用语义相同的 index 字段。
 */
export type ChangePayload = MenuDataItem & {
	/** 当前选中菜单下标（兼容字段，等同 index） */
	currenIndex : number
	/** 当前选中菜单下标 */
	index : number
	/** 触发来源：click-点击左侧菜单 / scroll-右侧滚动联动 / method-调用 scrollToIndex */
	source : ChangeSource
}

/** boundingClientRect 测量结果（仅保留组件用到的字段） */
export interface RectInfo {
	top : number
	height : number
}

/** 组件对外暴露的实例方法（配合 ref 使用） */
export interface SkLinkageMenuExpose {
	/** 重新测量布局。数据异步更新后组件会自动调用，特殊场景（如字体加载、图片撑高）可手动触发 */
	refresh : () => void
	/** 程序化跳转到指定菜单下标 */
	scrollToIndex : (index : number) => void
}
