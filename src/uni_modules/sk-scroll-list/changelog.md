## 1.1.0（2026-09-04）

- 【新增】首屏居中圆圈 loading：无内容且在请求时状态区垂直居中显示纯 CSS 圆圈，不再借用 footer 的「加载中」灰字（此前切页签首屏加载会在容器顶部贴一行小字）
- 【新增】下拉刷新对齐主流四态：pulling 跟手旋转 → loosing 回弹 → refreshing 自转+呼吸 → success/failed 结果驻留（`successDuration` 默认 600ms，传 0 关闭）
- 【新增】内置菱形指示器：图标在上、文案在下，默认使用组件内置 `66.png`（`indicatorIcon` 可覆盖），H5 构建内联为 base64、小程序构建产出独立资源，宿主项目无需供图
- 【新增】深色容器主题变量：`--sk-indicator-color` / `--sk-indicator-filter`（PNG 反白）/ `--sk-loading-color` / `--sk-loading-track-color`，用 `customStyle` 成对覆盖即可
- 【新增】下拉与横滑手势仲裁：手势过 10px 死区后一次性锁轴，横向短路 `refresher-enabled`（横滑不再误撑下拉头）、纵向 `stopPropagation`（下拉不再带动翻页）；配合 `refresherMaxAngle`（小程序原生生效）
- 【新增】四态文案 `pullingText` / `loosingText` / `refreshingText` / `successText` / `failedText`，以及 `emptyText` / `initialLoadingText`
- 【新增】`getScrollTop` / `setScrollTop` 实例方法，供页面层记忆并在组件重建后还原滚动位置；`scrollToTop` 复用同一实现
- 【变更】`empty` 语义收窄为「当前有没有内容」，无内容时展示 loading / 错误 / 空态由组件判定，调用方不要再写 `:empty="list.length === 0 && !loading"`
- 【变更】`refresherDefaultStyle` 默认值 `black` → `none`：默认即启用内置指示器，原生三点样式需显式传 `black` / `white`
- 【修复】loosing 判定此前硬编码 80px，而原生 refresher 默认 45px 即可触发刷新，导致「松开立即刷新」态几乎不可见；改为 `refresherThreshold` 单一来源同时驱动原生阈值与 loosing 判定（默认 45）
- 【修复】空态在首屏加载期间误显示（根因即 `empty` 语义被推给调用方兜底）
- 【修复】H5 平滑回顶 rAF 动画与用户手势打架：touchstart / wheel 时取消在途动画
- 【优化】`#refresher` 作用域补 `progress`（按阈值归一化 0~1），状态枚举扩展为 `idle/pulling/loosing/refreshing/success/failed`
- 【优化】小程序端 `pullDy` 节流至 40ms 且 pulling 态不跑逐帧旋转，避免每帧 setData 掉帧；逐帧跟手仅在 H5 开启
- 【说明】刷新驻留期（success/failed）不锁横滑：小程序 swiper 无禁用手势能力，锁了会变成 H5 独有行为

## 1.0.0（2026-09-02）

- 【新增】首次发布：滚动列表容器（下拉刷新 + 上拉加载 + 状态 UI）
- 【新增】内聚 scroll-view：原生 refresher 下拉头，仅列表在顶部时下拉手势生效
- 【新增】触底加载守卫：loading / finished / refreshing 期间不外发 load-more
- 【新增】footer 状态机：失败重试（errorText/retry）> 加载中（loadingText）> 没有更多了（finishedText），#footer 插槽可整体替换
- 【新增】空态 #empty 插槽
- 【新增】#refresher 作用域插槽完全自定义下拉头：{ state: idle/pulling/loosing/refreshing, dy }，传入后自动关闭系统默认样式
- 【新增】scrollToTop 实例方法（配合「再次点击当前 tab 回到顶部」）
- 【新增】refresherEnabled 开关（纯展示列表可关闭下拉）与 customStyle 自定义样式
- 【新增】首屏失败且无数据时的错误态（#error 插槽 / errorText 点击重试）
- 【优化】刷新改为原地替换：刷新期间保留旧内容，失败不清空列表（usePagedList.reload 同步升级，含请求序号防竞态）
- 【说明】组件不持有数据：状态全部受控传入，推荐配合 usePagedList composable
