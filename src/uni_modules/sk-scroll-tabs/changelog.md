## 1.0.0（2026-09-02）

- 【新增】首次发布：顶部滚动标签栏
- 【新增】选中滑块动画（translateX + 宽度自适应），支持不等宽标签
- 【新增】v-model:current 受控 + change 事件（source 区分 click/method）
- 【新增】选中标签自动滚入可视区并水平居中（scrollToIndex）
- 【新增】activeColor / sliderStyle 自定义主题，默认插槽自定义标签内容
- 【新增】标签项 badge 数字角标（>99 显示 99+）/ dot 红点 / disabled 禁用
- 【新增】beforeChange 切换拦截（返回 false 或 resolve false 的 Promise 阻止切换）
- 【新增】re-click 事件：再次点击当前标签时触发（配合列表回到顶部等场景）
- 【新增】默认渲染兜底支持字符串标签项（tab?.name ?? tab）
