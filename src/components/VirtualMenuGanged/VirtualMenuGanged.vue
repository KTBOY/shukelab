<!--
 * @Author: zlc
 * @Date: 2022-09-07 15:22:27
 * @LastEditTime: 2022-10-20 14:06:05
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
            :scroll-into-view="leftVesselState.leftIntoView"
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
            @scroll="rightFun.scroll"
          >
            <view class="info">
              <view v-for="(item, index) in list" :id="'right-' + index" :key="item.id" class="item-parent">
                <block v-for="(item1, index2) in item.data" :key="index2">
                  <view v-if="state.currenHeight.isLookList[index]">
                    <view class="class-item">
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

                  <!-- 虚拟块 -->
                  <block v-else>
                    <view :style="{ height: `${synthesizeItemHeight[index].list[index2]}px` }"> </view>
                  </block>
                </block>
              </view>
            </view>

            <!-- 占位符 -->
            <view class="fill-last" :style="{ height: state.fillHeight + 'px' }"></view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>
<script lang="ts" setup>
import { ref, reactive, defineProps, onMounted, computed, PropType, nextTick, WritableComputedRef } from 'vue'
interface stateType {
  scrollTopSize: number
  fillHeight: number
  currenHeight: any
  windowItemCount: WritableComputedRef<number>
}

interface leftVesselStateType {
  currenIndex: number
  currenHeight: number
  moveY: number
  leftIntoView: WritableComputedRef<string>
}
interface rightVesselStateType {
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
    default: uni.getSystemInfoSync().windowHeight - 44,
  },
  list: {
    type: Array as PropType<MenuDataItem[]>,
    default: () => {
      return []
    },
  },
  itemHeight: {
    type: Number,
    default: 130,
  },
})
const query = uni.createSelectorQuery().in(this)
const observer = uni.createIntersectionObserver(this)
const a = ref()
const state = reactive<stateType>({
  scrollTopSize: 0,
  fillHeight: 0,
  currenHeight: {
    isLookList: [],
  },
  windowItemCount: computed(() => {
    return Math.ceil(props.virtualMenuHeight / synthesizeItemHeight.value[leftVesselState.currenIndex].count)
  }),
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
const synthesizeItemHeight: WritableComputedRef<any> = computed(() => {
  if (!props.list.length) return
  const countList: Array<object> = []
  for (let index = 0; index < props.list.length; index++) {
    const data: any = {
      list: [],
      count: 0,
    }
    const element = props.list[index]
    const len = element.data.length
    data.list.push(len * props.itemHeight)
    data.count = data.list.length * props.itemHeight
    countList.push(data)
  }

  console.log('虚拟高度', countList)
  return countList
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
  //切换分类
  scroll(e) {
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
    rightFun.onScrollIntersectionObserverBlock()
    console.log(leftVesselState)
  },

  //获取数据头部距离
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
      const last = res[res.length - 1].height

      if (last - 20 < props.virtualMenuHeight) {
        state.fillHeight = props.virtualMenuHeight - last
      } else {
        state.fillHeight = 100
      }
    })
  },
  onScrollIntersectionObserverBlock() {
    const currenIndex = leftVesselState.currenIndex
    observer.relativeToViewport({ top: 100, bottom: 100 }).observe(`#right-${currenIndex}`, async (res: any) => {
      if (res.intersectionRatio) {
        const end = currenIndex + state.windowItemCount
        for (let index = currenIndex; index < end; index++) {
          state.currenHeight.isLookList[index] = true
        }
      } else {
        state.currenHeight.isLookList[res.dataset.index] = false
      }

      console.log(state.currenHeight)
    })
  },
}

onMounted(async () => {
  console.log(props)
  await nextTick()
  state.currenHeight.isLookList = Array(state.windowItemCount).fill(true) //当前视窗可以显示几条数据
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
