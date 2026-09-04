# sk-scroll-list 状态 UI 与手势重构 · 设计文档

日期：2026-09-04
涉及组件：sk-scroll-list（主体）、sk-swipe-page（配合）、skSwipePageDemo（用法层）

## 1. 背景

对 sk-swipe-page / sk-scroll-list / sk-scroll-tabs 三个组件做源码审计后，确认了 4 类问题，其中 3 类集中在 sk-scroll-list：

1. **状态语义混用**：组件不持有数据，`loading` 一个布尔值同时表达「首屏首次请求」和「触底加载更多」。切页签时 `channel-feed` 挂载即请求第一页，此时 `empty` 被调用方算成 false，组件走列表分支，footer 因 `loading && !refreshing` 成立，在容器最顶部贴一行灰字「加载中...」——首屏加载态被 footer 借用了。
2. **两套下拉阈值不一致**：内部 loosing 判定用硬编码 `REFRESH_LOOSING_THRESHOLD = 80`（sk-scroll-list.vue:232），而 `refresher-threshold` 从未传给原生 scroll-view（默认 45）。原生在 45px 就已具备触发条件，自定义刷新头却还显示「下拉刷新」。
3. **手势冲突**：横滑翻页时下拉头会被误撑开，严重时误触发刷新。
4. **频道数据无缓存**：`sk-swipe-page` 的 `maxAlive` LRU 淘汰窗口外页面后，`channel-feed` 连同其内部 `usePagedList` 实例一起销毁，回滑重新请求第一页且滚动位置丢失。

## 2. 目标与非目标

**目标**

- 首屏/切页签加载 → 容器垂直居中的圆圈 loading
- 下拉刷新 → 四态（pulling / loosing / refreshing / success），66.png 菱形图标在上、文字在下
- 触底加载 → footer 竖排指示器，仅在「已有内容 + 加载更多进行中」出现
- 下拉与横滑互斥：纵向手势独占下拉，横向手势独占翻页
- 频道数据与滚动位置随页面存活，与组件挂载解耦
- 顺带修复审计中确认的 5 个 bug（见 §8）

**非目标**（明确不做，留待后续）

- sk-scroll-tabs 滑块闪烁、`beforeChange` 连点竞态、`disabled-click` 事件
- sk-scroll-list 外发 `@scroll` / `@scrolltoupper`
- 骨架屏（首屏改用圆圈 loading，已决策）
- README 预览区橱窗化（独立事项，另行推进）

## 3. 状态机设计

### 3.1 区域划分

三种加载指示按触发源严格互斥，同一时刻至多出现一个：

| 区域 | 触发源 | 出现条件 | 视觉 |
| --- | --- | --- | --- |
| 首屏区 | 数据首次请求，非用户手势 | `empty && loading` | 居中圆圈 loading |
| refresher | 用户下拉手势 | 手势进行中 / 刷新中 / success 驻留 | 66.png 菱形在上、文字在下 |
| footer | 滚动触底 | `!empty && loading && !refreshing` | 66.png 菱形在上、文字在下（小一号） |

### 3.2 `empty` 语义变更（破坏性，组件未发布可直接改）

`empty` 只表达「当前有没有内容」，不再由调用方排除 loading 态。组件内部决定无内容时展示什么：

```
empty && loading            → 居中圆圈 loading
empty && !loading && error  → 居中错误态（点击重试，外发 retry）
empty && !loading           → 居中空态
!empty                      → 列表 + footer
```

调用方约定同步简化：`:empty="list.length === 0"`（demo 三处 + readme 全部更新）。
这同时修掉了「空态在首屏加载期间误显示」的 bug——该 bug 的根因正是语义被推给调用方兜底。

### 3.3 refresher 四态与 success 驻留

原生 scroll-view 的 `refresher-triggered` 不再直接绑 `props.refreshing`，改绑组件内部 `triggered`，以便在刷新结束后驻留 success 态再回弹：

