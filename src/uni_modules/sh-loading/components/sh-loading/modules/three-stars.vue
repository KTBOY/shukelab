<template>
  <view class="honeycomb-box">
    <view class="honeycomb">
      <view
        v-for="(item, index) in hexagons"
        :key="index"
        class="hexagon"
        :class="getHexagonClass(index)"
        :style="getHexagonStyle(index)"
      >
        <view class="top-triangle"></view>
        <view class="main-shape"></view>
        <view class="bottom-triangle"></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

// 定义hexagons数组用于v-for循环
const hexagons = ref(new Array(7).fill(null))

// 获取hexagon的class名称
const getHexagonClass = (index) => {
  return `hexagon-${index + 1}`
}

// 获取hexagon的样式（包括动画延迟）
const getHexagonStyle = (index) => {
  const positions = [
    { left: '-28rpx', top: '0' },
    { left: '-14rpx', top: '22rpx' },
    { left: '14rpx', top: '22rpx' },
    { left: '28rpx', top: '0' },
    { left: '14rpx', top: '-22rpx' },
    { left: '-14rpx', top: '-22rpx' },
    { left: '0', top: '0' },
  ]

  const delays = ['0s', '0.1s', '0.2s', '0.3s', '0.4s', '0.5s', '0.6s']

  return {
    ...positions[index],
    animationDelay: delays[index],
  }
}
</script>

<style scoped>
@keyframes honeycomb {
  0%,
  20% {
    opacity: 0;
    transform: scale(0);
  }

  30%,
  70% {
    opacity: 1;
    transform: scale(1);
  }

  80%,
  100% {
    opacity: 0;
    transform: scale(0);
  }
}

.honeycomb-box {
  overflow: hidden;
}

.honeycomb {
  position: relative;
  width: 24rpx;
  height: 24rpx;
}

.hexagon {
  position: absolute;
/*  animation: honeycomb 2.1s infinite; */
}

.main-shape {
  width: 24rpx;
  height: 12rpx;
  background: #000;
}

.top-triangle,
.bottom-triangle {
  position: absolute;
  left: 0;
  width: 0;
  height: 0;
  border-left: 12rpx solid transparent;
  border-right: 12rpx solid transparent;
}

.top-triangle {
  top: -6rpx;
  border-bottom: 6rpx solid #000;
}

.bottom-triangle {
  bottom: -6rpx;
  border-top: 6rpx solid #000;
}

/* 为每个hexagon定义位置 */
.hexagon-1 {
  left: -28rpx;
  top: 0;
}
.hexagon-2 {
  left: -14rpx;
  top: 22rpx;
}
.hexagon-3 {
  left: 14rpx;
  top: 22rpx;
}
.hexagon-4 {
  left: 28rpx;
  top: 0;
}
.hexagon-5 {
  left: 14rpx;
  top: -22rpx;
}
.hexagon-6 {
  left: -14rpx;
  top: -22rpx;
}
.hexagon-7 {
  left: 0;
  top: 0;
}
</style>
