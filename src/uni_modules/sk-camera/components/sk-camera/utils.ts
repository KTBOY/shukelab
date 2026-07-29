import type {
	SkCameraFacing,
	SkCameraResolution,
	SkCameraCropRegion,
	SkCameraErrorCode,
} from './sk-camera.type'

/** 分辨率预设 → 具体宽高（仅用于 ideal 期望值） */
const RESOLUTION_PRESETS: Record<string, { width: number; height: number }> = {
	'480p': { width: 640, height: 480 },
	'720p': { width: 1280, height: 720 },
	'1080p': { width: 1920, height: 1080 },
}

/** 解析分辨率入参为具体宽高 */
export function resolvePreset(resolution: SkCameraResolution): { width: number; height: number } {
	if (resolution && typeof resolution === 'object') return resolution
	return RESOLUTION_PRESETS[resolution as string] || RESOLUTION_PRESETS['720p']
}

/**
 * 构建“逐级降级”的 getUserMedia 约束链：
 * 仅使用 ideal（不使用硬性 min），失败时依次放宽，最大化机型兼容性，
 * 从根本上规避大量机型因分辨率约束过高导致的 OverconstrainedError。
 */
export function buildConstraintsChain(
	facing: SkCameraFacing,
	resolution: SkCameraResolution
): MediaStreamConstraints[] {
	const size = resolvePreset(resolution)
	const chain: MediaStreamConstraints[] = []
	// 后置优先精确匹配，规避部分机型 environment 不切换到后置的问题
	if (facing === 'environment') {
		chain.push({
			audio: false,
			video: { facingMode: { exact: 'environment' }, width: { ideal: size.width }, height: { ideal: size.height } },
		})
	}
	chain.push({ audio: false, video: { facingMode: facing, width: { ideal: size.width }, height: { ideal: size.height } } })
	chain.push({ audio: false, video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } })
	chain.push({ audio: false, video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } } })
	chain.push({ audio: false, video: { facingMode: facing } })
	chain.push({ audio: false, video: true })
	return chain
}

/** 将 getUserMedia 的原生错误映射为稳定错误码 + 友好文案 */
export function mapMediaError(err: any): { code: SkCameraErrorCode; message: string } {
	const name = (err && err.name) || ''
	switch (name) {
		case 'NotAllowedError':
		case 'SecurityError':
			return { code: 'PERMISSION_DENIED', message: '相机权限被拒绝，请在浏览器/系统设置中允许访问摄像头' }
		case 'NotFoundError':
		case 'DevicesNotFoundError':
			return { code: 'NOT_FOUND', message: '未检测到可用的摄像头设备' }
		case 'NotReadableError':
		case 'TrackStartError':
			return { code: 'NOT_READABLE', message: '摄像头被占用或无法启动，请关闭其他占用相机的程序后重试' }
		case 'OverconstrainedError':
		case 'ConstraintNotSatisfiedError':
			return { code: 'OVERCONSTRAINED', message: '当前设备不支持所请求的分辨率' }
		default:
			return { code: 'UNKNOWN', message: (err && err.message) || '相机启动失败' }
	}
}

/**
 * 计算裁剪矩形（预览容器像素）；crop 为 true 时取预览可视区域内的“居中最大正方形”。
 * @param cw 预览可视区域（相机容器）宽
 * @param ch 预览可视区域（相机容器）高
 */
export function resolveCropRect(
	crop: boolean | SkCameraCropRegion | undefined,
	cw: number,
	ch: number
): { x: number; y: number; width: number; height: number } | null {
	if (!crop) return null
	if (crop === true) {
		const side = Math.min(cw, ch)
		return { x: (cw - side) / 2, y: (ch - side) / 2, width: side, height: side }
	}
	const clamp = (n: number) => Math.min(1, Math.max(0, n))
	return { x: clamp(crop.x) * cw, y: clamp(crop.y) * ch, width: clamp(crop.width) * cw, height: clamp(crop.height) * ch }
}

/**
 * object-fit: cover 坐标映射（纯函数，H5 与小程序共用）：
 * 把「预览容器内的裁剪矩形（容器像素）」换算为「原始画面像素矩形」。
 * 预览按 cover 铺满容器时，屏幕只显示原始画面被裁掉两边后的中间部分，
 * 因此需先反推缩放与偏移，再换算回原始像素，做到所见即所得。
 * @param rect 裁剪矩形（预览容器像素）
 * @param cw/ch 预览容器宽高
 * @param vw/vh 原始画面（视频帧/照片）宽高
 */
export function mapRectToSource(
	rect: { x: number; y: number; width: number; height: number },
	cw: number,
	ch: number,
	vw: number,
	vh: number
): { x: number; y: number; width: number; height: number } {
	const scale = Math.max(cw / vw, ch / vh)
	const offX = (vw * scale - cw) / 2
	const offY = (vh * scale - ch) / 2
	let nx = (offX + rect.x) / scale
	let ny = (offY + rect.y) / scale
	let nw = rect.width / scale
	let nh = rect.height / scale
	// 约束到原始画面范围内
	nx = Math.max(0, Math.min(nx, vw))
	ny = Math.max(0, Math.min(ny, vh))
	nw = Math.max(1, Math.min(nw, vw - nx))
	nh = Math.max(1, Math.min(nh, vh - ny))
	return { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) }
}

/**
 * 将当前视频帧绘制到 canvas：可选水平镜像 + 可选裁剪。
 * 关键：预览使用 object-fit: cover，屏幕看到的只是原始画面被裁掉两边后的中间部分，
 * 因此裁剪坐标以“预览可视区域”为基准（0~1），再按 cover 映射回原始像素，做到所见即所得。
 * - 输出 canvas 取自视频原始分辨率对应区域，避免拉伸变形；
 * - 镜像使用 GPU 加速的 ctx.scale(-1,1)，取代逐像素循环。
 */
export function captureFrame(
	video: HTMLVideoElement,
	options: {
		mirror?: boolean
		crop?: boolean | SkCameraCropRegion
		containerWidth?: number
		containerHeight?: number
	}
): HTMLCanvasElement {
	const vw = video.videoWidth
	const vh = video.videoHeight
	// 先绘制“显示朝向”的完整原始帧（前置镜像后与预览一致）
	const full = document.createElement('canvas')
	full.width = vw
	full.height = vh
	const ctx = full.getContext('2d') as CanvasRenderingContext2D
	if (options.mirror) {
		ctx.translate(vw, 0)
		ctx.scale(-1, 1)
	}
	ctx.drawImage(video, 0, 0, vw, vh)
	ctx.setTransform(1, 0, 0, 1, 0, 0)

	const cw = options.containerWidth || vw
	const ch = options.containerHeight || vh
	const rect = resolveCropRect(options.crop, cw, ch)
	if (!rect) return full

	// object-fit: cover 映射：预览容器像素 → 原始画面像素（与小程序端共用同一纯函数）
	const src = mapRectToSource(rect, cw, ch, vw, vh)

	const out = document.createElement('canvas')
	out.width = src.width
	out.height = src.height
	;(out.getContext('2d') as CanvasRenderingContext2D).drawImage(
		full,
		src.x,
		src.y,
		src.width,
		src.height,
		0,
		0,
		src.width,
		src.height
	)
	return out
}

/** canvas → Blob（用于 format=blob 或后续上传） */
export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): Promise<Blob | null> {
	return new Promise((resolve) => {
		if (canvas.toBlob) canvas.toBlob((b) => resolve(b), type, quality)
		else resolve(null)
	})
}