```
props.refreshing: false → true   ：triggered = true，进入 refreshing 态
props.refreshing: true  → false  ：读取当前 error
                                  → refreshResult = error ? 'failed' : 'success'
                                  → triggered 保持 true，头部驻留展示 successText / failedText
                                  → successDuration(默认 600ms) 后：triggered = false，refreshResult 清空，头部回弹
```

时序依据：`usePagedList.reload` 在 `catch` 中先置 `error`，`finally` 中后置 `refreshing = false`（use-paged-list.ts:132-135），组件在 `refreshing` 下降沿读 `error` 时状态已稳定。

`successDuration = 0` 时跳过驻留，行为退化为三态（提供关闭开关，但默认启用）。

驻留期间用户再次下拉会被原生吞掉（refresher 未收起），这是可接受代价，已确认采纳。

## 4. 视觉与动画规格

### 4.1 首屏圆圈 loading（纯 CSS，不依赖图片）

```
尺寸 56rpx × 56rpx
border: 4rpx solid var(--sk-loading-track-color)
border-top-color: var(--sk-loading-color)
border-radius: 50%
animation: sk-spin 0.8s linear infinite
```

`--sk-loading-color` 默认 `#111`（黑色，符合「垂直居中黑色 loading」要求），`--sk-loading-track-color` 默认 `rgba(17, 17, 17, 0.15)`。因为是 CSS 变量方案，深色列表容器只需把两个变量分别覆盖为 `#fff` / `rgba(255,255,255,0.15)`，无需 filter。不使用 `color-mix()`——微信小程序渲染层对其支持不可靠。

默认不显示文字；新增 `initialLoadingText`（默认 `''`）可开启图标下方文字。

### 4.2 refresher / footer 菱形指示器

- 竖排：图标在上、文字在下，`gap: 8rpx`，整体水平垂直居中
- 图标尺寸：refresher `40rpx`，footer `36rpx`
- 文字：`24rpx`，颜色 `var(--sk-indicator-color)`，默认 `#999`（与现有 footer 文字色一致，不随圆圈变色）
- 深色容器：`--sk-indicator-filter: brightness(0) invert(1)`（PNG 无法改色，只能 filter 反白）

动画曲线（菱形旋转 0→90° 会产生「菱形→正方形→菱形」的形变错觉）：

| 状态 | 图标动画 | 默认文案 |
| --- | --- | --- |
| pulling（0 → 阈值） | `rotate(progress × 90deg)`，`scale` 0.8→1.0，`opacity` 0.55→1 | 下拉刷新 |
| loosing（≥ 阈值） | 补完最后 90° + 弹性 `scale` 1.15→1 | 松开立即刷新 |
| refreshing | 外层匀速自转 900ms/圈，内层呼吸 `scale` 0.85↔1.05 | 正在刷新... |
| success / failed | `scale` 1→0.6 + 淡出 | 更新成功 / 刷新失败 |

自转与呼吸必须拆成内外两层 `view`——同一元素上两个 `animation` 的 `transform` 会互相覆盖。

footer 的 loading 态复用同一套自转 + 呼吸结构，尺寸取小一档，无 success 态。

### 4.3 状态区定位统一

现有 empty / error 态用 `padding: 160rpx 0` 撑出「近似居中」（sk-scroll-list.css:35,48），首屏 loading 若沿用会导致三个状态不在同一水平线。统一改为：

