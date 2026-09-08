# sk-tab-bar

组件形式的镂空弧形 tabBar，选中项自动上浮进入圆形按钮，凹槽随切换平滑移动。默认 `mode="concave"`（伪类凹陷弧形，光圈需与页面背景同色）；页面背景为图片/渐变等复杂背景、无法与光圈同色时，建议显式设 `mode="plain"`（实心栏、不依赖背景色），

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

## 形态（mode）与内凹实现流派

GitHub 上「凹陷弧形 tabBar」主要有三种实现流派：①伪类 + box-shadow、②CSS filter(blur+contrast)、③clip-path / 径向渐变切割。本组件采用①（`concave`），另以④**画布自绘**（`canvas`）补齐"任意背景 + 内凹观感"这一①②③都给不了的组合，并提供无内凹的 `plain`（② `filter` 融合为内部保留形态，暂不开放）；第③派（clip-path 真实镂空）经评估与 `plain` 观感过于接近，已移除。

| mode | 流派 | 实现 | 是否依赖页面背景色 |
| :--- | :--- | :--- | :--- |
| `concave`（默认） | ① 伪类 + box-shadow | 小方块伪元素用圆角 + 实色 `box-shadow` 填出内凹 | 是，光圈色须等于页面背景 |
| `canvas` | ④ 画布自绘 | canvas 2d 模仿 concave 画"栏顶凹口 + 圆钮坐入"（底栏 + 凹口圆 + 相切凹唇），轮廓外**真实透明** | 否，任意背景都干净 |
| `plain` | — | 实心栏 + 圆钮悬浮，无内凹 | 否，任意背景都干净 |

**`canvas` 模式限制**

- 微信小程序需 **canvas 2d（基础库 ≥2.9.0）**；H5 / App-vue 通过 `createSelectorQuery().fields({node:true})` 取节点。
- **nvue 页面不支持**（无 DOM canvas / SelectorQuery node）。
- **开发者工具模拟器不支持 canvas 同层渲染**（画布恒盖在 view 之上，会遮住 tab 项，只剩选中图标从凹口透出），组件检测到 `platform === 'devtools'` 会自动降级为 plain 观感并 `console.warn` 提示，**真机不受影响**；canvas 形态的实际观感请以真机为准。
- `background` 在 canvas 模式下**仅支持纯色**（hex/rgb/rgba），传渐变字符串在小程序端会静默失败。
- 取节点失败 / 尺寸未就绪 / 绘制异常时**自动降级为 plain 观感**（实心栏），并 `console.warn` 提示，任何端都不会出现整条 tabBar 消失。
- 切换动画的缓动已对齐 `__bump` 的 CSS `ease`，避免深色钮与画布轮廓中途错位；窗口 resize / 旋转 / `height`、`data` 变化会自动重建重绘。
- 小程序真机需抽测：低端 Android 同层渲染是否盖层或吞点击、iOS 橡皮筋滚动、从二级页返回画布是否空白。**开发者工具模拟器不代表真机**。

**页面背景为图片/渐变等复杂背景、又想要内凹观感时，推荐 `mode="canvas"`**（真透明 + 内凹）；只想要极简则用 `plain`。三种形态在纯色 / 深色 / 渐变 / 图片背景下的直观对比见 demo 页 `pages/tabBarDemo/filter`。

## API

### Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| data | `SkTabBarItem[]` | `[]` | tab 数据源 |
| current | `Number` | `0` | 当前选中下标，支持 `v-model:current` |
| mode | `String` | `concave` | 形态：`concave` 伪类凹陷弧形（默认），光圈需与页面背景同色；`canvas` 画布绘制融合内凹，轮廓外真实透明、任意背景可用（小程序需基础库 2.9.0+，`background` 仅纯色，失败自动回退 plain 观感）；`plain` 纯净模式，实心栏 + 圆钮悬浮，无内凹弧形与外光圈，不依赖背景色。`filter` 融合为内部保留形态，暂不开放 |
| outerApertureBorderColor | `String` | `#f2f3f7` | 弧形外光圈颜色，需与页面背景一致（`concave` 模式生效；`canvas`/`plain` 模式下不生效） |
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

1.1.0 起组件默认形态为 `concave`（伪类光圈，需 `outerApertureBorderColor` 与页面背景同色），并新增可选形态 `filter`（blur+contrast 融合内凹，曲线更平滑）；页面背景为图片/渐变等无法与光圈同色的复杂背景时，可显式设 `mode="plain"`（实心栏、不依赖背景色）。若此前显式使用过某一形态，升级后请按需保留对应的 `mode` 传参；各形态取舍详见上文「形态（mode）与内凹实现流派」。
