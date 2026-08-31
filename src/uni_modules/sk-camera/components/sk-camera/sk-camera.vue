<template>
	<view class="sk-camera">
		<!-- #ifdef H5 -->
		<!-- H5：容器内由 use-camera 动态挂载原生 <video>，规避 uni video 组件承载媒体流的兼容问题 -->
		<view :id="stageId" class="sk-camera__stage"></view>
		<!-- 兜底拍照提示：环境不支持实时预览（如微信 iOS），点拍照调起系统相机 -->
		<view v-if="isFallback" class="sk-camera__fallback">
			<text>当前环境不支持实时预览</text>
			<text>点击下方「拍照」调起相机拍摄</text>
		</view>
		<!-- #endif -->
		<!-- #ifndef H5 -->
		<!-- 小程序/App：降级为原生 camera 组件 -->
		<camera
			class="sk-camera__stage"
			:device-position="facing === 'user' ? 'front' : 'back'"
			:flash="flashMode"
			@error="onNativeError"
		></camera>
		<!-- 离屏画布：仅 crop 启用时渲染，用于拍照后按取景框区域裁剪（移出可视区不影响预览） -->
		<canvas v-if="crop" type="2d" :id="cropCanvasId" class="sk-camera__crop-canvas"></canvas>
		<!-- #endif -->

		<!-- 覆盖层：自定义取景框/水印/内置人脸框 -->
		<view class="sk-camera__overlay">
			<!-- #ifdef H5 -->
			<template v-if="showFaceBox">
				<view v-for="(box, i) in faceBoxes" :key="i" class="sk-camera__face-box" :style="box.style"></view>
			</template>
			<!-- #endif -->
			<slot name="overlay"></slot>
		</view>

		<!-- 控制栏：默认 关闭/拍照/前后置，可用 controls 插槽完全自定义 -->
		<view v-if="showControls" class="sk-camera__controls">
			<slot name="controls" :capture="capture" :switch-camera="switchCamera" :stop="stop" :close="handleClose" :facing="facing">
				<view class="sk-camera__ctrl" @tap="handleClose">关闭</view>
				<view class="sk-camera__ctrl sk-camera__ctrl--primary" @tap="capture">拍照</view>
				<view v-if="canSwitch" class="sk-camera__ctrl" @tap="switchCamera">{{ facing === 'user' ? '前置' : '后置' }}</view>
			</slot>
		</view>
	</view>
</template>

<script lang="ts" setup>
/**
 * SkCamera 多端拍照组件
 * @description H5 基于 getUserMedia 实现，小程序/App 优雅降级为原生 <camera>；
 * 实时预览不可用时（如微信 iOS）自动降级为系统拍照兜底。
 * 支持前后置切换、约束逐级降级、镜像、固定区域裁剪、手电筒、变焦、多设备选择、
 * 断流自愈、人脸取景引导（BlazeFace 端上检测）与插槽/实例方法调用。
 *
 * @property {String} facing 摄像头朝向 user/environment，默认 user
 * @property {String|Object} resolution 分辨率预设 480p/720p/1080p 或 {width,height}，默认 720p
 * @property {Boolean} mirror 是否水平镜像，不传时前置默认镜像
 * @property {Number} quality JPEG 质量 0~1，默认 0.92
 * @property {String} format 输出格式 base64/blob，默认 base64
 * @property {Boolean} autoStart 挂载后是否自动开启相机，默认 true
 * @property {Boolean} showControls 是否显示内置控制栏，默认 true
 * @property {Boolean|Object} crop 固定区域裁剪，默认 false
 * @property {Boolean} fallback 预览不可用时是否降级系统拍照，默认 true
 * @property {String} flash 闪光灯 off/on/auto/torch，默认 off（H5 仅 torch 生效）
 * @property {Boolean|Object} faceGuide 人脸取景引导（仅 H5），默认 false
 * @property {Boolean} navigateOnClose 内置关闭后是否自动返回，默认 true
 *
 * @event {Function} ready 相机就绪
 * @event {Function} capture 拍照完成，参数为 SkCameraCaptureResult
 * @event {Function} switch 前后置切换，参数为当前朝向
 * @event {Function} error 发生错误，参数为 SkCameraError
 * @event {Function} close 内置关闭按钮被点击
 * @event {Function} fallback 实时预览不可用、进入兜底拍照，参数为原始错误
 * @event {Function} face 每轮人脸检测结果（SkFaceBox[]，比例坐标）
 * @event {Function} face-detected 画面中出现人脸
 * @event {Function} face-lost 人脸离开画面
 */
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCamera } from './use-camera'
import { resolveCropRect, mapRectToSource } from './utils'
import type {
	SkCameraCaptureResult,
	SkCameraDevice,
	SkCameraError,
	SkCameraFacing,
	SkCameraProps,
	SkFaceBox,
	SkFaceGuideOptions,
} from './sk-camera.type'
// #ifdef H5
import { useFaceDetection } from './use-face-detection'
// #endif

