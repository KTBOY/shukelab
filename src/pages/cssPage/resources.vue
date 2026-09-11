<template>
  <view class="resources">
    <view class="resources-header">
      <view class="resources-title">教程资源</view>
      <view class="resources-sub">点击下方按钮即可一键复制链接，粘贴到浏览器打开</view>
    </view>

    <view v-for="item in resourceList" :key="item.name" class="resource-card">
      <view class="resource-info">
        <view class="resource-name">{{ item.name }}</view>
        <view class="resource-url">{{ item.url }}</view>
      </view>
      <view class="resource-copy" @click="handleCopy(item.url)">复制</view>
    </view>
  </view>
</template>

<script lang="ts" setup>
const resourceList = [
  {
    name: 'Flash 教程',
    url: 'https://pan.baidu.com/s/1IgHpRecq2o-IM-sx_dP2aQ?pwd=6666',
  },
  {
    name: 'exe 解压教程',
    url: 'https://pan.baidu.com/s/1g3JU7MhP1f8kR4IEmN9Thg?pwd=6666',
  },
  {
    name: '夸克网盘下载和游戏解压',
    url: 'https://pan.baidu.com/s/1566RfApGq3DqUXnvucwYsw?pwd=6666',
  },
  {
    name: '【腾讯文档】通用教程-游戏解压游玩说明',
    url: 'https://docs.qq.com/doc/DYU9qR3FKU3RxTGpC',
  },
]

function handleCopy(url: string) {
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'none' })
    },
  })
}
</script>

<style lang="scss" scoped>
.resources {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 40rpx 30rpx;
  background: #f7f8fa;
}

.resources-header {
  padding: 20rpx 10rpx 40rpx;
}

.resources-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}

.resources-sub {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #9a9b9d;
  line-height: 36rpx;
}

.resource-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 1px 4px #6666660f;
}

.resource-info {
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.resource-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 12rpx;
}

.resource-url {
  font-size: 22rpx;
  color: #9a9b9d;
  word-break: break-all;
  line-height: 32rpx;
}

.resource-copy {
  flex-shrink: 0;
  width: 128rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 26rpx;
  color: #ffffff;
  background: #644dff;
  border-radius: 32rpx;
}

.resource-copy:active {
  opacity: 0.8;
}
</style>
