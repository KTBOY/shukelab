## 1.0.6（2026-07-26）
1. 【新增】分组级虚拟渲染，默认开启，可通过 `:virtual="false"` 关闭，大数据量下大幅减少节点数
2. 【新增】`v-model:current` 受控选中、`scrollToIndex` / `refresh` 实例方法
3. 【新增】`showTitle` 分组吸顶标题（支持 `title` 插槽自定义）、`menu` 菜单项插槽、`empty` 空数据插槽
4. 【新增】`scrolltolower` 触底事件透传、`menuWidth` / `scrollWithAnimation` 配置项
5. 【优化】`change` 事件在滚动切换分类时同样触发，新增 `index`、`source` 字段（`currenIndex` 保留兼容）
6. 【修复】数据异步加载或动态更新后联动失效（自动监听 list 重新测量）
7. 【修复】组件不在页面顶部时锚点定位整体偏移
8. 【修复】重复点击同一菜单无法回位、程序化滚动过程中左侧高亮抖动
9. 【修复】list 动态变短时下标越界导致渲染异常；替换已废弃的 getSystemInfoSync
10. 【文档】修正示例中 `:height` 应为 `virtualMenuHeight`、`leftBarStyle` 与 `leftBarUnStyle` 说明写反的问题
## 1.0.5（2025-08-07）
1.优化左侧菜单滚动效果
2.修复小程序滚动异常

## 1.0.3（2025-04-25）
1.增加左侧区域自定义样式参数
2.增加左侧区域事件暴露
## 1.0.1（2025-04-10）
删除沉冗代码
## 1.0.0（2025-04-03）
首次发布

