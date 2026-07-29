# sk-camera

基于 `getUserMedia` 的 H5 拍照组件，系统性修复旧方案在大量机型上「打不开 / 拍照变形 / 卡死」的问题。逻辑与视图分层（`use-camera` 组合式），支持前后置切换、分辨率约束逐级降级、镜像、**固定区域裁剪**；小程序 / App 自动降级为原生 `<camera>`。

## 特性

- 高兼容：`getUserMedia` 仅用 `ideal` 约束并逐级降级，规避大量机型的 `OverconstrainedError`。
- 不变形：canvas 采用视频原始分辨率成像；镜像用 `ctx.scale(-1,1)`，杜绝逐像素循环导致的卡死。
- 前后置切换：切换前释放旧流，后置优先精确匹配。
- 固定区域裁剪：`crop` 支持「居中最大正方形」或按比例区域，无需自由裁剪 UI；小程序/App 端同样生效（拍照后离屏 canvas 裁剪，与 H5 共用同一套 cover 坐标映射）。
- 资源安全：组件卸载自动关闭摄像头，避免相机灯常亮。
- 多端降级：H5 用 `getUserMedia`，小程序 / App 用原生 `<camera>`，同一套 API。
- 完善错误码：`INSECURE_CONTEXT / PERMISSION_DENIED / OVERCONSTRAINED …` 便于业务分支处理。

## 平台兼容

| H5-Chrome | H5-Safari | H5-Edge | H5-Firefox | 微信/QQ浏览器(Android) | 微信小程序 | App-vue |
| :-------: | :-------: | :-----: | :--------: | :--------------------: | :--------: | :-----: |
|     √     |     √     |    √    |     √      |           √            | √（原生camera） | √（原生camera） |

> H5 端 `getUserMedia` 要求**安全上下文**：`https://` 或 `http://localhost`、`http://127.0.0.1`。

## 引入

组件位于 `uni_modules`，遵循 easycom 规范，**无需 import 直接使用**：

```vue
<template>
  <sk-camera @capture="onCapture" @error="onError" />
</template>
```

## 快速开始

```vue
<template>
  <view class="wrap">
    <sk-camera v-if="!img" @capture="onCapture" @error="onError" />
    <image v-else :src="img" mode="widthFix" />
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const img = ref('')
const onCapture = (res) => { img.value = res.base64 }
const onError = (e) => uni.showToast({ title: e.message, icon: 'none' })
</script>

<style scoped>
.wrap { height: 100vh; }
</style>
```

## 前后置切换

内置控制栏已带「切换」按钮；也可关闭内置控制栏后通过实例方法切换：

```vue
<template>
  <sk-camera ref="cam" :show-controls="false" @switch="onSwitch" />
  <button @tap="cam.switchCamera()">切换前后置</button>
  <button @tap="cam.capture()">拍照</button>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const cam = ref()
const onSwitch = (facing) => console.log('当前朝向', facing)
</script>
```

## 固定区域裁剪（crop）

`crop` 用于「只截取取景框内的画面」。坐标系是**预览可视区域**（屏幕上看到的相机区域），取值均为 **0~1 比例**；组件会自动按 `object-fit: cover` 映射回摄像头原始像素，做到**所见即所得**（换机型/分辨率都无需改动）。

### 三种取值

| `crop` 取值 | 效果 |
| --- | --- |
| 不传（默认 `false`） | 不裁剪，输出整帧 |
| `true` | 输出预览「居中最大正方形」 |
| `{ x, y, width, height }` | 自定义矩形裁剪 |

### 区域对象 SkCameraCropRegion

四个值均为相对**预览可视区域**的比例（0~1）：

- `x` / `y`：裁剪矩形**左上角**的横 / 纵坐标（`0` 为左 / 上边缘，`1` 为右 / 下边缘）
- `width` / `height`：裁剪矩形的宽 / 高占比

