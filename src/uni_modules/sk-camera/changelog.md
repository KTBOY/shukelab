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
