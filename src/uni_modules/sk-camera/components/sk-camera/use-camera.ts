import { ref, shallowRef, onUnmounted } from 'vue'
import type {
	SkCameraFacing,
	SkCameraResolution,
	SkCameraFormat,
	SkCameraCropRegion,
	SkCameraCaptureResult,
	SkCameraError,
	SkCameraDevice,
} from './sk-camera.type'
import { buildConstraintsChain, mapMediaError, captureFrame, canvasToBlob } from './utils'

/** 选项值支持静态值或 getter；getter 用于读取最新 props，保证运行中修改属性也能生效 */
type MaybeGetter<T> = T | (() => T)
const readOpt = <T>(v: MaybeGetter<T> | undefined, dflt: T): T => {
	if (v === undefined) return dflt
	return typeof v === 'function' ? (v as () => T)() : v
}

/** useCamera 入参（由组件从 props 透传，运行中可变的属性用 getter 传入） */
export interface UseCameraOptions {
	facing?: SkCameraFacing
	resolution?: SkCameraResolution
	mirror?: boolean
	quality?: MaybeGetter<number>
	format?: MaybeGetter<SkCameraFormat>
	crop?: MaybeGetter<boolean | SkCameraCropRegion>
	/** 实时预览失败时是否降级为兜底拍照，默认 true */
	fallback?: MaybeGetter<boolean>
	/** 初始手电筒状态（H5 torch），默认 false */
	torch?: boolean
	onReady?: () => void
	onError?: (e: SkCameraError) => void
	onSwitch?: (facing: SkCameraFacing) => void
	/** 实时预览不可用、进入兜底拍照模式时触发（参数为原始错误） */
	onFallback?: (e: SkCameraError) => void
}

/**
 * H5 摄像头核心逻辑（视图无关）。
 * 逻辑与视图分层：getUserMedia、约束降级、断流自愈、兜底拍照、镜像/裁剪成像、
 * 手电筒/变焦/设备切换与资源释放全部收敛到此 hook，sk-camera.vue 仅做视图与事件透传。
 */
