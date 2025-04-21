<template>
	<view class="bg-header" v-if="!img"></view>
	<div class="container" v-if="!img">
		<take-photos ref="takePhotosRef" :fixedWidth="640" :fixedHeight="748"
			photosFaceBorder="/static/mypass_man_xk.png" photosBorder="/static/mypass_cjtp_img.png"
			@tankePhotosImage="tankePhotosImage">

		</take-photos>

	</div>
	<div class="img" v-if="img">
		<image :src="img" v-if="img"></image>
	</div>
</template>

<script lang="ts" setup>
	import { onLoad } from '@dcloudio/uni-app';
	import { ref, nextTick } from 'vue';

	const takePhotosRef = ref()
	const img = ref()
	const tankePhotosImage = (e) => {
		console.log(e)
		img.value = e
	}

	onLoad(async () => {
		await nextTick()
		takePhotosRef.value.initPhotos()
	})
</script>

<style lang="scss" scoped>
	.bg-header {
		width: 750rpx;
		height: 320rpx;
		background:linear-gradient(180deg, #1f8fff, #5d9ad6 51%, rgba(31, 143, 255, 0));
		position: absolute;
		z-index: -1;
	}

	.container {
		height: calc(100vh - 88rpx);
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 2;
		margin: 0 auto;
	}

	.img {
		display: flex;
		align-items: center;
		height: calc(100vh - 88rpx);
	}
</style>