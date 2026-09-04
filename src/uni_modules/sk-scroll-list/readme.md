# sk-scroll-list

滚动列表容器：内聚 scroll-view，把「首屏加载 / 下拉刷新 / 触底加载 / 空态 / 错误态」五种状态按**触发源**分区渲染，下拉刷新为对齐 Vant 的四态交互（pulling → loosing → refreshing → success），并内置下拉与横滑的手势仲裁。组件不持有数据——状态全部受控传入，推荐配合 `usePagedList` composable，适配 H5 与微信小程序。

### 设计说明

- 下拉头用 scroll-view 原生 refresher 实现，**只有列表滚动到顶部时下拉手势才会激活**（原生行为），与资讯/社区类 App 的体验一致。
- 刷新采用**原地替换**：刷新期间保留旧内容，成功后整体替换，失败保留旧数据并置 error。
- 组件与数据流分层：
  - 渲染与手势 → 本组件（状态区 + 下拉头 + 上拉尾 + 锁轴仲裁）
  - 分页状态机 → `usePagedList`（`refreshing` / `loading` / `finished` / `error`）
  - 页面 → 把两者接起来

### 状态分区（关键）

三种加载指示按触发源严格互斥，同一时刻至多出现一个。`empty` 只表达「当前有没有内容」，**无内容时展示什么由组件判定**，调用方不要再自行排除 loading 态：

| 区域     | 触发源                | 出现条件                         | 视觉                          |
| -------- | --------------------- | -------------------------------- | ----------------------------- |
| 首屏区   | 数据首次请求          | `empty && loading`               | 居中圆圈 loading（纯 CSS）    |
| refresher | 用户下拉手势         | 下拉中 / 刷新中 / 结果驻留       | 菱形图标在上、四态文案在下    |
| footer   | 滚动触底              | `!empty && loading && !refreshing` | 菱形图标在上、文字在下（小一档） |
| 状态区   | 无内容且加载结束       | `empty && !loading && error`     | 居中错误态（点击外发 retry）  |
| 状态区   | 无内容且加载结束       | `empty && !loading`              | 居中空态                      |

### 基础使用（配合 usePagedList）

```vue
<template>
  <sk-scroll-list
    :refreshing="refreshing"
    :loading="loading"
    :finished="finished"
    :error="!!error"
    :empty="list.length === 0"
    height="100%"
    @refresh="reload()"
    @load-more="loadNext()"
    @retry="loadNext()"
  >
    <view v-for="item in list" :key="item.id" class="item">{{ item.title }}</view>
  </sk-scroll-list>
</template>

<script lang="ts" setup>
import { usePagedList } from '@/composables/use-paged-list'
const { list, loading, refreshing, finished, error, loadNext, reload } = usePagedList(fetchPage, { pageSize: 10 })
</script>
```

无需任何配置即得到完整的下拉刷新四态与触底指示器（图标资源由组件内置，不要求宿主项目提供图片）。

### 下拉刷新四态

```
下拉未达阈值 pulling → 图标跟手旋转补满 90°（文案：下拉刷新）
达到阈值     loosing  → 回弹一次（文案：松开立即刷新）
松手加载中   refreshing → 外层自转 + 内层呼吸（文案：正在刷新...）
刷新结束     success / failed → 图标缩起淡出、结果文案驻留 successDuration 后收起回弹
```

`successDuration` 传 0 可关闭结果驻留（退化为三态）。`failed` 判定取刷新结束那一刻的 `error`，因此需要数据层在置 `error` 之后再把 `refreshing` 置回 false（`usePagedList.reload` 的 `catch` → `finally` 顺序即如此）。

### 深色容器适配

指示器图标是位图，只能靠 `filter` 反白；圆圈是纯 CSS，改颜色即可。两类变量都在组件根节点默认值里，用 `customStyle` 成对覆盖：

```vue
<sk-scroll-list
  refresher-background="#2b2b33"
  :custom-style="{
    '--sk-loading-color': '#fff',
    '--sk-loading-track-color': 'rgba(255, 255, 255, 0.18)',
    '--sk-indicator-color': '#bbb',
    '--sk-indicator-filter': 'brightness(0) invert(1)',
  }"
></sk-scroll-list>
```

### 自定义下拉头

`#refresher` 插槽会完全接管内置指示器（仅 `refresher-default-style="none"` 即默认值时生效）：

