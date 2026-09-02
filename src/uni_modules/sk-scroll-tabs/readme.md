# sk-scroll-tabs

顶部滚动标签栏。标签超出一屏时横向滚动，选中滑块带动画（支持不等宽标签），选中项自动滚入可视区居中。可与 `sk-swipe-page` 整页横滑容器联动（组件间零耦合），适配 H5 与微信小程序。

### 基础使用

```vue
<template>
  <sk-scroll-tabs v-model:current="current" :tabs="tabs" active-color="#fa5151">
    <template #default="{ item, active }">
      <text>{{ item.name }}</text>
    </template>
  </sk-scroll-tabs>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const tabs = ref([
  { id: 1, name: '今日推荐' },
  { id: 2, name: '热销爆款' },
])
const current = ref(0)
</script>
```

### 与 sk-swipe-page 整页横滑联动（仿小黑盒频道页）

两个组件把 `v-model:current` 绑定同一个 ref 即完成双向联动，互不依赖：

```vue
<sk-scroll-tabs v-model:current="tabIndex" :tabs="channels" />
<sk-swipe-page v-model:current="tabIndex" :count="channels.length" :height="pageHeight + 'px'">
  <template #page="{ index, mounted }">
    <view v-if="mounted" style="height: 100%">
      <channel-feed :channel="channels[index]" />
    </view>
  </template>
</sk-swipe-page>
```

- 点击 tab → `tabIndex` 变化 → 横滑容器翻页（`sk-swipe-page` 的 `change.source === 'method'`）
- 滑动内容区 → `update:current` 回写 `tabIndex` → tab 高亮跟随并自动滚入可视区

## API 参考

### Props

| 属性名              | 类型               | 默认值    | 说明                                     |
| ------------------- | ------------------ | --------- | ---------------------------------------- |
| tabs                | SkScrollTabsItem[] | []        | 标签数据，结构见下方 SkScrollTabsItem    |
| current             | Number             | 0         | 当前选中标签下标，支持 `v-model:current` |
| activeColor         | String             | '#111111' | 选中态文字颜色，同时作为滑块默认背景色   |
| sliderStyle         | Object             | -         | 选中滑块样式（覆盖默认下划线样式）       |
| scrollWithAnimation | Boolean            | true      | 程序化滚动是否使用动画                   |
| beforeChange        | Function           | -         | 切换拦截：(index) => boolean \| Promise<boolean>，返回 false 阻止本次点击切换 |

### Events

| 事件名         | 说明                                         | 回调参数                                                                         |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| change         | 选中标签变化时触发（点击、外部受控均会触发） | `{ ...tab, index, source }`，source 为 `click`（点击标签）/ `method`（外部受控） |
| update:current | 选中下标变化，配合 `v-model:current` 使用    | `index: number`                                                                  |
| re-click       | 再次点击当前已选中的标签（如列表回顶）       | `{ index, item }`                                                                |

### Slots

| 插槽名  | 说明                       | 作用域参数                |
| ------- | -------------------------- | ------------------------- |
| default | 标签内容，每个标签渲染一次 | `{ item, index, active }` |

### Methods（通过 ref 调用）

| 方法名        | 说明                                                                      | 参数            |
| ------------- | ------------------------------------------------------------------------- | --------------- |
| scrollToIndex | 切换到指定标签（更新高亮并把该标签滚入可视区居中）                        | `index: number` |
| refresh       | 重新测量标签布局。tabs 数据替换后组件会自动调用，字体加载等场景可手动触发 | -               |

**SkScrollTabsItem 类型**

| 属性名         | 类型          | 必填 | 说明                                   |
| -------------- | ------------- | ---- | -------------------------------------- |
| name           | String        | 建议 | 标签名称，用于默认渲染                 |
| id             | Number/String | 建议 | 唯一标识，优先作为渲染 key             |
| badge          | Number        | 否   | 数字角标（默认插槽渲染，>99 显示 99+） |
| dot            | Boolean       | 否   | 红点（badge 同时设置时 badge 优先）    |
| disabled       | Boolean       | 否   | 禁用：不响应点击、置灰                 |
| （自定义字段） | any           | 否   | 随 change 事件透出，可用于分组联动反查 |
