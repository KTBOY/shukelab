<!--
	案例：sk-scroll-list 综合示例——readme 文档中的能力逐项演示
	1. 基础用法：触底加载 + 到底文案 + scrollToTop 回顶按钮
	2. 首屏失败重试：错误态（点击重试）→ 成功后正常分页
	3. 空态 + 自定义 finished 文案 + #footer 插槽整体替换
	4. 刷新区定制：refresher-background + refresherDefaultStyle=white + customStyle
	所有列表的数据流均来自 usePagedList（状态受控，组件不持有数据）。
-->
<template>
  <view class="demo-page">
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
        :empty="base.list.value.length === 0 && !base.loading.value"
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
      <text class="demo-block__title">首屏失败重试（前 1 次请求必失败，点击重试）</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="retry.refreshing.value"
        :loading="retry.loading.value"
        :finished="retry.finished.value"
        :error="!!retry.error.value"
        :empty="retry.list.value.length === 0 && !retry.loading.value"
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
      <text class="demo-block__title">空态插槽 / 自定义 finished 文案 / #footer 插槽</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="emptyList.refreshing.value"
        :loading="emptyList.loading.value"
        :finished="emptyList.finished.value"
        :empty="emptyList.list.value.length === 0 && !emptyList.loading.value"
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

    <!-- 4. 刷新区定制 -->
    <view class="demo-block">
      <text class="demo-block__title">刷新区定制（深色背景 + 白色圆点 + customStyle 圆角）</text>
      <sk-scroll-list
        class="demo-list demo-list--dark"
        :refreshing="dark.refreshing.value"
        :loading="dark.loading.value"
        :finished="dark.finished.value"
        :error="!!dark.error.value"
        :empty="dark.list.value.length === 0 && !dark.loading.value"
        height="220px"
        refresher-background="#2b2b33"
        refresher-default-style="white"
        :custom-style="{ borderRadius: '12px', overflow: 'hidden' }"
        @refresh="dark.reload()"
        @load-more="dark.loadNext()"
      >
        <view v-for="item in dark.list.value" :key="item.id" class="row row--dark">
          <text class="row__title row__title--dark">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
    </view>

    <view class="demo-tip">
      <text class="demo-tip__text">所有列表互相独立：各自的 loading / finished / error 互不影响</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { SkScrollListExpose } from '@/uni_modules/sk-scroll-list/components/sk-scroll-list/sk-scroll-list.types'
import type { PageFetcher } from '@/composables/use-paged-list'
import { usePagedList } from '@/composables/use-paged-list'
import { delay } from './mock'

/** 生成模拟分页接口：可指定总条数 / 前N次失败 / 空数据 */
function makeFetcher(
  total: number,
  opts: { failFirst?: number; empty?: boolean } = {}
): PageFetcher<{ id: string; title: string }> {
  let calls = 0
  return async (page, pageSize) => {
    await delay(400)
    calls++
    if (opts.failFirst && calls <= opts.failFirst) {
      throw new Error('mock network error')
    }
    if (opts.empty) return { list: [], total: 0 }
    const start = (page - 1) * pageSize
    const end = Math.min(start + pageSize, total)
    const list = Array.from({ length: Math.max(end - start, 0) }, (_, i) => ({
      id: `t${total}-${start + i}`,
      title: `条目 ${start + i + 1}`,
    }))
    return { list, total }
  }
}

// 1. 基础：18 条 / 每页 6 条 → 3 页到底
const baseRef = ref<SkScrollListExpose>()
const base = usePagedList(makeFetcher(18), { pageSize: 12 })

// 2. 失败重试：首次请求必失败
const retry = usePagedList(makeFetcher(12, { failFirst: 1 }), { pageSize: 6 })

// 3. 空态 + 自定义 footer
const emptyList = usePagedList(makeFetcher(0, { empty: true }), { pageSize: 6 })
const customFooter = usePagedList(makeFetcher(6), { pageSize: 6 })

// 4. 深色刷新区
const dark = usePagedList(makeFetcher(20), { pageSize: 8 })
</script>

<style lang="scss" scoped>
.demo-page {
  min-height: 100vh;
  background: #f7f8fa;
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

  &--dark {
    border-color: #3a3a44;
  }
}

.row {
  padding: 22rpx 28rpx;
  border-bottom: 2rpx solid #f2f3f5;

  &--dark {
    background: #2b2b33;
    border-bottom-color: #3a3a44;
  }

  &__title {
    font-size: 26rpx;
    color: #444;

    &--dark {
      color: #ddd;
    }
  }
}

.center-tip {
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

.demo-tip {
  padding: 28rpx 32rpx 40rpx;

  &__text {
    font-size: 24rpx;
    color: #aaa;
  }
}
</style>
