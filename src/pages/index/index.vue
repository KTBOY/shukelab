<!--
 * @Author: zlc
 * @Date: 2022-09-06 16:39:43
 * @LastEditTime: 2022-09-07 16:51:23
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \project-template-ui-plus\src\pages\index\index.vue
-->
<template>
  <view class="content">
    <view class="head">
      <view class="cover">
        <image class="logo" src="https://p2.music.126.net/rNQH185Dp2lcG2yII_Aiwg==/18159534045164927.jpg"></image>
      </view>
      <view class="name"> Welcome to shuke lab</view>
    </view>
    <view class="body">
      <view class="module-list">
        <button class="button" @click="handlerPageRouter()">
          <view class="iconfont icon-drxx11 icon-menu"></view>
          <view class="module-name">vue-menu-ganged</view>
        </button>
        <button class="button"><view>icon</view> <view>vue-menu-ganged</view></button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ref } from 'vue'
const query = uni.createSelectorQuery().in(this)
//组件入口
const handlerPageRouter = () => {
  uni.navigateTo({
    url: '/pages/virtualMenuGanged/index',
  })
}
</script>

<style lang="scss" scoped>
page {
  --font-color: #4c88ff;
  --bg-color: #f2f3f7;
  --button-bg-color: #f2f3f7;
  --button-shadow: -12rpx -12rpx 16rpx rgba(255, 255, 255, 0.9), 10rpx 10rpx 16rpx rgba(0, 0, 0, 0.07);
  background-color: #f2f3f7;
}

.head {
  padding: 20rpx 30rpx;
}
button::after {
  border: none;
}
.cover {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 2rpx solid #f1f8fd;
  box-shadow: 20rpx 20rpx 20rpx rgba(0, 0, 0, 0.07), -20rpx -20rpx 20rpx rgba(255, 255, 255, 0.7),
    6rpx 6rpx 6rpx rgba(0, 0, 0, 0.09), -6rpx -6rpx 6rpx rgba(255, 255, 255, 0.9);

  .logo {
    width: 100%;
    height: 100%;
  }
}

.name {
  color: #aeafb0;
  padding: 10rpx 0;
}
// 模块列表
.body {
  .module-list {
    display: flex;
    .button {
      color: var(--font-color);
      position: relative;
      border-radius: 15px;
      background: var(--button-bg-color);
      transition: all 100ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: var(--button-shadow);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      text-align: left;
      width: 45%;
      .icon-menu {
        height: 60rpx;
        line-height: 60rpx;
        font-size: 66rpx;
      }
    }

    .module-name {
      color: #222222;
      font-weight: 700;
      font-size: 28rpx;
    }
  }
}
</style>
