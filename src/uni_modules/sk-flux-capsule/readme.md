# sk-flux-capsule

基于 WebGL 域扭曲 FBM 着色器的流体色彩胶囊组件，兼容 H5 与微信小程序。

## 特性

- WebGL 实时渲染，60fps 流体动画
- 支持 1~6 色调色板（单色自动派生明暗层次）
- 按压/搅动交互动力学（smoothstep 缓动）
- 玻璃高光层（iOS 镜面反光效果）
- 受控暂停/恢复，页面切后台自动停帧
- 多实例噪声种子隔离，纹理永不同步
- 零外部依赖，仅需 uni-app + Vue3

## 用法

```vue
<sk-flux-capsule colors="#5b8cff" title="FLUX" />
<sk-flux-capsule :colors="['#ff4f9e', '#ff8c40']" :height="160" @tap="onTap" />
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| colors | string \| string[] | — | 调色板，1~6 个 CSS 颜色 |
| title | string | '' | 标题（默认插槽优先） |
| subtitle | string | '' | 副标题 |
| width | number \| string | '100%' | 宽度，数字按 rpx |
| height | number \| string | 160 | 高度，数字按 rpx |
| radius | number \| string | 药丸形 | 圆角 |
| speed | number | 0.22 | 基础流速 |
| gloss | boolean | true | 玻璃高光层 |
| interactive | boolean | true | 触摸交互 |
| paused | boolean | false | 受控暂停 |
| seed | number | 随机 | 噪声种子 |

## Events

| 事件 | 说明 |
|------|------|
| press | 按下时触发 |
| release | 松开时触发 |
| tap | 点击时触发 |

## 暴露方法

| 方法 | 说明 |
|------|------|
| pause() | 暂停渲染 |
| resume() | 恢复渲染 |

## 平台兼容

| H5 | 微信小程序 |
|----|-----------|
| 支持 | 支持 |