```vue
<template #refresher="{ state, dy, progress }">
  <view class="refresher">
    <view class="refresher__bar" :style="{ width: progress * 100 + '%' }"></view>
    <text>{{ state === 'refreshing' ? '正在同步' : `下拉 ${Math.round(dy)}px` }}</text>
  </view>
</template>
```

`state` 为 `idle / pulling / loosing / refreshing / success / failed`；`dy` 是实时下拉距离；`progress` 已按阈值归一化到 0~1，自绘动画不必再除阈值。

### 手势仲裁：下拉与横滑互斥

在 `sk-swipe-page` 内做整页横滑频道页时，两类手势会互相抢：uni-app H5 的 refresher 只要列表在顶部、任何单指移动都会撑开下拉头（不判方向），而下拉阶段的 touchmove 又会冒泡给祖先 swiper 带动翻页。组件内部锁轴解决，无需使用方配合：

- 手势位移超过 10px 死区后一次性定方向
- 判定横向 → 短路 `refresher-enabled`，本次手势不再撑开下拉头，移动继续冒泡给 swiper 正常翻页
- 判定纵向 → `stopPropagation`，手势不交给 swiper，翻页手势被打断
- touchend / touchcancel 复位

微信小程序侧同一套锁轴 + 原生 `refresher-max-angle`（默认 45°）兜底。**刷新驻留期不锁横滑**：大厂 App 刷新中允许切频道，且小程序 swiper 无禁用手势能力，锁了会变成 H5 独有行为。

跟手旋转逐帧更新仅在 H5 开启；小程序端 `pullDy` 节流至 40ms 且 pulling 态只做离散动画，避免每帧 setData 掉帧。

### 与 sk-swipe-page 组合（频道页）

每个频道页一个 `sk-scroll-list`，容器（翻页/懒挂载/keepAlive）与列表容器（滚动/刷新）正交组合。`maxAlive` 会淘汰窗口外页面的**组件**，因此数据实例与滚动位置要提到页面层，回滑才不会重新请求第一页：

```vue
<template>
  <sk-swipe-page v-model:current="tabIndex" :count="channels.length" :max-alive="4" :height="pageHeight + 'px'">
    <template #page="{ index, mounted }">
      <channel-feed v-if="mounted" :state="getFeedState(index)" />
    </template>
  </sk-swipe-page>
</template>

<script lang="ts" setup>
// 页面层：以 channel.id 为 key 持有数据实例，immediate: false 由子组件挂载时拉起
const feedStates = new Map(channels.map((c) => [c.id, { feed: usePagedList(fetchOf(c.id), { immediate: false }), lastScrollTop: 0 }]))
</script>
```

```vue
<!-- channel-feed.vue：无状态展示组件，卸载时写回滚动位置 -->
<script lang="ts" setup>
onMounted(() => nextTick(() => listRef.value?.setScrollTop(props.state.lastScrollTop)))
onBeforeUnmount(() => (props.state.lastScrollTop = listRef.value?.getScrollTop() ?? 0))
</script>
```

完整可运行示例见 `src/pages/skSwipePageDemo/`。

## API 参考

### Props

