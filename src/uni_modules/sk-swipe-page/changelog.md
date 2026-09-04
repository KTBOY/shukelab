## 1.0.1（2026-09-04）

- 【修复】窗口尺寸变化后未重测容器宽度（横竖屏切换 / H5 缩放会让 transition 的 progress 按旧页宽算错），补 `uni.onWindowResize` 重测、卸载时解绑
- 【修复】首帧容器宽度测为 0 时 progress 恒为 0，改为 transition 首次回调懒测一次
- 【修复】`count` 变小时不夹取当前页下标：越界的 `state.current` 夹到最后一页并通过 `update:current` 同步外部，v-model 与 tabs 不再错位；LRU 顺序数组同步剪除越界下标
- 【说明】与 sk-scroll-list 配合时的「下拉与横滑互斥」由 sk-scroll-list 内部锁轴完成，本组件无需改动

## 1.0.0（2026-09-02）

- 【新增】首次发布：整页横滑容器（仿今日头条频道页）
- 【新增】基于原生 swiper 封装，跟手滑动、边界回弹，双端一致
- 【新增】页面级懒挂载（lazyBuffer 默认激活页 ±1 页），keepAlive 常驻保留滚动位置
- 【新增】v-model:current 受控 + change 事件（source 区分 swipe/method）
- 【新增】page 作用域插槽（{ index, active, mounted }），页面内容由使用方提供
- 【新增】maxAlive 常驻页数上限（LRU 淘汰最久挂载的窗口外页面），防多频道内存膨胀
- 【新增】transition 实时进度事件（{ dx, dy, progress }），用于标题栏渐变、视差联动
- 【新增】autoplay / interval / circular 透传，覆盖轮播场景
