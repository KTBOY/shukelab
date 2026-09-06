<!--
	案例：自定义下拉刷新图标与上拉加载动画（#refresher / #footer 插槽）
	1. 自定义刷新图标：CSS 三点，pulling/loosing 阶段按 progress 跟手放大，refreshing 阶段跳动，settling 淡出
	2. 自定义上拉加载：#footer 整体替换内置状态机，error / loading / finished 三态全部自绘
	3. 深色主题自绘刷新头（进度条 + 圆环）
	4. 同时替换 #refresher 与 #footer 的完整示例
	两个插槽都是「整体替换」：一旦传入，内置视觉与内置状态机完全不参与，
	所有状态分支都要自己渲染，漏一个分支就会出现「加载中但什么都不显示」。
	图标全部用 CSS 画，不依赖图片与字体字形，小程序端可编译；
	换成自己的品牌图标时，把对应节点换成 image 并按 state 驱动动画即可。
-->
<template>
  <scroll-view class="demo-page" :scroll-y="true" :show-scrollbar="false">
    <!-- 1. 自定义刷新图标 -->
    <view class="demo-block">
      <text class="demo-block__title">1 · #refresher 自定义刷新图标（三点跟手 + 跳动 + 收合淡出）</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="dots.refreshing.value"
        :loading="dots.loading.value"
        :finished="dots.finished.value"
        :error="!!dots.error.value"
        :empty="dots.list.value.length === 0"
        height="260px"
        @refresh="dots.reload()"
        @load-more="dots.loadNext()"
        @retry="dots.loadNext()"
      >
        <template #refresher="{ state, progress }">
          <view class="dots" :class="{ 'dots--out': state === 'settling' }">
            <view class="dots__row">
              <view
                v-for="n in 3"
                :key="n"
                class="dots__dot"
                :class="{ 'dots__dot--run': state === 'refreshing' || state === 'settling' }"
                :style="dotStyle(state, progress, n)"
              ></view>
            </view>
            <text class="dots__text">{{ dotsText(state) }}</text>
          </view>
        </template>
        <view v-for="item in dots.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-tip">
        <text class="demo-tip__text">
          pulling / loosing 阶段三个点按 progress 依次放大（跟手，不加过渡所以不拖手）；refreshing 阶段换成错时跳动；settling 阶段整体淡出，落在原生 300ms 收合窗口内。自定义内容不会自动淡出，必须自己按 state 处理。
        </text>
      </view>
    </view>

    <!-- 2. 自定义上拉加载 -->
    <view class="demo-block">
      <view class="demo-block__head">
        <text class="demo-block__title">2 · #footer 自定义上拉加载（三态全自绘）</text>
        <text class="demo-block__action" @click="footerFeed.reset()">重置</text>
      </view>
      <sk-scroll-list
        class="demo-list"
        :refreshing="footerFeed.refreshing.value"
        :loading="footerFeed.loading.value"
        :finished="footerFeed.finished.value"
        :error="!!footerFeed.error.value"
        :empty="footerFeed.list.value.length === 0"
        height="280px"
        error-text="加载失败"
        @refresh="footerFeed.reload()"
        @load-more="footerFeed.loadNext()"
        @retry="footerFeed.loadNext()"
      >
        <!-- 整体替换内置 footer 状态机：error / loading / finished 三态都要自己渲染 -->
        <template #footer="{ loading, finished, error }">
          <view v-if="error" class="cfooter cfooter--error" @click="footerFeed.loadNext()">
            <text class="cfooter__text cfooter__text--error">加载失败，点击重试</text>
          </view>
          <view v-else-if="loading" class="cfooter">
            <view class="cfooter__bars">
              <view
                v-for="n in 4"
                :key="n"
                class="cfooter__bar"
                :style="{ animationDelay: (n - 1) * 0.12 + 's' }"
              ></view>
            </view>
            <text class="cfooter__text">正在加载</text>
          </view>
          <view v-else-if="finished" class="cfooter">
            <view class="cfooter__line"></view>
            <text class="cfooter__text cfooter__text--dim">已经到底了</text>
            <view class="cfooter__line"></view>
          </view>
        </template>
        <view v-for="item in footerFeed.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-tip">
        <text class="demo-tip__text">
          前 2 次请求必失败，可看到自绘的失败态；点重试或继续触底后进入加载态；18 条 / 每页 6 条，第 3 页到底后显示自绘的到底样式。传入 #footer 后内置的 loadingText / finishedText / errorText 全部失效，文案要自己写。
        </text>
      </view>
    </view>

    <!-- 3. 深色主题自绘刷新头 -->
    <view class="demo-block">
      <text class="demo-block__title">3 · 深色主题自绘刷新头（进度条 + 圆环 + customStyle 圆角）</text>
      <sk-scroll-list
        class="demo-list demo-list--dark"
        :refreshing="dark.refreshing.value"
        :loading="dark.loading.value"
        :finished="dark.finished.value"
        :error="!!dark.error.value"
        :empty="dark.list.value.length === 0"
        height="220px"
        refresher-background="#2b2b33"
        :custom-style="{ borderRadius: '12px', overflow: 'hidden' }"
        @refresh="dark.reload()"
        @load-more="dark.loadNext()"
        @retry="dark.loadNext()"
      >
        <template #refresher="{ state, progress }">
          <view class="dark-refresher" :class="{ 'dark-refresher--out': state === 'settling' }">
            <view v-if="state === 'refreshing' || state === 'settling'" class="dark-refresher__spinner"></view>
            <view v-else class="dark-refresher__track">
              <view class="dark-refresher__bar" :style="{ width: barWidth(progress) }"></view>
            </view>
            <text class="dark-refresher__text">{{ dotsText(state) }}</text>
          </view>
        </template>
        <view v-for="item in dark.list.value" :key="item.id" class="row row--dark">
          <text class="row__title row__title--dark">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
    </view>

    <!-- 4. 同时替换两者 -->
    <view class="demo-block">
      <text class="demo-block__title">4 · 同时替换 #refresher 与 #footer（一套视觉贯穿到底）</text>
      <sk-scroll-list
        class="demo-list demo-list--brand"
        :refreshing="both.refreshing.value"
        :loading="both.loading.value"
        :finished="both.finished.value"
        :error="!!both.error.value"
        :empty="both.list.value.length === 0"
        height="300px"
        refresher-background="#fff7f0"
        @refresh="both.reload()"
        @load-more="both.loadNext()"
        @retry="both.loadNext()"
      >
        <template #refresher="{ state, progress }">
          <view class="brand" :class="{ 'brand--out': state === 'settling' }">
            <view class="brand__ring" :class="{ 'brand__ring--spin': state === 'refreshing' || state === 'settling' }">
              <view class="brand__arc" :style="{ opacity: state === 'refreshing' || state === 'settling' ? 1 : progress }"></view>
            </view>
            <text class="brand__text">{{ dotsText(state) }}</text>
          </view>
        </template>
        <template #footer="{ loading, finished, error }">
          <view v-if="error" class="cfooter cfooter--error" @click="both.loadNext()">
            <text class="cfooter__text cfooter__text--error">出错了，点我重试</text>
          </view>
          <view v-else-if="loading" class="cfooter">
            <view class="brand__ring brand__ring--small brand__ring--spin"><view class="brand__arc"></view></view>
            <text class="cfooter__text">加载中</text>
          </view>
          <view v-else-if="finished" class="cfooter">
            <text class="cfooter__text cfooter__text--dim">· 全部内容已加载完毕 ·</text>
          </view>
        </template>
        <view v-for="item in both.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-tip">
        <text class="demo-tip__text">
          同一个圆环元素在刷新头与 footer 里复用：刷新头里靠 progress 控制弧的透明度（跟手），footer 里直接常转。整套视觉只有一处色值，换主题时改一个变量即可。
        </text>
      </view>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import type { SkScrollListRefresherState } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'