| 属性名                | 类型    | 默认值               | 说明                                                             |
| --------------------- | ------- | -------------------- | ---------------------------------------------------------------- |
| refreshing            | Boolean | false                | 刷新中状态（受控），绑定 usePagedList 的 `refreshing`            |
| loading               | Boolean | false                | 加载请求进行中：无内容即首屏 loading，有内容即触底加载更多       |
| finished              | Boolean | false                | 是否已全部加载                                                   |
| error                 | Boolean | false                | 最近一次加载是否失败（状态区 / footer 展示重试）                 |
| empty                 | Boolean | false                | 当前有没有内容。**不要**再叠加 `&& !loading`，无内容时展示什么由组件判定 |
| height                | String  | '100%'               | 容器高度                                                         |
| loadingText           | String  | '加载中...'          | footer 加载中文案（指示器下方）                                  |
| finishedText          | String  | '没有更多了'         | 全部加载完提示文案                                               |
| errorText             | String  | '加载失败，点击重试' | 加载失败提示文案（点击重试）                                     |
| emptyText             | String  | '暂无数据'           | 空态文案（#empty 插槽可替换）                                    |
| initialLoadingText    | String  | ''                   | 首屏 loading 文案，留空则只显示圆圈                              |
| refresherEnabled      | Boolean | true                 | 是否开启下拉刷新（纯展示列表可关闭）                             |
| refresherThreshold    | Number  | 45                   | 下拉触发阈值（px），同时传给原生与内部 loosing 判定；内置头约 40px 高，调小于 45 会裁掉文案 |
| refresherMaxAngle     | Number  | 45                   | 下拉手势最大角度阈值（度），微信小程序原生生效，H5 由组件锁轴代替 |
| refresherDefaultStyle | String  | 'none'               | 下拉头样式：none-内置菱形指示器（可被 #refresher 接管）/ black / white-原生三点样式 |
| refresherBackground   | String  | '#fff'               | 下拉刷新区域背景色                                               |
| indicatorIcon         | String  | 组件内置 66.png      | 菱形指示器图标（refresher 与 footer 共用），可换成本地资源路径    |
| pullingText           | String  | '下拉刷新'           | pulling 态文案                                                   |
| loosingText           | String  | '松开立即刷新'       | loosing 态文案                                                   |
| refreshingText        | String  | '正在刷新...'        | refreshing 态文案                                                |
| successText           | String  | '更新成功'           | success 态文案                                                   |
| failedText            | String  | '刷新失败'           | failed 态文案（刷新结束时 error 为真）                           |
| successDuration       | Number  | 600                  | success / failed 态驻留时长（ms），0 关闭驻留立即收起            |
| lowerThreshold        | Number  | 50                   | 触底阈值（px）                                                   |
| customStyle           | Object  | {}                   | 容器自定义样式，可用于覆盖 `--sk-*` 主题变量                     |

### Events

| 事件名    | 说明                                                             | 回调参数     |
| --------- | ---------------------------------------------------------------- | ------------ |
| refresh   | 下拉刷新触发（列表须在顶部，原生 refresher 保证）                | 原生事件对象 |
| load-more | 滚动触底（loading / finished / refreshing 中组件自行拦截不外发） | 原生事件对象 |
| retry     | footer / 状态区失败重试点击                                      | -            |

### Slots

| 插槽名    | 说明                                                        | 作用域参数                                                                 |
| --------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| default   | 列表项内容                                                  | -                                                                          |
| refresher | 下拉头，完全接管内置指示器（`refresherDefaultStyle` 须为 none） | `state`（idle/pulling/loosing/refreshing/success/failed）/ `dy`（下拉距离）/ `progress`（0~1） |
| footer    | 底部状态区，可整体替换内置状态机                            | `loading` / `finished` / `error` / `refreshing`                            |
| empty     | 空态内容（`empty && !loading && !error`）                    | -                                                                          |
| error     | 无内容且加载失败的错误态（点击外发 retry）                  | -                                                                          |

### Methods（通过 ref 调用）

| 方法名        | 说明                                                    | 参数                                |
| ------------- | ------------------------------------------------------- | ----------------------------------- |
| scrollToTop   | 列表回到顶部；配合「再次点击当前 tab 回顶」场景         | `smooth?: boolean`（是否带动画）    |
| getScrollTop  | 读取当前滚动位置（px）；配合页面层记忆滚动位置          | -                                   |
| setScrollTop  | 滚动到指定位置（px），重建页面后还原位置                | `top: number` / `smooth?: boolean`  |

### CSS 变量

| 变量                      | 默认值                 | 说明                                     |
| ------------------------- | ---------------------- | ---------------------------------------- |
| --sk-indicator-color      | #999                   | 指示器文字色（下拉头 / footer 文案）     |
| --sk-indicator-filter     | none                   | 菱形 PNG 着色，深色容器填 `brightness(0) invert(1)` |
| --sk-loading-color        | #111                   | 首屏圆圈 loading 主色                    |
| --sk-loading-track-color  | rgba(17, 17, 17, 0.15) | 首屏圆圈 loading 轨道色                  |

### 兼容性说明

- 下拉头锁轴仲裁依赖 `Event.stopPropagation()`，H5 端已验证；微信小程序端事件对象的该能力需在开发者工具实测，若无效则退化为「仅靠 `refresher-max-angle` + scroll-view 自身手势独占」，API 形态不变。
- 圆圈 loading 使用 CSS 变量换色，不使用 `color-mix()`（微信小程序渲染层支持不可靠）。
