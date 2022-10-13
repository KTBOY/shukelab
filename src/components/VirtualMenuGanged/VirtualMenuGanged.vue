<!--
 * @Author: zlc
 * @Date: 2022-09-07 15:22:27
 * @LastEditTime: 2022-10-13 18:03:18
 * @LastEditors: zlc
 * @Description: 菜单虚拟列表
 * @FilePath: \shuke-lab\src\components\VirtualMenuGanged\VirtualMenuGanged.vue
-->
<template>
  <view class="virtual-menu-ganged">
    <view class="menu-vessel">
      <view class="vessel-info">
        <view class="left-vessel">
          <scroll-view
            :scroll-y="true"
            class="left-scroll"
            :scroll-into-view="leftVesselState.currenIndex"
            :scroll-with-animation="true"
          >
          </scroll-view>
        </view>
        <view class="right-vessel"></view>
      </view>
    </view>
  </view>
</template>
<script lang="ts" setup>
import { reactive, defineProps, onMounted } from 'vue'
type leftVesselStateType = {
  currenIndex: number | null
}
const props = defineProps({
  virtualMenuHeight: {
    type: Number,
    default: uni.getSystemInfoSync().windowHeight,
  },
})

const leftVesselState = reactive<leftVesselStateType>({
  currenIndex: 0,
})
const RightVesselState = reactive({})

onMounted(() => {
  console.log(props)
})
</script>
<style lang="scss" scoped>
@import './style/v-bind-style.scss';
</style>
