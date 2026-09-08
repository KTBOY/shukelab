<!--
  挂载探针：把 sk-swipe-page 的懒挂载 / keepAlive / LRU 淘汰变成可读数字。
  组件自身 onMounted 时向父级上报一次；父级用常驻数组累计，
  因此页面被卸载重建后计数会继续增长，而 keepAlive 常驻时始终为 1。
  内部带一个可滚动 scroll-view，用于验证「滑走再滑回滚动位置保留」。
-->
<template>
  <view class="probe">
    <view class="probe__head">
      <text class="probe__title">页面 {{ index + 1 }}</text>
      <text class="probe__count">第 {{ generation }} 次挂载</text>
    </view>
    <scroll-view class="probe__scroll" scroll-y>
      <view v-for="n in 40" :key="n" class="probe__row">
        <text class="probe__row-text">行 {{ n }} · 滚到中间再滑走，滑回后位置不变说明 keepAlive 生效</text>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'

const props = defineProps<{ index: number }>()

const emit = defineEmits<{ mount: [index: number] }>()

/** 本实例的挂载世代（组件被销毁重建后从 1 重新计） */
const generation = ref(0)

onMounted(() => {
  generation.value += 1
  emit('mount', props.index)
})
</script>

<style lang="scss" scoped>
.probe {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__head {
    flex-shrink: 0;
    padding: 16rpx 24rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.04);
  }

  &__title {
    font-size: 28rpx;
    font-weight: 700;
    color: #222;
  }

  &__count {
    font-size: 24rpx;
    color: #fa5151;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__row {
    padding: 20rpx 24rpx;
    border-bottom: 2rpx solid #f0f1f2;
  }

  &__row-text {
    font-size: 24rpx;
    color: #888;
  }
}
</style>
