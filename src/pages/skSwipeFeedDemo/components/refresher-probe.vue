<!--
  下拉头读数探针：把 sk-scroll-list #refresher 插槽的作用域参数渲染成可读数字，
  并在 state 变化时上报父级，用于记录状态机轨迹。
  settling 只持续 200ms，肉眼容易漏看，靠轨迹才能确认收合态真的走到了。
-->
<template>
  <view class="probe" :class="`probe--${state}`">
    <text class="probe__state">{{ state }}</text>
    <view class="probe__nums">
      <text class="probe__num">dy {{ dyText }}px</text>
      <text class="probe__num">progress {{ progressText }}%</text>
    </view>
    <view class="probe__track">
      <view class="probe__bar" :style="{ width: barWidth }"></view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue'
import type { SkScrollListRefresherState } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'

const props = defineProps<{
  state: SkScrollListRefresherState
  dy: number
  progress: number
}>()

const emit = defineEmits<{ change: [state: SkScrollListRefresherState] }>()

const dyText = computed(() => (props.dy ?? 0).toFixed(1))
const progressText = computed(() => ((props.progress ?? 0) * 100).toFixed(0))
const barWidth = computed(() => `${Math.min(Math.abs(props.progress ?? 0) * 100, 100).toFixed(1)}%`)

watch(
  () => props.state,
  (state) => emit('change', state),
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.probe {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  &__state {
    font-size: 26rpx;
    font-weight: 700;
    color: #1677ff;
  }

  &--loosing &__state {
    color: #fa5151;
  }

  &--refreshing &__state,
  &--settling &__state {
    color: #07c160;
  }

  &__nums {
    display: flex;
    gap: 20rpx;
  }

  &__num {
    font-size: 20rpx;
    color: #999;
  }

  &__track {
    width: 200rpx;
    height: 6rpx;
    border-radius: 3rpx;
    background: #eef0f2;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 3rpx;
    background: #1677ff;
  }
}
</style>
