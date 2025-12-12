<template>
	<view class="z z-1">Z</view>
	<view class="z z-2">Z</view>
	<view class="z z-3">Z</view>
	<view class="z z-4">Z</view>

</template>

<script>
</script>

<style lang="scss">
	/* From Uiverse.io by necatimertmetin */
	.z {
		position: absolute;
		font-size: 38rpx;
		opacity: 0;
	}

	.z-1 {
		animation: swayUpToRight 2s ease-out infinite;
	}

	.z-2 {
		animation: swayUpToRight 2s ease-out 0.5s infinite;
	}

	.z-3 {
		animation: swayUpToRight 2s ease-out 1s infinite;
	}

	.z-4 {
		animation: swayUpToRight 2s ease-out 1.5s infinite;
	}

	@keyframes swayUpToRight {
		0% {
			transform: translate(0, 0) rotate(0deg);
			opacity: 1;
		}

		100% {
			transform: translate(80rpx, -100rpx) rotate(30deg);
			opacity: 0;
		}
	}
</style>