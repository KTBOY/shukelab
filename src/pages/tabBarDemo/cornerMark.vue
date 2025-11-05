<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<div class="tab-demo">
			<view class="uni-title uni-common-mt">切换弧度背景样式</view>

		</div>
		<sk-tab-bar :data="list" :iconBackgroundColor="iconBackgroundColor"
			:outerApertureBorderColor="outerApertureBorderColor"></sk-tab-bar>


	</view>
</template>

<script lang="ts" setup>
	import { ref } from 'vue';
	import icon1Active from "@/static/icon1.png"
	import icon1 from "@/static/66.png"
	import icon2Active from "@/static/icon2.png"
	import icon2 from "@/static/77.png"
	import airec from "@/static/airec.png"
	import airec2 from "@/static/airec2.png"

	const colorList = ref([{
		value: '#e07800',
		name: '#e07800',
		checked: 'true'
	},
	{
		value: '#c30c00',
		name: '#c30c00'
	},
	{
		value: '#f2f3f7',
		name: '复原'
	},

	])
	const colorList2 = ref([{
		value: '#aa0000',
		name: '#aa0000',
		checked: 'true'
	},
	{
		value: '#ffaaff',
		name: '#ffaaff'
	},
	{
		value: '#030303',
		name: '复原'
	},

	])
	const iconList = ref([{
		value: '#aa0000',
		name: '#aa0000',
		checked: 'true'
	},

	{
		value: '#030303',
		name: '复原'
	},

	])
	const iconList3 = ref([{
		name: '切换',
		checked: 'true',
		icon: airec,
		active: airec2,
	},


	])
	const current = ref(2)
	const current2 = ref(2)
	const current3 = ref(1)
	const list = ref([{
		icon: icon1,
		active: icon1Active,
		text: '首页',
		width: '36px',
		height: '36px',
		url: 'pages/home/home',
	},
	{
		icon: icon2,
		active: icon2Active,
		text: '资源列表',
		width: '36px',
		height: '36px',
		url: 'pages/goods/category/index',
	},
		// {
		// 	icon: icon2,
		// 	active:icon2Active,
		// 	text: '资源列表',
		// 	width: '36px',
		// 	height: '36px',
		// 	url: 'pages/goods/category/index',
		// },
		// {
		// 	icon: icon2,
		// 	active:icon2Active,
		// 	text: '资源列表',
		// 	width: '36px',
		// 	height: '36px',
		// 	url: 'pages/goods/category/index',
		// },
	])

	const outerApertureBorderColor = ref('#f2f3f7')
	const iconBackgroundColor = ref()
	const iconNmae = ref()

</script>

<style>
	page {
		background-color: var(--bg)
	}
</style>
<style lang="scss" scoped>
	.bg {
		background-color: var(--bg);
		height: 100%;
		padding: 15rpx;
	}

	.tab-demo {
		height: 390rpx;
		background-color: #f2f3f7;
		padding: 10rpx;
	}

	.flex {
		display: flex;
		margin: 5rpx;
	}
</style>