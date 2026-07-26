import type { SkTabBarItem } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type'
import icon1 from '@/static/66.png'
import icon1Active from '@/static/icon1.png'
import icon2 from '@/static/77.png'
import icon2Active from '@/static/icon2.png'

/** 路由联动示例的共享 tab 配置：pagePath + switchMode 由组件自动跳转 */
export const TAB_BAR_ITEMS: SkTabBarItem[] = [
	{
		text: '页面A',
		icon: icon1,
		active: icon1Active,
		pagePath: '/pages/tabBarDemo/route-a',
		switchMode: 'redirectTo',
	},
	{
		text: '页面B',
		icon: icon2,
		active: icon2Active,
		pagePath: '/pages/tabBarDemo/route-b',
		switchMode: 'redirectTo',
	},
]
