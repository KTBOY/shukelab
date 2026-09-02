<!-- 案例：整页横滑基础用法（v-model 受控 + 懒挂载 mounted 标记） -->
<template>
  <view class="demo-page">
    <view class="load-status">
      <text class="load-status__text">当前第 {{ current + 1 }} / {{ count }} 页 · 激活页 ± 1 页才挂载内容</text>
    </view>
    <sk-swipe-page v-model:current="current" :count="count" :height="pageHeight + 'px'">
      <template #page="{ index, active, mounted }">
        <view v-if="mounted" class="panel" :class="`panel--${index % 4}`">
          <text class="panel__title">页面 {{ index + 1 }}</text>
          <text class="panel__desc">{{
            mounted ? (active ? '当前激活页' : '已挂载（keepAlive 常驻，滑回不重建）') : '未挂载'
          }}</text>
        </view>
      </template>
    </sk-swipe-page>
    <view class="demo-dots">
      <view
        v-for="i in count"
        :key="i"
        class="demo-dots__dot"
        :class="{ 'demo-dots__dot--active': i - 1 === current }"
        @click="current = i - 1"
      ></view>
    </view>
    <view class="demo-tip">
      <text class="demo-tip__text">左右滑动整页翻页，或点圆点切换（程序化翻页）</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { getContentHeight } from './mock'

/** 页面总数 */
const count = 6
const current = ref(0)

/** 内容区高度 = 窗口高度 - 状态条 - 圆点指示区 - 提示区 */
const pageHeight = getContentHeight(32 + 60 + 60)
</script>

<style lang="scss" scoped>
.demo-page {
  min-height: 100vh;
  background: #fff;
}

.load-status {
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;

  &__text {
    font-size: 24rpx;
    color: #666;
  }
}

.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &--0 {
    background: #e8f3ff;
  }
  &--1 {
    background: #eafff1;
  }
  &--2 {
    background: #fff7e8;
  }
  &--3 {
    background: #ffeef0;
  }

  &__title {
    font-size: 48rpx;
    font-weight: 700;
    color: #222;
  }

  &__desc {
    font-size: 24rpx;
    color: #888;
  }
}

.demo-dots {
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &__dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #ddd;

    &--active {
      width: 40rpx;
      border-radius: 8rpx;
      background: #fa5151;
    }
  }
}

.demo-tip {
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-size: 24rpx;
    color: #999;
  }
}
</style>
