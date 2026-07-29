import { ref, shallowRef, onUnmounted } from 'vue'
import type {
	SkCameraFacing,
	SkCameraResolution,
	SkCameraFormat,
	SkCameraCropRegion,
	SkCameraCaptureResult,
	SkCameraError,
} from './sk-camera.type'
import { buildConstraintsChain, mapMediaError, captureFrame, canvasToBlob } from './utils'

/** useCamera 入参（由组件从 props 透传） */
export interface UseCameraOptions {
	facing?: SkCameraFacing
	resolution?: SkCameraResolution
	mirror?: boolean
	quality?: number
	format?: SkCameraFormat
	crop?: boolean | SkCameraCropRegion
	onReady?: () => void
	onError?: (e: SkCameraError) => void
	onSwitch?: (facing: SkCameraFacing) => void
}

/**
 * H5 摄像头核心逻辑（视图无关）。
 * 参考大厂组件的“逻辑与视图分层”做法，将 getUserMedia、约束降级、镜像/裁剪成像、
 * 人脸检测与资源释放全部收敛到此 hook，sk-camera.vue 仅做视图与事件透传。
 */
export function useCamera(options: UseCameraOptions = {}) {
	const facing = ref<SkCameraFacing>(options.facing || 'user')
	const streaming = ref(false)
	const starting = ref(false)
	const hasMultipleCameras = ref(false)
	const error = ref<SkCameraError | null>(null)
	const stream = shallowRef<MediaStream | null>(null)

	const resolution = options.resolution || '720p'
	const quality = options.quality ?? 0.92
	const format = options.format || 'base64'
	// 未显式指定 mirror 时：前置默认镜像、后置默认不镜像
	const mirror = ref(options.mirror ?? facing.value === 'user')

	let videoEl: HTMLVideoElement | null = null

	const emitError = (e: SkCameraError) => {
		error.value = e
		options.onError && options.onError(e)
	}

	/** 预览镜像：前置时对原生 video 做 CSS 翻转，使自拍呈镜像（与成像镜像保持一致） */
	const syncMirrorStyle = () => {
		if (videoEl) videoEl.style.transform = mirror.value ? 'rotateY(180deg)' : 'none'
	}

	/**
	 * 创建原生 <video> 并挂载到容器。
	 * 刻意不使用 uni 的 <video> 组件——它面向“播放视频文件”封装，
	 * 承载 MediaStream 时属性透传/控制栏/object-fit 表现不一致，是旧实现的坑点之一。
	 */
	const mountVideo = (container: HTMLElement) => {
		if (videoEl) return
		videoEl = document.createElement('video')
		videoEl.setAttribute('playsinline', 'true')
		videoEl.setAttribute('webkit-playsinline', 'true')
		videoEl.setAttribute('x5-playsinline', 'true')
		videoEl.muted = true
		videoEl.autoplay = true
		videoEl.style.width = '100%'
		videoEl.style.height = '100%'
		videoEl.style.objectFit = 'cover'
		container.appendChild(videoEl)
		syncMirrorStyle()
	}

	const unmountVideo = () => {
		if (videoEl && videoEl.parentNode) videoEl.parentNode.removeChild(videoEl)
		videoEl = null
	}

	const attachStream = async () => {
		if (!videoEl || !stream.value) return
		if ('srcObject' in videoEl) videoEl.srcObject = stream.value
		try {
			await videoEl.play()
		} catch (_) {
			// iOS 首帧可能需要用户手势；muted + autoplay 通常可自动播放，失败则忽略
		}
	}

	const detectCameras = async () => {
		try {
			if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return
			const list = await navigator.mediaDevices.enumerateDevices()
			hasMultipleCameras.value = list.filter((d) => d.kind === 'videoinput').length > 1
		} catch (_) {
			/* 枚举失败不影响主流程 */
		}
	}

	/** 开启相机：安全上下文校验 → 能力检测 → 约束逐级降级重试 */
	const start = async () => {
		if (starting.value) return
		error.value = null
		if (typeof window === 'undefined' || !window.isSecureContext) {
			emitError({ code: 'INSECURE_CONTEXT', message: '当前非安全上下文，请通过 HTTPS 或 localhost 访问后再使用相机' })
			return
		}
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			emitError({ code: 'NOT_SUPPORTED', message: '当前浏览器不支持 getUserMedia' })
			return
		}
		starting.value = true
		const chain = buildConstraintsChain(facing.value, resolution)
		let lastErr: any = null
		for (const constraints of chain) {
			try {
				const s = await navigator.mediaDevices.getUserMedia(constraints)
				stream.value = s
				streaming.value = true
				starting.value = false
				await attachStream()
				detectCameras()
				options.onReady && options.onReady()
				return
			} catch (e: any) {
				lastErr = e
				// 权限类错误无需继续降级，直接反馈
				if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break
			}
		}
		starting.value = false
		emitError({ ...mapMediaError(lastErr), raw: lastErr })
	}

	/** 关闭相机并释放所有轨道（避免相机灯常亮 / 资源占用） */
	const stop = () => {
		if (stream.value) {
			stream.value.getTracks().forEach((t) => t.stop())
			stream.value = null
		}
		if (videoEl) {
			try {
				videoEl.pause()
			} catch (_) {
				/* ignore */
			}
			if ('srcObject' in videoEl) videoEl.srcObject = null
		}
		streaming.value = false
	}

	/** 拍照：镜像 + 可选裁剪，输出 base64（可选 Blob） */
	const capture = async (): Promise<SkCameraCaptureResult | null> => {
		if (!videoEl || !streaming.value || !videoEl.videoWidth) {
			emitError({ code: 'NOT_READY', message: '相机尚未就绪' })
			return null
		}
		const canvas = captureFrame(videoEl, {
			mirror: mirror.value,
			crop: options.crop,
			containerWidth: videoEl.clientWidth,
			containerHeight: videoEl.clientHeight,
		})
		const base64 = canvas.toDataURL('image/jpeg', quality)
		let blob: Blob | null = null
		if (format === 'blob') blob = await canvasToBlob(canvas, 'image/jpeg', quality)
		return {
			base64,
			blob,
			width: canvas.width,
			height: canvas.height,
			facing: facing.value,
			cropped: !!options.crop,
		}
	}

	/** 前后置切换：先释放旧流，再以新朝向重启 */
	const switchCamera = async () => {
		stop()
		facing.value = facing.value === 'user' ? 'environment' : 'user'
		if (options.mirror === undefined) mirror.value = facing.value === 'user'
		syncMirrorStyle()
		await start()
		options.onSwitch && options.onSwitch(facing.value)
	}

	// 组件卸载时兜底释放，避免摄像头未关闭
	onUnmounted(() => {
		stop()
		unmountVideo()
	})

	return {
		// 状态
		facing,
		mirror,
		streaming,
		starting,
		hasMultipleCameras,
		error,
		// 方法
		mountVideo,
		unmountVideo,
		start,
		stop,
		capture,
		switchCamera,
		getStream: () => stream.value,
	}
}
