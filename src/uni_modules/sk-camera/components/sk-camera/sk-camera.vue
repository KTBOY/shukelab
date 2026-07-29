<template>
	<view class="sk-camera">
		<!-- #ifdef H5 -->
		<!-- H5：容器内由 use-camera 动态挂载原生 <video>，规避 uni video 组件承载媒体流的兼容问题 -->
		<view :id="stageId" class="sk-camera__stage"></view>
		<!-- #endif -->
		<!-- #ifndef H5 -->
		<!-- 小程序/App：降级为原生 camera 组件 -->
		<camera
			class="sk-camera__stage"
			:device-position="facing === 'user' ? 'front' : 'back'"
			flash="off"
			@error="onNativeError"
		></camera>
		<!-- 离屏画布：仅 crop 启用时渲染，用于拍照后按取景框区域裁剪（移出可视区不影响预览） -->
		<canvas v-if="crop" type="2d" :id="cropCanvasId" class="sk-camera__crop-canvas"></canvas>
		<!-- #endif -->

		<!-- 覆盖层：自定义取景框/水印 -->
		<view class="sk-camera__overlay">
			<slot name="overlay"></slot>
		</view>

		<!-- 控制栏：默认 关闭/拍照/前后置，可用 controls 插槽完全自定义 -->
		<view v-if="showControls" class="sk-camera__controls">
			<slot name="controls" :capture="capture" :switch-camera="switchCamera" :stop="stop" :close="handleClose" :facing="facing">
				<view class="sk-camera__ctrl" @tap="handleClose">关闭</view>
				<view class="sk-camera__ctrl sk-camera__ctrl--primary" @tap="capture">拍照</view>
				<view class="sk-camera__ctrl" @tap="switchCamera">{{ facing === 'user' ? '前置' : '后置' }}</view>
			</slot>
		</view>
	</view>
</template>

<script lang="ts" setup>
/**
 * SkCamera H5 拍照组件
 * @description H5 基于 getUserMedia 实现，小程序/App 优雅降级为原生 <camera>。
 * 支持前后置切换、约束逐级降级、镜像、固定区域裁剪、
 * 取景框/控制栏插槽与实例方法调用。
 *
 * @property {String} facing 摄像头朝向 user/environment，默认 user
 * @property {String|Object} resolution 分辨率预设 480p/720p/1080p 或 {width,height}，默认 720p
 * @property {Boolean} mirror 是否水平镜像，不传时前置默认镜像
 * @property {Number} quality JPEG 质量 0~1，默认 0.92
 * @property {String} format 输出格式 base64/blob，默认 base64
 * @property {Boolean} autoStart 挂载后是否自动开启相机，默认 true
 * @property {Boolean} showControls 是否显示内置控制栏，默认 true
 * @property {Boolean|Object} crop 固定区域裁剪，true=居中最大正方形或传比例区域，默认 false
 *
 * @event {Function} ready 相机就绪
 * @event {Function} capture 拍照完成，参数为 SkCameraCaptureResult
 * @event {Function} switch 前后置切换，参数为当前朝向
 * @event {Function} error 发生错误，参数为 SkCameraError
 */
import { getCurrentInstance, onMounted, ref, watch } from 'vue'
import { useCamera } from './use-camera'
import { resolveCropRect, mapRectToSource } from './utils'
import type {
	SkCameraCaptureResult,
	SkCameraError,
	SkCameraFacing,
	SkCameraProps,
} from './sk-camera.type'

defineOptions({ name: 'SkCamera' })

const props = withDefaults(defineProps<SkCameraProps>(), {
	facing: 'user',
	resolution: '720p',
	quality: 0.92,
	format: 'base64',
	autoStart: true,
	showControls: true,
	crop: false,
})

const emit = defineEmits<{
	(e: 'ready'): void
	(e: 'capture', result: SkCameraCaptureResult): void
	(e: 'switch', facing: SkCameraFacing): void
	(e: 'error', err: SkCameraError): void
}>()

const instance = getCurrentInstance()
/** 视图侧朝向态，用于原生 camera 的 device-position */
const facing = ref<SkCameraFacing>(props.facing)
/** 每个实例唯一的容器 id，供 H5 挂载原生 video */
const stageId = `sk-camera__stage_${instance?.uid ?? Math.floor(Math.random() * 1e6)}`
/** 离屏裁剪画布 id（小程序/App 端 crop 用） */
const cropCanvasId = `sk-camera__crop_${instance?.uid ?? Math.floor(Math.random() * 1e6)}`

const camera = useCamera({
	facing: props.facing,
	resolution: props.resolution,
	mirror: props.mirror,
	quality: props.quality,
	format: props.format,
	crop: props.crop,
	onReady: () => emit('ready'),
	onError: (e) => emit('error', e),
	onSwitch: (f) => emit('switch', f),
})

// 组合式内部朝向变化时同步到视图
watch(camera.facing, (v) => (facing.value = v))

/** 开启相机 */
const start = async () => {
	// #ifdef H5
	const el = typeof document !== 'undefined' ? document.getElementById(stageId) : null
	if (el) camera.mountVideo(el as unknown as HTMLElement)
	await camera.start()
	// #endif
	// #ifndef H5
	// 原生 camera 组件自动预览，直接视为就绪
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
			quality: 'high',
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

/** 内置关闭：优先返回上一页，无上一页则回首页 */
const handleClose = () => {
	stop()
	const pages = getCurrentPages()
	if (pages.length <= 1) uni.reLaunch({ url: '/pages/index/index' })
	else uni.navigateBack()
}

onMounted(() => {
	if (props.autoStart) start()
})

defineExpose({ start, stop, capture, switchCamera, getStream: () => camera.getStream() })
</script>

<style>
@import './sk-camera.css';
</style>
