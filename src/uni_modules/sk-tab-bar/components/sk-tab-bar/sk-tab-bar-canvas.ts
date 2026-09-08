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
