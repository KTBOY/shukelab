/**
 * sk-tab-bar canvas 形态：绘制"栏色融合轮廓"（底栏矩形 + 圆钮凸包 + 两侧相切内凹 fillet）。
 * 轮廓之外保持真实透明，故可叠在任意页面背景（渐变/图片/深色）上。
 * 本模块只做纯计算与绘制，不做节点查询（查询留在 .vue，便于跨端条件编译）。
 * 约定：所有绘制坐标一律 CSS 像素；物理像素换算由调用方的 dpr transform 负责。
 */

/** canvas 形态的几何常量（rpx，调用方用 uni.upx2px 换算） */
export const CANVAS_CONST = {
	/** 凹唇内凹 fillet 半径。仅用于软化凹口两翼与栏顶相交的直角：
	 *  取值过大会让唇弧在两翼愈合白栏、吃掉圆钮与凹口间的均匀缝隙（缝隙只剩底部可见），
	 *  8rpx 实测两翼缝隙仍齐全且直角明显变柔和；0 = 纯半圆直角 */
	filletRpx: 28,
	/** 底栏顶部圆角，还原 CSS 的 10rpx */
	cornerRpx: 10,
	/** DPR 上限，tabBar 面积小，2 倍足够锐利 */
	maxDpr: 2,
} as const

/** 凹口轮廓几何（CSS px） */
export interface SilhouetteGeometry {
	/** canvas 宽 */
	width: number
	/** canvas 高 */
	height: number
	/** 栏顶边在 canvas 坐标系的 y */
	barTop: number
	/** 凹口/圆钮圆心 y（实测深色圆钮得来） */
	knobCy: number
	/** 凹口半径（贴住圆钮元素边缘，内收 0.5px 防发丝线；与圆钮可视边缘之间即 10rpx 透明缝） */
	knobR: number
	/** 凹唇内凹 fillet 半径 */
	filletR: number
	/** 底栏顶部圆角半径 */
	cornerR: number
}

/** 第 index 个 tab 对应的凸包圆心 x（CSS px） */
export function knobCxFor(index: number, count: number, width: number): number {
	if (count <= 0) return width / 2
	return (width * (index + 0.5)) / count
}

/**
 * 补间轨迹（下标空间）。canvas 凸包与 view 层圆钮（CSS transition）共用这一条时间线，
 * 两层才不会在连续切换时中途错位；下标空间还让栏宽变化（resize / 折叠屏）自动等比适配。
 */
export interface KnobTrack {
	/** 起点下标（可为小数，即被打断时的位置） */
	from: number
	/** 终点下标 */
	to: number
	/** 起始时间戳（ms） */
	t0: number
	/** 本次时长（ms） */
	dur: number
}

/** 打断后时长按剩余距离等比取时，下限为 duration 的该比例 */
export const MIN_DURATION_RATIO = 0.35

/**
 * 本次切换应用的时长：走满一个位距仍是完整 duration（观感不变），
 * 打断时按剩余距离缩短。若每次都重跑整条 duration 的 ease，
 * 起步段几乎不动，连点会让圆钮在两 tab 间来回折返、迟迟落不到目标。
 */
export function trackDuration(dist: number, duration: number): number {
	const base = Math.max(duration, 1)
	return Math.max(base * MIN_DURATION_RATIO, Math.min(base, dist * base))
}

/** 轨迹在 now 时刻的下标（ease 取 CSS 默认 ease 的贝塞尔，与 view 层 transition 同拍） */
export function trackPos(track: KnobTrack, ease: (x: number) => number, now: number): number {
	const p = Math.min(Math.max((now - track.t0) / track.dur, 0), 1)
	return p >= 1 ? track.to : track.from + (track.to - track.from) * ease(p)
}

/* ---------- 开发者工具自绘 tab 项 ----------
   模拟器里 canvas 非同层、恒盖在 view 之上，DOM 圆钮/图标/文字会被栏体遮没，
   故由画布按 DOM 实测几何再画一份。几何取自 boundingClientRect，避免与 CSS 两处对齐。 */

