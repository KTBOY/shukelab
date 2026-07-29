<template>
	<view class="page">
		<view class="stage">
			<sk-camera
				ref="cam"
				:auto-start="false"
				:show-controls="false"
				@ready="onReady"
				@capture="onCapture"
				@error="onError"
			/>
			<view v-if="!ready" class="stage__hint">相机未开启，点击下方「开启」</view>
		</view>

		<view class="panel">
			<view class="btn" @tap="handleStart">开启</view>
			<view class="btn" @tap="handleStop">关闭</view>
			<view class="btn btn--primary" @tap="handleCapture">拍照</view>
		</view>

		<image v-if="img" class="thumb" :src="img" mode="aspectFill" />
	</view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const cam = ref()
const ready = ref(false)
const img = ref('')

const handleStart = () => cam.value?.start()
const handleStop = () => {
	cam.value?.stop()
	ready.value = false
}
const handleCapture = () => cam.value?.capture()
const onReady = () => (ready.value = true)
// 小程序/App 返回 tempFilePath，H5 返回 base64，两端兼容
const onCapture = (res: any) => (img.value = res.tempFilePath || res.base64)
const onError = (e: any) => uni.showToast({ title: e.message, icon: 'none' })
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: #111;
	display: flex;
	flex-direction: column;
}
.stage {
	position: relative;
	height: 60vh;
}
.stage__hint {
	position: absolute;
	top: 50%;
	left: 0;
	right: 0;
	transform: translateY(-50%);
	text-align: center;
	color: rgba(255, 255, 255, 0.7);
	font-size: 28rpx;
}
.panel {
	display: flex;
	justify-content: center;
	gap: 30rpx;
	padding: 40rpx;
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
.thumb {
	align-self: center;
	width: 320rpx;
	height: 320rpx;
	border-radius: 16rpx;
	border: 2rpx solid rgba(255, 255, 255, 0.3);
}
</style>
