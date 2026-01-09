<template>
<view class="loader">
  <view class="box box-1">
    <view class="side-left"></view>
    <view class="side-right"></view>
    <view class="side-top"></view>
  </view>
  <view class="box box-2">
    <view class="side-left"></view>
    <view class="side-right"></view>
    <view class="side-top"></view>
  </view>
  <view class="box box-3">
    <view class="side-left"></view>
    <view class="side-right"></view>
    <view class="side-top"></view>
  </view>
  <view class="box box-4">
    <view class="side-left"></view>
    <view class="side-right"></view>
    <view class="side-top"></view>
  </view>
</view>
</template>

<script setup>

</script>

<style scoped>


.loader {
  scale: 3;
  height: 50rpx;
  width: 40rpx;
}

.box {
  position: relative;
  opacity: 0;
  left: 10rpx;
}

.side-left {
  position: absolute;
  background-color: #286cb5;
  width: 19rpx;
  height: 5rpx;
  transform: skew(0deg, -25deg);
  top: 14rpx;
  left: 10rpx;
}

.side-right {
  position: absolute;
  background-color: #2f85e0;
  width: 19rpx;
  height: 5rpx;
  transform: skew(0deg, 25deg);
  top: 14rpx;
  left: -9rpx;
}

.side-top {
  position: absolute;
  background-color: #5fa8f5;
  width: 20rpx;
  height: 20rpx;
  rotate: 45deg;
  transform: skew(-20deg, -20deg);
}

.box-1 {
  animation: from-left 4s infinite;
}

.box-2 {
  animation: from-right 4s infinite;
  animation-delay: 1s;
}

.box-3 {
  animation: from-left 4s infinite;
  animation-delay: 2s;
}

.box-4 {
  animation: from-right 4s infinite;
  animation-delay: 3s;
}

@keyframes from-left {
  0% {
    z-index: 20;
    opacity: 0;
    translate: -20rpx -6rpx;
  }

  20% {
    z-index: 10;
    opacity: 1;
    translate: 0rpx 0rpx;
  }

  40% {
    z-index: 9;
    translate: 0rpx 4rpx;
  }

  60% {
    z-index: 8;
    translate: 0rpx 8rpx;
  }

  80% {
    z-index: 7;
    opacity: 1;
    translate: 0rpx 12rpx;
  }

  100% {
    z-index: 5;
    translate: 0rpx 30rpx;
    opacity: 0;
  }
}

@keyframes from-right {
  0% {
    z-index: 20;
    opacity: 0;
    translate: 20rpx -6rpx;
  }

  20% {
    z-index: 10;
    opacity: 1;
    translate: 0rpx 0rpx;
  }

  40% {
    z-index: 9;
    translate: 0rpx 4rpx;
  }

  60% {
    z-index: 8;
    translate: 0rpx 8rpx;
  }

  80% {
    z-index: 7;
    opacity: 1;
    translate: 0rpx 12rpx;
  }

  100% {
    z-index: 5;
    translate: 0rpx 30rpx;
    opacity: 0;
  }
}
</style>
