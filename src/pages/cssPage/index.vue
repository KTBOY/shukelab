<!--
 * @Author: zlc
 * @Date: 2025-12-04 19:14:42
 * @LastEditTime: 2026-09-11 18:05:46
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \shukelab\src\pages\cssPage\index.vue
-->
<template>
  <view class="css-info">
    <view class="css-border" @click="handleUnlock">
      <sh-loading type="1" :visible="true" :wrapper-style="{ position: 'absolute' }" />
    </view>
    <view class="css-border">
      <sh-loading ref="shLoadingRef" type="2" :wrapper-style="{ position: 'absolute' }" />
    </view>
    <view class="css-border">
      <sh-loading type="3" :wrapper-style="{ position: 'absolute' }" :visible="true" />
    </view>
    <view class="css-border">
      <sh-loading type="4" :wrapper-style="{ position: 'absolute' }" :visible="true" />
    </view>
    <view class="css-border">
      <sh-loading type="5" :wrapper-style="{ position: 'absolute' }" :visible="true" />
    </view>
    <view class="css-border">
      <sh-loading type="6" :wrapper-style="{ position: 'absolute' }" :visible="true" />
    </view>
  </view>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import breathingLight from './Loading/breathingLight.vue'
import sleep from './Loading/sleep.vue'

const shLoadingRef = ref()

onMounted(() => {
  shLoadingRef.value.open()
})

// —— 隐藏入口：连点第一个模块 5 次 + 口令校验，通过后永久解锁（重启依然生效）——
// 口令以 djb2 哈希存储，源码中不出现任何明文中文
const SECRET_HASH = 229161966
const NEED_TAP = 5
const TAP_WINDOW = 2000

function hashStr(s: string): number {
  let x = 5381
  for (let i = 0; i < s.length; i++) {
    x = ((x << 5) + x + s.charCodeAt(i)) >>> 0
  }
  return x >>> 0
}

let tapCount = 0
let tapTimer: ReturnType<typeof setTimeout> | null = null

function handleUnlock() {
  tapCount++
  if (tapTimer) clearTimeout(tapTimer)
  if (tapCount >= NEED_TAP) {
    tapCount = 0
    tapTimer = null
    promptPassword()
    return
  }
  tapTimer = setTimeout(() => {
    tapCount = 0
    tapTimer = null
  }, TAP_WINDOW)
}

function promptPassword() {
  uni.showModal({
    title: '请输入口令',
    editable: true,
    placeholderText: '请输入口令',
    success: (res) => {
      if (!res.confirm) return
      const input = (res.content || '').trim()
      if (hashStr(input) === SECRET_HASH) {
        uni.setStorageSync('cssResourcesUnlocked', true)
        uni.showToast({ title: '开发模式', icon: 'none' })
      } else {
        uni.showToast({ title: '口令错误', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.css-info {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.css-border {
  border: 1rpx solid #d4d4d4;
  width: 45%;
  height: 300rpx;
  border-radius: 20rpx;
  margin: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
</style>
