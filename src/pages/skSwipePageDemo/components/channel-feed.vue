<!-- 频道页内的信息流列表：sk-scroll-list 容器（下拉刷新 + 触底加载 + 状态 footer）+ usePagedList 数据流 -->
<template>
  <sk-scroll-list
    ref="listRef"
    :refreshing="refreshing"
    :loading="loading"
    :finished="finished"
    :error="!!error"
    :empty="list.length === 0 && !loading"
    height="100%"
    @refresh="reload()"
    @load-more="loadNext()"
    @retry="loadNext()"
  >
    <!-- 自定义下拉头：state 为 idle/pulling/loosing/refreshing，dy 为实时下拉距离 -->
    <template #refresher="{ state, dy }">
      <view class="feed-refresher">
        <text class="feed-refresher__icon" :class="{ 'feed-refresher__icon--spin': state === 'refreshing' }">
          {{ state === 'refreshing' ? '◌' : state === 'loosing' ? '↑' : '↓' }}
        </text>
        <text class="feed-refresher__text">
          {{ state === 'refreshing' ? '正在刷新...' : state === 'loosing' ? '松手立即刷新' : '下拉刷新' }}
        </text>
        <text v-if="state === 'pulling' && dy > 0" class="feed-refresher__dy">{{ Math.round(dy) }}px</text>
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
import type { SkScrollListExpose } from '@/uni_modules/sk-scroll-list/components/sk-scroll-list/sk-scroll-list.types'
import { usePagedList } from '@/composables/use-paged-list'
import type { Channel } from '../mock'
import { createChannelFetcher } from '../mock'

const props = defineProps<{ channel: Channel }>()

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

defineExpose({ scrollToTop })
</script>

<style lang="scss" scoped>
.feed-refresher {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &__icon {
    font-size: 16px;
    color: #999;

    &--spin {
      display: inline-block;
      animation: feed-spin 0.8s linear infinite;
    }
  }

  &__text {
    font-size: 13px;
    color: #999;
  }

  &__dy {
    font-size: 12px;
    color: #ccc;
  }
}

@keyframes feed-spin {
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
