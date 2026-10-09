# sk-linkage-menu 修复与优化清单

> 分析对象：`src/uni_modules/sk-linkage-menu/components/sk-linkage-menu/`（v1.0.6）
> 分析日期：2026-10-09
> 分析方式：静态代码走查（源码 + 样式 + 类型 + readme 契约比对）
> 关联文档：`docs/组件Bug分析报告.md`（2026-07-28，其中 7 项问题经复核**当前版本仍存在**，本清单标记为【遗留】）
> 修复进度：第一批 P0（B1 / B2 / B3）+ B14（滑块拦截点击）+ P5（滚动锚定补偿，分页场景升级为正确性问题）✅ 已于 1.0.7 修复（2026-10-09），详见 `changelog.md`；均经 H5 自动化验证（A 方案 10/10 + 全量回归 22/22，验证页 `src/pages/virtualMenuGanged/batch1-verify`）
> 备注：`loadmore`（异步与分页加载）演示页已于 2026-10-09 删除——其"空分组 + 分页 + 点击自动补载重定位"场景对锚定精度要求最高，MP 端未经充分验证；组件 `scrolltolower` API 保留（仅为事件透传，无已知缺陷），分页接入建议见 readme

---

## 一、Bug 修复清单

### P0 —— 影响功能正确性，建议立即修复

#### B1【遗留】list 清空后残留脏状态，并可能对外 emit 非法下标 ✅ 1.0.7 已修复

- 位置：`sk-linkage-menu.vue` L481（`refresh` 早退）、L338-L349（`setCurrent`）
- 现状：`refresh()` 中 `if (!props.list.length) return` 直接返回，`fillHeight` / `topArrList` / `groupHeights` / `currentIndex` 全部残留旧值；`.fill-last` 始终渲染，空数据时出现一段可滚动空白。且 `setCurrent` 先赋值并 emit `update:current`，后判断 `item` 是否存在，越界下标会先发给 v-model 绑定方。
- 同类变体：list **变短**的防抖窗口（50ms）内 `groupHeights` 尚未截断，滚动反查可得到 `>= list.length` 的下标，同样触发非法 emit。
- 修复方案：list 为空时重置全部派生状态（`fillHeight=0`、`topArrList=[]`、`groupHeights=[]`、`ready=false`、`currentIndex=0`）后再 return；`setCurrent` 入口增加 `index` 越界守卫，非法值直接丢弃。
- 修复状态：✅ 1.0.7 已按上述方案修复。

#### B2 高度表按下标存储，分组动态插入 / 删除 / 排序后锚点全面失准 ✅ 1.0.7 已修复

- 位置：`sk-linkage-menu.vue` L294-L301（`syncGroupHeights`）、L459-L463（高度回填）
- 现状：`groupHeights[index]` 以**数组下标**为键缓存实测高度。使用方在中间插入分组、删除分组或对 list 排序后，旧高度会错配到新分组上，`recomputeTops` 前缀和全错，点击菜单跳到错误位置；且错误高度会一直保留（`syncGroupHeights` 只对齐长度、不修正顺序）。
- 修复方案：高度缓存改为以 `item.id` 为键的 `Map`（无 id 时退化按下标，并在文档声明动态增删必须传 id）；list 引用变化时按新顺序重建映射。
- 修复状态：✅ 1.0.7 已按上述方案修复（`groupHeightCache` 以 `id:` / `idx:` 双命名空间为键，`syncGroupHeights` 按当前顺序重建并淘汰失效缓存）。

#### B3 长距离跳转依赖估算高度，落点偏移后高亮与内容长期不一致 ✅ 1.0.7 已修复

- 位置：`sk-linkage-menu.vue` L362-L393（`scrollRightTo`）、L282-L291（`recomputeTops`）、L388-L392（兜底解锁）
- 现状：虚拟渲染下，目标分组与当前视口之间未渲染的分组一律按 `estimatedGroupHeight` 计入前缀和。估算与真实值偏差累积后，`scrollTop` 落在错误偏移处：
  1. 若落点恰好等于（错误的）target 值，锁正常解除，但内容区展示的是其他分组，且此后再无 scroll 事件，左侧高亮与右侧内容**永久错位**，直到用户手动滚动；
  2. 若落点不在容差内，600ms 兜底解锁只调用 `updateRenderRange`，**不校正高亮**，错位同样持续到用户滚动。
