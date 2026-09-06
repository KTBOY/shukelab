<!--
	案例：sk-scroll-list 下拉刷新头专项（内置头的 props 对照与状态机读数）
	两个列表吃同一组控制面板，互相对照：
	A. 内置自绘头（不传 #refresher）——肉眼检查居中、chevron 跟手旋转、loosing 切换点、
	   settling 200ms 淡出与 uni 原生 refresher 300ms 高度收合是否对齐（有没有两段式跳变）。
	B. #refresher 插槽换成读数探针——把 state / dy / progress 打出来，并记录状态机轨迹。
	   A 上看不出来的时序问题（尤其只持续 200ms 的 settling）在轨迹里一眼可见。
	自定义刷新头（自绘图标 / 深色主题）与自定义上拉加载见 custom-indicator.vue。
	预期轨迹：idle → pulling → loosing → refreshing → settling → idle
	loosing 的切换点 = refresherThreshold * 0.9（略低于原生触发点，保证松手前提示可见）；
	刷新头容器高度恒等于 refresherThreshold，所以切阈值时头会跟着变高。
-->
<template>
  <scroll-view class="demo-page" :scroll-y="true" :show-scrollbar="false">
    <!-- 控制面板 -->
    <view class="demo-block">
      <text class="demo-block__title">刷新头 props（同时作用于 A / B 两个列表）</text>
      <view class="ctrl">
        <text class="ctrl__label">refresherEnabled</text>
        <switch :checked="enabled" color="#fa5151" style="transform: scale(0.7)" @change="onEnabledChange" />
      </view>
      <view class="ctrl">
        <text class="ctrl__label">refresherThreshold</text>
        <text
          v-for="px in THRESHOLDS"
          :key="px"
          class="ctrl__tag"
          :class="{ 'ctrl__tag--on': threshold === px }"
          @click="threshold = px"
          >{{ px }}px</text
        >
      </view>
      <view class="ctrl">
        <text class="ctrl__label">refresherBackground</text>
        <text
          v-for="bg in BACKGROUNDS"
          :key="bg.value"
          class="ctrl__tag"
          :class="{ 'ctrl__tag--on': background === bg.value }"
          @click="background = bg.value"
          >{{ bg.label }}</text
        >
      </view>
      <view class="ctrl">
        <text class="ctrl__label">三段文案</text>
        <text class="ctrl__tag" :class="{ 'ctrl__tag--on': !customTexts }" @click="customTexts = false">默认</text>
        <text class="ctrl__tag" :class="{ 'ctrl__tag--on': customTexts }" @click="customTexts = true">自定义</text>
        <text class="ctrl__hint">{{ pullingText }} / {{ loosingText }} / {{ refreshingText }}</text>
      </view>
    </view>

    <!-- A. 内置自绘头 -->
    <view class="demo-block">
      <text class="demo-block__title">A · 内置自绘头（CSS border 画 chevron 与圆环，无 SVG，小程序可编译）</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="builtIn.refreshing.value"
        :loading="builtIn.loading.value"
        :finished="builtIn.finished.value"
        :error="!!builtIn.error.value"
        :empty="builtIn.list.value.length === 0"
        height="320px"
        :refresher-enabled="enabled"
        :refresher-threshold="threshold"
        :refresher-background="background"
        :pulling-text="pullingText"
        :loosing-text="loosingText"
        :refreshing-text="refreshingText"
        @refresh="onRefreshA"
        @load-more="builtIn.loadNext()"
        @retry="builtIn.loadNext()"
      >
        <view v-for="item in builtIn.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-tip">
        <text class="demo-tip__text">
          下拉时箭头 45° → 225° 连续跟手旋转；到位翻向并提示「{{ loosingText }}」；刷新中箭头淡出换成旋转圆环；结束时内容 200ms 淡出微缩，落在原生 300ms 收合窗口内。
        </text>
      </view>
    </view>

    <!-- B. 读数探针 -->
    <view class="demo-block">
      <view class="demo-block__head">
        <text class="demo-block__title">B · #refresher 换成读数探针（state / dy / progress）</text>
        <text class="demo-block__action" @click="clearTrail">清空轨迹</text>
      </view>
      <sk-scroll-list
        class="demo-list"
        :refreshing="probeList.refreshing.value"
        :loading="probeList.loading.value"
        :finished="probeList.finished.value"
        :error="!!probeList.error.value"
        :empty="probeList.list.value.length === 0"
        height="260px"
        :refresher-enabled="enabled"
        :refresher-threshold="threshold"
        :refresher-background="background"
        @refresh="onRefreshB"
        @load-more="probeList.loadNext()"
        @retry="probeList.loadNext()"
      >
        <template #refresher="{ state, dy, progress }">
          <refresher-probe :state="state" :dy="dy" :progress="progress" @change="onStateChange" />
        </template>
        <view v-for="item in probeList.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="trail">
        <text class="trail__label">状态轨迹</text>
        <view class="trail__items">
          <text v-for="(s, i) in stateTrail" :key="i" class="trail__item" :class="`trail__item--${s}`">{{ s }}</text>
        </view>
      </view>
      <view class="demo-tip">
        <text class="demo-tip__text">
          dy 是原始下拉像素距离；progress = dy / refresherThreshold 并钳制在 0~1，所以把阈值切到 100px 后，拉满 progress=1 需要的下拉距离同步变长。
        </text>
      </view>
    </view>

    <!-- 关闭下拉刷新 -->
    <view class="demo-block">
      <text class="demo-block__title">refresherEnabled = false（纯展示列表，不下发 refresh）</text>
      <sk-scroll-list
        class="demo-list"
        :refreshing="plain.refreshing.value"
        :loading="plain.loading.value"
        :finished="plain.finished.value"
        :empty="plain.list.value.length === 0"
        height="160px"
        :refresher-enabled="false"
        @load-more="plain.loadNext()"
      >
        <view v-for="item in plain.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-state">
        <text class="demo-state__text">A + B 两个列表的 refresh 事件累计触发 {{ refreshCount }} 次</text>
      </view>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { SkScrollListRefresherState } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/sk-scroll-list.types'
