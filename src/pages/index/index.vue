<template>
	<view class="content">
		<view class="head">
			<view class="cover">
				<image class="logo" src="https://p2.music.126.net/rNQH185Dp2lcG2yII_Aiwg==/18159534045164927.jpg"></image>
			</view>
			<view class="name"> Welcome to shuke lab</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const title = ref('Hello');
</script>

<style lang="scss" scoped> 
.head{
	padding: 20rpx 30rpx;
}
.cover {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 3rpx solid #f1f8fd;
  box-shadow:20rpx 20rpx 20rpx rgba(0,0,0,0.07),
    -20rpx -20rpx 20rpx rgba(255,255,255,0.7),
    6rpx 6rpx 6rpx rgba(0,0,0,0.09),
    -6rpx -6rpx 6rpx rgba(255,255,255,0.9);
	.logo{
		width: 100%;
		height: 100%;
	}
}

.name{
	color: #aeafb0;
}



</style>
