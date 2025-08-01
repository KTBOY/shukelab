<template>
	<view class="tabbar-box" :style="{'--length':list.length}">
		<block v-for="(item,index) in list" :key="index">
			<view :class="['menu-item', currIndex==index ? 'active':'']" @click="tabClick(index)">
				<image :class="['iconfont']" :src="currIndex==index?item.active:item.icon"
					:style="{width:item.width, height:item.height}"></image>
				<text>{{item.text}}</text>
			</view>
		</block>
		<view class="active-tabbar-box" :style="{'--n':currIndex, '--color':props.outerApertureBorderColor,
		'--bg':props.iconBackgroundColor
		}"></view>
	</view>
</template>
<script lang="ts" setup>
	import { PropType, ref, watch } from 'vue';

	interface data {
		text : string,
		icon : string
	}

	const props = defineProps({
		data: {
			type: Array as PropType<data[]>,

		},
		outerApertureBorderColor: {
			type: String,
			default: '#f2f3f7'
		},
		iconBackgroundColor: {
			type: String,
			default: 'rgb(3, 3, 3)'
		}
	})

	const list = ref([])
	const currIndex = ref(0)


	watch(() => props.data, (v) => {
		list.value = v
	}, { deep: true, immediate: true })
	const tabClick = (i) => {
		currIndex.value = i
	}
</script>
<style scoped>
	@import './sk-tab-bar.css';

	.test {
		background-color: ;
	}
</style>