<!--
	案例：sk-swipe-page 整页横滑容器专项
	1. 基础受控：v-model:current + 圆点程序化翻页
	2. 懒挂载 / keepAlive / maxAlive 可视化：page-probe 上报挂载次数，LRU 淘汰肉眼可见
	3. @transition 实时进度联动：色带宽度 / 标题栏透明度 / 页内视差位移
	4. 播放控制：autoplay / interval / circular / duration，并读出 change.source
	注：sk-swipe-page 没有 defineExpose，所有控制都走受控 props，没有实例方法可调。
-->
<template>
  <scroll-view class="demo-page" :scroll-y="true" :show-scrollbar="false">
    <!-- 1. 基础受控 -->
    <view class="demo-block">
      <text class="demo-block__title">基础用法（v-model:current + 圆点程序化翻页）</text>
      <view class="load-status">
        <text class="load-status__text">当前第 {{ basicCurrent + 1 }} / {{ BASIC_COUNT }} 页 · 激活页 ±1 页才挂载内容</text>
      </view>
      <sk-swipe-page v-model:current="basicCurrent" :count="BASIC_COUNT" height="220px">
        <template #page="{ index, active, mounted }">
          <view v-if="mounted" class="panel" :class="`panel--${index % 4}`">
            <text class="panel__title">页面 {{ index + 1 }}</text>
            <text class="panel__desc">{{ active ? '当前激活页' : '已挂载（keepAlive 常驻，滑回不重建）' }}</text>
          </view>
        </template>
      </sk-swipe-page>
      <view class="demo-dots">
        <view
          v-for="i in BASIC_COUNT"
          :key="i"
          class="demo-dots__dot"
          :class="{ 'demo-dots__dot--active': i - 1 === basicCurrent }"
          @click="basicCurrent = i - 1"
        ></view>
      </view>
    </view>

    <!-- 2. 懒挂载 / keepAlive / maxAlive -->
    <view class="demo-block">
      <text class="demo-block__title">懒挂载 + keepAlive + maxAlive（LRU 常驻上限 = 4）</text>
      <view class="ctrl">
        <text class="ctrl__label">keepAlive</text>
        <switch :checked="keepAliveOn" color="#fa5151" style="transform: scale(0.7)" @change="onKeepAliveChange" />
        <text class="ctrl__action" @click="rebuildProbe">重建容器</text>
      </view>
      <view class="probe-strip">
        <view
          v-for="(n, i) in mountCounts"
          :key="i"
          class="probe-chip"
          :class="{ 'probe-chip--active': i === probeCurrent }"
        >
          <text class="probe-chip__text">{{ i + 1 }}页×{{ n }}</text>
        </view>
      </view>
      <sk-swipe-page
        :key="probeKey"
        v-model:current="probeCurrent"
        :count="PROBE_COUNT"
        :max-alive="4"
        :keep-alive="keepAliveOn"
        height="300px"
      >
        <template #page="{ index, mounted }">
          <page-probe v-if="mounted" :index="index" @mount="onProbeMount" />
        </template>
      </sk-swipe-page>
      <view class="demo-tip">
        <text class="demo-tip__text">
          数字 = 该页累计挂载次数。keepAlive 开启时滑走再滑回仍为 1 且滚动位置保留；连滑超过 4 页后，最久未访问的页被淘汰，滑回时变成 2。关掉 keepAlive 则每次滑回都递增。
        </text>
      </view>
    </view>

    <!-- 3. @transition 实时进度联动 -->
    <view class="demo-block">
      <text class="demo-block__title">@transition 实时进度（标题栏渐变 / 色带 / 视差）</text>
      <view class="fake-navbar" :style="{ backgroundColor: `rgba(250, 81, 81, ${navbarOpacity})` }">
        <text class="fake-navbar__text" :style="{ color: navbarOpacity > 0.5 ? '#fff' : '#222' }">
          频道详情 · progress {{ progressText }}
        </text>
      </view>
      <view class="progress-track">
        <view class="progress-bar" :style="{ width: barWidth }"></view>
      </view>
      <sk-swipe-page v-model:current="parallaxCurrent" :count="PARALLAX_COUNT" height="220px" @transition="onTransition">
        <template #page="{ index, mounted }">
          <view v-if="mounted" class="panel" :class="`panel--${index % 4}`">
            <!-- 视差：内容随手势反向位移，位移量 = progress * 40px -->
            <view class="panel__parallax" :style="{ transform: `translateX(${parallaxOffset}px)` }">
              <text class="panel__title">页面 {{ index + 1 }}</text>
            </view>
            <text class="panel__desc">dx {{ dxText }} px</text>
          </view>
        </template>
      </sk-swipe-page>
      <view class="demo-tip">
        <text class="demo-tip__text">
          transition 每帧外发且未节流，本页只把 progress 绑到 3 处 style，消费方务必保持轻量（小程序端每帧都会 setData）。progress = dx / 容器宽度。
        </text>
      </view>
    </view>

    <!-- 4. 播放控制 -->
    <view class="demo-block">
      <text class="demo-block__title">播放控制（autoplay / interval / circular / duration）</text>
      <view class="ctrl">
        <text class="ctrl__label">autoplay</text>
        <switch :checked="autoplayOn" color="#fa5151" style="transform: scale(0.7)" @change="onAutoplayChange" />
        <text class="ctrl__label">circular</text>
        <switch :checked="circularOn" color="#fa5151" style="transform: scale(0.7)" @change="onCircularChange" />
      </view>
      <view class="ctrl">
        <text class="ctrl__label">interval</text>
        <text
          v-for="ms in INTERVALS"
          :key="ms"
          class="ctrl__tag"
          :class="{ 'ctrl__tag--on': interval === ms }"
          @click="interval = ms"
          >{{ ms }}ms</text
        >
        <text class="ctrl__label">duration</text>
        <text
          v-for="ms in DURATIONS"
          :key="ms"
          class="ctrl__tag"
          :class="{ 'ctrl__tag--on': duration === ms }"
          @click="duration = ms"
          >{{ ms }}ms</text
        >
      </view>
      <sk-swipe-page
        v-model:current="playCurrent"
        :count="PLAY_COUNT"
        :autoplay="autoplayOn"
        :interval="interval"
        :circular="circularOn"
        :duration="duration"
        height="200px"
        @change="onPlayChange"
      >
        <template #page="{ index, mounted }">
          <view v-if="mounted" class="panel" :class="`panel--${index % 4}`">
            <text class="panel__title">页面 {{ index + 1 }}</text>
          </view>
        </template>
      </sk-swipe-page>
      <view class="demo-state">
        <text class="demo-state__text">
          change 累计 {{ changeCount }} 次 · 最近 source = {{ lastSource }} · index = {{ lastIndex }}
        </text>
      </view>
      <view class="demo-tip">
        <text class="demo-tip__text">
          source = swipe 表示用户滑动，method 表示外部受控赋值。已知限制：autoplay 触发的翻页 source 也报 swipe（无 autoplay 枚举）。
        </text>
      </view>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { ChangePayload, TransitionPayload } from '@/uni_modules/sk-swipe-feed/components/sk-swipe-page/sk-swipe-page.types'
