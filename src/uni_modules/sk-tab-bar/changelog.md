## 1.0.5（2026-07-26）
1. 【新增】`v-model:current` 受控选中，支持外部设置初始选中项与程序化切换
2. 【新增】item 级角标系统：`badge`（数字/文本，支持 `badgeMax` 上限显示 99+）、`dot`（红点）
3. 【新增】`beforeChange` 切换守卫，支持返回 `Promise`，可用于登录拦截等场景
4. 【新增】`autoRoute` 路由联动：item 配置 `pagePath` + `switchMode` 后点击自动跳转；配套 `useTabBar` 组合式函数实现多页面选中态同步
5. 【新增】字体图标支持：item 配置 `iconType: 'font'` 后 `icon/active` 传字体图标 class
6. 【新增】样式配置：`background`、`textColor`、`activeTextColor`、`fontSize`、`height`、`zIndex`、`duration`、`fixed`、`placeholder`
7. 【新增】item 支持 `disabled` 禁用；组件暴露 `switchTo(index)` 编程式切换方法
8. 【优化】布局改为百分比自适应，修复宽屏/iPad/折叠屏下 750rpx 硬编码导致的错位
9. 【优化】角标锚定图标右上角并随选中图标一同浮入圆钮，自带底栏同色描边；修复 tab 数量变化时角标偏移；图片图标增加 `aspectFit` 与默认尺寸
10. 【修复】移除生产环境调试日志与无效样式；`data` 为空时的除零保护
11. 【兼容】旧版 `corner` + `cornerMark` 用法与 `change` 事件的 `currenIndex` 字段继续可用（已标记废弃，建议迁移）
## 1.0.3（2025-12-02）
1.更新角标功能
2.简化示例
## 1.0.2（2025-08-07）
1.增加参数说明
## 1.0.1（2025-08-07）
1.更新使用文档
## 1.0.0（2025-07-30）
V1.0版本发布
