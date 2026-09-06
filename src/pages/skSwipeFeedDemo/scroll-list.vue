<!--
	案例：sk-scroll-list 滚动列表容器专项——数据状态与插槽
	1. 基础用法：触底加载 + 到底文案 + scrollToTop 回顶
	2. 首屏失败重试：内置错误态（点击重试）→ 成功后正常分页
	3. #empty 空态插槽 + 自定义 finished 文案 + #footer 插槽整体替换
	4. #error 插槽整体替换首屏错误态
	5. lowerThreshold 触底阈值 + 四个文案 prop 定制
	下拉刷新头的视觉与状态机在 refresher.vue 单独演示，本页不重复。
	所有列表的数据流均来自 usePagedList（状态受控，组件不持有数据）。
-->
<template>
  <scroll-view class="demo-page" :scroll-y="true" :show-scrollbar="false">
    <!-- 1. 基础用法 -->
    <view class="demo-block">
      <view class="demo-block__head">
        <text class="demo-block__title">基础用法（触底加载 + 回顶按钮）</text>
        <text class="demo-block__action" @click="baseRef?.scrollToTop(true)">回顶</text>
      </view>
      <sk-scroll-list
        ref="baseRef"
        class="demo-list"
        :refreshing="base.refreshing.value"
        :loading="base.loading.value"
        :finished="base.finished.value"
        :error="!!base.error.value"
        :empty="base.list.value.length === 0"
        height="300px"
        finished-text="没有更多了"
        @refresh="base.reload()"
        @load-more="base.loadNext()"
        @retry="base.loadNext()"
      >
        <view v-for="item in base.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
    </view>

    <!-- 2. 首屏失败重试 -->
    <view class="demo-block">
      <text class="demo-block__title">首屏失败重试（第 1 次请求必失败，点击重试）</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="retry.refreshing.value"
        :loading="retry.loading.value"
        :finished="retry.finished.value"
        :error="!!retry.error.value"
        :empty="retry.list.value.length === 0"
        height="220px"
        @refresh="retry.reload()"
        @load-more="retry.loadNext()"
        @retry="retry.loadNext()"
      >
        <view v-for="item in retry.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
    </view>

    <!-- 3. 空态 + 自定义 footer -->
    <view class="demo-block">
      <text class="demo-block__title">#empty 空态插槽 / 自定义 finished 文案 / #footer 插槽</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="emptyList.refreshing.value"
        :loading="emptyList.loading.value"
        :finished="emptyList.finished.value"
        :empty="emptyList.list.value.length === 0"
        height="160px"
        @refresh="emptyList.reload()"
        @load-more="emptyList.loadNext()"
      >
        <template #empty>
          <view class="center-tip">
            <text class="center-tip__icon">🍪</text>
            <text class="center-tip__text">空空如也，去别处逛逛吧</text>
          </view>
        </template>
        <view v-for="item in emptyList.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <sk-scroll-list
        class="demo-list demo-list--gap"
        :refreshing="customFooter.refreshing.value"
        :loading="customFooter.loading.value"
        :finished="customFooter.finished.value"
        :error="!!customFooter.error.value"
        height="160px"
        finished-text="换个文案"
        @refresh="customFooter.reload()"
        @load-more="customFooter.loadNext()"
      >
        <view v-for="item in customFooter.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
        <template #footer="{ finished }">
          <view v-if="finished" class="end-line"><text class="end-line__text">— 到底啦 —</text></view>
        </template>
      </sk-scroll-list>
    </view>

    <!-- 4. #error 插槽 -->
    <view class="demo-block">
      <view class="demo-block__head">
        <text class="demo-block__title">#error 插槽（整体替换首屏错误态）</text>
        <text class="demo-block__action" @click="customError.reload()">重新加载</text>
      </view>
      <sk-scroll-list
        class="demo-list"
        :refreshing="customError.refreshing.value"
        :loading="customError.loading.value"
        :finished="customError.finished.value"
        :error="!!customError.error.value"
        :empty="customError.list.value.length === 0"
        height="180px"
        @refresh="customError.reload()"
        @load-more="customError.loadNext()"
        @retry="customError.loadNext()"
      >
        <template #error>
          <view class="center-tip">
            <text class="center-tip__icon">📡</text>
            <text class="center-tip__text">信号不好，点击这里重试</text>
          </view>
        </template>
        <view v-for="item in customError.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
    </view>

    <!-- 5. 触底阈值 + 文案定制 -->
    <view class="demo-block">
      <text class="demo-block__title">lowerThreshold 提前触底（200px）+ 四个文案 prop 定制</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="threshold.refreshing.value"
        :loading="threshold.loading.value"
        :finished="threshold.finished.value"
        :error="!!threshold.error.value"
        :empty="threshold.list.value.length === 0"
        height="240px"
        :lower-threshold="200"
        loading-text="正在拼命加载"
        finished-text="· 全部内容已加载完毕 ·"
        error-text="出错了，点我重来"
        empty-text="这里什么都没有"
        @refresh="threshold.reload()"
        @load-more="threshold.loadNext()"
        @retry="threshold.loadNext()"
      >
        <view v-for="item in threshold.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-state">
        <text class="demo-state__text">距底部还有 200px 就触发 load-more，长列表可用来做预加载</text>
      </view>
    </view>

    <view class="demo-tip">
      <text class="demo-tip__text">所有列表互相独立：各自的 loading / finished / error 互不影响</text>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { SkScrollListExpose } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'