import { usePagedList } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import { makeFetcher } from './mock'

/** 刷新耗时拉长到 800ms，便于观察 refreshing → settling 的收合过程 */
const dots = usePagedList(makeFetcher(30, { delayMs: 800 }), { pageSize: 10 })
/** 前 2 次必失败，用于展示自绘的失败态 */
const footerFeed = usePagedList(makeFetcher(18, { failFirst: 2, delayMs: 700 }), { pageSize: 6 })
const dark = usePagedList(makeFetcher(20, { delayMs: 800 }), { pageSize: 8 })
const both = usePagedList(makeFetcher(24, { delayMs: 700 }), { pageSize: 8 })

/** 状态文案：三个自绘刷新头共用 */
const dotsText = (state: SkScrollListRefresherState): string => {
  if (state === 'refreshing' || state === 'settling') return '正在刷新...'
  if (state === 'loosing') return '松手立即刷新'
  if (state === 'pulling') return '下拉刷新'
  return ''
}

/**
 * 三点的样式：refreshing/settling 交给 CSS 动画（错时跳动），
 * pulling/loosing 阶段按 progress 依次放大做跟手效果，不加过渡避免拖手。
 */
const dotStyle = (state: SkScrollListRefresherState, progress: number, n: number) => {
  if (state === 'refreshing' || state === 'settling') {
    return { animationDelay: `${(n - 1) * 0.16}s` }
  }
  const t = Math.min(Math.max(progress * 3 - (n - 1), 0), 1)
  return { transform: `scale(${(0.4 + t * 0.6).toFixed(3)})`, opacity: (0.25 + t * 0.75).toFixed(3) }
}

