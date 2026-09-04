# sk-swipe-page

整页横滑容器（仿今日头条频道页）。基于原生 `swiper` 封装：跟手滑动、边界回弹，页面级懒挂载 + 常驻（keep-alive），配合 `sk-scroll-tabs` 通过 `v-model` 完成双向联动，适配 H5 与微信小程序。

### 基础使用

```vue
<template>
  <sk-swipe-page v-model:current="current" :count="3" height="60vh">
    <template #page="{ index, active, mounted }">
      <!-- 懒挂载：激活页 ± lazyBuffer 页内 mounted 才为 true -->
      <view v-if="mounted" class="page">
        <text>{{ index + 1 }}{{ active ? '（激活）' : '' }}</text>
      </view>
    </template>
  </sk-swipe-page>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const current = ref(0)
</script>
```

### 频道页示例（sk-scroll-tabs + 每页独立分页列表）

顶部标签栏与整页横滑容器绑定同一个 `v-model:current`，即完成双向联动（组件间零耦合）：

```vue
<template>
  <view style="height: 100vh; overflow: hidden">
    <sk-scroll-tabs v-model:current="tabIndex" :tabs="channels" />
    <sk-swipe-page v-model:current="tabIndex" :count="channels.length" :height="pageHeight + 'px'">
      <template #page="{ index, mounted }">
        <view v-if="mounted" style="height: 100%">
          <!-- 每个频道页一个独立分页列表；数据实例由页面层持有，挂载时才拉第一页 -->
          <channel-feed :state="getFeedState(index)" />
        </view>
      </template>
    </sk-swipe-page>
  </view>
</template>
```

- 点击 tab → `tabIndex` 变化 → 容器翻页（`change.source === 'method'`）
- 滑动内容区 → `update:current` 回写 `tabIndex` → tab 高亮跟随并自动滚入可视区
- 每页列表的分页加载用 `usePagedList` + `scrolltolower` 实现（渲染与数据流分层，见 `src/composables/use-paged-list.ts`）
- 设置 `maxAlive` 时，被淘汰的是页面**组件**：数据实例与滚动位置应提到页面层按频道 id 持有，页面层用 `sk-scroll-list` 的 `getScrollTop` / `setScrollTop` 在卸载与重建之间中转，回滑才能数据秒出、位置还原

## API 参考

### Props

| 属性名     | 类型    | 默认值 | 说明                                                               |
| ---------- | ------- | ------ | ------------------------------------------------------------------ |
| count      | Number  | 0      | 页面总数                                                           |
| current    | Number  | 0      | 当前页下标，支持 `v-model:current`                                 |
| lazyBuffer | Number  | 1      | 懒挂载缓冲：激活页左右各 n 页内的页面才挂载内容                    |
| keepAlive  | Boolean | true   | 已挂载页面是否常驻；false 时滑出缓冲区的页面被卸载（滚动位置丢失） |
| duration   | Number  | 300    | 翻页动画时长（ms）                                                 |
| height     | String  | '100%' | 容器高度                                                           |
| maxAlive   | Number  | 0      | 常驻页数上限（LRU 淘汰最久挂载的窗口外页面），0 表示不限制           |
| autoplay   | Boolean | false  | 自动轮播（透传 swiper）                                             |
| interval   | Number  | 5000   | 自动轮播间隔（ms）                                                  |
| circular   | Boolean | false  | 循环播放（透传 swiper）                                             |

### Events

| 事件名         | 说明                                      | 回调参数                                                                 |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| change         | 页面切换时触发（滑动、外部受控均会触发）  | `{ index, source }`，source 为 `swipe`（用户滑动）/ `method`（外部受控） |
| update:current | 页面下标变化，配合 `v-model:current` 使用 | `index: number`                                                          |
| transition     | 翻页手势/动画进行中实时触发（标题栏渐变、视差联动） | `{ dx, dy, progress }`，progress = dx/容器宽度                   |

### Slots

| 插槽名 | 说明                                               | 作用域参数                   |
| ------ | -------------------------------------------------- | ---------------------------- |
| page   | 每页内容渲染一次，配合 `v-if="mounted"` 实现懒挂载 | `{ index, active, mounted }` |

### 性能说明

1. **懒挂载**：未激活的页面不渲染任何内容，节点数只与「激活页 ± lazyBuffer」相关；越远的页面滑动成本越低。
2. **常驻保滚动**：keepAlive 开启时挂载过的页面不销毁，滑回时滚动位置保留（信息流体验的关键）。
3. **页面自治**：每页内容（含其列表的分页/虚拟化）由 page 插槽自治，容器不感知业务。
