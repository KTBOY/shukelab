<!--
 * @Author: zlc
 * @Date: 2022-09-07 15:22:27
 * @LastEditTime: 2022-10-17 16:33:44
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
                <text class="active-name">{{ list[leftVesselState.currenIndex].name }}</text>
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
            @scroll="rightFun.rightClickButton"
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
import { reactive, defineProps, onMounted, computed, PropType, nextTick, type WritableComputedRef } from 'vue'
type stateType = {
  scrollTopSize: number
  fillHeight: number
}

type leftVesselStateType = {
  currenIndex: number
  currenHeight: number
  moveY: number
  leftIntoView: WritableComputedRef<string>
}
type rightVesselStateType = {
  scrollTop: number
  oldScrollTop: number
  topArrList: Array<any>
}

interface MenuDataItem {
  name: string
  data: Array<any>
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
const query = uni.createSelectorQuery().in(this)
const observer = uni.createIntersectionObserver(this)
const state = reactive<stateType>({
  scrollTopSize: 0,
  fillHeight: 0,
})
const leftVesselState = reactive<leftVesselStateType>({
  currenIndex: 0,
  currenHeight: 0,
  moveY: 0,
  leftIntoView: computed(() => {
    return `left-${leftVesselState.currenIndex > 1 ? leftVesselState.currenIndex - 2 : 0}`
  }),
})
const rightVesselState = reactive<rightVesselStateType>({
  scrollTop: 0,
  oldScrollTop: 0,
  topArrList: [],
})
const leftFun = {
  async leftClickButton(value: number) {
    rightVesselState.scrollTop = rightVesselState.oldScrollTop
    await nextTick()
    rightVesselState.scrollTop = rightVesselState.topArrList[value]
    await nextTick()
    setTimeout(() => {
      leftVesselState.currenIndex = value
    }, 1000)
  },

  getClassifyElement() {
    query
      .select('.item')
      .boundingClientRect((data: any) => {
        return new Promise((resolve, reject) => {
          leftVesselState.currenHeight = data.height //获取第一个item的高度
          resolve(data)
        }).catch((err) => {
          leftVesselState.currenHeight = 50
        })
      })
      .exec()
  },
}

const rightFun = {
  rightClickButton(e) {
    console.log(rightVesselState)

    const { scrollTop, scrollHeight, deltaY } = e.detail
    let index = 0
    for (let i = rightVesselState.topArrList.length - 1; i >= 0; i--) {
      if (scrollTop + 2 >= rightVesselState.topArrList[i]) {
        index = i
        break
      }
    }
    rightVesselState.oldScrollTop = rightVesselState.topArrList[index]
    leftVesselState.currenIndex = index < 0 ? 0 : index
    leftVesselState.moveY = leftVesselState.currenIndex * leftVesselState.currenHeight
    console.log(leftVesselState)
  },
  getElementTop() {
    return new Promise((resolve, reject) => {
      query
        .selectAll('.item-parent')
        .boundingClientRect((data) => {
          resolve(data)
        })
        .exec()
    }).then((res: any) => {
      rightVesselState.topArrList = res.map((item) => {
        return item.top - state.scrollTopSize
      })
      //剩余多少高度撑满屏幕
      const last = res[res.length - 1].length
      if (last < props.virtualMenuHeight) {
        state.fillHeight = props.virtualMenuHeight - last
      } else {
        state.fillHeight = 100
      }
    })
  },
}

onMounted(async () => {
  console.log(props)
  await nextTick()

  await leftFun.getClassifyElement()
  await rightFun.getElementTop()
})
</script>
<style lang="scss" scoped>
@import './style/v-bind-style.scss';
.vessel-info {
  overflow: hidden;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
}

//左侧区域
.left-vessel {
  width: 180rpx;
  box-sizing: border-box;
  font-size: 32rpx;
  &-scroll {
    background-color: #f2f4f6;
  }
  .info {
    .item {
      width: 180rpx;
      height: 100rpx;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      font-size: 26rpx;
      color: #444;
      font-weight: 400;
      justify-content: center;
    }
  }
  .item-active {
    width: 180rpx;
    height: 100rpx;
    position: absolute;
    font-size: 28rpx;
    font-weight: 600;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    .active-name {
      z-index: 10;
    }
  }
}

//右侧区域
.right-vessel {
  flex: 1;
  .info {
    background-color: #f2f4f6;
    width: 100%;
  }
  .item-parent {
    width: 530rpx;
  }
  .item-parent + .item-parent {
    border-top: 2rpx solid #e3e4e6;
  }
  .class-item {
    .item-title {
      font-size: 28rpx;
      font-family: Source Han Sans CN;
      color: #222222;
      font-weight: bold;
    }
    .thumb-box {
      width: 100%;
      display: flex;
      height: 260rpx;
      padding: 33rpx 0;

      //左侧缩略图
      .left-info {
        width: 220rpx;
        height: 220rpx;
        border-radius: 15rpx;
        background: #f2f4f6;
        overflow: hidden !important;
        text-align: center;
        line-height: 220rpx;
        .item-image {
          width: 90rpx;
          height: 90rpx;
        }
      }

      //右侧商品说明
      .right-info {
        padding: 0 0 0 15rpx;
        width: 320rpx;
        .goods-title {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          font-size: 32rpx;
          height: 90rpx;
          word-wrap: break-word;
        }
        .bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      }
    }
  }
}
</style>
