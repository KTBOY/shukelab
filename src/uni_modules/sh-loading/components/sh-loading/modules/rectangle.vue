<template>
	<view class="loader"></view>
</template>

<script>
</script>

<style scoped>
	/* From Uiverse.io by SchawnnahJ - 已转换为rpx单位 */ 
	.loader {
	 position: relative;
	 width: 50rpx;
	 height: 50rpx;
	 transform: rotate(165deg);
	}
	
	.loader:before, .loader:after {
	 content: "";
	 position: absolute;
	 top: 50%;
	 left: 50%;
	 display: block;
	 width: 10rpx;
	 height: 10rpx;
	 border-radius: 5rpx;
	 transform: translate(-50%, -50%);
	}
	
	.loader:before {
	 animation: before8 2s infinite;
	}
	
	.loader:after {
	 animation: after6 2s infinite;
	}
	
	@keyframes before8 {
	 0% {
	  width: 10rpx;
	  box-shadow: 20rpx -10rpx rgba(225, 20, 98, 0.75), -20rpx 10rpx rgba(111, 202, 220, 0.75);
	 }
	
	 35% {
	  width: 50rpx;
	  box-shadow: 0 -10rpx rgba(225, 20, 98, 0.75), 0 10rpx rgba(111, 202, 220, 0.75);
	 }
	
	 70% {
	  width: 10rpx;
	  box-shadow: -20rpx -10rpx rgba(225, 20, 98, 0.75), 20rpx 10rpx rgba(111, 202, 220, 0.75);
	 }
	
	 100% {
	  box-shadow: 20rpx -10rpx rgba(225, 20, 98, 0.75), -20rpx 10rpx rgba(111, 202, 220, 0.75);
	 }
	}
	
	@keyframes after6 {
	 0% {
	  height: 10rpx;
	  box-shadow: 10rpx 20rpx rgba(61, 184, 143, 0.75), -10rpx -20rpx rgba(233, 169, 32, 0.75);
	 }
	
	 35% {
	  height: 50rpx;
	  box-shadow: 10rpx 0 rgba(61, 184, 143, 0.75), -10rpx 0 rgba(233, 169, 32, 0.75);
	 }
	
	 70% {
	  height: 10rpx;
	  box-shadow: 10rpx -20rpx rgba(61, 184, 143, 0.75), -10rpx 20rpx rgba(233, 169, 32, 0.75);
	 }
	
	 100% {
	  box-shadow: 10rpx 20rpx rgba(61, 184, 143, 0.75), -10rpx -20rpx rgba(233, 169, 32, 0.75);
	 }
	}
	

</style>