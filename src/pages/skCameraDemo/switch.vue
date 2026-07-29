<template>
	<view class="page">
		<view v-if="!img" class="stage">
			<sk-camera ref="cam" :show-controls="false" @switch="onSwitch" @capture="onCapture" @error="onError" />
			<view class="bar">
				<text class="bar__tip">当前：{{ facing === 'user' ? '前置' : '后置' }}</text>
				<view class="bar__btns">
					<view class="btn" @tap="toggle">切换前后置</view>
					<view class="btn btn--primary" @tap="shoot">拍照</view>
				</view>
			</view>
		</view>
		<view v-else class="preview">
			<image class="preview__img" :src="img" mode="widthFix" />
			<view class="btn" @tap="reset">重拍</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { SkCameraFacing } from '@/uni_modules/sk-camera/components/sk-camera/sk-camera.type'

const cam = ref()
const img = ref('')
const facing = ref<SkCameraFacing>('user')

const onSwitch = (f: SkCameraFacing) => (facing.value = f)
const toggle = () => cam.value?.switchCamera()
const shoot = () => cam.value?.capture()
// 小程序/App 返回 tempFilePath，H5 返回 base64，两端兼容
const onCapture = (res: any) => (img.value = res.tempFilePath || res.base64)
const onError = (e: any) => uni.showToast({ title: e.message, icon: 'none' })
const reset = () => (img.value = '')
</script>

<style lang="scss" scoped>
.page,
.stage {
	height: 100vh;
	/* #ifdef H5 */
	/* H5 导航栏是 DOM 元素占视口高度；小程序/App 导航栏为原生，减 44px 会在底部留白 */
	height: calc(100vh - 44px);
	/* #endif */
	position: relative;
}
.bar {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 30rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
	background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.55));
	text-align: center;
}
.bar__tip {
	color: #fff;
	font-size: 28rpx;
}
.bar__btns {
	margin-top: 24rpx;
	display: flex;
	justify-content: center;
	gap: 40rpx;
}
.btn {
	padding: 0 48rpx;
	height: 84rpx;
	line-height: 84rpx;
	color: #fff;
	background: rgba(255, 255, 255, 0.18);
	border-radius: 42rpx;
}
.btn--primary {
	background: #1f8fff;
}
.preview {
	min-height: 100vh;
	background: #111;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.preview__img {
	width: 100%;
}
</style>
