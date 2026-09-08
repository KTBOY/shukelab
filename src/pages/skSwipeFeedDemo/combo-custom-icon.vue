<!--
	案例：组合示例 + 自定义下拉刷新图标
	与 index.vue（频道页组合示例）完全相同的三件套联动，唯一区别是每个频道列表的
	下拉刷新头换成了一张图片图标（/static/zdy.png），通过 sk-scroll-list 的 #refresher 插槽实现。
	联动链路：点 tab 翻页 / 滑内容区 tab 跟随 / 再点当前 tab 列表回顶 / 下拉刷新 / 触底加载。
	图标路径是 channel-feed-icon 的 iconSrc prop，换成自己的品牌图即可。
-->
<template>
  <view class="demo-page">
    <sk-scroll-tabs v-model:current="tabIndex" :tabs="channels" active-color="#fa5151" @re-click="onTabReClick" />
    <sk-swipe-page v-model:current="tabIndex" :count="channels.length" :max-alive="4" :height="pageHeight + 'px'">
      <template #page="{ index, mounted }">
        <view v-if="mounted" class="channel">
          <channel-feed-icon
            :ref="(el) => setFeedRef(index, el)"
            :channel="channels[index]"
            icon-src="/static/zdy.png"
            :height="feedHeight"
          />
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
import ChannelFeedIcon from './components/channel-feed-icon.vue'
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