```
.sk-scroll-list__state {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

首屏 loading / 空态 / 错误态共用该容器。

### 4.4 两套指示器的已知不一致

圆圈用 CSS 变量可任意变色，菱形是位图只能 filter 反色。这是「下拉用 66.png、首屏用圆圈」这一决策的直接代价，记录在此，不做额外封装。

### 4.5 资源归属（关键）

`66.png` 当前在 `src/static/`。uni_modules 的交付契约是「整目录拖入宿主项目即用」，组件内引用 `/static/66.png` 在宿主项目会破图。

处理：将 `66.png` 复制到 `src/uni_modules/sk-scroll-list/components/sk-scroll-list/66.png`，组件内用 `import indicatorIcon from './66.png'` 后 `:src="indicatorIcon"` 绑定，由 vite（H5）与 uni 编译（小程序）各自解析路径。新增 `indicatorIcon` prop 允许覆盖。`src/static/66.png` 保留不动（其他页面可能在用）。

这是双端资源引用中最易翻车的一环，实施时 H5 与小程序各跑一次确认。

## 5. 手势仲裁层

### 5.1 平台能力事实（源码核实）

`node_modules/@dcloudio/uni-h5/dist/uni-h5.es.js`：

- 14447 行：`Math.abs(dx) > Math.abs(dy)` 硬编码 45° 方向判定
- 14476 行：纵向时 `event.stopPropagation()` → 手势不到达父级 swiper，「下拉时不翻页」H5 端本已成立
- 14479 行：`if (scrollTop === 0 && touches.length === 1) _setRefreshState('pulling')` **不判断方向** → 横滑时手指的向下分量会撑开下拉头（14488）并触发 `refresherpulling`，超过阈值还会在 touchend（14515）误触发刷新。**这是横滑被下拉打断的根因。**
- H5 不支持 `refresher-max-angle`（全库 grep 零命中）
- H5 swiper 支持 `disable-touch`（grep 命中）

微信小程序：scroll-view 支持 `refresher-max-angle`（默认 45），但 swiper **无**任何禁用手势属性。两端能力互补，必须双策略。

### 5.2 仲裁实现（在 sk-scroll-list 内部，保持与 sk-swipe-page 零耦合）

非响应式变量 `axisLock: 'pending' | 'vertical' | 'horizontal'`：

1. `touchstart`：记录 `x0/y0`，`axisLock = 'pending'`
2. `touchmove`（冒泡阶段，绑在组件根节点）：
   - `axisLock === 'pending'` 且 `max(|dx|,|dy|) > 10`（死区）时一次性定终身
   - 判定 `horizontal` → `gestureRefresherEnabled = false`，原生 `:refresher-enabled="props.refresherEnabled && gestureRefresherEnabled"` 被短路（对应 H5 14482 行的 `props2.refresherEnabled` 检查），手势继续冒泡给 swiper 正常翻页
   - 判定 `vertical` → 调用 `e.stopPropagation()`，手势不到达 swiper
3. `touchend` / `touchcancel`：`axisLock = 'pending'`，`gestureRefresherEnabled = true`

补充 `:refresher-max-angle="props.refresherMaxAngle"`（默认 45）：小程序端原生生效，H5 端被忽略，无害。

### 5.3 双端策略矩阵

| 需求 | H5 | 微信小程序 |
| --- | --- | --- |
| 下拉时不翻页 | uni 已 stopPropagation（14476）+ 仲裁层双保险 | 仲裁层 `stopPropagation`（唯一手段） |
| 横滑时不下拉 | 仲裁层短路 `refresher-enabled` | `refresher-max-angle` + 同一套短路 |
| 刷新驻留期锁翻页 | 可做（swiper `disable-touch`） | 无原生能力 |

**决策：刷新驻留期不锁横滑。** 理由：大厂 App 刷新中允许切频道；且小程序端无能力，锁了会变成 H5 独有行为，破坏双端一致性。

### 5.4 双端帧率策略

跟手旋转需要实时 `dy`，而 `refresherpulling` 在小程序端每帧更新响应式值会触发每帧 setData 掉帧。按平台分治（条件编译）：

- **H5**：`pullDy` 逐帧更新，pulling 态做 `rotate(progress × 90deg)` 跟手旋转
- **微信小程序**：`pullDy` 节流至 40ms 一次，且 pulling 态不跑逐帧旋转，只做离散状态动画（pulling 静态图标 → loosing 翻转一次 → refreshing 自转）

`progress` 作用域参数在两端都提供，节流不影响其最终值正确性。

### 5.5 已知风险

微信小程序端 `Event.stopPropagation()` 在 uni-app 编译产物中的可用性需实测。若不生效，fallback：小程序端仅依赖 `refresher-max-angle` + scroll-view 自身手势独占（下拉时 swiper 通常不被带动），H5 端保持完整仲裁能力。该 fallback 不改变 API 形态，仅减少小程序端一项保证。

## 6. 频道数据缓存与滚动位置恢复

数据实例从组件上提到页面，与挂载生命周期解耦：

- `tabs-linkage.vue`：`const feeds = new Map<string | number, UsePagedListReturn<Item>>()`，**以 `channel.id` 为 key**（不用数组下标，避免频道顺序变化时数据错位），`getFeed(channel)` 惰性创建 `usePagedList(createChannelFetcher(channel.id), { pageSize: 10 })`
- `channel-feed.vue`：改为无状态展示组件，通过 prop 接收 feed 实例（`list / loading / refreshing / finished / error / loadNext / reload`），不再自己 `usePagedList`
- 滚动位置：`sk-scroll-list` 新增 expose `getScrollTop(): number` 与 `setScrollTop(top: number, smooth?: boolean)`
  - `channel-feed` 在 `onBeforeUnmount` 把 `getScrollTop()` 写回 feed 实例的 `lastScrollTop`（页面层持有的普通对象字段）
  - 重建后 `onMounted` + `nextTick` 调 `setScrollTop(lastScrollTop)`

效果：LRU 淘汰后回滑，数据秒出（无 loading 闪烁）、滚动位置还原。

## 7. API 变更清单（sk-scroll-list）

### 新增 Props

| 属性名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| refresherThreshold | Number | 45 | 下拉触发阈值，同时传给原生 `refresher-threshold` 与内部 loosing 判定 |
| refresherMaxAngle | Number | 45 | 下拉手势最大角度阈值（小程序生效，H5 忽略） |
| pullingText | String | '下拉刷新' | pulling 态文案 |
| loosingText | String | '松开立即刷新' | loosing 态文案 |
| refreshingText | String | '正在刷新...' | refreshing 态文案 |
| successText | String | '更新成功' | success 态文案 |
| failedText | String | '刷新失败' | failed 态文案 |
| successDuration | Number | 600 | success/failed 态驻留时长（ms），0 关闭 |
| initialLoadingText | String | '' | 首屏 loading 文字，留空则只显示圆圈 |
| indicatorIcon | String | 组件内 66.png | 菱形指示器图标资源 |
| emptyText | String | '暂无数据' | 空态文案（原硬编码） |

### 变更 Props

- `empty`：语义收窄为「当前无内容」，调用方不再自行排除 loading。

### 新增 Methods（expose）

| 方法名 | 说明 |
| --- | --- |
| getScrollTop | 读取当前滚动位置（px） |
| setScrollTop | 设置滚动位置，`setScrollTop(top, smooth?)` |

### 新增作用域参数

- `#refresher` 作用域补 `progress`（0~1 归一化下拉进度），自定义动画无需自己除阈值
- `#refresher` 状态枚举扩展为 `idle / pulling / loosing / refreshing / success / failed`

