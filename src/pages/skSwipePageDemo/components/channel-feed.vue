<!--
  频道页信息流：无状态展示组件。
  数据实例与滚动位置由页面层（tabs-linkage.vue）按 channel.id 持有并传入，
  本组件卸载重挂只重建视图——下拉刷新/触底加载四态全部交给 sk-scroll-list 内置指示器渲染。
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
    initial-loading-text="正在加载"
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
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SkScrollListExpose } from '@/uni_modules/sk-scroll-list/components/sk-scroll-list/sk-scroll-list.types'
import type { ChannelFeedState } from '../mock'

const props = defineProps<{ state: ChannelFeedState }>()

/** 数据实例从页面层注入，本组件不持有数据 */
const { list, loading, refreshing, finished, error, loadNext, reload } = props.state.feed

const listRef = ref<SkScrollListExpose>()

const scrollToTop = (smooth = true) => {
  listRef.value?.scrollToTop(smooth)
}

defineExpose({ scrollToTop })

onMounted(() => {
  props.state.start()
  const { lastScrollTop } = props.state
  if (lastScrollTop > 0) {
    // 列表首帧渲染后再还原位置，过早设置会被内容高度变化顶掉
    nextTick(() => listRef.value?.setScrollTop(lastScrollTop))
  }
})

/** LRU 淘汰时把滚动位置写回页面层实例，回滑重建后还原 */
onBeforeUnmount(() => {
  props.state.lastScrollTop = listRef.value?.getScrollTop() ?? 0
})
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
