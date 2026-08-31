<template>
	<view class="page">
		<view v-if="!img" class="stage">
			<!-- key 随自动快门开关变化：切换配置时重启相机，保证 face-guide 配置即时生效 -->
			<sk-camera
				:key="autoCapture ? 'auto' : 'manual'"
				:face-guide="faceGuide"
				@capture="onCapture"
				@error="onError"
				@face-detected="hasFace = true"
				@face-lost="hasFace = false"
			>
				<template #overlay>
					<view class="tip-bar">
						<view class="switch-row" @tap="autoCapture = !autoCapture">
							<text class="switch-row__label">自动快门 {{ autoCapture ? '开' : '关' }}</text>
							<text class="switch-row__hint">人脸稳定居框 1.5s 自动拍照</text>
						</view>
						<view class="status" :class="{ 'status--ok': hasFace }">
							{{ hasFace ? '已检测到人脸，请保持不动' : '请将人脸对准画面' }}
						</view>
					</view>
					<!-- #ifndef H5 -->
					<view class="mp-tip">人脸取景引导目前仅支持 H5 端（BlazeFace 端上检测）</view>
					<!-- #endif -->
				</template>
			</sk-camera>
		</view>

		<view v-else class="preview">
			<text class="preview__tip">{{ autoCapture ? '人脸稳定居框后已自动拍摄' : '手动拍摄完成' }}</text>
			<image class="preview__img" :src="img" mode="widthFix" />
			<view class="btn" @tap="retake">重拍</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

const autoCapture = ref(true)
const hasFace = ref(false)
const img = ref('')

/**
 * 人脸取景引导配置：
 * 模型与 wasm 使用项目自托管资源（离线可用），路径需带部署 base（如 /shukelab/）；
 * 生产环境可改传 CDN 或自有静态地址。检测全程端上推理，人脸数据不出端。
 */
let assetBase = '/'
// #ifdef H5
assetBase = import.meta.env.BASE_URL || '/'
// #endif
const faceGuide = computed(() => ({
	modelUrl: `${assetBase}static/models/blaze_face_short_range.tflite`,
	wasmPath: `${assetBase}static/mediapipe/wasm`,
	autoCapture: autoCapture.value ? { stableMs: 1500 } : false,
}))

const onCapture = (res: any) => (img.value = res.tempFilePath || res.base64)
const onError = (e: any) => uni.showToast({ title: e.message, icon: 'none' })
const retake = () => {
	img.value = ''
	hasFace.value = false
}
</script>

<style lang="scss" scoped>
.page,
.stage {
	height: 100vh;
	/* #ifdef H5 */
	height: calc(100vh - 44px);
	/* #endif */
	position: relative;
}
/* 覆盖层默认不拦截触摸，提示条需要点按，显式恢复 */
.tip-bar {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	padding: 30rpx;
	pointer-events: auto;
}
.switch-row {
	display: inline-flex;
	flex-direction: column;
	padding: 16rpx 28rpx;
	border-radius: 16rpx;
	background: rgba(0, 0, 0, 0.5);
}
.switch-row__label {
	color: #fff;
	font-size: 28rpx;
	font-weight: 600;
}
.switch-row__hint {
	color: rgba(255, 255, 255, 0.65);
	font-size: 22rpx;
}
.status {
	margin-top: 24rpx;
	display: inline-block;
	padding: 12rpx 28rpx;
	border-radius: 12rpx;
	color: #fff;
	font-size: 26rpx;
	background: rgba(0, 0, 0, 0.5);
}
.status--ok {
	background: rgba(46, 160, 87, 0.85);
}
.mp-tip {
	position: absolute;
	left: 30rpx;
	right: 30rpx;
	bottom: 220rpx;
	padding: 16rpx 24rpx;
	border-radius: 12rpx;
	background: rgba(0, 0, 0, 0.55);
	color: rgba(255, 255, 255, 0.85);
	font-size: 24rpx;
	text-align: center;
}
.preview {
	min-height: 100vh;
	/* #ifdef H5 */
	min-height: calc(100vh - 44px);
	/* #endif */
	background: #111;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.preview__tip {
	color: #fff;
	font-size: 28rpx;
	padding: 30rpx;
}
.preview__img {
	width: 70%;
}
.btn {
	margin: 40rpx;
	padding: 0 60rpx;
	height: 84rpx;
	line-height: 84rpx;
	color: #fff;
	background: #1f8fff;
	border-radius: 42rpx;
}
</style>
