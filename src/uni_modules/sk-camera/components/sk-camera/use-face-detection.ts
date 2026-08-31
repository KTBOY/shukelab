import { ref, shallowRef } from 'vue'
import type { SkFaceBox } from './sk-camera.type'
import { mapSourceToRect } from './utils'

/** BlazeFace 模型默认地址（官方 Google Storage）；国内/离线请自托管后传 modelUrl */
export const DEFAULT_FACE_MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

/** tasks-vision wasm 默认地址（jsdelivr，版本与依赖保持一致）；可自托管整个目录 */
export const DEFAULT_FACE_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'

export interface UseFaceDetectionOptions {
	modelUrl?: string
	wasmPath?: string
	/** 最低置信度，默认 0.5 */
	minConfidence?: number
	/** 检测节流间隔（ms），默认 200 */
	interval?: number
	/** 初始化失败回调 */
	onError?: (message: string) => void
}

/**
 * H5 端上人脸检测（MediaPipe BlazeFace，约 230KB 模型）。
 * 检测在视频原始帧上进行，结果按 object-fit:cover 逆映射 + 镜像翻转换算为
 * 「相对预览可视区域的比例坐标」，可直接用于覆盖层渲染，所见即所得。
 * 全程端上推理，人脸数据不出端。
 *
 * 注意：仅 H5 可用；@mediapipe/tasks-vision 通过动态 import 按需加载（懒分包）。
 */
export function useFaceDetection(options: UseFaceDetectionOptions = {}) {
	/** 检测到的人脸（比例坐标，已换算到预览容器、已处理镜像） */
	const faces = ref<SkFaceBox[]>([])
	const active = ref(false)
	/** 运行库/模型是否初始化成功 */
	const ready = ref(false)

	const modelUrl = options.modelUrl || DEFAULT_FACE_MODEL_URL
	const wasmPath = options.wasmPath || DEFAULT_FACE_WASM_PATH
	const minConfidence = options.minConfidence ?? 0.5
	const interval = Math.max(100, options.interval ?? 200)

	let detector: any = null
	let videoEl: HTMLVideoElement | null = null
	let rafId = 0
	let lastDetectAt = 0
	let mirrorGetter: () => boolean = () => false

	const createDetector = async (delegate: 'GPU' | 'CPU') => {
		// 动态加载：未启用人脸引导时零体积代价
		const vision = await import('@mediapipe/tasks-vision')
		const fileset = await vision.FilesetResolver.forVisionTasks(wasmPath)
		return vision.FaceDetector.createFromOptions(fileset, {
			baseOptions: { modelAssetPath: modelUrl, delegate },
			runningMode: 'VIDEO',
			minDetectionConfidence: minConfidence,
		})
	}

	/** 初始化检测器（GPU 优先，失败回退 CPU） */
	const init = async (): Promise<boolean> => {
		if (ready.value) return true
		try {
			detector = await createDetector('GPU')
		} catch (_) {
			try {
				detector = await createDetector('CPU')
			} catch (e: any) {
				detector = null
				options.onError && options.onError((e && e.message) || '人脸检测运行库加载失败')
				return false
			}
		}
		ready.value = true
		return true
	}

	/** 原始帧坐标 → 预览容器比例坐标（cover 逆映射 + 镜像翻转） */
	const toContainerRatio = (box: { originX: number; originY: number; width: number; height: number }) => {
		if (!videoEl) return null
		const vw = videoEl.videoWidth
		const vh = videoEl.videoHeight
		const cw = videoEl.clientWidth
		const ch = videoEl.clientHeight
		if (!vw || !vh || !cw || !ch) return null
		const r = mapSourceToRect({ x: box.originX, y: box.originY, width: box.width, height: box.height }, cw, ch, vw, vh)
		// 检测在未镜像的原始帧上，前置镜像预览需把人脸框水平翻转，与画面一致
		const x = mirrorGetter() ? cw - r.x - r.width : r.x
		return { x: x / cw, y: r.y / ch, width: r.width / cw, height: r.height / ch }
	}

	const tick = (ts: number) => {
		if (!active.value) return
		rafId = requestAnimationFrame(tick)
		if (!detector || !videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return
		if (ts - lastDetectAt < interval) return
		lastDetectAt = ts
		let result: any = null
		try {
			result = detector.detectForVideo(videoEl, performance.now())
		} catch (_) {
			return
		}
		const boxes: SkFaceBox[] = []
		const detections = (result && result.detections) || []
		for (const d of detections) {
			const score = d.categories && d.categories[0] ? d.categories[0].score : 0
			if (score < minConfidence) continue
			const r = d.boundingBox && toContainerRatio(d.boundingBox)
			if (r) boxes.push({ ...r, score })
		}
		faces.value = boxes
	}

	/** 开始检测：需传入预览 video 元素与「当前是否镜像」的读取函数 */
	const start = (video: HTMLVideoElement, getMirror: () => boolean) => {
		if (!detector || active.value) return
		videoEl = video
		mirrorGetter = getMirror
		active.value = true
		lastDetectAt = 0
		rafId = requestAnimationFrame(tick)
	}

	/** 停止检测（不销毁模型，可再次 start） */
	const stop = () => {
		active.value = false
		if (rafId) cancelAnimationFrame(rafId)
		rafId = 0
		faces.value = []
	}

	/** 销毁检测器并释放资源 */
	const dispose = () => {
		stop()
		if (detector && detector.close) {
			try {
				detector.close()
			} catch (_) {
				/* ignore */
			}
		}
		detector = null
		ready.value = false
	}

	return { faces, active, ready, init, start, stop, dispose }
}
