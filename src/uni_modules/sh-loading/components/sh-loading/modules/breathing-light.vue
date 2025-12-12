<template>
	<!-- From Uiverse.io by terenceodonoghue --> 
	<view class="container">
	  <text></text>
	  <text></text>
	  <text></text>
	  <text></text>
	</view>
</template>

<script>
</script>

<style lang="scss">
	/* From Uiverse.io by terenceodonoghue */ 
	.container {
	  position: absolute;
	  top: 50%;
	  left: 50%;
	  border-radius: 50%;
	  height: 150rpx;
	  width: 150rpx;
	  animation: rotate_3922 1.2s linear infinite;
	  background-color: #9b59b6;
	  background-image: linear-gradient(#9b59b6, #84cdfa, #5ad1cd);
	}
	
	.container text {
	  position: absolute;
	  border-radius: 50%;
	  height: 100%;
	  width: 100%;
	  background-color: #9b59b6;
	  background-image: linear-gradient(#9b59b6, #84cdfa, #5ad1cd);
	}
	
	.container text:nth-of-type(1) {
	  filter: blur(5rpx);
	}
	
	.container text:nth-of-type(2) {
	  filter: blur(10rpx);
	}
	
	.container text:nth-of-type(3) {
	  filter: blur(25rpx);
	}
	
	.container text:nth-of-type(4) {
	  filter: blur(50rpx);
	}
	
	.container::after {
	  content: "";
	  position: absolute;
	  top: 10rpx;
	  left: 10rpx;
	  right: 10rpx;
	  bottom: 10rpx;
	  background-color: #fff;
	  border: solid 5rpx #ffffff;
	  border-radius: 50%;
	}
	
	@keyframes rotate_3922 {
	  from {
	    transform: translate(-50%, -50%) rotate(0deg);
	  }
	
	  to {
	    transform: translate(-50%, -50%) rotate(360deg);
	  }
	}

</style>