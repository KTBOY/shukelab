<!--
	案例：sk-scroll-tabs 顶部滚动标签栏专项
	1. 胶囊滑块（sliderStyle 覆盖默认下划线）
	2. 分段器（灰色轨道 + 白色圆角滑块）
	3. #default 插槽自绘（图标 + 角标）
	4. 内置渲染的 badge / dot / disabled / beforeChange 拦截 / re-click
	5. 受控与实例方法：scrollToIndex 滚入居中、动态增删标签自动重测、手动 refresh()
-->
<template>
  <scroll-view class="demo-page" :scroll-y="true" :show-scrollbar="false">
    <view class="demo-block">
      <text class="demo-block__title">胶囊滑块（sliderStyle 覆盖默认下划线）</text>
      <sk-scroll-tabs v-model:current="pillIndex" :tabs="tags" active-color="#ffffff" :slider-style="pillStyle">
        <template #default="{ item }">
          <text class="demo-tag">{{ item.name }}</text>
        </template>
      </sk-scroll-tabs>
    </view>

    <view class="demo-block">
      <text class="demo-block__title">分段器（灰色轨道 + 白色圆角滑块）</text>
      <view class="segment">
        <sk-scroll-tabs
          v-model:current="segIndex"
          class="segment__tabs"
          :tabs="segTabs"
          active-color="#fa5151"
          :slider-style="segmentStyle"
        />
      </view>
    </view>

    <view class="demo-block">
      <text class="demo-block__title">自定义插槽（图标 + 角标）</text>
      <sk-scroll-tabs v-model:current="iconIndex" :tabs="iconTabs" active-color="#1677ff">
        <template #default="{ item }">
          <view class="icon-tab">
            <text class="icon-tab__icon">{{ item.icon }}</text>
            <text class="icon-tab__name">{{ item.name }}</text>
            <text v-if="item.badge" class="icon-tab__badge">{{ item.badge > 99 ? '99+' : item.badge }}</text>
          </view>
        </template>
      </sk-scroll-tabs>
    </view>

    <view class="demo-block">
      <text class="demo-block__title">徽标 / 红点 / 禁用 / 切换拦截 / 重复点击</text>
      <!-- 不传插槽走内置渲染：badge/dot/disabled 开箱即用 -->
      <sk-scroll-tabs
        v-model:current="metaIndex"
        :tabs="metaTabs"
        active-color="#1677ff"
        :before-change="beforeChange"
        @re-click="onReClick"
      />
    </view>

    <view class="demo-block">
      <text class="demo-block__title">受控与实例方法（scrollToIndex 自动滚入居中 / refresh 重测）</text>
      <sk-scroll-tabs
        ref="ctrlTabsRef"
        v-model:current="ctrlIndex"
        :tabs="ctrlTabs"
        active-color="#fa5151"
        @change="onCtrlChange"
      />
      <view class="ctrl">
        <text class="ctrl__action" @click="jumpTo(0)">跳到首</text>
        <text class="ctrl__action" @click="jumpTo(6)">跳到第 7</text>
        <text class="ctrl__action" @click="jumpTo(ctrlTabs.length - 1)">跳到尾</text>
      </view>
      <view class="ctrl">
        <text class="ctrl__action" @click="appendTab">追加标签</text>
        <text class="ctrl__action" @click="removeTab">删除末尾</text>
        <text class="ctrl__action" @click="renameCurrent">改当前标签名</text>
        <text class="ctrl__action" @click="manualRefresh">手动 refresh()</text>
      </view>
      <view class="demo-state">
        <text class="demo-state__text">
          共 {{ ctrlTabs.length }} 个标签 · 选中第 {{ ctrlIndex + 1 }} 个 · change source = {{ ctrlSource }}
        </text>
      </view>
      <view class="demo-tip">
        <text class="demo-tip__text">
          追加/删除/改名后组件靠 deep watch 自动重测布局，「手动 refresh()」用于字体异步加载等外部改变宽度的场景。已知限制：disabled 标签仍可被 scrollToIndex 程序化选中。
        </text>
      </view>
    </view>

    <view class="demo-tip demo-tip--page">
      <text class="demo-tip__text">activeColor 定选中色，sliderStyle 完全接管滑块，default 插槽接管标签内容</text>
    </view>
    <view class="demo-state">
      <text class="demo-state__text"
        >当前选中：{{ tags[pillIndex].name }} / {{ segTabs[segIndex].name }} / {{ iconTabs[iconIndex].name }} /
        {{ metaTabs[metaIndex].name }}</text
      >
    </view>
    <view class="demo-state">
      <text class="demo-state__text"
        >切换拦截：点「手游」弹提示不切换；「端游」为禁用项；再点当前项触发 re-click ×{{ reClickCount }}</text
      >
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type {
  ChangePayload,
  SkScrollTabsExpose,
  SkScrollTabsItem,
} from '@/uni_modules/sk-swipe-feed/components/sk-scroll-tabs/sk-scroll-tabs.types'

const tags = ['全部', '单机', '手游', '端游', '攻略', '福利', '社区', '直播'].map((name) => ({ name }))
const pillIndex = ref(1)
/** 胶囊滑块：圆角底色盖住整个标签 */
const pillStyle = {
  backgroundColor: '#fa5151',
  height: '30px',
  bottom: '7px',
  borderRadius: '15px',
}