例：`{ x: 0.1, y: 0.2, width: 0.8, height: 0.5 }` = 从预览宽度 10% 处起、占 80% 宽，从高度 20% 处起、占 50% 高。约束：`x + width ≤ 1`、`y + height ≤ 1`；水平居中取 `x = (1 - width) / 2`。

### 推荐用法：取景框与 crop 共用一份数据

把取景框放进 `overlay` 插槽，用**与 crop 相同的比例**定位，即可保证「框里是什么、裁出来就是什么」：

```vue
<template>
  <sk-camera :crop="cropRegion" @capture="onCapture">
    <template #overlay>
      <!-- 取景框图片自行提供；scaleToFill 铺满该区域，与 crop 完全对齐 -->
      <image class="frame" :style="frameStyle" src="/static/your-frame.png" mode="scaleToFill" />
    </template>
  </sk-camera>
</template>

<script lang="ts" setup>
import type { SkCameraCropRegion } from '@/uni_modules/sk-camera/components/sk-camera/sk-camera.type'

// 唯一数据源：改这一处即可自定义取景框大小 / 位置
const cropRegion: SkCameraCropRegion = { x: 0.08, y: 0.25, width: 0.84, height: 0.44 }
// 取景框样式由 cropRegion 推导，二者始终一致
const frameStyle = {
  left: `${cropRegion.x * 100}%`,
  top: `${cropRegion.y * 100}%`,
  width: `${cropRegion.width * 100}%`,
  height: `${cropRegion.height * 100}%`,
}
const onCapture = (res) => {
  // res.base64 即裁剪后的图片；res.cropped === true；res.width/height 为裁剪后像素
}
</script>

<style scoped>
/* 取景框四周压暗，突出裁剪区域 */
.frame { position: absolute; box-shadow: 0 0 0 1000rpx rgba(0, 0, 0, 0.4); }
</style>
```

### 放大 / 缩小取景框

只改 `cropRegion` 一处，取景框与裁剪同步变化：

```ts
const cropRegion = { x: 0.05, y: 0.18, width: 0.9, height: 0.6 }  // 更大
const cropRegion = { x: 0.2, y: 0.32, width: 0.6, height: 0.36 }  // 更小
```

> 提示：`crop` 基于预览可视区域而非原始分辨率；若取景框用图片，务必让图片铺满该区域（`mode="scaleToFill"`），否则 aspectFit 的居中留白会让裁剪看起来「多裁」。
>
> 小程序/App 端：拍照后组件内置的离屏 `canvas 2d` 会按与 H5 同一套 cover 映射裁剪，结果通过 `tempFilePath` 返回（`cropped: true`）；裁剪失败时降级返回原图（`cropped: false`）。

## Props

| 参数                  | 说明                                            | 类型                                  | 默认值   |
| --------------------- | ----------------------------------------------- | ------------------------------------- | -------- |
| facing                | 摄像头朝向 `user` 前置 / `environment` 后置     | `String`                              | `user`   |
| resolution            | 分辨率预设 `480p/720p/1080p` 或 `{width,height}`（仅作 ideal 期望） | `String \| Object` | `720p`   |
| mirror                | 是否水平镜像；不传时前置默认镜像、后置默认不镜像 | `Boolean`                             | —        |
| quality               | JPEG 质量 0~1                                    | `Number`                              | `0.92`   |
| format                | 输出格式 `base64` / `blob`                      | `String`                              | `base64` |
| autoStart             | 挂载后是否自动开启相机                          | `Boolean`                             | `true`   |
| showControls          | 是否显示内置控制栏（关闭/拍照/切换）            | `Boolean`                             | `true`   |
| crop                  | 固定区域裁剪，`true`=居中最大正方形或传比例区域 | `Boolean \| SkCameraCropRegion`       | `false`  |

## Events

| 事件名  | 说明               | 回调参数                    |
| ------- | ------------------ | --------------------------- |
| ready   | 相机就绪           | —                           |
| capture | 拍照完成           | `SkCameraCaptureResult`     |
| switch  | 前后置切换完成     | `facing: SkCameraFacing`    |
| error   | 发生错误           | `SkCameraError`             |