defineOptions({ name: 'SkCamera' })

const props = withDefaults(defineProps<SkCameraProps>(), {
	facing: 'user',
	resolution: '720p',
	quality: 0.92,
	format: 'base64',
	autoStart: true,
	showControls: true,
	crop: false,
	fallback: true,
	flash: 'off',
	faceGuide: false,
	navigateOnClose: true,
})

const emit = defineEmits<{
	(e: 'ready'): void
	(e: 'capture', result: SkCameraCaptureResult): void
	(e: 'switch', facing: SkCameraFacing): void
	(e: 'error', err: SkCameraError): void
	(e: 'close'): void
	(e: 'fallback', err: SkCameraError): void
	(e: 'face', faces: SkFaceBox[]): void
	(e: 'face-detected'): void
	(e: 'face-lost'): void
}>()

const instance = getCurrentInstance()
/** 视图侧朝向态，用于原生 camera 的 device-position */
const facing = ref<SkCameraFacing>(props.facing)
/** 每个实例唯一的容器 id，供 H5 挂载原生 video */
const stageId = `sk-camera__stage_${instance?.uid ?? Math.floor(Math.random() * 1e6)}`
/** 离屏裁剪画布 id（小程序/App 端 crop 用） */
const cropCanvasId = `sk-camera__crop_${instance?.uid ?? Math.floor(Math.random() * 1e6)}`

/** 运行中可变的 props 以 getter 传入，保证属性修改实时生效 */
const camera = useCamera({
	facing: props.facing,
	resolution: props.resolution,
	mirror: props.mirror,
	quality: () => props.quality,
	format: () => props.format,
	crop: () => props.crop,
	fallback: () => props.fallback,
	torch: props.flash === 'torch',
	// 箭头包裹延迟求值：handleReady 声明在下方
	onReady: () => handleReady(),
	onError: (e) => emit('error', e),
	onSwitch: (f) => emit('switch', f),
	onFallback: (e) => emit('fallback', e),
})

// 组合式内部朝向变化时同步到视图
watch(camera.facing, (v) => (facing.value = v))

// #ifdef H5
/** H5：mirror 运行中修改时同步预览与成像 */
watch(
	() => props.mirror,
	(v) => {
		if (v !== undefined) {
			camera.mirror.value = v
			camera.syncMirror()
		}
	}
)
/** H5：flash 运行中修改 → 手电筒开关（仅 torch 有对应能力） */
watch(
	() => props.flash,
	(v) => camera.setTorch(v === 'torch')
)
// #endif

// #ifndef H5
/** 原生 camera 的 flash 属性直传（off/on/auto/torch） */
const flashMode = computed(() => props.flash || 'off')
// #endif

const isFallback = computed(() => camera.mode.value === 'fallback')
// 兜底模式下无实时流，隐藏前后置切换（仅 H5 存在兜底态）；非 H5 恒可切换
const canSwitch = computed(() => {
	let allowed = true
	// #ifdef H5
	allowed = !isFallback.value
	// #endif
	return allowed
})

// ---------------- 人脸取景引导（仅 H5） ----------------

// #ifdef H5
let face: ReturnType<typeof useFaceDetection> | null = null
let faceInited = false

/** 内置人脸框样式（比例坐标 → 百分比定位） */
const faceBoxes = computed(() =>
	face && showFaceBox.value
		? face.faces.value.map((f) => ({
				style: `left:${(f.x * 100).toFixed(2)}%;top:${(f.y * 100).toFixed(2)}%;width:${(f.width * 100).toFixed(2)}%;height:${(f.height * 100).toFixed(2)}%`,
		  }))
		: []
)

const faceGuideOpts = computed(() => (props.faceGuide === true ? ({} as SkFaceGuideOptions) : props.faceGuide || null))
const showFaceBox = computed(() => !!faceGuideOpts.value && faceGuideOpts.value.showBox !== false && !isFallback.value)

