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
	import {
		defineComponent,
		reactive,
		ref,
	} from 'vue'
	import listPages from '@/components/list/listPages/index.vue'
	import {
		nav
	} from "../../../config.json"


	const moduleData = ref(uni.getStorageSync('moduleData'))
	console.log(moduleData)
</script>
<style scoped>

</style>