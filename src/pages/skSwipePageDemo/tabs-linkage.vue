<!--
	案例：整页横滑频道页——sk-scroll-tabs + sk-swipe-page + sk-scroll-list + usePagedList 四件套
	组件零耦合，页面用 v-model / 事件把三者接起来：
	- 点击 tab → v-model 联动 → sk-swipe-page 翻页（change.source === 'method'）
	- 滑动内容区 → v-model 回写 tabIndex → tab 高亮跟随并自动滚入可视区
	- 再次点击当前 tab（re-click）→ 该频道列表平滑回到顶部
	- 下拉刷新 / 触底加载：频道页内的 sk-scroll-list 内置四态指示器
	懒挂载（激活 ±1 页）+ maxAlive=4（LRU 常驻上限）：数据实例常驻页面层，
	被淘汰的频道回滑时不重新请求第一页，滚动位置从页面层记录还原
-->
<template>
  <view class="demo-page">
    <sk-scroll-tabs v-model:current="tabIndex" :tabs="channels" active-color="#fa5151" @re-click="onTabReClick" />
    <sk-swipe-page v-model:current="tabIndex" :count="channels.length" :max-alive="4" :height="pageHeight + 'px'">
      <template #page="{ index, mounted }">
        <view v-if="mounted" class="channel">
          <channel-feed :ref="(el) => setPageRef(index, el)" :state="getFeedState(index)" />
        </view>
      </template>
    </sk-swipe-page>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type {
  ReClickPayload,
  SkScrollTabsItem,
} from '@/uni_modules/sk-scroll-tabs/components/sk-scroll-tabs/sk-scroll-tabs.types'
import ChannelFeed from './components/channel-feed.vue'
import type { ChannelFeedState } from './mock'
import { createChannels, createChannelFeedState, getContentHeight } from './mock'

const channels = createChannels(8)
const tabIndex = ref(0)

/** 内容区高度 = 窗口高度 - 顶部 tabs 高度 */
const pageHeight = getContentHeight(44)

/**
 * 频道数据实例：以 channel.id 为 key（不用数组下标，避免频道顺序变化时数据错位）。
 * maxAlive 淘汰的是页面组件，这里的数据与滚动位置存活。
 */
const feedStates = new Map<number, ChannelFeedState>(
  channels.map((channel) => [channel.id, createChannelFeedState(channel.id)])
)
const getFeedState = (index: number): ChannelFeedState => feedStates.get(channels[index].id) as ChannelFeedState

/** 各频道页实例（用于 re-click 回顶），页面卸载时由 :ref 回调清理 */
const pageRefs = new Map<number, { scrollToTop: (smooth?: boolean) => void }>()
const setPageRef = (index: number, el: any) => {
  if (el) pageRefs.set(index, el)
  else pageRefs.delete(index)
}

/** 再次点击当前频道 tab：列表平滑回到顶部 */
const onTabReClick = (payload: ReClickPayload & SkScrollTabsItem) => {
  pageRefs.get(payload.index)?.scrollToTop(true)
}
</script>

<style lang="scss" scoped>
.demo-page {
  height: 100vh;
  background: #fff;
  overflow: hidden;
}

.channel {
  height: 100%;
  overflow: hidden;
}
</style>
