<!-- 频道页内的信息流列表：sk-scroll-list 容器（下拉刷新 + 触底加载 + 状态 footer）+ usePagedList 数据流 -->
<template>
  <sk-scroll-list
    ref="listRef"
    :refreshing="refreshing"
    :loading="loading"
    :finished="finished"
    :error="!!error"
    :empty="list.length === 0"
    :height="height"
    @refresh="reload()"
    @load-more="loadNext()"
    @retry="loadNext()"
  >
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
import type { SkScrollListExpose } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'
import { usePagedList } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import type { Channel } from '../mock'
import { createChannelFetcher } from '../mock'

const props = withDefaults(
  defineProps<{
    channel: Channel
    /** 列表容器高度；小程序端请传 px（百分比在组件包裹节点下会塌陷） */
    height?: string
  }>(),
  { height: '100%' }
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

defineExpose({ scrollToTop })
</script>

<style lang="scss" scoped>
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
