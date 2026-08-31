/** 摄像头朝向：user 前置 / environment 后置 */
export type SkCameraFacing = 'user' | 'environment'

/** 分辨率预设或自定义宽高（仅作为 ideal 期望值，不作硬性约束） */
export type SkCameraResolution = '480p' | '720p' | '1080p' | { width: number; height: number }

/** 拍照输出格式：base64（默认）或额外附带 Blob */
export type SkCameraFormat = 'base64' | 'blob'

/** 闪光灯/手电筒模式。小程序/App 直传原生 camera；H5 端仅 'torch'（常亮手电筒）可通过轨道约束实现，'on'/'auto' 在 H5 无对应能力会被忽略 */
export type SkCameraFlash = 'off' | 'on' | 'auto' | 'torch'

/** 成像来源：实时媒体流 / 兜底拍照（环境不支持实时预览时） */
export type SkCameraSource = 'stream' | 'fallback'

/**
 * 裁剪区域：坐标均为相对“预览可视区域”的比例（0~1）。
 * 组件按 object-fit: cover 映射回原始像素，做到所见即所得（与屏幕上取景框位置一致）。
 * 例如取景框位于预览居中、宽 84%、高 50%：{ x: 0.08, y: 0.25, width: 0.84, height: 0.5 }
 */
export interface SkCameraCropRegion {
	/** 左上角 x，占预览宽度比例 0~1 */
	x: number
	/** 左上角 y，占预览高度比例 0~1 */
	y: number
	/** 裁剪宽度，占预览宽度比例 0~1 */
	width: number
	/** 裁剪高度，占预览高度比例 0~1 */
	height: number
}

/** 稳定错误码，便于业务侧分支处理 */
export type SkCameraErrorCode =
	| 'INSECURE_CONTEXT' // 非安全上下文（需 HTTPS 或 localhost）
	| 'NOT_SUPPORTED' // 浏览器不支持 getUserMedia
	| 'PERMISSION_DENIED' // 用户拒绝授权
	| 'NOT_FOUND' // 无可用摄像头
	| 'NOT_READABLE' // 摄像头被占用/无法启动
	| 'OVERCONSTRAINED' // 分辨率等约束不被满足
	| 'NOT_READY' // 相机尚未就绪
	| 'STREAM_LOST' // 预览流意外断开且自动恢复失败
	| 'FACE_GUIDE_UNAVAILABLE' // 人脸取景引导初始化失败（模型/运行库加载失败）
	| 'UNKNOWN'

/** 统一的错误结构 */
export interface SkCameraError {
	code: SkCameraErrorCode
	message: string
	raw?: unknown
}

/** 拍照结果 */
export interface SkCameraCaptureResult {
	/** base64（image/jpeg），H5 端始终返回 */
	base64: string
	/** Blob 对象，仅当 format 为 blob 时返回 */
	blob?: Blob | null
	/** 原生端（小程序/App）返回的临时文件路径 */
	tempFilePath?: string
	/** 输出图片宽度（px） */
	width: number
	/** 输出图片高度（px） */
	height: number
	/** 拍照时的摄像头朝向 */
	facing: SkCameraFacing
	/** 是否已按 crop 区域裁剪 */
	cropped: boolean
	/** 成像来源；兜底拍照（如微信 H5 不支持实时预览时）为 'fallback'，默认 'stream' */
	source?: SkCameraSource
}

/**
 * 人脸取景引导配置（仅 H5 端生效，基于 MediaPipe BlazeFace 端上检测，人脸数据不出端）。
 * `face-guide` 传 `true` 时使用全部默认值。
 */
export interface SkFaceGuideOptions {
	/** BlazeFace tflite 模型地址；默认官方 Google Storage 地址，国内/离线环境请自托管后传入 */
	modelUrl?: string
	/** @mediapipe/tasks-vision 的 wasm 目录地址；默认 jsdelivr CDN，可自托管 */
	wasmPath?: string
	/** 最低检测置信度 0~1，默认 0.5 */
	minConfidence?: number
	/** 检测节流间隔（ms），默认 200；低端机可调大 */
	interval?: number
	/** 是否渲染内置人脸框，默认 true */
	showBox?: boolean
	/** 人脸持续稳定在画面中达到时长后自动拍照；传对象可自定义稳定时长，默认 1200ms */
	autoCapture?: boolean | { stableMs?: number }
}

/** 单个人脸检测结果（供 @face 事件与内置人脸框渲染） */
export interface SkFaceBox {
	/** 人脸框，相对预览可视区域的比例（0~1，可能略微越界） */
	x: number
	y: number
	width: number
	height: number
	/** 置信度 0~1 */
	score: number
}

/** 可枚举的摄像头设备（授权后才有 label） */
export interface SkCameraDevice {
	deviceId: string
	label: string
}

/** 组件 Props 类型（供 defineProps 泛型与外部引用） */
export interface SkCameraProps {
	/** 摄像头朝向，默认 user（前置） */
	facing?: SkCameraFacing
	/** 分辨率预设或自定义宽高，默认 720p */
	resolution?: SkCameraResolution
	/** 是否水平镜像；不传时前置默认镜像、后置默认不镜像 */
	mirror?: boolean
	/** JPEG 质量 0~1，默认 0.92 */
	quality?: number
	/** 输出格式，默认 base64 */
	format?: SkCameraFormat
	/** 是否挂载后自动开启相机，默认 true */
	autoStart?: boolean
	/** 是否显示内置控制栏（关闭/拍照/切换），默认 true */
	showControls?: boolean
	/** 固定区域裁剪（相对预览可视区域）：true=居中最大正方形；传区域对象=预览内比例矩形。默认 false */
	crop?: boolean | SkCameraCropRegion
	/** 实时预览不可用时（如微信 iOS H5 限制）是否降级为系统拍照兜底，默认 true */
	fallback?: boolean
	/** 闪光灯/手电筒模式，默认 off；H5 端仅 torch 生效 */
	flash?: SkCameraFlash
	/** 人脸取景引导（仅 H5）：true 用默认配置，或传 SkFaceGuideOptions */
	faceGuide?: boolean | SkFaceGuideOptions
	/** 内置「关闭」按钮点击后是否自动执行返回上一页/回首页导航，默认 true；
	 * 关闭后可仅监听 @close 自行处理 */
	navigateOnClose?: boolean
}
