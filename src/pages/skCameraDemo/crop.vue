<template>
	<view class="page">
		<view v-if="!img" class="stage">
			<!-- 裁剪区域完全由外部传入；取景框用 :style 绑定同一 region，两者始终一致 -->
			<sk-camera :crop="region" @capture="onCapture" @error="onError">
				<template #overlay>
					<view class="frame" :style="frameStyle"></view>
				</template>
			</sk-camera>
			<!-- 切换不同的自定义裁剪区域，演示区域可自由传入 -->
			<view class="switcher">
				<view
					v-for="p in presets"
					:key="p.name"
					:class="['chip', { 'chip--active': p.name === current }]"
					@tap="use(p)"
				>{{ p.name }}</view>
			</view>
		</view>

		<view v-else class="preview">
			<text class="preview__tip">已按「{{ current }}」区域裁剪输出</text>
			<image class="preview__img" :src="img" mode="widthFix" />
			<view class="btn" @tap="reset">重拍</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { SkCameraCropRegion } from '@/uni_modules/sk-camera/components/sk-camera/sk-camera.type'

// 裁剪区域完全由外部自定义传入（相对预览可视区域的比例 0~1）
const presets: { name: string; region: SkCameraCropRegion }[] = [
	{ name: '方形', region: { x: 0.1, y: 0.26, width: 0.8, height: 0.48 } },
	{ name: '竖向', region: { x: 0.2, y: 0.12, width: 0.6, height: 0.76 } },
	{ name: '宽幅', region: { x: 0.05, y: 0.34, width: 0.9, height: 0.32 } },
]
const current = ref(presets[0].name)
const region = ref<SkCameraCropRegion>(presets[0].region)
const img = ref('')

// 取景框位置 = 当前 region（保证所见即所得）
const frameStyle = computed<CSSProperties>(() => ({
	left: `${region.value.x * 100}%`,
	top: `${region.value.y * 100}%`,
	width: `${region.value.width * 100}%`,
	height: `${region.value.height * 100}%`,
}))

const use = (p: { name: string; region: SkCameraCropRegion }) => {
	current.value = p.name
	region.value = p.region
}
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
/* 取景框：虚线框，位置/大小由 region 动态决定，四周背景压暗 */
.frame {
	position: absolute;
	border: 4rpx dashed rgba(255, 255, 255, 0.9);
	border-radius: 12rpx;
	box-shadow: 0 0 0 1000rpx rgba(0, 0, 0, 0.4);
}
.switcher {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 220rpx;
	z-index: 4;
	display: flex;
	justify-content: center;
	gap: 24rpx;
}
.chip {
	padding: 0 32rpx;
	height: 72rpx;
	line-height: 72rpx;
	color: #fff;
	font-size: 28rpx;
	background: rgba(255, 255, 255, 0.22);
	border-radius: 36rpx;
}
.chip--active {
	background: #1f8fff;
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
