<template>
	<view class="tabbar-box" :style="{'--length':list.length,'--color':props.outerApertureBorderColor,}">
		<block v-for="(item,index) in list" :key="index">
			<view :class="['menu-item', currIndex==index ? 'active':'']" @click="tabClick(item,index)">
				<image :class="['iconfont']" :src="currIndex==index?item.active:item.icon"
					:style="{width:item.width, height:item.height}"/>
				<text>{{item.text}}</text>
				<view class="corner" v-if="item.cornerMark&&corner">
					{{corner}}
				</view>
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
		icon : string,
		active : string,
		width : string,
		height : string,
		cornerMark:boolean
	}

	interface indexType {
		currenIndex : number
	}
	const emits = defineEmits<{
		change : [data: data & indexType]
	}>()
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
		},

		corner:{
			type: [String,Number]
		}
	})

	const list = ref<data[]>([])
	const currIndex = ref(0)


	watch(() => props.data, (v) => {
		if (v) {
			list.value = v
		}

	}, { deep: true, immediate: true })
	const tabClick = (item : data, currenIndex : number) => {
		currIndex.value = currenIndex
		const data = {
			...item,
			currenIndex

		}
		emits('change', data)

	}
</script>
<style scoped>
	@import './sk-tab-bar.css';

	.test {
		background-color: ;
	}
</style>