# sk-tab-bar / sk-linkage-menu 组件 Bug 分析报告

> 分析对象：
> - `src/uni_modules/sk-tab-bar/components/sk-tab-bar/`
> - `src/uni_modules/sk-linkage-menu/components/sk-linkage-menu/`
>
> 分析日期：2026-07-28
> 分析方式：静态代码走查（组件源码 + 类型定义 + 样式 + readme 契约比对）

---

## 结论速览

| 组件 | 严重（🔴） | 中等（🟡） | 轻微/风险（🟢） |
| --- | --- | --- | --- |
| sk-tab-bar | 异步数据初始 `current` 丢失 | `beforeChange` 异步竞态 | v-for key 冲突、重复点击拦截取舍 |
| sk-linkage-menu | list 清空脏状态 + 非法下标 emit | 左侧 scroll-top 同值失效、refresh 测量竞态、测量前设置 current 丢失 | H5 类名测量污染、readme 示例 id 重复、deep watch 性能 |

---

## 一、sk-tab-bar

### 🔴 Bug 1：异步数据 + 初始 `current > 0` 时选中态丢失

**位置**：`sk-tab-bar.vue` L180-L194（两个 watch）

**成因**：

```ts
// 受控同步：仅依赖 current
watch(() => props.current, (current) => {
    activeIndex.value = clampIndex(current)
}, { immediate: true })

// 数据长度变化时仅 clamp 当前值
watch(() => list.value.length, () => {
    activeIndex.value = clampIndex(activeIndex.value)
})
```

**复现路径**：

1. 父组件 `current = 2`，`data` 通过接口异步加载（初始为 `[]`）；
2. 挂载时 `immediate` watch 执行，`clampIndex(2)` 在空列表下返回 0，`activeIndex = 0`；
3. 数据到达后，`length` watch 只执行 `clampIndex(activeIndex.value)`（即 `clampIndex(0) = 0`）；
4. 而 `props.current` 一直是 2 未变化，其 watch 不会再次触发。

**结果**：`activeIndex` 永远停在 0，与父组件 `current = 2` 永久失去同步。

**修复建议**：在列表**从空变为非空**时，从 `props.current` 重新同步一次；其余长度变化仍只做 clamp，以保留"不覆盖用户已选项"的语义：

```ts
watch(() => list.value.length, (len, oldLen) => {
    activeIndex.value = oldLen === 0 && len > 0
        ? clampIndex(props.current)
        : clampIndex(activeIndex.value)
})
```

---

### 🟡 Bug 2：`beforeChange` 异步守卫存在并发竞态

**位置**：`sk-tab-bar.vue` L243-L259（`onItemClick`）

**成因**：`await props.beforeChange(...)` 期间没有任何互斥/序号控制：

- 用户快速点 tab A 再点 tab B，若 A 的守卫（如网络请求）后返回，会**反过来覆盖** B 的选中态，并触发两次 `change` / 两次路由跳转；
- `index === activeIndex.value`、`item.disabled` 的校验都在 `await` **之前**完成，await 结束后这些状态可能已过期。

**修复建议**：引入自增 token，守卫 resolve 后校验 token 是否仍属于最新一次点击，过期则丢弃：

```ts
let clickSeq = 0
async function onItemClick(item: SkTabBarItem, index: number) {
    if (item.disabled || index === activeIndex.value) return
    const seq = ++clickSeq
    if (props.beforeChange) {
        let allowed: boolean | void
        try { allowed = await props.beforeChange(index, item) } catch { allowed = false }
        if (allowed === false || seq !== clickSeq) return // 过期点击丢弃
    }
    // ...后续切换逻辑
}
```

---

### 🟢 Bug 3：`:key="item.text || index"` 可能产生重复 key

**位置**：`sk-tab-bar.vue` L7

**问题**：

- 两个 tab 文案相同时（自定义插槽只用图标、text 留空等场景并不罕见）key 冲突；
- `text` 为空串时回退到 index，同一列表内字符串 key 与数字 key 混用。

**修复建议**：`SkTabBarItem` 增加可选 `id` 字段，key 取 `item.id ?? index`。

---

### 🟢 设计取舍提醒：点击当前项被静默拦截

**位置**：`sk-tab-bar.vue` L244（`index === activeIndex.value` 直接 return）

在 `autoRoute` + `useTabBar` 多页面共享选中态的场景下：若用户当前停留在**非 tab 页**，但共享的 `current` 恰好等于某项，点击该项将无法跳回对应页面；`switchTo()` 走同一入口，同样被拦截。

**建议**：对 autoRoute 场景放行"重复点击仅执行导航、不重复发事件"。

---

## 二、sk-linkage-menu

### 🔴 Bug 1：list 清空后残留脏状态，且可能对外 emit 非法下标

**位置**：`sk-linkage-menu.vue` L409-L434（`refresh`）、L67（`.fill-last`）、L280-L291（`setCurrent`）

**成因**：`refresh()` 内 `if (!props.list.length) return` 直接早退，list 被清空（如切换筛选条件重新加载）时：

1. `state.fillHeight` 保留旧值，而 `.fill-last` 始终渲染 → 右侧出现 empty 插槽 + 一段**可滚动的空白填充区**；
2. `topArrList` / `groupHeights` / `currentIndex` 均为脏数据；
3. 用户在空白区滚动时，`onRightScroll` 用旧 `topArrList` 反查下标，而 `setCurrent` 会**先 emit `update:current`（可能为非法下标）再判断 item 是否存在**，v-model 绑定方会收到越界值。

