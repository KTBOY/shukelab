<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<div class="tab-demo">


			<view class="uni-title uni-common-mt">cornerMark 开启角标</view>
			<view class="uni-title uni-common-mt">corner 角标内容</view>


		</div>
		<sk-tab-bar :data="list" :corner="corner" :iconBackgroundColor="iconBackgroundColor"
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
	import car from "@/static/car.png"

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

	const current = ref(2)
	const corner = ref(2)
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
		cornerMark:true
	},
	{
		icon: car,
		active: car,
		text: '购物车',
		width: '32px',
		height: '32px',
		url: 'pages/goods/category/index',
		
		cornerMark:true
	},

	])

	const outerApertureBorderColor = ref('#f2f3f7')
	const iconBackgroundColor = ref()
	const iconNmae = ref()

	const radioChange = (evt) => {
		for (let i = 0; i < colorList.value.length; i++) {
			if (colorList.value[i].value === evt.detail.value) {
				current.value = i;
				break;
			}
		}
		outerApertureBorderColor.value = evt.detail.value
	}
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