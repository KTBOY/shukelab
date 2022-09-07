<!--
 * @Author: zlc
 * @Date: 2022-09-06 16:39:43
 * @LastEditTime: 2022-09-07 16:04:01
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \project-template-ui-plus\src\App.vue
-->
<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { onMounted } from 'vue'
onMounted(() => {
  console.log('onMounted')
})
onLaunch(() => {
  console.log('App Launch')
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>
<style lang="scss">
@import '../pubilc/style/icon.scss';
</style>
