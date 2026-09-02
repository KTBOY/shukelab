# sk-scroll-list

滚动列表容器：内聚 scroll-view，提供「仅顶部可触发」的下拉刷新、触底加载守卫、footer 状态机（加载中 / 没有更多了 / 失败重试）与空态插槽。组件不持有数据——状态全部受控传入，推荐配合 `usePagedList` composable，适配 H5 与微信小程序。

### 设计说明

下拉头用 scroll-view 原生 refresher 实现，**只有列表滚动到顶部时下拉手势才会激活**（原生行为），与资讯/社区类 App 的体验一致。刷新采用**原地替换**：刷新期间保留旧内容，成功后整体替换，失败保留旧数据并置 error（配合 #error 插槽展示重试）。组件与数据流分层：

- 渲染与手势 → 本组件（滚动 + 下拉头 + 上拉尾 + 状态 UI）
- 分页状态机 → `usePagedList`（`refreshing` / `loading` / `finished` / `error`）
- 页面 → 把两者接起来

### 基础使用（配合 usePagedList）

```vue
<template>
  <sk-scroll-list
    :refreshing="refreshing"
    :loading="loading"
    :finished="finished"
    :error="!!error"
    :empty="list.length === 0 && !loading"
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

### 自定义下拉头（动画 + 文案）

```vue
<sk-scroll-list ...>
	<template #refresher="{ state, dy }">
		<view class="refresher">
			<text>{{ state === 'refreshing' ? '正在刷新...' : state === 'loosing' ? '松手立即刷新' : '下拉刷新' }}</text>
			<text v-if="state === 'pulling'">{{ Math.round(dy) }}px</text>
		</view>
	</template>
	<view v-for="item in list">...</view>
</sk-scroll-list>
```

### 与 sk-swipe-page 组合（频道页）

每个频道页一个 `sk-scroll-list`，容器（翻页/懒挂载/keepAlive）与列表容器（滚动/刷新）正交组合：

```vue
<sk-swipe-page v-model:current="tabIndex" :count="channels.length" :height="pageHeight + 'px'">
	<template #page="{ index, mounted }">
		<channel-feed v-if="mounted" :channel="channels[index]" />
		<!-- channel-feed 内部即上面的 sk-scroll-list 用法 -->
	</template>
</sk-swipe-page>
```

## API 参考

### Props

| 属性名                | 类型    | 默认值               | 说明                                                  |
| --------------------- | ------- | -------------------- | ----------------------------------------------------- |
| refreshing            | Boolean | false                | 刷新中状态（受控），绑定 usePagedList 的 `refreshing` |
| loading               | Boolean | false                | 加载更多请求进行中                                    |
| finished              | Boolean | false                | 是否已全部加载                                        |
| error                 | Boolean | false                | 最近一次加载是否失败（footer 展示重试）               |
| empty                 | Boolean | false                | 列表是否为空（为空且不在加载中时展示 empty 插槽）     |
| height                | String  | '100%'               | 容器高度                                              |
| loadingText           | String  | '加载中...'          | 加载更多提示文案                                      |
| finishedText          | String  | '没有更多了'         | 全部加载完提示文案                                    |
| errorText             | String  | '加载失败，点击重试' | 加载失败提示文案（点击重试）                          |
| refresherBackground   | String  | '#fff'               | 下拉刷新区域背景色                                    |
| refresherDefaultStyle | String  | 'black'              | 下拉刷新默认样式：black / white / none                |
| lowerThreshold        | Number  | 50                   | 触底阈值（px）                                        |

### Events

| 事件名    | 说明                                                             | 回调参数     |
| --------- | ---------------------------------------------------------------- | ------------ |
| refresh   | 下拉刷新触发（列表须在顶部，原生 refresher 保证）                | 原生事件对象 |
| load-more | 滚动触底（loading / finished / refreshing 中组件自行拦截不外发） | 原生事件对象 |
| retry     | footer 失败重试点击                                              | -            |

### Slots

| 插槽名  | 说明                             | 作用域参数 |
| ------- | -------------------------------- | ---------- |
| default | 列表项内容                       | -          |
| footer  | 底部状态区，可整体替换内置状态机 | -          |
| empty   | 空态内容                         | -          |

### Methods（通过 ref 调用）

| 方法名      | 说明                                            | 参数                             |
| ----------- | ----------------------------------------------- | -------------------------------- |
| scrollToTop | 列表回到顶部；配合「再次点击当前 tab 回顶」场景 | `smooth?: boolean`（是否带动画） |
