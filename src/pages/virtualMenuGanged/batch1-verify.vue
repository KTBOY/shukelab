<!-- 第一批 P0 修复（B1 清空脏状态 / B2 高度按 id 键控 / B3 长跳转着陆校正）H5 验证页
     断言钩子：window.__TEST__ = { updates, changes }，供浏览器自动化读取 -->
<template>
  <view class="demo-page">
    <view class="panel">
      <view class="row">
        <view class="btn" id="btn-clear" @click="onToggleClear">{{ menuList.length ? '清空list' : '恢复list' }}</view>
        <view class="btn" id="btn-shrink" @click="onShrink">变短到5组</view>
        <view class="btn" id="btn-restore" @click="onRestore">恢复100组</view>
        <view class="btn" id="btn-insert" @click="onInsertHead">头部插入5组</view>
      </view>
      <view class="row">
        <view class="btn" id="btn-jump-94" @click="onJump(94)">跳第95组</view>
        <view class="btn" id="btn-jump-id29" @click="onJumpId29">跳id=29组</view>
      </view>
      <view class="status" id="status-line">current={{ currentIndex }} len={{ menuList.length }} illegal={{ illegalCount }}</view>
    </view>

    <sk-linkage-menu
      ref="menuRef"
      v-model:current="currentIndex"
      :list="menuList"
      :virtual-menu-height="menuHeight"
      :show-title="true"
      @change="onChange"
      @update:current="onUpdateCurrent"
    >
      <template #default="{ data }">
        <goods-item :data="data"></goods-item>
      </template>
      <template #empty>
        <view class="empty-box" id="empty-box">empty slot</view>
      </template>
    </sk-linkage-menu>
  </view>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import type {
  MenuDataItem,
  ChangePayload,
  SkLinkageMenuExpose,
} from '@/uni_modules/sk-linkage-menu/components/sk-linkage-menu/sk-linkage-menu.types'
import GoodsItem from './components/goods-item.vue'
import { createMenuList, delay, getContentHeight } from './mock'

/** 控制台区域高度（px），从组件可视高度中扣除 */
const PANEL_HEIGHT = 120
const menuHeight = getContentHeight(PANEL_HEIGHT)

const menuList = ref<MenuDataItem[]>([])
const menuRef = ref<SkLinkageMenuExpose | null>(null)
const currentIndex = ref(0)
/** update:current 越界计数（list 当前长度视角），P0 修复后应恒为 0 */
const illegalCount = ref(0)

// 浏览器自动化断言钩子
const testState = {
  updates: [] as number[],
  changes: [] as Array<{ index: number; source: string }>,
}
;(window as any).__TEST__ = testState

onMounted(async () => {
  await delay(300)
  menuList.value = createMenuList(100, 3)
})

const onUpdateCurrent = (v: number) => {
  testState.updates.push(v)
  if (v < 0 || v >= menuList.value.length) illegalCount.value++
}

const onChange = (p: ChangePayload) => {
  testState.changes.push({ index: p.index, source: p.source })
}

/** B1a：清空 / 恢复 */
const onToggleClear = () => {
  if (menuList.value.length) {
    menuList.value = []
  } else {
    menuList.value = createMenuList(100, 3)
  }
}

/** B1b：高选中位时变短，观测是否发出越界下标 */
const onShrink = () => {
  menuList.value = createMenuList(5, 3)
}

const onRestore = () => {
  menuList.value = createMenuList(100, 3)
}

/** B2：头部插入 5 个全新分组（id 9000+），原有分组 id 不变、下标全部 +5 */
const onInsertHead = () => {
  const inserted: MenuDataItem[] = []
  for (let i = 0; i < 5; i++) {
    inserted.push({
      id: 9000 + i,
      name: `插入组${i + 1}`,
      data: [
        { id: `9000-${i}`, goodsName: `插入组${i + 1}·商品1`, desc: '插入数据', price: 1, image: '/static/test/test1.jpg' },
      ],
    })
  }
  menuList.value = [...inserted, ...menuList.value]
}

/** B3：长距离跳转（途经大量未测量的估算高度分组） */
const onJump = (index: number) => {
  menuRef.value?.scrollToIndex(index)
}

/** B2：按 id 定位跳转，验证高度缓存随 id 走而不随下标错位 */
const onJumpId29 = () => {
  const index = menuList.value.findIndex((g) => g.id === 29)
  if (index >= 0) menuRef.value?.scrollToIndex(index)
}
</script>

<style lang="scss" scoped>
.demo-page {
  min-height: 100vh;
  background: #fff;
}

.panel {
  padding: 12rpx 20rpx;
  border-bottom: 2rpx solid #eee;
  box-sizing: border-box;
}

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10rpx;
}

.btn {
  padding: 8rpx 20rpx;
  margin-right: 14rpx;
  margin-bottom: 6rpx;
  border-radius: 8rpx;
  background: #000;
  color: #fff;
  font-size: 22rpx;

  &:active {
    opacity: 0.7;
  }
}

.status {
  font-size: 22rpx;
  color: #666;
}

.empty-box {
  padding: 80rpx 0;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}
</style>