- 修复方案：兜底解锁（及正常解锁）后执行一次"静默校正"——重测已渲染分组、重算 tops，若当前 scrollTop 与目标下标的新 top 偏差超过容差，则以无动画方式补滚一次；或在校正完成前保持锁定。
- 修复状态：✅ 1.0.7 已修复，最终实现优于原方案——单次校正以估算 tops 为基准在数学上无法收敛（目标上方未渲染分组永远是估算值），改为：跳转前将当前位置到目标之间的分组整段渲染测量，`computeExactGroupTop` 以实测锚点 rect 换算目标绝对位置（与估算高度无关，单次即精确落点）；`finalizeLanding` 着陆收尾作为兜底，同样以实测基准校验，偏差超容差才无动画补滚，校正期间用户手动滚动则放弃。已经 H5 自动化验证（20/20 断言通过）。

### P1 —— 特定交互路径必现，建议下个版本修复

#### B4【遗留】左侧 scroll-view 受控 `scroll-top` 双向失效

- 位置：`sk-linkage-menu.vue` L19-L26、L266-L271（`leftScrollTop` computed）
- 现状：右侧做了"先赋实际位置再赋目标值"的 reset 技巧，左侧是纯 computed：
  1. 同值不生效——用户手动滑动左侧菜单后，若 computed 值不变（如选中项恒为第 0 项时恒为 0），scroll-view 不会滚回，"选中项自动居中"失效；
  2. 反向打断——用户正在手动浏览左侧菜单时，右侧滚动触发 `setCurrent`，computed 重新求值会把左侧滚回选中项，打断浏览。
- 修复方案：左侧改为与右侧一致的受控 state + reset 技巧；记录用户手动滚动的 realScrollTop，仅在选中项**超出可视区**时才自动滚动纠偏。

#### B5【遗留】`refresh` 防抖无法取消已启动的异步测量，存在交错写入

- 位置：`sk-linkage-menu.vue` L478-L504
- 现状：`clearTimeout` 只能取消未触发的定时器。上一轮 `await measureLayout()` 在途时新一轮 refresh 启动，两个异步体交错执行，旧测量结果可能回写到新数据渲染后的状态，出现定位错乱 / 占位高度错误。
- 修复方案：引入自增序号 token，`exec` 回调及后续写状态前校验序号，过期结果直接丢弃。

#### B6【遗留】测量完成前外部改 `current` / 调 `scrollToIndex`，滚动静默丢失

- 位置：`sk-linkage-menu.vue` L370-L374（`scrollRightTo` 早退）、L499-L502（`firstMeasured`）
- 现状：`firstMeasured` 只兜底挂载时的初始 `current`；数据已渲染但测量未完成（防抖 + 测量耗时窗口）期间外部设置 `current`，左侧高亮变化但右侧不滚动且事后无补偿。
- 修复方案：记录 `pendingScrollIndex`，首次测量完成后补一次 `scrollRightTo`。

#### B7【遗留】H5 端类名测量被插槽内容污染

- 位置：`sk-linkage-menu.vue` L442-L443（`selectAll('.item')` / `selectAll('.item-parent')`）
- 现状：`selectorQuery` 不受 scoped CSS 隔离，H5 端会匹配到使用方插槽里的同名 class（`.item` 极常见），导致菜单项高度 / 滑块位置计算错乱，且跨端表现不一致。
- 修复方案：测量用类名加专属前缀（如 `.sk-lm__menu-item`、`.sk-lm__group`），与展示类名分离。

#### B8 快速连续点击不同菜单项的滚动竞态

- 位置：`sk-linkage-menu.vue` L362-L393、L402-L414
- 现状：第一次动画滚动在途时第二次点击重设 target，旧动画路径上的 scroll 事件若恰好落入新 target 容差内会提前解锁，随后高亮被滚动反查改写，出现滑块抖动 / 停在中途分组。
- 修复方案：`scrollRightTo` 引入自增序号，scroll 事件的解锁判断同时校验序号与 target；或直接中断旧动画（先无动画归位再启动新动画）。

### P2 —— 边界场景 / 工程规范

#### B9【遗留】readme 示例数据组内 id 重复

- 位置：`readme.md` L49-L67（同一分组两条数据均为 `id: index`）
- 修复方案：示例改为组内唯一 id（如 `` `${index}-${sub}` ``），避免照抄触发重复 key。