import PageProbe from './components/page-probe.vue'

// ===== 1. 基础受控 =====
const BASIC_COUNT = 6
const basicCurrent = ref(0)

// ===== 2. 懒挂载 / keepAlive / maxAlive =====
const PROBE_COUNT = 8
const probeCurrent = ref(0)
const probeKey = ref(0)
const keepAliveOn = ref(true)
/** 每页累计挂载次数，由 page-probe 的 mount 事件上报（页面卸载不会清掉这里的记录） */
const mountCounts = ref<number[]>(Array.from({ length: PROBE_COUNT }, () => 0))

const onProbeMount = (index: number) => {
  mountCounts.value[index] = (mountCounts.value[index] ?? 0) + 1
}

const onKeepAliveChange = (e: any) => {
  keepAliveOn.value = e.detail.value
  // sk-swipe-page 只 watch current / count，keepAlive 变化不会立即重算挂载窗口，
  // 要等下一次翻页才生效。这里一并重建容器，让正反对照立刻可见。
  rebuildProbe()
}

/** 重建容器：换 key 强制销毁全部页面，计数归零，可重新观察懒挂载窗口 */
const rebuildProbe = () => {
  probeKey.value++
  probeCurrent.value = 0
  mountCounts.value = Array.from({ length: PROBE_COUNT }, () => 0)
}

