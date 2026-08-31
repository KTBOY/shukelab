# sk-camera

基于 `getUserMedia` 的 H5 拍照组件，系统性修复旧方案在大量机型上「打不开 / 拍照变形 / 卡死」的问题。逻辑与视图分层（`use-camera` 组合式），支持前后置切换、分辨率约束逐级降级、镜像、**固定区域裁剪**、**人脸取景引导**、手电筒/变焦/多设备选择；小程序 / App 自动降级为原生 `<camera>`，**实时预览不可用的环境（如微信 iOS）自动降级为系统拍照兜底**。

## 特性

- 高兼容：`getUserMedia` 仅用 `ideal` 约束并逐级降级，规避大量机型的 `OverconstrainedError`。
- **兜底拍照**：实时预览不可用（微信 iOS、非安全上下文、无 getUserMedia）时，自动降级为系统拍照（微信 JSSDK `chooseImage` → `<input capture>` 三级链路），拍照功能不中断。
- **断流自愈**：轨道被系统回收/切后台中断时自动重启（最多 2 次），失败抛 `STREAM_LOST`。
- **人脸取景引导（H5）**：集成 MediaPipe BlazeFace 端上检测（约 230KB 模型），实时人脸框、`face-detected/face-lost` 事件、可选自动快门；人脸数据全程不出端。
- **相机控制**：手电筒（`torch`）、变焦（`setZoom`）、多摄像头枚举与切换（`getDevices/switchDevice`）。
- 不变形：canvas 采用视频原始分辨率成像，单画布直出（无中间全帧画布，高分辨率内存峰值减半）；镜像用 `ctx.scale(-1,1)`。
- 前后置切换：切换前释放旧流，后置优先精确匹配。
- 固定区域裁剪：`crop` 支持「居中最大正方形」或按比例区域；小程序/App 端同样生效（与 H5 共用同一套 cover 坐标映射）。
- 响应式属性：`crop / quality / format / mirror` 运行中修改即时生效。
- 资源安全：组件卸载自动关闭摄像头；拍照节流防连点。
- 多端降级：H5 用 `getUserMedia`，小程序 / App 用原生 `<camera>`（含授权预检、质量联动），同一套 API。
- 完善错误码：`INSECURE_CONTEXT / PERMISSION_DENIED / OVERCONSTRAINED / STREAM_LOST / FACE_GUIDE_UNAVAILABLE …` 便于业务分支处理。

## 平台兼容

| H5-Chrome | H5-Safari | H5-Edge | H5-Firefox | 微信/QQ浏览器(Android) | 微信小程序 | App-vue |
| :-------: | :-------: | :-----: | :--------: | :--------------------: | :--------: | :-----: |
|     √     |     √     |    √    |     √      |           √            | √（原生camera） | √（原生camera） |

> - H5 端 `getUserMedia` 要求**安全上下文**：`https://` 或 `http://localhost`、`http://127.0.0.1`。
> - **微信 iOS / 不支持实时预览的环境**：自动进入兜底拍照模式（无预览，点拍照调起系统相机），`@fallback` 事件携带原始原因。
> - 人脸取景引导仅 H5 端；模型与 wasm 建议自托管（见下文）。

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
// 小程序/App 返回 tempFilePath，H5 返回 base64，两端兼容
const onCapture = (res) => { img.value = res.tempFilePath || res.base64 }
const onError = (e) => uni.showToast({ title: e.message, icon: 'none' })
</script>

<style scoped>
.wrap { height: 100vh; }
</style>
```

## 兜底拍照（自动降级，无需业务处理）

实时预览启动失败时（微信 iOS、非安全上下文、无摄像头权限但可系统拍照等），组件自动切换为兜底模式并在预览区提示，点击「拍照」调起系统相机：

- 微信环境优先使用页面已引入的 JSSDK `wx.chooseImage`（结果为 `tempFilePath`，即 `localId`，可直接 `wx.uploadImage`）；
- 其余环境使用 `<input capture>`，返回 `base64`（`format=blob` 时附带 `blob`）。
- 兜底成像结果 `source === 'fallback'`（实时流为 `'stream'`），且 `cropped` 恒为 `false`（无预览即无取景框裁剪）。

```vue
<sk-camera @fallback="onFallback" @capture="onCapture" />