**修复建议**：list 为空时重置状态后再 return：

```ts
if (!props.list.length) {
    state.fillHeight = 0
    rightState.topArrList = []
    virtualState.groupHeights = []
    virtualState.ready = false
    leftState.currentIndex = 0
    return
}
```

---

### 🟡 Bug 2：左侧 scroll-view 受控 `scroll-top` 同值不生效

**位置**：`sk-linkage-menu.vue` L19-L20（左侧 scroll-view）、L227-L232（`leftScrollTop` computed）

**成因**：右侧滚动专门做了"先赋当前实际位置再赋目标值"的 reset 技巧（L319-L322），但左侧的 `leftScrollTop` 是纯 computed。用户**手动滑动左侧菜单**后，若选中项对应的计算值与上一次相同（典型如选中项一直是第 0 项，computed 恒为 0），prop 不变化，scroll-view 不会滚回，"选中项自动居中"失效。

**修复建议**：左侧改为与右侧一致的受控 state + reset 技巧，或监听左侧 scroll 事件记录 realScrollTop 后按需重置。

---

### 🟡 Bug 3：`refresh` 防抖未覆盖已启动的异步测量，存在交错写入

**位置**：`sk-linkage-menu.vue` L409-L434

**成因**：`clearTimeout` 只能取消**尚未触发**的定时器。若上一轮 timeout 已触发、正处于 `await measureLayout()` 途中，list 再次变化触发新一轮 refresh，两个异步体会交错执行：

- 旧测量结果可能在新数据渲染后回写 `topArrList` / `groupHeights`；
- 中途 `virtualState.ready` 被旧流程置 true，出现短暂的定位错乱 / 占位符高度错误。

**修复建议**：引入自增序号 token，`measureLayout` 的 `exec` 回调中丢弃过期结果：

```ts
let measureSeq = 0
const refresh = () => {
    // ...
    refreshTimer = setTimeout(async () => {
        const seq = ++measureSeq
        // ...
        await measureLayout(seq) // 内部 exec 回调判断 seq !== measureSeq 时直接 resolve 不写状态
        if (seq !== measureSeq) return
        // ...
    }, REFRESH_DEBOUNCE)
}
```

---

### 🟡 Bug 4：测量完成前外部改 `current` / 调 `scrollToIndex` 会静默丢失滚动

**位置**：`sk-linkage-menu.vue` L304-L307（`scrollRightTo` 早退）、L429-L432（`firstMeasured`）

**成因**：`scrollRightTo` 在 `topArrList[index] === undefined` 时直接 return。`firstMeasured` 只兜底了**挂载时**的初始 `current`；若数据已渲染但测量尚未完成（50ms 防抖 + 测量耗时窗口内）外部设置了 `current`，左侧高亮会变，但右侧**不滚动且事后不补偿**。

**修复建议**：记录 `pendingScrollIndex`，测量完成后补一次 `scrollRightTo(pendingScrollIndex)`。

---

### 🟢 风险 5：H5 端类名测量可能被插槽内容污染

**位置**：`sk-linkage-menu.vue` L376-L402（`measureLayout`）

**成因**：`selectAll('.item')` / `selectAll('.item-parent')` 使用了非常通用的类名。小程序端插槽内容归属页面作用域，不会被 `query.in(proxy)` 匹配；但 **H5 端会匹配到用户插槽里的同名 class**（`.item` 尤其常见），导致左侧菜单高度 / 滑块位置计算错乱，且表现为跨端不一致。

**修复建议**：改用带前缀的专属类名（如 `.sk-lm__menu-item`、`.sk-lm__group`）。

---

### 🟢 文档 Bug 6：readme 示例数据同一分组内 id 重复

**位置**：`readme.md` L49-L67

示例中每个分组的两条数据都是 `id: index`（同值），而组件用 `item1.id` 作为 v-for key（组件 L58-L59）。照抄示例会触发重复 key 警告 / 渲染复用异常。

**修复建议**：readme 示例中给组内每条数据分配唯一 id。

---

### 🟢 性能提醒：deep watch 大数据量开销

**位置**：`sk-linkage-menu.vue` L450

`watch(() => props.list, refresh, { deep: true })` 对大数据量（虚拟渲染的目标场景恰恰是大数据）做深度监听开销较大。可考虑改为浅监听 + 由使用方在数据变更后调用已 expose 的 `refresh()`，或至少在文档中说明。

---

## 三、修复优先级建议

1. **P0**（影响功能正确性，建议立即修复）
   - sk-tab-bar：异步数据初始 `current` 丢失
   - sk-linkage-menu：list 清空脏状态 + 非法下标 emit
2. **P1**（特定交互路径下必现，建议下个版本修复）
   - sk-tab-bar：`beforeChange` 竞态
   - sk-linkage-menu：左侧 scroll-top 同值失效、refresh 测量竞态、测量前设置 current 丢失
3. **P2**（边界场景 / 工程规范）
   - sk-tab-bar：key 冲突、重复点击拦截取舍
   - sk-linkage-menu：H5 类名污染、readme 示例、deep watch 性能
