# sk-tab-bar

组件形式的镂空弧形 tabBar，选中项自动上浮进入圆形按钮，凹槽随切换平滑移动。默认 `mode="notch"` 采用 clip-path 真实镂空，页面背景任意（图片/渐变均可）；如需旧版伪类凹陷效果可设 `mode="concave"`。

- ✅ `v-model:current` 受控选中，支持外部设置初始项与程序化切换
- ✅ item 级角标（数字 / 红点 / 99+ 上限）
- ✅ `beforeChange` 切换守卫（支持异步，可做登录拦截）
- ✅ `autoRoute` 路由联动 + `useTabBar` 多页面选中态同步
- ✅ 作用域插槽完全自定义 tab 内容
- ✅ 图片图标 / 字体图标双模式
- ✅ 主题样式全量可配，百分比布局自适应宽屏
- ✅ TypeScript 类型导出

### 扫码体验

<img src="https://cdn.sanity.io/images/vrmep2m5/production/33d80d6b725f9793d0f454315ddb2b6f71381136-430x430.jpg" style="zoom:33%;" />

## 基础用法

> 组件形式 tabBar 不依赖 pages.json 的原生 tabBar 配置；如需页面跳转请使用 `autoRoute` 或在 `change` 回调中自行处理。

```vue
<template>
	<sk-tab-bar v-model:current="current" :data="list" @change="onChange" />
</template>

<script lang="ts" setup>
	import { ref } from 'vue'
	import type { SkTabBarItem, SkTabBarChangeEvent } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type'
	import icon1 from '@/static/66.png'
	import icon1Active from '@/static/icon1.png'
	import icon2 from '@/static/77.png'
	import icon2Active from '@/static/icon2.png'

	const current = ref(0)
	const list = ref<SkTabBarItem[]>([
		{ text: '首页', icon: icon1, active: icon1Active },
		{ text: '资源列表', icon: icon2, active: icon2Active }
	])

	const onChange = (e: SkTabBarChangeEvent) => {
		console.log('切换到：', e.currentIndex, e.text)
	}
</script>
```

## 角标 / 红点

角标配置在每个 item 上，互不影响；数字超过 `badgeMax`（默认 99）显示 `99+`，为 `0` 或空时自动隐藏。

```vue
<sk-tab-bar :data="list" :badge-max="99" />
```

```ts
const list = ref<SkTabBarItem[]>([
	{ text: '首页', icon: icon1, active: icon1Active },
	{ text: '消息', icon: icon2, active: icon2Active, badge: 128 }, // 显示 99+
	{ text: '我的', icon: icon3, active: icon3Active, dot: true }   // 红点
])
```

## 切换拦截（beforeChange）

返回 `false` 或 `Promise<false>` 时阻止切换，常用于登录校验：

```vue
<sk-tab-bar :data="list" :before-change="beforeChange" />
```

```ts
const beforeChange = async (index: number, item: SkTabBarItem) => {
	if (index === 2 && !isLogin.value) {
		uni.navigateTo({ url: '/pages/login/index' })
		return false
	}
	return true
}
```

## 路由联动（autoRoute）

item 配置 `pagePath` 后点击自动跳转；多页面场景配合 `useTabBar` 同步选中态：

```vue
<sk-tab-bar auto-route v-model:current="current" :data="items" @change="e => setCurrent(e.currentIndex)" />
```

```ts
import { useTabBar } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/use-tab-bar'

// 每个页面调用同一份共享状态
const { current, items, setCurrent } = useTabBar([
	{ text: '首页', icon: icon1, active: icon1Active, pagePath: '/pages/home/index', switchMode: 'reLaunch' },
	{ text: '我的', icon: icon2, active: icon2Active, pagePath: '/pages/mine/index', switchMode: 'reLaunch' }
])
```

## 自定义内容（插槽）

通过 `item` 作用域插槽完全接管 tab 渲染：

```vue
<sk-tab-bar :data="list">
	<template #item="{ item, index, active }">
		<image :src="active ? item.active : item.icon" style="width: 40px; height: 40px" />
		<text v-if="!active">{{ item.text }}</text>
	</template>
</sk-tab-bar>
```

## 字体图标

```ts
const list = ref<SkTabBarItem[]>([
	// icon/active 传字体图标 class，width 作为字号
	{ text: '首页', iconType: 'font', icon: 'iconfont icon-home', active: 'iconfont icon-home-fill', width: '48rpx' }
])
```

## 主题定制