#### B10 `.item-active` 绝对定位未显式声明 `top/left`

- 位置：`sk-linkage-menu.css` L37-L49
- 现状：依赖"静态位置"充当定位起点，在 `.info` 结构变化（如后续加 header 插槽）或个别端布局差异下可能偏移。
- 修复方案：显式 `top: 0; left: 0;`（`.info` 加 `position: relative`）。

#### B11 选中滑块 `transition: all 0.5s` 范围过大且与滚动动画时长不匹配

- 位置：`sk-linkage-menu.css` L48
- 现状：用户通过 `leftBarStyle` 传入的任意属性（背景、圆角等）都会被过渡；scroll-view 动画约 300ms，滑块过渡 500ms，视觉上滑块总是"晚到"。
- 修复方案：改为 `transition: transform 0.3s, height 0.3s;`。

#### B12 重复点击同一菜单会重复派发 `change`

- 位置：`sk-linkage-menu.vue` L396-L399（`forceEmit=true`）
- 现状：为支持"重复点击回位"而强制派发，使用方若用 `change` 做埋点会重复计数。
- 修复方案：保留行为，payload 增加 `repeat: boolean` 字段或在 readme 明确说明该语义。

#### B14 选中滑块拦截点击事件，"重复点击回位"实际未生效 ✅ 1.0.7 已修复

- 位置：`sk-linkage-menu.css` `.item-active`
- 现状：滑块绝对定位且无 `pointer-events: none`，覆盖在当前选中项上方拦截点击——1.0.6 修复的"重复点击同一菜单回位"因点击根本到不了菜单项而从未生效（H5 自动化实测点击被 intercepted）。
- 修复状态：✅ 1.0.7 已修复（`.item-active` 增加 `pointer-events: none`）。

#### B13 测量回读依赖 `boundingClientRect` 返回 `id` 字段

- 位置：`sk-linkage-menu.vue` L455-L458
- 现状：主流端（微信 / H5 / App）均返回 `id`，但部分小众小程序端未必带该字段，届时高度回填静默失败。
- 修复方案：优先读 `dataset.index`，或按 `selectAll` 文档顺序与渲染窗口顺序做下标映射，去除对 `id` 的依赖。

---

## 二、功能优化清单

| # | 优先级 | 项 | 说明 | 涉及位置 |
| --- | --- | --- | --- | --- |
| F1 | 高 | 左侧选中项对齐方式 | 新增 `menuAlign: 'center' \| 'top' \| 'none'`，`none` 时不自动滚动左侧，解决 B4 类打断浏览的诉求 | L266-L271 |
| F2 | 高 | 透传右侧 `scroll` 事件 | 目前仅透传 `scrolltolower`，使用方无法做 shadow / 进度条等联动 | L57 |
| F3 | 高 | 默认文案可配置 | `加载中...` 硬编码，新增 `loadingText` prop，便于 i18n | L65 |
| F4 | 中 | 滑块内容插槽 | `item-active` 内只渲染 `activeName`，自定义 menu 插槽（图标+文字）时滑块样式不匹配；新增 `active` 插槽 | L29-L31 |
| F5 | 中 | `menuWidth` 支持 Number | 目前仅 String，支持数字（按 rpx 处理）更符合 uni 生态习惯 | L158-L161 |
| F6 | 中 | 左侧滚动动画开关 | 左侧 `scroll-with-animation` 写死，与右侧 `scrollWithAnimation` 对齐为可配置 | L24 |
| F7 | 中 | `change` payload 增加 `prevIndex` | 便于使用方做来源去向分析 | L347 |
| F8 | 中 | 支持按 id 定位 | 新增 `currentId` / `scrollToId(id)`，动态增删场景比下标更稳（配合 B2 改造） | types.ts |
| F9 | 中 | 图片撑高自动重测 | 插槽内图片懒加载导致分组高度变化是高频场景，可内置 `image @load` 委托监听 + 防抖 `refresh`，新增 `autoRefresh` 开关 | measureLayout |
| F10 | 低 | 左/右两侧 header、footer 插槽 | 便于放置搜索框、分类广告位、到底提示 | 模板 |
| F11 | 低 | 主题 CSS 变量化 | `#000` / `#fff` / `#e3e4e6` 等硬编码改为 `var(--sk-lm-*)`，支持深色模式 | css |
| F12 | 低 | 全局组件类型声明 | 提供 `components.d.ts` 片段 / Volar 支持说明，改善 TS 体验 | readme |
| F13 | 低 | 无障碍语义 | 左侧菜单 `role="tab"` / `aria-selected`，右侧分组 `role="tabpanel"` | 模板 |
| F14 | 低 | nvue / uvue 支持评估 | package.json 目前标记 `u`，明确不支持原因或排期 | package.json |

