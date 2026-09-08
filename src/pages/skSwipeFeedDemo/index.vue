<template>
  <view class="demo-page">
    <sk-scroll-tabs v-model:current="tabIndex" :tabs="channels" active-color="#fa5151" @re-click="onTabReClick" />
    <sk-swipe-page v-model:current="tabIndex" :count="channels.length" :max-alive="4" :height="pageHeight + 'px'">
      <template #page="{ index, mounted }">
        <view v-if="mounted" class="channel">
          <channel-feed :ref="(el) => setFeedRef(index, el)" :channel="channels[index]" :height="feedHeight" />
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
} from '@/uni_modules/sk-swipe-feed/components/sk-scroll-tabs/sk-scroll-tabs.types'
import type { SkScrollListExpose } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'
import ChannelFeed from './components/channel-feed.vue'
import { createChannels, getContentHeight } from './mock'

const channels = createChannels(8)
const tabIndex = ref(0)

/** 内容区高度 = 窗口高度 - 顶部 tabs 高度 */
const pageHeight = getContentHeight(44)

/** 列表容器高度：H5 父链确定，用 100% 即可；小程序端自定义组件包裹节点没有高度，
 *  百分比会塌成内容高导致列表不可滚，必须传 px */
let feedHeight = '100%'
// #ifdef MP-WEIXIN
feedHeight = pageHeight + 'px'
// #endif

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
/* uni-page-wrapper 在 H5 下已是 calc(100% - 44px)（扣掉导航栏），
   用 100vh 会比可用区高 44px 并被 page{overflow:hidden} 裁掉，故用 100% */
.demo-page {
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.channel {
  height: 100%;
  overflow: hidden;
}
</style>