```vue
<sk-tab-bar
	:data="list"
	background="#1f1f1f"
	text-color="#999"
	active-text-color="#fff"
	icon-background-color="#07c160"
	outer-aperture-border-color="#141414"
	height="130rpx"
	:duration="300"
	placeholder
/>
```

## API

### Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| data | `SkTabBarItem[]` | `[]` | tab 数据源 |
| current | `Number` | `0` | 当前选中下标，支持 `v-model:current` |
| mode | `String` | `notch` | 形态：`notch` 镂空弧形（默认），clip-path 裁出真实缺口、透出任意页面背景（图片/渐变均可），缺口随切换平移动画；`concave` 伪类凹陷弧形，光圈需与页面背景同色；`plain` 纯净模式，无内凹弧形与外光圈 |
| outerApertureBorderColor | `String` | `#f2f3f7` | 弧形外光圈颜色，需与页面背景一致（`notch`/`plain` 模式下不生效） |
| iconBackgroundColor | `String` | `rgb(3, 3, 3)` | 选中圆形按钮背景色 |
| background | `String` | `#fff` | tabBar 背景色 |
| textColor | `String` | `#222` | 文字颜色 |
| activeTextColor | `String` | `#222` | 选中文字颜色 |
| fontSize | `String` | `26rpx` | 文字字号 |
| height | `String` | `120rpx` | tabBar 高度，同时决定圆形按钮直径 |
| zIndex | `Number` | `10` | 层级 |
| duration | `Number` | `500` | 切换动画时长（ms） |
| fixed | `Boolean` | `true` | 是否固定在页面底部 |
| placeholder | `Boolean` | `false` | fixed 时是否生成同高占位，防止遮挡页面内容 |
| badgeMax | `Number` | `99` | 数字角标上限，超出显示 `badgeMax+` |
| autoRoute | `Boolean` | `false` | 点击后是否按 `item.pagePath` 自动跳转 |
| beforeChange | `(index, item) => boolean \| Promise<boolean>` | - | 切换守卫，返回 `false` 阻止切换 |
| corner | `String \| Number` | - | ⚠️ 已废弃，请使用 `item.badge` |

### SkTabBarItem

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| text | `String` | - | 按钮文字 |
| icon | `String` | - | 未选中图标（图片地址或字体图标 class） |
| active | `String` | - | 选中图标（图片地址或字体图标 class） |
| iconType | `'image' \| 'font'` | `image` | 图标类型 |
| width | `String` | `36px` | 图标宽度（字体图标时作为字号） |
| height | `String` | `36px` | 图标高度 |
| badge | `String \| Number` | - | 角标内容，`0` 或空时隐藏 |
| dot | `Boolean` | `false` | 红点角标，优先级高于 badge |
| disabled | `Boolean` | `false` | 是否禁用 |
| pagePath | `String` | - | 页面路径，配合 `autoRoute` 使用 |
| switchMode | `'switchTab' \| 'reLaunch' \| 'navigateTo' \| 'redirectTo'` | `reLaunch` | 跳转方式 |
| cornerMark | `Boolean` | - | ⚠️ 已废弃，请使用 `badge` |

### Events

| 事件名 | 回调参数 | 说明 |
| :--- | :--- | :--- |
| change | `SkTabBarChangeEvent`（item 全量字段 + `currentIndex`） | tab 切换后触发 |
| update:current | `index: number` | 选中变化，配合 `v-model:current` |

### Slots

| 插槽名 | 作用域参数 | 说明 |
| :--- | :--- | :--- |
| item | `{ item, index, active }` | 自定义每个 tab 的内容 |

### Methods（ref 调用）

| 方法名 | 参数 | 说明 |
| :--- | :--- | :--- |
| switchTo | `index: number` | 编程式切换，会执行 `beforeChange` 守卫与事件流程 |

## 从旧版本迁移

1.0.5 完全兼容旧版用法，以下 API 已标记废弃，建议迁移：

| 旧用法 | 新用法 |
| :--- | :--- |
| 组件级 `corner` + item `cornerMark` | item 级 `badge` / `dot` |
| `change` 回调中的 `currenIndex` | `currentIndex` |

2.0.0 起默认形态由 `concave`（伪类光圈）改为 `notch`（clip-path 镂空），视觉上凹槽与圆钮间留有一圈透明缝隙，且不再依赖 `outerApertureBorderColor` 与页面背景同色。升级后若希望保持旧版观感，显式传入 `mode="concave"` 即可。