/** 单个 tab 项的绘制参数（CSS px，画布坐标系） */
export interface ItemPaint {
	/** 对应下标（算激活度用） */
	index: number
	/** 图标与文字中心 x */
	cx: number
	/** 图标中心 y：未选中 / 选中（选中时上浮进圆钮） */
	iconIdleY: number
	iconActiveY: number
	/** 图标绘制尺寸 */
	iconW: number
	iconH: number
	/** 文字中心 y：未选中 / 选中 */
	textIdleY: number
	textActiveY: number
	/** 文字内容、字号与两态颜色 */
	text: string
	fontSize: number
	textColor: string
	activeTextColor: string
	/** 两态图标源（active 缺省时同 icon） */
	idleSrc: string
	activeSrc: string
	/** 当前是否为选中项（决定取哪一态图，与 view 层三元表达式同语义） */
	active: boolean
	/** 禁用项整体半透明 */
	alpha: number
}

/** 深色圆钮绘制参数 */
export interface KnobPaint {
	/** 圆心 y */
	cy: number
	/** 元素外半径（含描边环） */
	r: number
	/** 描边环宽 */
	ring: number
	/** 钮心色（--bg）与环色（--color） */
	fill: string
	ringColor: string
}

/** 画深色圆钮：先铺环再铺心，等价于 view 的 border + background */
export function drawKnob(ctx: any, k: KnobPaint, cx: number): void {
	ctx.fillStyle = k.ringColor
	ctx.beginPath()
	ctx.arc(cx, k.cy, k.r, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = k.fill
	ctx.beginPath()
	ctx.arc(cx, k.cy, Math.max(k.r - k.ring, 0), 0, Math.PI * 2)
	ctx.fill()
}

/**
 * 画一组 tab 项的图标与文字。
 * pos 为补间中的浮点下标，激活度取 1 - |pos - i|，与 view 层 CSS transition 同步落位
 */
export function drawTabItems(
	ctx: any,
	items: ItemPaint[],
	pos: number,
	getImage: (src: string) => any
): void {
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	items.forEach((it) => {
		const k = Math.max(0, Math.min(1, 1 - Math.abs(pos - it.index)))
		ctx.globalAlpha = it.alpha
		const img = getImage(it.active ? it.activeSrc : it.idleSrc)
		if (img) {
			const cy = it.iconIdleY + (it.iconActiveY - it.iconIdleY) * k
			ctx.drawImage(img, it.cx - it.iconW / 2, cy - it.iconH / 2, it.iconW, it.iconH)
		}
		if (k > 0.01 && it.text) {
			ctx.globalAlpha = it.alpha * k
			ctx.fillStyle = it.active ? it.activeTextColor : it.textColor
			ctx.font = `bold ${it.fontSize}px sans-serif`
			ctx.fillText(it.text, it.cx, it.textIdleY + (it.textActiveY - it.textIdleY) * k)
		}
		ctx.globalAlpha = 1
	})
}

/**
 * 绘制单条闭合并填充：模仿 concave 的"栏顶凹口"观感，但轮廓外为真实透明。
 * 白色栏顶在圆钮处向下凹出一个半圆口（filletR > 0 时带相切圆唇，默认 0 = 纯半圆），
 * 深色圆钮（view 层）坐进口中，圆钮与凹口之间的缝隙透出任意页面背景。
 * 路径：左下 → 左上圆角 → 顶边 → [左凹唇 fillet] → 凹口半圆弧(口底) → [右凹唇 fillet] → 右上圆角 → 右下 → 闭合。
 */
export function drawSilhouette(ctx: any, geo: SilhouetteGeometry, knobCx: number, color: string): void {
	const { width: W, height: H, barTop: T, knobCy: cy, knobR: Rb, cornerR: r0 } = geo
	// 凹口圆心相对栏顶边的深度（圆钮约半沉入栏内）
	const h = cy - T
	// 凹唇 fillet 半径；过大时收窄保证相切有解
	const f = Math.max(Math.min(geo.filletR, Rb * 0.9), 0)
	// 相切条件：凹唇圆心在栏顶边下方 f 处、到凹口圆心距离 Rb+f
	const g = h - f
	const d = f > 0 ? Math.sqrt(Math.max((Rb + f) * (Rb + f) - g * g, 0)) : Rb
	const Fy = T + f
	const Fl = knobCx - d
	const Fr = knobCx + d
	// 凹口圆上的左右切点角（指向凹唇圆心）
	const pL = Math.atan2(Fy - cy, Fl - knobCx)
	const pR = Math.atan2(Fy - cy, Fr - knobCx)
	// 凹唇圆上指向凹口圆心的方向角
	const qL = Math.atan2(cy - Fy, knobCx - Fl)
	const qR = Math.atan2(cy - Fy, knobCx - Fr)

	ctx.fillStyle = color
	ctx.beginPath()
	ctx.moveTo(0, H)
	ctx.lineTo(0, T + r0)
	ctx.arcTo(0, T, r0, T, r0)
	ctx.lineTo(Fl, T)
	// 左凹唇：从顶边切点(凹唇正上)扫向凹口切点，向下舀入
	if (f > 0) ctx.arc(Fl, Fy, f, -Math.PI / 2, qL, false)
	// 凹口圆弧：左切点 → 口底 → 右切点
	ctx.arc(knobCx, cy, Rb, pL, pR, true)
	// 右凹唇：从凹口切点扫回顶边切点
	if (f > 0) ctx.arc(Fr, Fy, f, qR, -Math.PI / 2, false)
	ctx.lineTo(W - r0, T)
	ctx.arcTo(W, T, W, T + r0, r0)
	ctx.lineTo(W, H)
	ctx.closePath()
	ctx.fill()
}

/** 构造 cubic-bezier(0.25,0.1,0.25,1)（= CSS 默认 ease），用于与 __bump 的 transition 对齐 */
export function makeCssEase(): (x: number) => number {
	const p1x = 0.25
	const p1y = 0.1
	const p2x = 0.25
	const p2y = 1
	const cx = 3 * p1x
	const bx = 3 * (p2x - p1x) - cx
	const ax = 1 - cx - bx
	const cy = 3 * p1y
	const by = 3 * (p2y - p1y) - cy
	const ay = 1 - cy - by
	const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
	const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
	const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
	return (x: number) => {
		if (x <= 0) return 0
		if (x >= 1) return 1
		let t = x
		// 牛顿迭代求根
		for (let i = 0; i < 8; i++) {
			const dx = sampleX(t) - x
			if (Math.abs(dx) < 1e-5) return sampleY(t)
			const deriv = sampleDX(t)
			if (Math.abs(deriv) < 1e-6) break
			t -= dx / deriv
		}
		// 二分兜底
		let lo = 0
		let hi = 1
		t = x
		while (hi - lo > 1e-5) {
			if (sampleX(t) < x) lo = t
			else hi = t
			t = (lo + hi) / 2
		}
		return sampleY(t)
	}
}

/** 帧驱动：优先 canvas node 的 rAF（mp-weixin），其次全局 rAF（H5），兜底 setTimeout */
export interface FrameDriver {
	request: (cb: (ts: number) => void) => number
	cancel: (id: number) => void
}

export function createFrameDriver(
	nodeRaf?: (cb: (ts: number) => void) => number,
	nodeCaf?: (id: number) => void,
): FrameDriver {
	if (nodeRaf) {
		return {
			request: (cb) => nodeRaf(cb),
			cancel: (id) => (nodeCaf ? nodeCaf(id) : undefined),
		}
	}
	const g: any = typeof globalThis !== 'undefined' ? globalThis : {}
	if (typeof g.requestAnimationFrame === 'function') {
		return {
			request: (cb) => g.requestAnimationFrame(cb),
			cancel: (id) => g.cancelAnimationFrame && g.cancelAnimationFrame(id),
		}
	}
	return {
		request: (cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number,
		cancel: (id) => clearTimeout(id),
	}
}
