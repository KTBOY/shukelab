<!--
 * @Author: zlc
 * @Date: 2022-09-07 15:22:27
 * @LastEditTime: 2022-10-14 18:06:38
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
            class="left-scroll"
            :scroll-y="true"
            :scroll-into-view="leftVesselState.currenIndex"
            :scroll-with-animation="true"
          >
            <view v-if="list.length" class="info">
              <view class="item-active" :style="{ transform: `translateY(${leftVesselState.moveY}px)` }">
                <!-- <text class="active-name">{{ list[leftVesselState.currenIndex] }}</text> -->
              </view>
              <view
                v-for="(item, index) in list"
                :id="`left-${index}`"
                :key="index"
                class="item"
                @click="leftFun.leftClickButton(index)"
              >
                <text class="name">{{ item.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view class="right-vessel">
          <scroll-view
            :scroll-y="true"
            class="right-scroll"
            :style="{ height: `${virtualMenuHeight}px` }"
            :scroll-top="rightVesselState.scrollTop"
            :scroll-with-animation="true"
          >
            <view class="info">
              <view v-for="item in list" :key="item.id" class="item-parent">
                <view>
                  <view v-for="(item1, index2) in item.data" :key="index2" class="class-item">
                    <view class="thumb-box item-food">
                      <view class="left-info">
                        <image :src="item1.image" class="item-image"></image>
                      </view>
                      <view class="right-info">
                        <view class="goods-title"> {{ item.name }}</view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>
<script lang="ts" setup>
import { reactive, defineProps, onMounted, PropType } from 'vue'

type leftVesselStateType = {
  currenIndex: number
  moveY: number
}
type rightVesselStateType = {
  scrollTop: number
}

interface MenuDataItem {
  name: string
  data: Array<object>
  id: number
}

const props = defineProps({
  virtualMenuHeight: {
    type: Number,
    default: uni.getSystemInfoSync().windowHeight,
  },
  list: {
    type: Array as PropType<MenuDataItem[]>,
    default: () => {
      return []
    },
  },
})

const leftVesselState = reactive<leftVesselStateType>({
  currenIndex: 0,
  moveY: 0,
})
const rightVesselState = reactive<rightVesselStateType>({
  scrollTop: 0,
})
const leftFun = {
  leftClickButton(index: number) {
    console.log('1')
  },
}

onMounted(() => {
  console.log(props)
})
</script>
<style lang="scss" scoped>
@import './style/v-bind-style.scss';
</style>