// ===== 3. @transition 进度联动 =====
const PARALLAX_COUNT = 4
const parallaxCurrent = ref(0)
const progress = ref(0)
const dx = ref(0)

const onTransition = (payload: TransitionPayload) => {
  progress.value = payload.progress
  dx.value = payload.dx
}

const navbarOpacity = computed(() => Math.min(Math.abs(progress.value), 1).toFixed(3))
const barWidth = computed(() => `${(Math.min(Math.abs(progress.value), 1) * 100).toFixed(1)}%`)
const parallaxOffset = computed(() => (progress.value * 40).toFixed(1))
const progressText = computed(() => progress.value.toFixed(3))
const dxText = computed(() => dx.value.toFixed(0))

// ===== 4. 播放控制 =====
const PLAY_COUNT = 4
const INTERVALS = [1500, 3000, 5000]
const DURATIONS = [150, 300, 800]
const playCurrent = ref(0)
const autoplayOn = ref(false)
const circularOn = ref(false)
const interval = ref(3000)
const duration = ref(300)
const changeCount = ref(0)
const lastSource = ref('—')
const lastIndex = ref('—')

const onAutoplayChange = (e: any) => {
  autoplayOn.value = e.detail.value
}

const onCircularChange = (e: any) => {
  circularOn.value = e.detail.value
}

const onPlayChange = (payload: ChangePayload) => {
  changeCount.value++
  lastSource.value = payload.source
  lastIndex.value = String(payload.index)
}
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
  overflow: hidden;

  &__title {
    display: block;
    margin-bottom: 20rpx;
    font-size: 26rpx;
    color: #666;
  }
}

.load-status {
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;
  border-radius: 8rpx;

  &__text {
    font-size: 24rpx;
    color: #666;
  }
}

.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &--0 {
    background: #e8f3ff;
  }
  &--1 {
    background: #eafff1;
  }
  &--2 {
    background: #fff7e8;
  }
  &--3 {
    background: #ffeef0;
  }

  &__parallax {
    will-change: transform;
  }

  &__title {
    font-size: 44rpx;
    font-weight: 700;
    color: #222;
  }

  &__desc {
    font-size: 24rpx;
    color: #888;
  }
}

.demo-dots {
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &__dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #ddd;

    &--active {
      width: 40rpx;
      border-radius: 8rpx;
      background: #fa5151;
    }
  }
}

/* 控制行 */
.ctrl {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16rpx;

  &__label {
    font-size: 24rpx;
    color: #999;
    margin-right: 4rpx;
  }

  &__action {
    margin-left: auto;
    font-size: 24rpx;
    color: #1677ff;
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
}

/* 挂载次数条 */
.probe-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.probe-chip {
  padding: 4rpx 12rpx;
  background: #f2f3f5;
  border-radius: 8rpx;

  &--active {
    background: #ffeceb;
  }

  &__text {
    font-size: 20rpx;
    color: #666;
  }
}

/* 模拟标题栏：背景透明度跟随 progress */
.fake-navbar {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  transition: none;

  &__text {
    font-size: 26rpx;
    font-weight: 600;
  }
}

.progress-track {
  height: 8rpx;
  margin: 12rpx 0 16rpx;
  background: #f0f1f2;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #fa5151;
  border-radius: 4rpx;
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
