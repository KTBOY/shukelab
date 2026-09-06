<!--
  首屏骨架屏：形状与 channel-feed 的卡片布局一一对应（左三行文字 + 右缩略图），
  加载完成替换为真实数据时不发生布局跳动。透明度呼吸代替位移，小程序端开销最小。
-->
<template>
  <view class="skeleton">
    <view v-for="n in rows" :key="n" class="skeleton__row">
      <view class="skeleton__body">
        <view class="skeleton__line skeleton__line--title"></view>
        <view class="skeleton__line"></view>
        <view class="skeleton__line skeleton__line--short"></view>
      </view>
      <view class="skeleton__thumb"></view>
    </view>
  </view>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>

<style lang="scss" scoped>
.skeleton {
  &__row {
    display: flex;
    align-items: center;
    padding: 24rpx 32rpx;
    border-bottom: 2rpx solid #f0f1f2;
    background: #fff;
  }

  &__body {
    flex: 1;
    min-width: 0;
    margin-right: 20rpx;
    display: flex;
    flex-direction: column;
    gap: 14rpx;
  }

  &__line {
    height: 24rpx;
    border-radius: 6rpx;
    background: #eef0f2;
    animation: skeleton-blink 1.2s ease-in-out infinite;

    &--title {
      width: 62%;
      height: 30rpx;
    }

    &--short {
      width: 30%;
    }
  }

  &__thumb {
    width: 200rpx;
    height: 140rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
    background: #eef0f2;
    animation: skeleton-blink 1.2s ease-in-out infinite;
  }
}

@keyframes skeleton-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>