/** 人脸事件：@face 逐轮抛出；0↔有 切换抛 face-detected/face-lost；可选自动快门 */
const bindFaceEvents = (fd: ReturnType<typeof useFaceDetection>) => {
	const acOpt = faceGuideOpts.value && faceGuideOpts.value.autoCapture
	const stableMs = (typeof acOpt === 'object' && acOpt && acOpt.stableMs) || 1200
	let hasFace = false
	let armed = true
	let stableTimer: ReturnType<typeof setTimeout> | null = null
	watch(
		fd.faces,
		(list) => {
			emit('face', list)
			const has = list.length > 0
			if (has === hasFace) return
			hasFace = has
			if (has) {
				emit('face-detected')
				if (acOpt && armed) {
					stableTimer = setTimeout(async () => {
						const r = await capture()
						// 自动快门一次后需要人脸离开画面再回来才会再次触发，避免连拍
						if (r) armed = false
					}, stableMs)
				}
			} else {
				emit('face-lost')
				armed = true
				if (stableTimer) {
					clearTimeout(stableTimer)
					stableTimer = null
				}
			}
		},
		{ deep: true }
	)
}

// 预览流停止（卸载/切换/断流）时暂停检测；恢复由 ready 时的 trySetupFaceGuide 接管
watch(
	() => camera.streaming.value,
	(v) => {
		if (!v && face) face.stop()
	}
)

onUnmounted(() => {
	if (face) face.dispose()
})
// #endif

/** 相机就绪（含断流恢复/切换重启）后启动或恢复检测；非 H5 端无操作 */
const trySetupFaceGuide = async () => {
	// #ifdef H5
	if (!faceGuideOpts.value || camera.mode.value !== 'stream') return
	const video = camera.getVideo()
	if (!video) return
	if (!face) {
		face = useFaceDetection({
			...faceGuideOpts.value,
			onError: (message) => emit('error', { code: 'FACE_GUIDE_UNAVAILABLE', message }),
		})
		bindFaceEvents(face)
	}
	if (!faceInited) {
		faceInited = await face.init()
		if (!faceInited) return
	}
	face.start(video, () => camera.mirror.value)
	// #endif
}

const handleReady = () => {
	emit('ready')
	trySetupFaceGuide()
}

/** 开启相机 */
const start = async () => {
	// #ifdef H5
	const el = typeof document !== 'undefined' ? document.getElementById(stageId) : null
	if (el) camera.mountVideo(el as unknown as HTMLElement)
	await camera.start()
	// #endif
	// #ifdef MP
	// 小程序：<camera> 自动预览，但先做授权预检，拒绝权限时给出明确错误而非黑屏
	uni.authorize({
		scope: 'scope.camera',
		success: () => emit('ready'),
		fail: () => emit('error', { code: 'PERMISSION_DENIED', message: '相机权限被拒绝，请在小程序设置中开启摄像头权限' }),
	})
	// #endif
	// #ifdef APP-PLUS
	emit('ready')
	// #endif
}

/** 关闭相机 */
const stop = () => {
	// #ifdef H5
	camera.stop()
	// #endif
}

// #ifndef H5
let cameraCtx: any = null

/** 原生端拍照质量与 quality prop 联动 */
const nativeQuality = computed(() => (props.quality > 0.8 ? 'high' : props.quality > 0.5 ? 'normal' : 'low'))

/**
 * 小程序/App 端裁剪：用离屏 canvas 2d 按 crop 区域裁剪照片。
 * 原生 camera 预览同样是 cover 表现（铺满容器、中心裁切），
 * 因此复用与 H5 完全一致的 mapRectToSource 映射，保证取景框所见即所得。
 */
const cropNativePhoto = (src: string) =>
	new Promise<{ path: string; width: number; height: number } | null>((resolve) => {
		uni.getImageInfo({
			src,
			success: (info: any) => {
				const query = uni.createSelectorQuery().in(instance?.proxy as any)
				query.select('.sk-camera').boundingClientRect()
				query.select(`#${cropCanvasId}`).fields({ node: true } as any, () => {})
				query.exec((res: any[]) => {
					const stage = res && res[0]
					const canvas = res && res[1] && res[1].node
					const cw = (stage && stage.width) || 0
					const ch = (stage && stage.height) || 0
					const rect = resolveCropRect(props.crop, cw, ch)
					if (!canvas || !rect || !cw || !ch) return resolve(null)
					// 预览容器像素 → 照片原始像素（与 H5 共用同一映射）
					const sc = mapRectToSource(rect, cw, ch, info.width, info.height)
					canvas.width = sc.width
					canvas.height = sc.height
					const ctx = canvas.getContext('2d')
					const img = canvas.createImage()
					img.onload = () => {
						ctx.drawImage(img, sc.x, sc.y, sc.width, sc.height, 0, 0, sc.width, sc.height)
						uni.canvasToTempFilePath(
							{
								canvas,
								fileType: 'jpg',
								quality: props.quality,
								success: (r: any) => resolve({ path: r.tempFilePath, width: sc.width, height: sc.height }),
								fail: () => resolve(null),
							} as any,
							instance?.proxy as any
						)
					}
					img.onerror = () => resolve(null)
					img.src = src
				})
			},
			fail: () => resolve(null),
		})
	})