---

## 三、性能优化清单

| # | 优先级 | 项 | 现状与收益 | 涉及位置 |
| --- | --- | --- | --- | --- |
| P1 | 高 | 【遗留】deep watch 改造 | `watch(list, refresh, { deep: true })` 对大数据量（恰是虚拟渲染的目标场景）开销大，且购物车点单场景中数量等高频字段变更也会触发全量重测。改为浅监听（引用 + length），字段级变更引导使用方调已暴露的 `refresh()`，或新增 `deepWatch` 开关默认关闭 | L520-L524 |
| P2 | 高 | 滚动事件处理节流 | `onRightScroll` 每次事件同步执行 `updateRenderRange` + 反查 + `setCurrent`，小程序端 scroll 事件频率高。用 rAF / 16ms 节流，渲染窗口更新与高亮反查分帧处理 | L402-L425 |
| P3 | 中 | `updateRenderRange` 线性扫描改二分 | tops 单调递增，两次 O(n) 循环（每次 scroll 都跑）可降为 O(log n)；分组数百上千时收益明显 | L313-L324 |
| P4 | 中 | 左侧菜单项免重复测量 | `measureLayout` 每次都 `selectAll` 全部左侧菜单项，但菜单项高度仅在 list 结构 / menuWidth 变化时才可能变。拆分测量：菜单项低频测、分组按需测，减少 query 规模 | L442-L443 |
| P5 | 中 | 占位符回填真实高度时的滚动锚定补偿 ✅ 1.0.7 已修复 | 估算值与真实值差异大时，可视区**上方**分组高度突变会导致内容跳动（虚拟滚动经典问题；分页空分组场景下升级为肉眼可见的正确性问题）。修复：高度回填时对 scrollTop 上方分组按差值无动画补偿 + 滚动期间节流回填（此前普通滚动不触发测量，tops 会持续失准） | L459-L464 |
| P6 | 中 | 快速惯性滚动期间延迟窗口重算 | 惯性滚动中占位符/真实节点频繁互换触发大量重排。scroll 速度高于阈值时跳过 `updateRenderRange`，速度回落后一次性校正 | L411 |
| P7 | 低 | `change` payload 瘦身 | `{ ...item }` 会带上整个 `data` 数组引用；改为显式字段（`id` / `name` / `index` / `source`），大列表下减少序列化压力（小程序跨线程通信按值传递） | L347 |
| P8 | 低 | 模板内联对象 / 数组缓存 | `:style="[{ width: menuWidth }, leftBarUnStyle \|\| {}]"` 每行每次渲染新建数组与对象，改为 computed 缓存一份 | L37 |
| P9 | 低 | 左侧菜单超大分组数虚拟化 | 分组数 500+ 时左侧同样全量渲染；按可视窗口渲染菜单项（低优先，业务上极少见） | L32-L44 |
| P10 | 低 | 滑块过渡属性收敛 | 同 B11，`transition: all` → 仅 `transform, height`，避免无关属性触发布局过渡 | css L48 |

---

## 四、修复顺序建议

1. **第一批（P0，正确性）**：B1、B2、B3 —— 均会导致用户可感知的"点错位置 / 状态错乱"。✅ 已于 1.0.7 修复（2026-10-09）。
2. **第二批（P1，交互健壮性）**：B4、B5、B6、B7、B8 + 性能 P1、P2 —— 顺手把滚动链路（锁、序号、节流）一起重构，避免反复触碰同一段代码。
3. **第三批（体验与工程化）**：B9-B13、F1-F9、P3-P6，随下一个 minor 版本发布。
4. **第四批（生态）**：F10-F14、P7-P10，按社区反馈排期。

> 发布注意：B12、P7 涉及事件 payload 语义变化，F1 等新增 prop 需同步更新 readme 的 API 表与 changelog；`currenIndex` 兼容字段继续保留。
