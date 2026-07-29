<template>
	<view class="page">
		<view v-if="!img" class="stage">
			<!-- 固定区域裁剪（基础用法）：取景框大小 = 裁剪区域，改 cropRegion 一处即可自定义；取景框图片由使用者自行提供 -->
			<sk-camera :crop="cropRegion" @capture="onCapture" @error="onError">
				<template #overlay>
					<image class="frame" :style="frameStyle" src="/static/mypass_cjtp_img@2x.png" mode="scaleToFill" />
				</template>
			</sk-camera>
		</view>

		<view v-else class="preview">
			<text class="preview__tip">已按取景框区域裁剪输出</text>
			<image class="preview__img" :src="img" mode="widthFix" />
			<view class="btn" @tap="reset">重拍</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { SkCameraCropRegion } from '@/uni_modules/sk-camera/components/sk-camera/sk-camera.type'

// 取景框大小/位置（相对预览可视区域，0~1）——想放大/缩小就改这一处；裁剪与取景框共用
const cropRegion : SkCameraCropRegion = { x: 0.08, y: 0.25, width: 0.84, height: 0.44 }

// 取景框样式直接由 cropRegion 推导，保证取景框与裁剪区域完全一致
const frameStyle = {
	left: `${cropRegion.x * 100}%`,
	top: `${cropRegion.y * 100}%`,
	width: `${cropRegion.width * 100}%`,
	height: `${cropRegion.height * 100}%`,
}

const img = ref('')
// 小程序/App 返回 tempFilePath，H5 返回 base64，两端兼容
const onCapture = (res : any) => (img.value = res.tempFilePath || res.base64)
const onError = (e : any) => uni.showToast({ title: e.message, icon: 'none' })
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
/* 取景框：大小由 cropRegion 决定（scaleToFill 让图片铺满该区域），四周背景压暗 */
.frame {
	position: absolute;
	box-shadow: 0 0 0 1000rpx rgba(0, 0, 0, 0.4);
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