import { usePagedList } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import { makeFetcher } from './mock'

// 1. 基础：18 条 / 每页 12 条
const baseRef = ref<SkScrollListExpose>()
const base = usePagedList(makeFetcher(18), { pageSize: 12 })

// 2. 失败重试：首次请求必失败
const retry = usePagedList(makeFetcher(12, { failFirst: 1 }), { pageSize: 6 })

// 3. 空态 + 自定义 footer
const emptyList = usePagedList(makeFetcher(0, { empty: true }), { pageSize: 6 })
const customFooter = usePagedList(makeFetcher(6), { pageSize: 6 })

// 4. #error 插槽：前 2 次必失败，点「重新加载」后成功
const customError = usePagedList(makeFetcher(10, { failFirst: 2 }), { pageSize: 5 })

// 5. 触底阈值 + 文案定制
const threshold = usePagedList(makeFetcher(40), { pageSize: 10 })
</script>

<style lang="scss" scoped>
/* App.vue 全局 page{height:100%;overflow:hidden} 关掉了原生滚动，所以根节点用 scroll-view，需要确定高度 */
.demo-page {
  height: 100%;
  box-sizing: border-box;
  background: #f7f8fa;
  padding-bottom: 40rpx;
}

.demo-block {
  margin: 24rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }

  &__title {
    display: block;
    margin-bottom: 20rpx;
    font-size: 26rpx;
    color: #666;
  }

  &__action {
    font-size: 24rpx;
    color: #1677ff;
  }
}

.demo-list {
  border: 2rpx solid #eef0f2;
  border-radius: 12rpx;
  overflow: hidden;

  &--gap {
    margin-top: 20rpx;
  }
}

.row {
  padding: 22rpx 28rpx;
  border-bottom: 2rpx solid #f2f3f5;

  &__title {
    font-size: 26rpx;
    color: #444;
  }
}

.center-tip {
  padding: 32rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;

  &__icon {
    font-size: 48rpx;
  }

  &__text {
    font-size: 24rpx;
    color: #999;
  }
}

.end-line {
  padding: 28rpx 0;
  display: flex;
  justify-content: center;

  &__text {
    font-size: 22rpx;
    color: #bbb;
    letter-spacing: 4rpx;
  }
}

.demo-state {
  padding-top: 16rpx;

  &__text {
    font-size: 22rpx;
    color: #999;
  }
}

.demo-tip {
  padding: 28rpx 32rpx 0;

  &__text {
    font-size: 24rpx;
    color: #aaa;
  }
}
</style>