### 新增 CSS 变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| --sk-indicator-color | #999 | 指示器文字色（refresher / footer 文案） |
| --sk-indicator-filter | none | 菱形 PNG 着色，深色容器设 `brightness(0) invert(1)` |
| --sk-loading-color | #111 | 首屏圆圈 loading 主色 |
| --sk-loading-track-color | rgba(17,17,17,0.15) | 首屏圆圈 loading 轨道色 |

### 内部实现要点

- 删除恒真条件 `pullState.value !== 'refreshing'`（sk-scroll-list.vue:242）
- `REFRESH_LOOSING_THRESHOLD` 常量删除，统一走 `refresherThreshold`
- H5 `animateTop` 补用户手势取消：`touchstart` / `wheel` 时 `animSeq++` 使在途回顶动画失效（修 §8-3）

## 8. 顺带修复的 bug

| # | 问题 | 位置 | 处理 |
| --- | --- | --- | --- |
| 1 | 两套下拉阈值不一致 | sk-scroll-list.vue:232 | §7 `refresherThreshold` 统一 |
| 2 | 空态在首屏加载中误显示 | sk-scroll-list.vue:49 | §3.2 `empty` 语义重构 |
| 3 | H5 回顶动画与用户手势打架 | sk-scroll-list.vue:274-295 | touchstart/wheel 取消在途 rAF |
| 4 | sk-swipe-page 注释承诺 resize 重测但不存在 | sk-swipe-page.vue:163-171 | 补 `uni.onWindowResize` 重测容器宽度 + 首帧宽度为 0 时在 transition 首次回调懒测 |
| 5 | count 变小不夹取 `state.current` | sk-swipe-page.vue:210 | 越界时夹取到 `count - 1` |

