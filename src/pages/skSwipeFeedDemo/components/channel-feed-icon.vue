<!--
  频道信息流列表（自定义图片刷新图标版）
  与 channel-feed.vue 的唯一区别：通过 #refresher 插槽把内置自绘头整体换成一张图片图标。
  图标路径做成 prop，换成自己的品牌 logo 即可复用。

  状态驱动方式（这是自定义刷新头的关键，内置头也是这么做的）：
  - pulling：按 progress 旋转 0 → 360deg，跟手。transform 不加 transition，否则会拖手。
  - loosing：转到满圈并轻微放大，提示「松手即刷新」。
  - refreshing / settling：交给 CSS animation 常转。动画会覆盖内联 transform，所以这两个状态下不再写内联旋转。
  - settling：整体 opacity 淡出，落在 uni 原生 refresher 300ms 高度收合窗口内，避免两段式跳变。
    自定义内容不会自动淡出，必须自己处理。
-->
<template>
  <sk-scroll-list
    ref="listRef"
    :refreshing="refreshing"
    :loading="loading"
    :finished="finished"
    :error="!!error"
    :empty="list.length === 0"
    height="100%"
    @refresh="reload()"
    @load-more="loadNext()"
    @retry="loadNext()"
  >
    <template #refresher="{ state, progress }">
      <view class="icon-refresher" :class="{ 'icon-refresher--out': state === 'settling' }">
        <image
          class="icon-refresher__img"
          :class="{
            'icon-refresher__img--spin': state === 'refreshing' || state === 'settling',
            'icon-refresher__img--ready': state === 'loosing',
          }"
          :src="iconSrc"
          :style="iconStyle(state, progress)"
          mode="aspectFit"
        ></image>
        <text class="icon-refresher__text">{{ stateText(state) }}</text>
      </view>
    </template>

    <view v-for="item in list" :key="item.id" class="feed__item">
      <view class="feed__body">
        <text class="feed__title">{{ item.title }}</text>
        <text class="feed__desc">{{ item.desc }}</text>
        <text class="feed__meta">{{ item.views }} 浏览</text>
      </view>
      <image class="feed__thumb" :src="item.image" mode="aspectFill"></image>
    </view>
  </sk-scroll-list>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { SkScrollListExpose, SkScrollListRefresherState } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'
import { usePagedList } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import type { Channel } from '../mock'
import { createChannelFetcher } from '../mock'

const props = withDefaults(
  defineProps<{
    channel: Channel
    /** 刷新图标路径，换成自己的品牌图即可 */
    iconSrc?: string
  }>(),
  { iconSrc: '/static/zdy.png' }
)

/** 每页条数 */
const PAGE_SIZE = 10

const { list, loading, refreshing, finished, error, loadNext, reload } = usePagedList(
  createChannelFetcher(props.channel.id),
  {
    pageSize: PAGE_SIZE,
  }
)

const listRef = ref<SkScrollListExpose>()

/** 回到顶部（供「再次点击当前频道 tab」调用） */
const scrollToTop = (smooth = true) => {
  listRef.value?.scrollToTop(smooth)
}

/** 旋转交给 CSS 动画的两个状态，不再写内联 transform（动画优先级高于内联，写了也是白费） */
const iconStyle = (state: SkScrollListRefresherState, progress: number) => {
  if (state === 'refreshing' || state === 'settling') return {}
  const p = Math.min(Math.max(progress, 0), 1)
  return {
    transform: `rotate(${Math.round(p * 360)}deg) scale(${(0.7 + p * 0.3).toFixed(3)})`,
    opacity: (0.35 + p * 0.65).toFixed(3),
  }
}

const stateText = (state: SkScrollListRefresherState) => {
  if (state === 'refreshing' || state === 'settling') return '正在刷新...'
  if (state === 'loosing') return '松手立即刷新'
  if (state === 'pulling') return '下拉刷新'
  return ''
}

defineExpose({ scrollToTop })
</script>

<style lang="scss" scoped>
.icon-refresher {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease-out;

  &--out {
    opacity: 0;
  }

  &__img {
    width: 56rpx;
    height: 56rpx;
  }

  &__img--ready {
    transform: rotate(360deg) scale(1.1);
  }

  &__img--spin {
    animation: icon-refresher-spin 0.9s linear infinite;
  }

  &__text {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #999;
  }
}

@keyframes icon-refresher-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.feed__item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #f0f1f2;
  background: #fff;

  .feed__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
    margin-right: 20rpx;
  }

  .feed__title {
    font-size: 30rpx;
    color: #222;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .feed__desc {
    font-size: 24rpx;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .feed__meta {
    font-size: 22rpx;
    color: #bbb;
  }

  .feed__thumb {
    width: 200rpx;
    height: 140rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
  }
}
</style>
