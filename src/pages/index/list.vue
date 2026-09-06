<!--
 * @Author: zlc
 * @Date: 2022-04-11 21:57:38
 * @LastEditTime: 2022-06-28 15:51:41
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \project-template\uni_template\pages\index\list.vue
-->
<template>
  <view class="collapse">
    <list-pages :nav="moduleData"></list-pages>
  </view>
</template>

<script lang="ts" setup>
import { defineComponent, reactive, ref } from 'vue'
import listPages from '@/components/list/listPages/index.vue'
import { nav } from '../../../config.json'

const moduleData = ref(uni.getStorageSync('moduleData'))
console.log(moduleData)
</script>
<style scoped>
/* .collapse 高度为 auto 时，内层 list-pages 的 scroll-view{height:100%} 会退化成内容高，
   不再构成滚动容器；配合 App.vue 的 page{overflow:hidden} 就是超出即裁、滚不动。
   用 calc 而非 100%：小程序端 page{height:100%} 得不到确定高度，百分比会一路塌陷 */
.collapse {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
}
</style>
