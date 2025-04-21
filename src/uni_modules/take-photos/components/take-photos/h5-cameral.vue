<!--
 * @Author: zlc
 * @Date: 2023-02-28 14:39:19
 * @LastEditTime: 2023-07-20 18:06:35
 * @LastEditors: zlc
 * @Description: H5端拍照
 * @FilePath: \idds-uniapp\src\packageA\components\Camera\H5Cameral.vue
-->
<template>
	<view class="camera_con" :style="{ height: `${fixedHeight - 44}rpx` }">
		<video id="myVideo" :class="['camera-box', props.facingMode == 'user' ? 'camera-box_video' : '']" playsinline
			:webkit-playsinline="true" x5-playsinline autoplay muted object-fit="cover" @play="play"></video>

		<view class="image-info" :style="{
        width: `${fixedWidth}rpx`,
      }">
			<view class="cover_view">
				<image class="img" :src="photosFaceBorder"  v-if="photosBorder"/>

				<image class="img2" :src="photosBorder" v-if="photosBorder" />
			</view>
		</view>
	</view>
</template>
<script setup lang="ts">
	import { onMounted, ref } from 'vue';

	const props = defineProps({
		facingMode: {
			type: String,
			default: 'user',
		},
		fixedWidth: {
			type: Number,
			default: 640
		},
		fixedHeight: {
			type: Number,
			default: 748
		},
		photosBorder: {
			type: String,
		},
		photosFaceBorder: {
			type: String,
		}
	});



	const heightStyle = ref();
	onMounted(() => {
		uni.getSystemInfo({
			success: function (res) {
				heightStyle.value = res.safeArea.height;
			},
		});
	});
	const play = (e) => {
		uni.showToast({
			title: '摄像头已打开',
			icon: 'none',
		});
	};
</script>
<style lang="scss" scoped>
	video {}

	.camera-box_video {
		transform: rotateY(180deg);
		-webkit-transform: rotateY(180deg);
		/* Safari 和 Chrome */
		-moz-transform: rotateY(180deg);
	}

	:deep(.uni-video-bar) {
		display: none;
	}

	:deep(.uni-video-cover) {
		display: none;
	}

	.camera_con {


		position: relative;
	}

	.camera-box {
		width: 750rpx;
		height: 100%;
	}

	.image-info {
		background-color: transparent;
		opacity: 1;
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		height: 100%;
		width: 100%;
	}

	.cover_view {
		position: relative;
		width: 100%;
		height: 100%;


	}

	.img {
		width: 100%;
		height: 100%;
		border-radius: 16rpx;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		object-fit: contain;
	}

	.img2 {
		width: 100%;
		height: 100%;
	}
</style>