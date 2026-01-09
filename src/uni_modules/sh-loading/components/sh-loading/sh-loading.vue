<!--
 * @Author: zlc
 * @Date: 2025-12-09 19:26:43
 * @LastEditTime: 2025-12-12 19:13:26
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \shukelab\src\uni_modules\sh-loading\components\sh-loading\sh-loading.vue
-->
<template>
  <view v-if="localVisible" class="sh-loading-wrapper" :style="props.wrapperStyle">
    <view v-if="mask" class="mask" @click="onMaskClick"></view>
    <view class="loading" :style="{ width: props.width, height: props.height }">
      <breathing-light v-if="props.type === '1'"/>
      <sleep v-else-if="props.type === '2'" />
      <rectangle v-else-if="props.type === '3'" />
      <three-stars v-else-if="props.type ==='4'"  />
	  <triangle v-else-if="props.type === '5'"  />
	    <taiJi v-else-if="props.type === '6'"  />
    </view>

    <slot name="tip">
      <view class="hint">{{ props.tip }}</view>
    </slot>
  </view>
</template>
<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import type { CSSProperties } from 'vue'
import breathingLight from './modules/breathing-light.vue'
import sleep from './modules/sleep.vue'
import rectangle from './modules/rectangle.vue'
import threeStars from './modules/three-stars.vue'
import triangle from './modules/triangle.vue'
import taiJi from './modules/tai-ji.vue'
const props = defineProps({
  type: {
    type: [String, Number],
    default: '1',
  },
  visible: {
    type: Boolean,
    default: false,
  },
  mask: {
    type: Boolean,
    default: false,
  },
  wrapperStyle: { type: Object as () => CSSProperties, default: () => ({}) },

  width: {
    type: String,
    default: '50px',
  },
  height: {
    type: String,
    default: '50px',
  },
  tip: {
    type: String,
    default: '加载中',
  },
})

const emit = defineEmits(['update:visible'])

// 本地可控可同步的可见状态
const localVisible = ref(props.visible)
watch(
  () => props.visible,
  (v) => (localVisible.value = v)
)
watch(localVisible, (v) => emit('update:visible', v))

// 按顺序放入所有可用的 loading 组件（按文件名顺序或按你想要的顺序）
// type=1 -> index 0, type=2 -> index 1, 以此类推；超出长度时循环
const modules = [breathingLight, sleep, rectangle, threeStars /*, 其它组件可在此加入 */]

const itemIndex = computed(() => {
  const t = Number(props.type) || 1
  const idx = Math.max(0, t - 1)
  return idx % modules.length
})

const itemComponent = computed(() => modules[itemIndex.value] ?? breathingLight)

// 对外方法：open / close，并暴露给调用方
function open() {
  localVisible.value = true
}
function close() {
  localVisible.value = false
}
defineExpose({ open, close })

function onMaskClick() {
  // 点击遮罩默认关闭；如需阻止关闭可删除该行
  close()
}
</script>
<style scoped>
.sh-loading-wrapper {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  z-index: 9999;
}

/* 半透明遮罩 */
.mask {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
}

/* loading 容器，居中显示 */
.loading {
  position: relative;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20rpx;
  height: 20rpx;
  background: transparent;
}

/* 使内部组件占满容器（根据具体组件样式可调整） */


.hint {
  margin: 20rpx 0;
  font-size: 18rpx;
  color: #a6a6a6;
}
</style>
