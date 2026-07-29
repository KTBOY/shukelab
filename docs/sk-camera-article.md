# 我把 H5 拍照踩过的坑，全部封进了这个 uni-app 组件里 —— sk-camera

> 「相机打不开」「拍出来的照片是变形的」「拍完照相机灯还亮着」——如果你在 H5 里做过拍照功能，这几句话大概率戳中过你。这篇文章聊聊我是怎么系统性地解决这些问题，并沉淀成一个开箱即用的 uni-app 组件 `sk-camera` 的。

![图片待上传：组件运行效果 GIF，展示打开相机 → 拍照 → 出图的完整流程（手机 H5 录屏最佳）]()

## 一、为什么 H5 拍照这么难搞

`getUserMedia` 这个 API 看起来很简单，三行代码就能拉起摄像头。但真正上了生产环境、面对成百上千种安卓机型 + iOS Safari + 微信/QQ 内置浏览器之后，你会陆续遇到这些问题：

### 1. 相机打不开：OverconstrainedError

很多教程会这样写约束：

```js
navigator.mediaDevices.getUserMedia({
  video: { width: { min: 1280 }, height: { min: 720 } },
})
```

`min` 是**硬性约束**。设备摄像头不支持这个分辨率时，浏览器不会「尽力而为」，而是直接抛 `OverconstrainedError`——在低端安卓机上这几乎是必现的。

### 2. 拍出来的照片变形

预览用 CSS 把 video 拉伸铺满了容器，成像时却直接按容器尺寸画 canvas，宽高比对不上，人脸自然就「压扁」或「拉长」了。

### 3. 前置镜像导致页面卡死

有些实现为了让自拍成像和预览一致（镜像），用 `getImageData` 逐像素翻转。一张 1080p 的照片是 200 万+ 像素，JS 单线程逐像素循环，低端机直接卡死。

### 4. 拍完照，摄像头灯还亮着

页面跳走了、组件销毁了，但 `MediaStream` 的轨道没有 `stop()`，摄像头持续占用——用户看到状态栏的相机指示灯常亮，第一反应是「这个网页在偷拍我」。

### 5. 多端适配

同一套业务代码，H5 要用 `getUserMedia`，小程序和 App 只能用原生 `<camera>`，API 完全是两个世界。

这些问题每一个都不算「大」，但凑在一起，足够让一个拍照需求返工三四次。所以我决定把它们一次性收敛到一个组件里。

## 二、设计思路：逻辑与视图分层

参考大厂组件库的做法，`sk-camera` 把**所有和视图无关的逻辑**抽到了一个组合式函数 `useCamera` 里：

```text
sk-camera/
├── sk-camera.vue        # 纯视图：预览容器、控制栏、插槽、事件透传
├── use-camera.ts        # 核心逻辑：getUserMedia、约束降级、成像、资源释放
├── utils.ts             # 纯函数：约束链构建、错误映射、裁剪坐标换算
└── sk-camera.type.ts    # 完整 TS 类型定义
```

![图片待上传：架构分层示意图，画出 vue（视图层）→ use-camera（逻辑层）→ utils（纯函数层）的依赖关系，可以用 draw.io / excalidraw 画]()

这样做的好处很直接：

- **可测试**：`utils.ts` 是纯函数，约束链、坐标映射都能单测覆盖；
- **可复用**：不想用我的 UI？直接 `import { useCamera }` 自己搭界面；
- **好维护**：视图和 WebRTC 细节彻底解耦，改样式不会碰坏相机逻辑。

## 三、几个关键问题的解法

### 1. 约束逐级降级：只用 ideal，失败就放宽

打不开相机的根因是约束太硬。`sk-camera` 的策略是：**全部用 `ideal`（期望值），并构建一条降级链，逐级重试**：

```ts
export function buildConstraintsChain(facing, resolution) {
  const size = resolvePreset(resolution)
  const chain: MediaStreamConstraints[] = []
  // 后置优先精确匹配，规避部分机型 environment 不生效的问题
  if (facing === 'environment') {
    chain.push({ audio: false, video: { facingMode: { exact: 'environment' }, width: { ideal: size.width }, height: { ideal: size.height } } })
  }
  chain.push({ audio: false, video: { facingMode: facing, width: { ideal: size.width }, height: { ideal: size.height } } })
  chain.push({ audio: false, video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } })
  chain.push({ audio: false, video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } } })
  chain.push({ audio: false, video: { facingMode: facing } })
  chain.push({ audio: false, video: true }) // 最后的兜底：能开就行
  return chain
}
```

从「期望分辨率」一路降到「video: true」，除非设备真的没有摄像头，否则总能打开。有一个细节：**权限类错误（NotAllowedError）不参与降级**——用户拒绝了授权，重试一百次也没用，直接反馈错误让业务处理。

### 2. 不变形：成像永远用视频原始分辨率

预览可以随便 `object-fit: cover`，但成像时 canvas 的尺寸必须取 `video.videoWidth / videoHeight`（视频流的原始分辨率），而不是容器的 CSS 尺寸：

```ts
const full = document.createElement('canvas')
full.width = video.videoWidth   // 原始分辨率，而非 clientWidth
full.height = video.videoHeight
```