const segTabs = ['日榜', '周榜', '月榜', '总榜'].map((name) => ({ name }))
const segIndex = ref(2)
/** 分段器：灰色轨道上的白色圆角滑块 */
const segmentStyle = {
  backgroundColor: '#ffffff',
  height: '30px',
  bottom: '5px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
}

const iconTabs = [
  { name: '游戏', icon: '🎮' },
  { name: '资讯', icon: '📰', badge: 5 },
  { name: '视频', icon: '🎬' },
  { name: '商城', icon: '🛒', badge: 120 },
  { name: '社区', icon: '💬' },
]
const iconIndex = ref(0)

// ===== 徽标 / 红点 / 禁用 / 切换拦截 / 重复点击 =====
const metaTabs = [
  { id: 0, name: '推荐' },
  { id: 1, name: '热榜', badge: 6 },
  { id: 2, name: '消息', dot: true },
  { id: 3, name: '端游', disabled: true },
  { id: 4, name: '手游' },
]
const metaIndex = ref(0)
const reClickCount = ref(0)

/** 切换拦截：点「手游」弹提示并阻止切换 */
const beforeChange = async (index: number) => {
  if (metaTabs[index]?.name === '手游') {
    uni.showToast({ title: '该标签暂不可切换', icon: 'none' })
    return false
  }
  return true
}

/** 再次点击当前标签（配合列表回顶等场景） */
const onReClick = () => {
  reClickCount.value += 1
  uni.showToast({ title: `re-click x${reClickCount.value}`, icon: 'none' })
}

// ===== 受控与实例方法 =====
const ctrlTabsRef = ref<SkScrollTabsExpose>()
const ctrlIndex = ref(0)
const ctrlSource = ref('—')
const ctrlTabs = ref<SkScrollTabsItem[]>(
  Array.from({ length: 12 }, (_, i) => ({ id: i, name: `分类${i + 1}` }))
)
let appended = 12

const onCtrlChange = (payload: ChangePayload) => {
  ctrlSource.value = payload.source
}

/** 程序化切换：高亮更新 + 该标签自动滚入可视区居中 */
const jumpTo = (index: number) => {
  ctrlTabsRef.value?.scrollToIndex(index)
}

const appendTab = () => {
  ctrlTabs.value = [...ctrlTabs.value, { id: appended, name: `新增${++appended}` }]
}

const removeTab = () => {
  if (ctrlTabs.value.length <= 1) return
  ctrlTabs.value = ctrlTabs.value.slice(0, -1)
  if (ctrlIndex.value >= ctrlTabs.value.length) ctrlIndex.value = ctrlTabs.value.length - 1
}

/** 原地改字段：标签宽度变化，依赖 deep watch 自动重测 */
const renameCurrent = () => {
  if (!ctrlTabs.value[ctrlIndex.value]) return
  ctrlTabs.value = ctrlTabs.value.map((item, i) =>
    i === ctrlIndex.value ? { ...item, name: `${item.name}·长` } : item
  )
}

/** 手动重测（字体异步加载、外部样式改变标签宽度时用） */
const manualRefresh = () => {
  ctrlTabsRef.value?.refresh()
  uni.showToast({ title: 'refresh() 已调用', icon: 'none' })
}
</script>

<style lang="scss" scoped>
/* App.vue 全局 page{height:100%;overflow:hidden} 关掉了原生滚动，所以根节点用 scroll-view，需要确定高度。
   高度必须自足：小程序端 page{height:100%} 得不到确定高度，height:100% 会塌成内容高、scroll-view 不再是滚动容器；
   --window-top 在 H5 是导航栏 44px，小程序端是 0（原生导航栏不占视口） */
.demo-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  box-sizing: border-box;
  background: #fff;
  padding-bottom: 40rpx;
}

.demo-block {
  padding: 28rpx 0;
  border-bottom: 2rpx solid #f5f6f7;

  &__title {
    display: block;
    padding: 0 32rpx 20rpx;
    font-size: 26rpx;
    color: #999;
  }
}

.demo-tag {
  font-size: 28rpx;
}

.segment {
  margin: 0 32rpx;
  background: #f2f3f5;
  border-radius: 16px;
  overflow: hidden;

  /* 分段器场景把组件默认白底换成透明，露出灰色轨道 */
  :deep(.sk-scroll-tabs__scroll) {
    background: transparent;
  }
}

.icon-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &__icon {
    font-size: 34rpx;
    line-height: 1.2;
  }

  /* 颜色不写死，继承组件的选中色（activeColor） */
  &__name {
    font-size: 26rpx;
  }

  &__badge {
    position: absolute;
    top: -8px;
    right: -10px;
    min-width: 28rpx;
    height: 28rpx;
    padding: 0 8rpx;
    border-radius: 14rpx;
    background: #fa5151;
    color: #fff;
    font-size: 18rpx;
    line-height: 28rpx;
    text-align: center;
    box-sizing: border-box;
  }
}

.ctrl {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 16rpx 32rpx 0;

  &__action {
    margin-right: 24rpx;
    font-size: 24rpx;
    color: #1677ff;
  }
}

.demo-tip {
  padding: 20rpx 32rpx 0;

  &--page {
    padding-top: 28rpx;
  }

  &__text {
    font-size: 22rpx;
    line-height: 1.6;
    color: #bbb;
  }
}

.demo-state {
  padding: 12rpx 32rpx 0;

  &__text {
    font-size: 24rpx;
    color: #666;
  }
}
</style>