const barWidth = (progress: number) => `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%`
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
    align-items: flex-start;
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
    flex-shrink: 0;
    font-size: 24rpx;
    color: #1677ff;
  }
}

.demo-list {
  border: 2rpx solid #eef0f2;
  border-radius: 12rpx;
  overflow: hidden;

  &--dark {
    border-color: #3a3a44;
  }

  &--brand {
    border-color: #ffd9bd;
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

/* ===== 1. 三点刷新图标 ===== */
.dots {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease-out;

  &--out {
    opacity: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__dot {
    width: 14rpx;
    height: 14rpx;
    margin: 0 6rpx;
    border-radius: 50%;
    background: #fa5151;
  }

  &__dot--run {
    animation: dots-bounce 0.6s ease-in-out infinite;
  }

  &__text {
    margin-top: 12rpx;
    font-size: 22rpx;
    color: #999;
  }
}

@keyframes dots-bounce {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-10rpx) scale(1.15);
  }
}

/* ===== 2. 自绘 footer ===== */
.cfooter {
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &--error {
    padding: 24rpx 0;
  }

  &__bars {
    display: flex;
    align-items: flex-end;
    height: 28rpx;
    margin-right: 12rpx;
  }

  &__bar {
    width: 6rpx;
    height: 12rpx;
    margin-right: 5rpx;
    border-radius: 3rpx;
    background: #fa5151;
    animation: cfooter-stretch 0.9s ease-in-out infinite;
  }

  &__line {
    width: 60rpx;
    height: 2rpx;
    margin: 0 16rpx;
    background: #ebedf0;
  }

  &__text {
    font-size: 24rpx;
    color: #999;

    &--dim {
      font-size: 22rpx;
      color: #bbb;
      letter-spacing: 2rpx;
    }

    &--error {
      padding: 8rpx 24rpx;
      color: #fa5151;
    }
  }
}

@keyframes cfooter-stretch {
  0%,
  100% {
    height: 12rpx;
  }
  50% {
    height: 28rpx;
  }
}

/* ===== 3. 深色自绘刷新头 ===== */
.dark-refresher {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease-out;

  &--out {
    opacity: 0;
  }

  &__track {
    width: 160rpx;
    height: 6rpx;
    border-radius: 3rpx;
    background: rgba(255, 255, 255, 0.2);
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 3rpx;
    background: #fff;
  }

  &__spinner {
    width: 28rpx;
    height: 28rpx;
    border: 3rpx solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: dark-refresher-spin 0.8s linear infinite;
  }

  &__text {
    margin-top: 10rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
  }
}

@keyframes dark-refresher-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ===== 4. 品牌圆环（刷新头与 footer 复用） ===== */
.brand {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease-out;

  &--out {
    opacity: 0;
  }

  &__ring {
    position: relative;
    width: 40rpx;
    height: 40rpx;
    border: 4rpx solid #ffe4d1;
    border-radius: 50%;

    &--small {
      width: 26rpx;
      height: 26rpx;
      border-width: 3rpx;
      margin-right: 12rpx;
    }

    &--spin {
      animation: dark-refresher-spin 0.8s linear infinite;
    }
  }

  /* 弧：用一半透明边框模拟进度弧，透明度由 progress 驱动 */
  &__arc {
    position: absolute;
    top: -4rpx;
    right: -4rpx;
    bottom: -4rpx;
    left: -4rpx;
    border: 4rpx solid transparent;
    border-top-color: #ff7a2f;
    border-radius: 50%;
  }

  &__text {
    margin-top: 12rpx;
    font-size: 22rpx;
    color: #ff7a2f;
  }
}

.demo-tip {
  padding-top: 16rpx;

  &__text {
    font-size: 22rpx;
    line-height: 1.6;
    color: #aaa;
  }
}
</style>
