<!--
 * @Author: zlc
 * @Date: 2022-09-07 15:22:27
 * @LastEditTime: 2022-09-07 17:08:09
 * @LastEditors: zlc
 * @Description: 菜单虚拟列表
 * @FilePath: \project-template-ui-plus\src\components\VirtualMenuGanged\VirtualMenuGanged.vue
-->
<template>
  <view class="virtual-menu-ganged">
    <view class="menu-vessel">
      <view class="left-vessel"></view>
      <view class="right-vessel"></view>
    </view>
  </view>
</template>
<script lang="ts" setup>
import { reactive } from 'vue'
const leftState = reactive({
  currenIndex: 0,
})
const RightState = reactive({})
</script>
<style lang="scss" scoped></style>
