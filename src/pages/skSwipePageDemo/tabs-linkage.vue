<!--
	案例：仿小黑盒频道页——sk-scroll-tabs + sk-swipe-page + sk-scroll-list + usePagedList 四件套
	组件零耦合，页面用 v-model / 事件把三者接起来：
	- 点击 tab → v-model 联动 → sk-swipe-page 翻页（change.source === 'method'）
	- 滑动内容区 → v-model 回写 tabIndex → tab 高亮跟随并自动滚入可视区
	- 再次点击当前 tab（re-click）→ 该频道列表平滑回到顶部
	- 下拉刷新 / 触底加载：频道页内的 sk-scroll-list + usePagedList
	懒挂载（激活 ±1 页）+ maxAlive=4（LRU 常驻上限，最多保留 4 个频道的滚动位置）
-->
<template>
  <view class="demo-page">
    <sk-scroll-tabs v-model:current="tabIndex" :tabs="channels" active-color="#fa5151" @re-click="onTabReClick" />
    <sk-swipe-page v-model:current="tabIndex" :count="channels.length" :max-alive="4" :height="pageHeight + 'px'">
      <template #page="{ index, mounted }">
        <view v-if="mounted" class="channel">
          <channel-feed :ref="(el) => setFeedRef(index, el)" :channel="channels[index]" />
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
import type { SkScrollListExpose } from '@/uni_modules/sk-scroll-list/components/sk-scroll-list/sk-scroll-list.types'
import ChannelFeed from './components/channel-feed.vue'
import { createChannels, getContentHeight } from './mock'

const channels = createChannels(8)
const tabIndex = ref(0)

/** 内容区高度 = 窗口高度 - 顶部 tabs 高度 */
const pageHeight = getContentHeight(44)

/** 各频道页列表实例（用于 re-click 回顶） */
const feedRefs = new Map<number, SkScrollListExpose>()
const setFeedRef = (index: number, el: any) => {
  if (el) feedRefs.set(index, el as SkScrollListExpose)
  else feedRefs.delete(index)
}

/** 再次点击当前频道 tab：列表平滑回到顶部 */
const onTabReClick = (payload: ReClickPayload & SkScrollTabsItem) => {
  feedRefs.get(payload.index)?.scrollToTop(true)
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
