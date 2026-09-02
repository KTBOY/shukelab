<!-- 案例：sk-scroll-tabs 自定义样式（胶囊滑块 / 分段器 / 图标+角标插槽） -->
<template>
  <view class="demo-page">
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

    <view class="demo-tip">
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
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

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
</script>

<style lang="scss" scoped>
.demo-page {
  min-height: 100vh;
  background: #fff;
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

.demo-tip {
  padding: 28rpx 32rpx 8rpx;

  &__text {
    font-size: 24rpx;
    color: #bbb;
  }
}

.demo-state {
  padding: 8rpx 32rpx 28rpx;

  &__text {
    font-size: 24rpx;
    color: #666;
  }
}
</style>