export function useCamera(options: UseCameraOptions = {}) {
	const facing = ref<SkCameraFacing>(options.facing || 'user')
	const streaming = ref(false)
	const starting = ref(false)
	const hasMultipleCameras = ref(false)
	const error = ref<SkCameraError | null>(null)
	const stream = shallowRef<MediaStream | null>(null)
	/** 成像模式：实时媒体流 / 兜底拍照（微信 iOS H5 等限制环境） */
	const mode = ref<'stream' | 'fallback'>('stream')
	/** 手电筒状态 */
	const torch = ref(!!options.torch)
	/** 已授权的摄像头设备列表 */
	const devices = ref<SkCameraDevice[]>([])

	const resolution = options.resolution || '720p'
	// 未显式指定 mirror 时：前置默认镜像、后置默认不镜像
	const mirror = ref(options.mirror ?? facing.value === 'user')

	let videoEl: HTMLVideoElement | null = null
	let manualStopped = false
	let recoveryTries = 0
	let preferredDeviceId = ''
	/** 断流自动重启上限，防止设备被占用时无限重试 */
	const MAX_RECOVERY = 2

	const emitError = (e: SkCameraError) => {
		error.value = e
		options.onError && options.onError(e)
	}

	/** 预览镜像：前置时对原生 video 做 CSS 翻转，使自拍呈镜像（与成像镜像保持一致） */
	const syncMirror = () => {
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
		syncMirror()
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

	/** 枚举设备（授权后才有 label）并同步多摄标记 */
	const refreshDevices = async () => {
		try {
			if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return
			const list = await navigator.mediaDevices.enumerateDevices()
			const cams = list.filter((d) => d.kind === 'videoinput')
			devices.value = cams.map((d, i) => ({ deviceId: d.deviceId, label: d.label || `摄像头 ${i + 1}` }))
			hasMultipleCameras.value = cams.length > 1
		} catch (_) {
			/* 枚举失败不影响主流程 */
		}
	}

	/** 轨道被外部终止（系统回收/设备拔出/切后台）时的自愈入口 */
	const tryRecover = async () => {
		if (manualStopped || mode.value === 'fallback') return
		if (recoveryTries >= MAX_RECOVERY) {
			emitError({ code: 'STREAM_LOST', message: '相机连接已断开，请重试或重新进入页面' })
			return
		}
		recoveryTries += 1
		stopTracks()
		await start()
	}

	const bindStreamWatcher = () => {
		const track = stream.value && stream.value.getVideoTracks()[0]
		if (track) track.onended = () => tryRecover()
	}

	/** 页面回前台：轨道已死则重启；仅被暂停则尝试恢复播放 */
	const onVisibilityChange = () => {
		if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
		if (mode.value !== 'stream' || manualStopped) return
		const track = stream.value && stream.value.getVideoTracks()[0]
		if (!track) return
		if (track.readyState === 'ended') {
			tryRecover()
		} else if (videoEl && videoEl.paused) {
			videoEl.play().catch(() => {
				/* 个别环境回前台后仍需用户手势，忽略 */
			})
		}
	}
	if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange)

	/** 只停轨道，不清视图层状态（重启场景复用） */
	const stopTracks = () => {
		if (stream.value) {
			stream.value.getTracks().forEach((t) => t.stop())
			stream.value = null
		}
		streaming.value = false
	}

	/** 进入兜底拍照模式（无实时预览，拍照调起系统相机/微信选图） */
	const enterFallback = (e: SkCameraError) => {
		if (!readOpt(options.fallback, true)) {
			emitError(e)
			return
		}
		mode.value = 'fallback'
		options.onFallback && options.onFallback(e)
		options.onReady && options.onReady()
	}

	/** 开启相机：安全上下文校验 → 能力检测 → 约束逐级降级重试 → 兜底拍照 */
	const start = async () => {
		if (starting.value) return
		error.value = null
		manualStopped = false
		if (typeof window === 'undefined') return
		if (!window.isSecureContext) {
			// 非安全上下文无法使用 getUserMedia，但系统拍照（file input）仍可用
			return enterFallback({ code: 'INSECURE_CONTEXT', message: '当前非安全上下文（需 HTTPS 或 localhost），已降级为系统拍照' })
		}
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			return enterFallback({ code: 'NOT_SUPPORTED', message: '当前环境不支持实时预览（如微信 iOS），已降级为系统拍照' })
		}
		starting.value = true
		const chain = buildConstraintsChain(facing.value, resolution)
		// 指定设备（多摄选择）时优先精确匹配该设备
		if (preferredDeviceId) {
			chain.unshift({ audio: false, video: { deviceId: { exact: preferredDeviceId } } })
		}
		let lastErr: any = null
		for (const constraints of chain) {
			try {
				const s = await navigator.mediaDevices.getUserMedia(constraints)
				stream.value = s
				streaming.value = true
				starting.value = false
				recoveryTries = 0
				mode.value = 'stream'
				bindStreamWatcher()
				await attachStream()
				refreshDevices()
				if (torch.value) setTorch(true)
				options.onReady && options.onReady()
				return
			} catch (e: any) {
				lastErr = e
				// 权限类错误无需继续降级，直接反馈（仍可走兜底）
				if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break
			}
		}
		starting.value = false
		enterFallback({ ...mapMediaError(lastErr), raw: lastErr })
	}

	/** 关闭相机并释放所有轨道（避免相机灯常亮 / 资源占用） */
	const stop = () => {
		manualStopped = true
		stopTracks()
		if (videoEl) {
			try {
				videoEl.pause()
			} catch (_) {
				/* ignore */
			}
			if ('srcObject' in videoEl) videoEl.srcObject = null
		}
	}

	// ---------------- 兜底拍照（无实时预览环境） ----------------

	/** 微信 JSSDK 可用时优先使用：直接调起相机，返回 localId（业务侧可 wx.uploadImage 或后端拉取） */
	const captureViaWx = (): Promise<SkCameraCaptureResult | null> =>
		new Promise((resolve) => {
			const wx = (window as any).wx
			if (!wx || typeof wx.chooseImage !== 'function') return resolve(null)
			wx.chooseImage({
				count: 1,
				sizeType: ['original'],
				sourceType: ['camera'],
				success: (res: any) => {
					const localId = res.localIds && res.localIds[0]
					if (!localId) return resolve(null)
					resolve({
						base64: '',
						blob: null,
						// 复用 tempFilePath 语义：iOS 微信下 localId 无法读取为二进制，只能直接上传
						tempFilePath: localId,
						width: 0,
						height: 0,
						facing: facing.value,
						cropped: false,
						source: 'fallback',
					})
				},
				fail: () => resolve(null),
				cancel: () => resolve(null),
			})
		})

	const fileToDataURL = (file: File): Promise<string> =>
		new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(file)
		})

	const readImageSize = (src: string): Promise<{ width: number; height: number }> =>
		new Promise((resolve) => {
			const img = new Image()
			img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
			img.onerror = () => resolve({ width: 0, height: 0 })
			img.src = src
		})

	/** 终极兜底：<input capture> 调起系统相机，全 webview 可用 */
	const captureViaInput = (): Promise<SkCameraCaptureResult | null> =>
		new Promise((resolve) => {
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = 'image/*'
			// 期望系统相机按朝向打开（部分浏览器忽略该值，仅尽力而为）
			input.setAttribute('capture', facing.value === 'user' ? 'user' : 'environment')
			input.style.display = 'none'
			document.body.appendChild(input)
			let settled = false
			const finish = (r: SkCameraCaptureResult | null) => {
				if (settled) return
				settled = true
				window.removeEventListener('focus', onCancelProbe)
				input.remove()
				resolve(r)
			}
			// 移动端取消选择器不触发 change：用回焦探测 + 原生 cancel 事件双保险
			const onCancelProbe = () => setTimeout(() => finish(null), 600)
			window.addEventListener('focus', onCancelProbe)
			input.addEventListener('cancel', () => finish(null))
			input.addEventListener('change', async () => {
				const file = input.files && input.files[0]
				if (!file) return finish(null)
				try {
					const base64 = await fileToDataURL(file)
					const size = await readImageSize(base64)
					finish({
						base64,
						blob: readOpt(options.format, 'base64') === 'blob' ? file : null,
						width: size.width,
						height: size.height,
						facing: facing.value,
						cropped: false,
						source: 'fallback',
					})
				} catch (_) {
					finish(null)
				}
			})
			input.click()
		})

	const captureFallback = async (): Promise<SkCameraCaptureResult | null> => {
		const byWx = await captureViaWx()
		if (byWx) return byWx
		return captureViaInput()
	}

	// ---------------- 拍照 ----------------

	let capturing = false

	/** 拍照：镜像 + 可选裁剪，输出 base64（可选 Blob）；兜底模式调起系统拍照 */
	const capture = async (): Promise<SkCameraCaptureResult | null> => {
		// 节流：连点只生效一次，避免并发成像/弹多个选择器
		if (capturing) return null
		capturing = true
		try {
			if (mode.value === 'fallback') return await captureFallback()
			if (!videoEl || !streaming.value || !videoEl.videoWidth) {
				emitError({ code: 'NOT_READY', message: '相机尚未就绪' })
				return null
			}
			const canvas = captureFrame(videoEl, {
				mirror: mirror.value,
				crop: readOpt(options.crop, false),
				containerWidth: videoEl.clientWidth,
				containerHeight: videoEl.clientHeight,
			})
			const base64 = canvas.toDataURL('image/jpeg', readOpt(options.quality, 0.92))
			let blob: Blob | null = null
			if (readOpt(options.format, 'base64') === 'blob') blob = await canvasToBlob(canvas, 'image/jpeg', readOpt(options.quality, 0.92))
			return {
				base64,
				blob,
				width: canvas.width,
				height: canvas.height,
				facing: facing.value,
				cropped: !!readOpt(options.crop, false),
				source: 'stream',
			}
		} finally {
			capturing = false
		}
	}

	/** 前后置切换：先释放旧流，再以新朝向重启 */
	const switchCamera = async () => {
		preferredDeviceId = ''
		stop()
		manualStopped = false
		facing.value = facing.value === 'user' ? 'environment' : 'user'
		if (options.mirror === undefined) mirror.value = facing.value === 'user'
		syncMirror()
		await start()
		options.onSwitch && options.onSwitch(facing.value)
	}

	// ---------------- 设备能力：手电筒 / 变焦 / 设备选择 ----------------

	const getVideoTrack = (): MediaStreamTrack | null => (stream.value && stream.value.getVideoTracks()[0]) || null

	/** 查询当前轨道能力：是否支持手电筒、变焦范围 */
	const getCapabilities = (): { torch: boolean; zoom: { min: number; max: number; step: number } | null } => {
		const track: any = getVideoTrack()
		const caps = track && track.getCapabilities ? track.getCapabilities() : {}
		return {
			torch: !!(caps && caps.torch),
			zoom:
				caps && caps.zoom
					? { min: caps.zoom.min ?? 1, max: caps.zoom.max ?? 1, step: caps.zoom.step ?? 0.1 }
					: null,
		}
	}

	/** 手电筒（需设备支持，getCapabilities().torch 为 true） */
	const setTorch = async (on: boolean): Promise<boolean> => {
		torch.value = on
		const track: any = getVideoTrack()
		if (!track || typeof track.applyConstraints !== 'function') return false
		try {
			await track.applyConstraints({ advanced: [{ torch: on }] })
			return true
		} catch (_) {
			return false
		}
	}

	/** 设置变焦倍数（范围见 getCapabilities().zoom） */
	const setZoom = async (zoom: number): Promise<boolean> => {
		const track: any = getVideoTrack()
		if (!track || typeof track.applyConstraints !== 'function') return false
		try {
			await track.applyConstraints({ advanced: [{ zoom }] })
			return true
		} catch (_) {
			return false
		}
	}

	/** 切换到指定设备（devices 中的 deviceId），会重启相机 */
	const switchDevice = async (deviceId: string) => {
		if (!deviceId || mode.value === 'fallback') return
		preferredDeviceId = deviceId
		stop()
		manualStopped = false
		await start()
	}

	// 组件卸载时兜底释放，避免摄像头未关闭
	onUnmounted(() => {
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange)
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
		mode,
		torch,
		devices,
		// 方法
		mountVideo,
		unmountVideo,
		start,
		stop,
		capture,
		switchCamera,
		syncMirror,
		getStream: () => stream.value,
		getVideo: () => videoEl,
		getCapabilities,
		setTorch,
		setZoom,
		switchDevice,
		refreshDevices,
	}
}