import { usePagedList } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import RefresherProbe from './components/refresher-probe.vue'
import { makeFetcher } from './mock'

const THRESHOLDS = [40, 60, 100]
const BACKGROUNDS = [
  { label: '白', value: '#ffffff' },
  { label: '浅灰', value: '#f2f3f5' },
  { label: '深色', value: '#2b2b33' },
]

// ===== 控制面板（作用于 A / B） =====
const enabled = ref(true)
const threshold = ref(60)
const background = ref('#ffffff')
const customTexts = ref(false)

const pullingText = computed(() => (customTexts.value ? '继续往下拉' : '下拉刷新'))
const loosingText = computed(() => (customTexts.value ? '可以松手了' : '松手立即刷新'))
const refreshingText = computed(() => (customTexts.value ? '努力加载中' : '正在刷新...'))

const onEnabledChange = (e: any) => {
  enabled.value = e.detail.value
}

// ===== 三个列表各自独立的数据流 =====
/** 刷新耗时拉长到 800ms，便于观察 refreshing → settling 的收合过程 */
const builtIn = usePagedList(makeFetcher(40, { delayMs: 800 }), { pageSize: 10 })
const probeList = usePagedList(makeFetcher(40, { delayMs: 800 }), { pageSize: 10 })
const plain = usePagedList(makeFetcher(20), { pageSize: 10 })

// ===== 状态轨迹与 refresh 计数 =====
const stateTrail = ref<SkScrollListRefresherState[]>([])
const refreshCount = ref(0)

const onStateChange = (state: SkScrollListRefresherState) => {
  stateTrail.value = [...stateTrail.value, state].slice(-12)
}

const clearTrail = () => {
  stateTrail.value = []
}

const onRefreshA = () => {
  refreshCount.value++
  builtIn.reload()
}

const onRefreshB = () => {
  refreshCount.value++
  probeList.reload()
}
</script>

<style lang="scss" scoped>
/* App.vue 全局 page{height:100%;overflow:hidden} 关掉了原生滚动，所以根节点用 scroll-view，需要确定高度。
   高度必须自足：小程序端 page{height:100%} 得不到确定高度，height:100% 会塌成内容高、scroll-view 不再是滚动容器；
   --window-top 在 H5 是导航栏 44px，小程序端是 0（原生导航栏不占视口） */
.demo-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
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
}

.row {
  padding: 22rpx 28rpx;
  border-bottom: 2rpx solid #f2f3f5;

  &__title {
    font-size: 26rpx;
    color: #444;
  }
}

.ctrl {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12rpx;

  &__label {
    font-size: 24rpx;
    color: #999;
    margin-right: 8rpx;
  }

  &__tag {
    padding: 4rpx 16rpx;
    margin-right: 12rpx;
    font-size: 22rpx;
    color: #666;
    background: #f2f3f5;
    border-radius: 20rpx;

    &--on {
      color: #fff;
      background: #fa5151;
    }
  }

  &__hint {
    font-size: 20rpx;
    color: #bbb;
  }
}

.trail {
  padding-top: 16rpx;

  &__label {
    display: block;
    margin-bottom: 10rpx;
    font-size: 22rpx;
    color: #999;
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
  }

  &__item {
    padding: 2rpx 12rpx;
    font-size: 20rpx;
    color: #666;
    background: #f2f3f5;
    border-radius: 6rpx;

    &--pulling {
      color: #1677ff;
      background: #e8f3ff;
    }

    &--loosing {
      color: #fa5151;
      background: #ffeceb;
    }

    &--refreshing,
    &--settling {
      color: #07c160;
      background: #e7f9ee;
    }
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

.demo-state {
  padding-top: 16rpx;

  &__text {
    font-size: 24rpx;
    color: #666;
  }
}
</style>