## Methods（通过 ref 调用）

| 方法名       | 说明                             | 返回                                    |
| ------------ | -------------------------------- | --------------------------------------- |
| start        | 开启相机                         | `Promise<void>`                         |
| stop         | 关闭相机并释放资源               | `void`                                  |
| capture      | 拍照                             | `Promise<SkCameraCaptureResult \| null>` |
| switchCamera | 前后置切换                       | `Promise<void>`                         |
| getStream    | 获取当前 `MediaStream`（H5）     | `MediaStream \| null`                   |

## Slots

| 名称     | 说明                     | 作用域参数                              |
| -------- | ------------------------ | --------------------------------------- |
| overlay  | 自定义取景框 / 水印遮罩（组件默认不含取景框，由此传入图片等） | —                              |
| controls | 自定义控制栏             | `{ capture, switchCamera, stop, close, facing }` |

## 类型定义

```ts
type SkCameraFacing = 'user' | 'environment'
type SkCameraResolution = '480p' | '720p' | '1080p' | { width: number; height: number }
type SkCameraFormat = 'base64' | 'blob'

interface SkCameraCropRegion { x: number; y: number; width: number; height: number } // 均为 0~1 比例

interface SkCameraCaptureResult {
  base64: string
  blob?: Blob | null
  tempFilePath?: string // 小程序/App
  width: number
  height: number
  facing: SkCameraFacing
  cropped: boolean
}

type SkCameraErrorCode =
  | 'INSECURE_CONTEXT' | 'NOT_SUPPORTED' | 'PERMISSION_DENIED'
  | 'NOT_FOUND' | 'NOT_READABLE' | 'OVERCONSTRAINED'
  | 'NOT_READY' | 'UNKNOWN'
interface SkCameraError { code: SkCameraErrorCode; message: string; raw?: unknown }
```

## 常见问题（FAQ）

- **相机打不开 / 报错 INSECURE_CONTEXT**：`getUserMedia` 必须运行在安全上下文。请用 `https://` 或 `http://localhost`、`http://127.0.0.1` 访问；通过局域网 IP 访问需开启 HTTPS。
- **提示 OVERCONSTRAINED**：设备不支持该分辨率。本组件已自动降级，仍失败时可显式传更低的 `resolution`。
- **iOS 预览黑屏 / 不自动播放**：确保安全上下文；组件已设置 `playsinline + muted + autoplay`，个别场景需一次用户手势后再 `start()`。
- **切到后置无反应**：部分机型不支持 `{exact:'environment'}`，组件会回退到 ideal；若设备无后置摄像头则保持前置。
- **小程序端点拍照无反应**：`<camera>` 位于自定义组件内部时，`createCameraContext` 必须传入组件实例，否则 `takePhoto` 的回调不会触发（组件内部已处理，无需业务侧关心）。另外小程序端拍照结果在 `tempFilePath` 而非 `base64`，两端兼容写法：`res.tempFilePath || res.base64`。
- **小程序端底部留白**：页面容器不要照搬 H5 的 `calc(100vh - 44px)`——小程序导航栏是原生的不占视口高度，直接用 `100vh`（可用条件编译区分两端）；底部安全区组件控制栏已通过 `env(safe-area-inset-bottom)` 适配。
- **本地 HTTPS 如何开启**：桌面端用 `http://localhost` 即为安全上下文，无需额外配置即可调用摄像头。如需 HTTPS（例如局域网 IP 访问），执行 `pnpm add -D vite-plugin-mkcert`，`vite.config.ts` 会自动检测并启用本地受信任证书，再用 `https://localhost:<port>` 访问即可。

## 本地测试

```bash
pnpm dev:h5
# 桌面端直接用 http://localhost:<port>/#/pages/skCameraDemo/basic 即可（localhost 为安全上下文）
# 如需 HTTPS：先执行 pnpm add -D vite-plugin-mkcert，再访问 https://localhost:<port>
```