<script lang="ts" setup>
const onFallback = (e) => console.log('实时预览不可用，已降级系统拍照', e.message)
const onCapture = (res) => {
  if (res.source === 'fallback') { /* 兜底成像分支 */ }
}
</script>
```

传 `:fallback="false"` 可关闭降级，保持旧行为（直接抛错）。

## 人脸取景引导（face-guide，仅 H5）

基于 MediaPipe BlazeFace 短距模型（前置自拍场景优化）在**端上实时检测**：内置人脸框跟随、出现/离开事件、可选自动快门。**人脸数据全程不出端**，适合证件照取景、人脸存在性校验等引导场景（身份核验请走云端比对 + 活体，勿信任端上结果）。

```vue
<sk-camera
  :face-guide="{
    modelUrl: '/static/models/blaze_face_short_range.tflite',
    wasmPath: '/static/mediapipe/wasm',
    autoCapture: { stableMs: 1500 },
  }"
  @face-detected="onDetected"
  @face-lost="onLost"
  @face="onFaces"
  @capture="onCapture"
/>
```

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `modelUrl` | BlazeFace tflite 模型地址 | 官方 Google Storage 地址（国内/离线请自托管） |
| `wasmPath` | `@mediapipe/tasks-vision` 的 wasm 目录 | jsdelivr CDN（可自托管） |
| `minConfidence` | 最低置信度 | `0.5` |
| `interval` | 检测节流间隔 ms | `200` |
| `showBox` | 渲染内置绿框 | `true` |
| `autoCapture` | 人脸持续稳定后自动拍照；`true`=1200ms 或 `{ stableMs }` | 关闭 |

**资源自托管（推荐国内/离线项目）**：

1. 项目安装 `pnpm add @mediapipe/tasks-vision`，将 `node_modules/@mediapipe/tasks-vision/wasm/` 下 `vision_wasm_internal.*` 与 `vision_wasm_nosimd_internal.*` 拷到 H5 静态目录；
2. 下载 [blaze_face_short_range.tflite](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite)（229KB）放入同一静态目录；
3. 通过 `modelUrl` / `wasmPath` 传入。本仓库已内置于根目录 `h5-static/`（`models/`、`mediapipe/wasm/`），由 `vite.config.ts` 中仅 H5 生效的插件按 `/static/*` 提供，demo 页 `pages/skCameraDemo/face` 直接演示。

> 注意：wasm 约 23MB，**不要放进 `src/static`** —— uni-app 会将其拷入所有平台构建产物，导致微信小程序包超限。请放入仅 H5 发布/服务的目录（如本仓库的 `h5-static/` 方案）。

事件与坐标：

- `@face`：每轮检测结果 `SkFaceBox[]`（相对预览区域的比例坐标，已按 cover 映射与镜像翻转，可直接用于自定义渲染）；
- `@face-detected` / `@face-lost`：人脸出现 / 离开画面；
- 自动快门触发一次后需人脸离开画面再回来才会再次触发，避免连拍。

## 手电筒 / 变焦 / 多设备选择（H5）

```vue
<template>
  <sk-camera ref="cam" flash="torch" />
  <button @tap="toggleTorch">手电筒</button>
  <button @tap="zoomIn">放大</button>
  <button @tap="pickDevice">切换设备</button>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
const cam = ref()
let torch = true
let zoom = 1

onMounted(() => {
  // 相机就绪后（@ready）查询能力更稳妥
  const caps = cam.value.getCapabilities()
  console.log('手电筒支持', caps.torch, '变焦范围', caps.zoom)
})

const toggleTorch = () => cam.value.setTorch((torch = !torch))
const zoomIn = () => cam.value.setZoom((zoom = Math.min(3, zoom + 0.5)))
const pickDevice = () => {
  const devices = cam.value.getDevices() // [{ deviceId, label }]
  if (devices.length > 1) cam.value.switchDevice(devices[1].deviceId)
}
</script>
```

- `flash` prop：`off/on/auto/torch`，直传原生 `<camera>`；**H5 端仅 `torch` 生效**（轨道约束），`on/auto` 在 H5 无对应能力会被忽略。
- `setTorch/setZoom` 需设备支持（先查 `getCapabilities()`），不支持时返回 `false`。
- 小程序/App 端以上方法为占位实现（返回 `false`/空列表），`flash` prop 除外。

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
| mirror                | 是否水平镜像；不传时前置默认镜像、后置默认不镜像（运行中修改即时生效） | `Boolean` | —        |
| quality               | JPEG 质量 0~1（运行中修改即时生效；小程序端联动 high/normal/low） | `Number` | `0.92`   |
| format                | 输出格式 `base64` / `blob`（运行中修改即时生效） | `String`                              | `base64` |
| autoStart             | 挂载后是否自动开启相机                          | `Boolean`                             | `true`   |
| showControls          | 是否显示内置控制栏（关闭/拍照/切换）            | `Boolean`                             | `true`   |
| crop                  | 固定区域裁剪，`true`=居中最大正方形或传比例区域（运行中修改即时生效） | `Boolean \| SkCameraCropRegion` | `false` |
| fallback              | 实时预览不可用时是否降级为系统拍照兜底          | `Boolean`                             | `true`   |
| flash                 | 闪光灯 `off/on/auto/torch`；H5 端仅 `torch` 生效 | `String`                              | `off`    |
| faceGuide             | 人脸取景引导（仅 H5），`true` 用默认配置        | `Boolean \| SkFaceGuideOptions`       | `false`  |
| navigateOnClose       | 内置「关闭」后是否自动返回上一页/回首页         | `Boolean`                             | `true`   |

## Events

| 事件名        | 说明               | 回调参数                    |
| ------------- | ------------------ | --------------------------- |
| ready         | 相机就绪（含断流自动恢复后） | —                  |
| capture       | 拍照完成           | `SkCameraCaptureResult`     |
| switch        | 前后置切换完成     | `facing: SkCameraFacing`    |
| error         | 发生错误           | `SkCameraError`             |
| close         | 内置关闭按钮被点击 | —                           |
| fallback      | 进入兜底拍照模式   | `SkCameraError`（原始原因） |
| face          | 每轮人脸检测结果（仅 H5） | `SkFaceBox[]`        |
| face-detected | 画面中出现人脸（仅 H5） | —                    |
| face-lost     | 人脸离开画面（仅 H5） | —                      |

## Methods（通过 ref 调用）

| 方法名          | 说明                             | 返回                                    |
| --------------- | -------------------------------- | --------------------------------------- |
| start           | 开启相机                         | `Promise<void>`                         |
| stop            | 关闭相机并释放资源               | `void`                                  |
| capture         | 拍照（连点自动节流）             | `Promise<SkCameraCaptureResult \| null>` |
| switchCamera    | 前后置切换                       | `Promise<void>`                         |
| getStream       | 获取当前 `MediaStream`（H5）     | `MediaStream \| null`                   |
| setTorch        | 手电筒开关（H5，需设备支持）     | `Promise<boolean>` 是否生效             |
| setZoom         | 设置变焦倍数（H5，范围见能力）   | `Promise<boolean>` 是否生效             |
| getCapabilities | 查询轨道能力（手电筒/变焦范围）  | `{ torch, zoom }`                       |
| getDevices      | 已授权摄像头设备列表（H5）       | `SkCameraDevice[]`                      |
| switchDevice    | 切换到指定设备并重启相机（H5）   | `Promise<void>`                         |

## Slots

| 名称     | 说明                     | 作用域参数                              |
| -------- | ------------------------ | --------------------------------------- |
| overlay  | 自定义取景框 / 水印遮罩（人脸框由组件内置渲染） | —                |
| controls | 自定义控制栏             | `{ capture, switchCamera, stop, close, facing }` |

## 类型定义

```ts
type SkCameraFacing = 'user' | 'environment'
type SkCameraResolution = '480p' | '720p' | '1080p' | { width: number; height: number }
type SkCameraFormat = 'base64' | 'blob'
type SkCameraFlash = 'off' | 'on' | 'auto' | 'torch'
type SkCameraSource = 'stream' | 'fallback'

interface SkCameraCropRegion { x: number; y: number; width: number; height: number } // 均为 0~1 比例

interface SkCameraCaptureResult {
  base64: string
  blob?: Blob | null
  tempFilePath?: string // 小程序/App；微信兜底时为 chooseImage 的 localId
  width: number
  height: number
  facing: SkCameraFacing
  cropped: boolean
  source?: SkCameraSource // 兜底拍照为 'fallback'
}

interface SkFaceGuideOptions {
  modelUrl?: string        // BlazeFace tflite 地址（建议自托管）
  wasmPath?: string        // tasks-vision wasm 目录（建议自托管）
  minConfidence?: number   // 默认 0.5
  interval?: number        // 检测节流 ms，默认 200
  showBox?: boolean        // 内置人脸框，默认 true
  autoCapture?: boolean | { stableMs?: number } // 自动快门
}

interface SkFaceBox { x: number; y: number; width: number; height: number; score: number } // 预览比例坐标
interface SkCameraDevice { deviceId: string; label: string }

type SkCameraErrorCode =
  | 'INSECURE_CONTEXT' | 'NOT_SUPPORTED' | 'PERMISSION_DENIED'
  | 'NOT_FOUND' | 'NOT_READABLE' | 'OVERCONSTRAINED'
  | 'NOT_READY' | 'STREAM_LOST' | 'FACE_GUIDE_UNAVAILABLE' | 'UNKNOWN'
interface SkCameraError { code: SkCameraErrorCode; message: string; raw?: unknown }
```

## 常见问题（FAQ）

- **相机打不开 / 报错 INSECURE_CONTEXT**：`getUserMedia` 必须运行在安全上下文。请用 `https://` 或 `http://localhost`、`http://127.0.0.1` 访问；通过局域网 IP 访问需开启 HTTPS。开启 `fallback`（默认）时会自动降级为系统拍照。
- **微信 iOS 打开页面没有预览**：微信 iOS WKWebView 对 `getUserMedia` 支持受限，组件会自动进入兜底拍照模式（`@fallback` 事件），点拍照调起系统相机，功能不中断。
- **提示 OVERCONSTRAINED**：设备不支持该分辨率。本组件已自动降级，仍失败时可显式传更低的 `resolution`。
- **预览突然黑屏/卡住**：组件监听轨道中断与页面回前台，会自动重启（最多 2 次）；仍失败时抛 `STREAM_LOST`，业务可提示用户重试。
- **人脸框不出现 / 报 FACE_GUIDE_UNAVAILABLE**：检查 `modelUrl`、`wasmPath` 可访问（国内建议自托管，见上文）；另需安全上下文。
- **切到后置无反应**：部分机型不支持 `{exact:'environment'}`，组件会回退到 ideal；若设备无后置摄像头则保持前置。
- **小程序端点拍照无反应**：`<camera>` 位于自定义组件内部时，`createCameraContext` 必须传入组件实例，否则 `takePhoto` 的回调不会触发（组件内部已处理）。另外小程序端拍照结果在 `tempFilePath` 而非 `base64`，两端兼容写法：`res.tempFilePath || res.base64`。
- **小程序端底部留白**：页面容器不要照搬 H5 的 `calc(100vh - 44px)`——小程序导航栏是原生的不占视口高度，直接用 `100vh`；底部安全区组件控制栏已通过 `env(safe-area-inset-bottom)` 适配。
- **本地 HTTPS 如何开启**：桌面端用 `http://localhost` 即为安全上下文。如需 HTTPS（例如局域网 IP 访问），执行 `pnpm add -D vite-plugin-mkcert` 后用 `https://localhost:<port>` 访问。

## 本地测试

> 本项目 `manifest.json` 中 H5 为 `history` 路由（`base: /`），直接用路径访问，无需 `#`。

```bash
pnpm dev:h5
# 基础/裁剪/切换：http://localhost:<port>/pages/skCameraDemo/basic
# 人脸取景引导：http://localhost:<port>/pages/skCameraDemo/face
# 如需 HTTPS：先执行 pnpm add -D vite-plugin-mkcert，再访问 https://localhost:<port>
```
