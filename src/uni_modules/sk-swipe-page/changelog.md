## 1.0.0（2026-09-02）

- 【新增】首次发布：整页横滑容器（仿小黑盒/今日头条频道页）
- 【新增】基于原生 swiper 封装，跟手滑动、边界回弹，双端一致
- 【新增】页面级懒挂载（lazyBuffer 默认激活页 ±1 页），keepAlive 常驻保留滚动位置
- 【新增】v-model:current 受控 + change 事件（source 区分 swipe/method）
- 【新增】page 作用域插槽（{ index, active, mounted }），页面内容由使用方提供
- 【新增】maxAlive 常驻页数上限（LRU 淘汰最久挂载的窗口外页面），防多频道内存膨胀
- 【新增】transition 实时进度事件（{ dx, dy, progress }），用于标题栏渐变、视差联动
- 【新增】autoplay / interval / circular 透传，覆盖轮播场景
