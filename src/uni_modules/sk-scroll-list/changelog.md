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
