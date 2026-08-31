## 1.1.0（2026-08-31）

兼容性刚需与能力扩展：

- **兜底拍照**：实时预览不可用时（微信 iOS、非安全上下文、无 `getUserMedia`）自动降级为系统拍照（微信 `wx.chooseImage` → `<input capture>` 三级链路），`@fallback` 事件与结果 `source: 'fallback'`；可用 `:fallback="false"` 关闭。
- **断流自愈**：监听轨道 `ended` 与页面 `visibilitychange`，预览被系统回收/切后台中断后自动重启（最多 2 次），失败抛 `STREAM_LOST`。
- **人脸取景引导（H5）**：新增 `face-guide`，基于 MediaPipe BlazeFace 端上检测（约 230KB 模型）；内置人脸框、`@face/@face-detected/@face-lost` 事件、可选自动快门（`autoCapture`）；模型与 wasm 支持自托管（仓库已内置于根目录 `h5-static/`，由仅 H5 生效的 vite 插件提供，避免拷入小程序包）。
- **相机控制**：手电筒（`flash="torch"` / `setTorch`）、变焦（`setZoom`）、多摄像头枚举与切换（`getDevices` / `switchDevice`）、能力查询（`getCapabilities`）。
- 新增 `@close` 事件与 `navigateOnClose` 属性，内置关闭行为可由业务接管。

优化：

- `crop / quality / format / mirror` 运行中修改即时生效（此前初始化后不响应）。
- 成像改为单画布直出（镜像源矩形映射 + 一次变换），高分辨率下内存峰值减半。
- 拍照节流：连点只生效一次。
- 小程序端：启动前 `uni.authorize` 授权预检（拒绝权限给出明确错误而非黑屏）；`takePhoto` 质量与 `quality` prop 联动（high/normal/low）。

依赖：

- 新增 `@mediapipe/tasks-vision`（按需动态加载，未启用 `face-guide` 时零体积代价）。

## 1.0.0（2026-07-29）

首个版本。基于 getUserMedia 重写 H5 拍照，系统性修复旧实现在大量机型上的问题：

- 修复相机无法启动：启动逻辑不再被错误地包裹在 `if(videoWidth)` 分支内。
- 兼容性大幅提升：`getUserMedia` 约束改为仅用 `ideal` 并逐级降级（请求档 → 720p → 480p → 仅 facingMode → video:true），规避大量机型 `OverconstrainedError`。
- 修复成像变形：canvas 采用视频原始分辨率，去除强制竖屏的 `Math.min/max`。
- 修复高分辨率卡死/崩溃：镜像改用 `ctx.scale(-1,1)`，删除逐像素双重循环。
- 承载媒体流改用原生 `<video>`，不再使用 uni `<video>` 组件。
- 移除损坏的旧 `getUserMedia.then()` polyfill；新增安全上下文校验与完善的错误码映射。
- 前后置切换先释放旧流再重启；组件卸载自动释放摄像头。
- 新增能力：`crop` 固定区域裁剪。
- 新增小程序/App 端降级为原生 `<camera>`。