宽高比天然一致，从根上杜绝变形。

### 3. 镜像：一行 ctx.scale(-1, 1) 取代逐像素循环

```ts
if (options.mirror) {
  ctx.translate(vw, 0)
  ctx.scale(-1, 1)   // GPU 加速的变换，耗时接近于 0
}
ctx.drawImage(video, 0, 0, vw, vh)
```

canvas 的 2D 变换是 GPU 加速的，性能和逐像素循环完全不在一个量级。同时预览层对 video 元素做 `rotateY(180deg)`，保证**预览和成像的镜像状态始终一致**——自拍看到什么，拍出来就是什么。

### 4. 固定区域裁剪：所见即所得的坐标映射

很多业务场景（证件照、人脸核身）需要「只保留取景框里的画面」。难点在于：预览是 `object-fit: cover`，屏幕上看到的只是原始画面被裁掉两边后的中间部分，**取景框在屏幕上的位置 ≠ 它在原始画面里的位置**。

`sk-camera` 的 `crop` 参数以**预览可视区域的比例（0~1）**为坐标系，内部按 cover 规则映射回原始像素：

```ts
// 预览容器像素 → 原始画面像素
const scale = Math.max(cw / vw, ch / vh)
const offX = (vw * scale - cw) / 2
const offY = (vh * scale - ch) / 2
let nx = (offX + rect.x) / scale
let ny = (offY + rect.y) / scale
```

于是用法变得非常直觉——取景框放在屏幕哪里，`crop` 就传一样的比例：

```vue
<!-- 取景框位于预览居中、宽 84%、高 50% -->
<sk-camera :crop="{ x: 0.08, y: 0.25, width: 0.84, height: 0.5 }" @capture="onCapture">
  <template #overlay>
    <!-- 你的取景框图片，用相同比例定位即可完全对齐 -->
  </template>
</sk-camera>
```

![图片待上传：裁剪对照图，左边是带取景框的预览截图，右边是拍照后实际输出的裁剪结果，证明「所见即所得」]()

### 5. 资源安全：卸载兜底释放

```ts
onUnmounted(() => {
  stop()          // 停掉所有 MediaStreamTrack
  unmountVideo()  // 移除 video 元素
})
```

无论业务代码有没有手动调 `stop()`，组件卸载时一定会释放摄像头。相机灯常亮的问题从机制上消灭。

### 6. 多端降级：一套 API 三端可用

通过条件编译，H5 走 `getUserMedia`，小程序 / App 自动降级为原生 `<camera>`，业务侧的 props、events、methods 完全一致，不用写两套代码。

## 四、快速上手

组件遵循 easycom 规范，放进 `uni_modules` 后**无需 import 直接用**：

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

![图片待上传：快速上手效果截图，展示相机预览界面（带内置控制栏：关闭/拍照/切换三个按钮）]()

不满足于默认 UI？控制栏和取景框都是插槽，实例方法全部暴露：

```vue
<sk-camera ref="cam" :show-controls="false">
  <template #controls="{ capture, switchCamera, facing }">
    <!-- 完全自定义的控制栏 -->
  </template>
</sk-camera>
```

错误处理也不用再猜浏览器抛的是什么——组件把原生错误统一映射成了稳定错误码：

| 错误码 | 含义 |
| --- | --- |
| `INSECURE_CONTEXT` | 非 HTTPS / localhost 环境 |
| `PERMISSION_DENIED` | 用户拒绝授权 |
| `NOT_FOUND` | 没有摄像头 |
| `NOT_READABLE` | 摄像头被其他程序占用 |
| `OVERCONSTRAINED` | 分辨率不支持（已自动降级，仍失败才会抛） |

业务侧一个 `switch(e.code)` 就能给出精准的引导文案。

## 五、踩坑备忘

最后附上几个开发过程中值得记录的点：

1. **`getUserMedia` 必须在安全上下文**：`https://` 或 `http://localhost`。局域网 IP 调试需要 HTTPS，用 `vite-plugin-mkcert` 一行配置搞定本地受信任证书。
2. **iOS 必须加 `playsinline`**：否则视频会强制全屏播放；再配合 `muted + autoplay` 才能自动出画面。腾讯 X5 内核还要额外加 `x5-playsinline`。
3. **不要用 uni 的 `<video>` 组件承载 MediaStream**：它是为「播放视频文件」封装的，属性透传和 `object-fit` 表现都不可控，直接 `document.createElement('video')` 挂载原生元素才是正解。
4. **切换前后置要先释放旧流**：部分机型不允许同时持有两个摄像头流，不先 `stop()` 会导致切换失败或黑屏。

## 六、写在最后

H5 拍照的每一个坑单看都不难，难的是它们分散在权限、约束、成像、坐标系、生命周期各个环节，而且只在特定机型上暴露。把它们一次性收敛到组件里，后面的项目就再也不用重新踩一遍了。

组件已发布到插件市场，源码含完整 TS 类型和注释，欢迎试用和反馈：

- 插件市场：（此处补充插件市场链接）
- 完整文档：见组件 `readme.md`

![图片待上传：文末引流图，可以是插件市场页面截图，或你的公众号/主页二维码]()

如果这篇文章帮你避开了哪怕一个坑，点个赞再走吧 👍