/**
 * 原生端拍照。
 * 关键：sk-camera 是自定义组件，<camera> 位于组件内部，
 * createCameraContext 必须传入组件实例（this/proxy），
 * 否则上下文绑定到页面找不到 camera，takePhoto 的 success/fail 均不会触发。
 */
const captureNative = () =>
	new Promise<SkCameraCaptureResult | null>((resolve) => {
		if (!cameraCtx) cameraCtx = uni.createCameraContext(instance?.proxy as any)
		cameraCtx.takePhoto({
			quality: nativeQuality.value as any,
			success: async (res: any) => {
				let tempFilePath = res.tempImagePath
				let width = 0
				let height = 0
				let cropped = false
				// 启用 crop 时按取景框区域裁剪；裁剪失败则降级返回原图
				if (props.crop) {
					const c = await cropNativePhoto(res.tempImagePath)
					if (c) {
						tempFilePath = c.path
						width = c.width
						height = c.height
						cropped = true
					}
				}
				const result: SkCameraCaptureResult = {
					base64: '',
					tempFilePath,
					width,
					height,
					facing: facing.value,
					cropped,
					source: 'stream',
				}
				emit('capture', result)
				resolve(result)
			},
			fail: (err: any) => {
				emit('error', { code: 'UNKNOWN', message: (err && err.errMsg) || '拍照失败', raw: err })
				resolve(null)
			},
		})
	})
const onNativeError = (e: any) =>
	emit('error', { code: 'UNKNOWN', message: (e && e.detail && e.detail.errMsg) || '相机错误' })
// #endif

/** 拍照 */
const capture = async (): Promise<SkCameraCaptureResult | null> => {
	// #ifdef H5
	const result = await camera.capture()
	if (result) emit('capture', result)
	return result
	// #endif
	// #ifndef H5
	return await captureNative()
	// #endif
}

/** 前后置切换 */
const switchCamera = async () => {
	// #ifdef H5
	await camera.switchCamera()
	// #endif
	// #ifndef H5
	facing.value = facing.value === 'user' ? 'environment' : 'user'
	emit('switch', facing.value)
	// #endif
}

/** 内置关闭：抛出 @close；navigateOnClose 时自动返回上一页（无上一页则回首页） */
const handleClose = () => {
	stop()
	emit('close')
	if (!props.navigateOnClose) return
	const pages = getCurrentPages()
	if (pages.length <= 1) uni.reLaunch({ url: '/pages/index/index' })
	else uni.navigateBack()
}

// ---------------- 设备能力（H5：手电筒/变焦/多设备；原生端为占位实现） ----------------

/** 手电筒开关（需 getCapabilities().torch 为 true） */
const setTorch = (on: boolean): Promise<boolean> => {
	let ret = Promise.resolve(false)
	// #ifdef H5
	ret = camera.setTorch(on)
	// #endif
	return ret
}

/** 设置变焦倍数，范围见 getCapabilities().zoom */
const setZoom = (zoom: number): Promise<boolean> => {
	let ret = Promise.resolve(false)
	// #ifdef H5
	ret = camera.setZoom(zoom)
	// #endif
	return ret
}

/** 查询当前轨道能力（手电筒/变焦范围），原生端返回空能力 */
const getCapabilities = (): { torch: boolean; zoom: { min: number; max: number; step: number } | null } => {
	let ret: { torch: boolean; zoom: { min: number; max: number; step: number } | null } = { torch: false, zoom: null }
	// #ifdef H5
	ret = camera.getCapabilities()
	// #endif
	return ret
}

/** 已授权的摄像头设备列表（多摄设备才有多个） */
const getDevices = (): SkCameraDevice[] => {
	let ret: SkCameraDevice[] = []
	// #ifdef H5
	ret = camera.devices.value
	// #endif
	return ret
}

/** 切换到指定设备（会重启相机） */
const switchDevice = (deviceId: string): Promise<void> => {
	let ret: Promise<void> = Promise.resolve()
	// #ifdef H5
	ret = camera.switchDevice(deviceId)
	// #endif
	return ret
}

onMounted(() => {
	if (props.autoStart) start()
})

defineExpose({
	start,
	stop,
	capture,
	switchCamera,
	handleClose,
	getStream: () => camera.getStream(),
	setTorch,
	setZoom,
	getCapabilities,
	getDevices,
	switchDevice,
})
</script>

<style>
@import './sk-camera.css';
</style>
