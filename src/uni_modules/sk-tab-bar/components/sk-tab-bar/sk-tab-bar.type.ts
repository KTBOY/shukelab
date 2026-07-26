/** tab 项路由跳转方式 */
export type SkTabBarSwitchMode = 'switchTab' | 'reLaunch' | 'navigateTo' | 'redirectTo'

/** 图标类型：image 图片图标 / font 字体图标 */
export type SkTabBarIconType = 'image' | 'font'

/** tabBar 单项数据 */
export interface SkTabBarItem {
	/** 按钮文字 */
	text: string
	/** 未选中图标：iconType 为 image 时传图片地址，为 font 时传字体图标 class */
	icon: string
	/** 选中图标：iconType 为 image 时传图片地址，为 font 时传字体图标 class */
	active: string
	/** 图标类型，默认 image */
	iconType?: SkTabBarIconType
	/** 图标宽度（iconType 为 font 时作为字号使用），默认 36px */
	width?: string
	/** 图标高度，默认 36px */
	height?: string
	/** 数字/文本角标，为 0 或空时不显示，数字超过 badgeMax 显示为 badgeMax+ */
	badge?: string | number
	/** 红点角标，优先级高于 badge */
	dot?: boolean
	/** 是否禁用该项 */
	disabled?: boolean
	/** 页面路径，配合 autoRoute 使用，点击后自动跳转 */
	pagePath?: string
	/** 跳转方式，默认 reLaunch（组件形式 tabBar 页面通常非原生 tabBar 页） */
	switchMode?: SkTabBarSwitchMode
	/** @deprecated 请使用 badge，保留用于兼容旧版组件级 corner 用法 */
	cornerMark?: boolean
	[key: string]: any
}

/** change 事件回调参数 */
export type SkTabBarChangeEvent = SkTabBarItem & {
	/** 当前选中下标 */
	currentIndex: number
	/** @deprecated 历史拼写，等同于 currentIndex，保留兼容旧版 */
	currenIndex: number
}

/**
 * 切换前守卫
 * @param index 目标 tab 下标
 * @param item 目标 tab 数据
 * @returns 返回 false 或 resolve(false) 时阻止本次切换
 */
export type SkTabBarBeforeChange = (
	index: number,
	item: SkTabBarItem
) => boolean | void | Promise<boolean | void>