死代码清理（限本次触及文件）：sk-swipe-page.vue:34 未使用的 `PropType` 导入。

## 9. 文档与演示同步

- `sk-scroll-list/readme.md`：补全 Props 表（现有缺失 `refresherEnabled`、`customStyle` 及 §7 全部新增项）、Slots 表（缺失 `#refresher`、`#error`，`#footer` 作用域参数标注错误）、新增「状态分区」一节说明三种 loading 的触发源差异
- `sk-scroll-list/changelog.md`：记录 `empty` 语义变更与新增 props
- `skSwipePageDemo/scroll-list.vue`：三处 `:empty` 简化；修正注释「18 条 / 每页 6 条」与实际 `pageSize: 12` 不符；深色卡片演示 `--sk-indicator-filter` 反白与 `--sk-loading-color` / `--sk-loading-track-color` 覆盖两组变量的用法
- `skSwipePageDemo/components/channel-feed.vue`：删除手写的 `↓ / ↑ / ◌` 文字图标，改用组件内置四态指示器，验证内置默认即好看；改为无状态展示组件（§6）
- `skSwipePageDemo/tabs-linkage.vue`：持有 feed 实例 Map 与滚动位置记录

## 10. 验收

项目无测试框架（package.json 仅 uni 的 dev/build 脚本），验收方式为构建 + 双端实操。

**我能在此环境验证（H5）**

1. `pnpm build:h5` 与 `pnpm build:mp-weixin` 构建通过
2. `pnpm dev:h5` + 浏览器设备模拟（DevTools device toolbar 派发 touch 事件）逐项检查：
   - 切页签 → 居中黑色圆圈，无顶部「加载中...」灰字
   - 下拉 45px 内 → 文案与原生触发口径一致；过阈值 → 「松开立即刷新」；松手 → 自转；结束 → 「更新成功」驻留 600ms 后回弹
   - 横滑翻页全程下拉头不撑开、不误触发刷新
   - 下拉过程中横滑不被带动
   - 触底 → footer 竖排指示器；到底 → 「没有更多了」
   - 深色卡片：圆圈与菱形均可见（CSS 变量生效）
   - 频道回滑：无 loading 闪烁、滚动位置还原
   - `66.png` 经打包路径正常显示

**我无法在此环境验证（需你在微信开发者工具过）**

- 小程序端 `Event.stopPropagation()` 是否生效（§5.4 fallback 判定）
- 小程序端 `refresher-max-angle` 与自定义 refresher 插槽的实际表现
- 小程序端 `./66.png` 相对路径在编译产物中的解析
- 小程序端每帧 setData 掉帧情况（dy 更新已按设计节流 40ms，需实测确认）

## 11. 实施依赖顺序

1. `66.png` 拷入组件目录并验证双端路径（后续都依赖它）
2. sk-scroll-list 状态机重构（§3.2 `empty` 语义 + §3.3 四态）+ 状态区样式统一（§4.3）
3. 圆圈 loading 与菱形指示器实现（§4.1/4.2）
4. 手势仲裁层（§5.2）
5. sk-swipe-page 修复（§8-4、§8-5）
6. 页面层数据缓存与滚动恢复（§6）
7. 文档与 demo 同步（§9）
8. H5 验收（§10）

步骤 2 与 3 强耦合（同一模板与样式文件），4 依赖 2 的状态字段，6 依赖 2 的新 expose。
