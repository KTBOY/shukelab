# sk-swipe-feed 更新日志

## 1.0.0（2026-09-05）

首次发布：频道页三件套（sk-swipe-page 整页横滑容器 + sk-scroll-tabs 滚动标签栏 + sk-scroll-list 滚动列表容器），附 usePagedList 分页状态机。

**sk-swipe-page**

- 【新增】基于原生 swiper 封装的整页横滑容器，跟手滑动、边界回弹，H5 / 微信小程序一致
- 【新增】页面级懒挂载（lazyBuffer 默认激活页 ±1 页），keepAlive 常驻保留滚动位置
- 【新增】maxAlive 常驻页数上限（LRU 淘汰最久未访问的窗口外页面，常用频道优先保留），防多频道内存膨胀
- 【新增】v-model:current 受控 + change 事件（source 区分 swipe/method）；受控翻页以目标页标记过滤快速连点时 swiper 先到达的中间目标，避免状态被回写拉扯
- 【新增】transition 实时进度事件（{ dx, dy, progress }），用于标题栏渐变、视差联动；容器宽度在挂载、补测与窗口 resize 时重测
- 【新增】circular 循环播放透传，挂载窗口按下标回绕补挂，避免克隆页过渡期间闪现空白
- 【修复】挂载记录与 LRU 顺序数组失同步导致的 keepAlive=false 时无界增长

**sk-scroll-tabs**

- 【新增】顶部滚动标签栏：选中滑块动画（translateX + 宽度自适应），支持不等宽标签
- 【新增】选中标签自动滚入可视区并水平居中（scrollToIndex / re-click 配合列表回顶）
- 【新增】标签项 badge 数字角标（>99 显示 99+）/ dot 红点 / disabled 禁用
- 【新增】beforeChange 切换拦截（返回 false 或 resolve false 的 Promise 阻止切换）
- 【新增】activeColor / sliderStyle 自定义主题，默认插槽自定义标签内容
- 【优化】tabs 数据 deep watch：原地修改 item 字段（如 badge 使标签变宽）自动重测布局
- 【优化】窗口 resize 后自动重测容器宽与标签布局
- 【优化】首次测量失败时延后补测一次（有界不轮询），避免小程序端布局未就绪导致选中滑块不渲染，与 sk-swipe-page 的宽度补测策略对齐

**sk-scroll-list**

- 【新增】滚动列表容器：内聚 scroll-view、仅列表在顶部时下拉手势生效、触底加载守卫（loading / finished / refreshing 中不外发）
- 【新增】内置下拉刷新头：CSS border 绘制的 chevron 箭头 + 旋转圆环（无 SVG、无字体字形依赖），箭头按进度跟手旋转，refresherThreshold 可调（默认 60px，同时作为原生 refresher-threshold 与刷新头高度）
- 【新增】settling 收合态：刷新结束内容 200ms 淡出 + 微缩，与原生 refresher 300ms 收合窗口对齐，圆环保持旋转不骤停，消除两段式跳变
- 【新增】下拉头显式 width:100% + flex 居中，修复下拉内容不居中
- 【新增】下拉头文案 props：pullingText / loosingText / refreshingText；空态文案 emptyText
- 【新增】footer 状态机：失败重试（加大热区）> 加载中（圆环 spinner）> 没有更多了（分割线），#footer 插槽可整体替换；#empty / #error 插槽
- 【新增】scrollToTop 实例方法（H5 端 rAF 平滑回顶，惰性解析滚动层失败可自愈）
- 【新增】#refresher 作用域插槽（{ state, dy, progress }）整体替换内置刷新头
- 【优化】下拉进度整像素提交，抑制逐帧 setData
- 【移除】refresherDefaultStyle prop（组件始终自绘刷新头，深色等场景用 #refresher 插槽覆盖）
- 【修复】refresh / load-more 事件按零参声明外发，类型三方一致
- 【新增】首屏加载态：`empty && loading` 时展示占满内容区的页面级加载区（`#loading` 插槽，默认居中 spinner，通常放骨架屏）。此前首屏加载只有 footer 的「加载中」，列表无数据时它会贴在空白内容区顶部，视觉上与下拉刷新指示器无法区分
- 【变更】`empty` 语义改为「列表没有任何数据」：直接传 `list.length === 0` 即可，无需自行排除加载中；组件内部以 `empty && loading` / `empty && !loading` 区分首屏加载态与空态

**usePagedList**

- 【新增】分页状态机：页码推进、防重入、完成判定（hasMore > total > 短页）、错误重试、请求序号互斥（刷新丢弃在途加载更多）、刷新原地替换不清空旧内容
