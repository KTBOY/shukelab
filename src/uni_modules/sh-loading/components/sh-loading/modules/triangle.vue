<template>
  <view class="ui-abstergo">
    <view class="abstergo-loader">
      <view class="loader-line line1"></view>
      <view class="loader-line line2"></view>
      <view class="loader-line line3"></view>
    </view>
  </view>
</template>

<script></script>

<style scoped>
.ui-abstergo {
  --primary: #000000;
  --secondary: rgba(255, 255, 255, 0.3);
  --shadow-blur: 3rpx;
  --text-shadow-blur: 3rpx;
  --animation-duration: 2s;
  --size: 1;
}

.abstergo-loader view {
  box-sizing: content-box;
}

.ui-abstergo {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 30rpx;
  transform: scale(var(--size));
}

.abstergo-loader {
  width: 103rpx;
  height: 90rpx;
  position: relative;
}

.loader-line {
  width: 50rpx;
  border-right: 12rpx solid transparent;
  border-left: 12rpx solid transparent;
  border-top: 21rpx solid var(--primary);
  position: absolute;
  filter: drop-shadow(0 0 var(--shadow-blur) var(--secondary));
}

.line1 {
  top: 27rpx;
  left: 7rpx;
  transform: rotate(-60deg);
  animation: line1 var(--animation-duration) linear infinite alternate;
}

.line2 {
  bottom: 2rpx;
  left: 0;
  transform: rotate(180deg);
  animation: line2 var(--animation-duration) linear infinite alternate;
}

.line3 {
  bottom: 16rpx;
  right: -9rpx;
  transform: rotate(60deg);
  animation: line3 var(--animation-duration) linear infinite alternate;
}

@keyframes line1 {
  0%,
  40% {
    top: 27rpx;
    left: 7rpx;
    transform: rotate(-60deg);
  }
  60%,
  100% {
    top: 22rpx;
    left: 14rpx;
    transform: rotate(60deg);
  }
}

@keyframes line2 {
  0%,
  40% {
    bottom: 2rpx;
    left: 0;
    transform: rotate(180deg);
  }
  60%,
  100% {
    bottom: 5rpx;
    left: -8rpx;
    transform: rotate(300deg);
  }
}

@keyframes line3 {
  0%,
  40% {
    bottom: 16rpx;
    right: -9rpx;
    transform: rotate(60deg);
  }
  60%,
  100% {
    bottom: 7rpx;
    right: -11rpx;
    transform: rotate(180deg);
  }
}
</style>
