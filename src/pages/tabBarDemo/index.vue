<template>
	<view class="bg" :style="{'background-color':outerApertureBorderColor}">

		<div class="tab-demo">
			<view class="uni-title uni-common-mt">切换弧度背景样式</view>

			<radio-group @change="radioChange" class="flex">
				<label class="flex" v-for="(item, index) in colorList" :key="item.value">
					<view>
						<radio :value="item.value" :checked="index === current" />
					</view>
					<view :style="{color: item.value}">{{item.name}}</view>
				</label>
			</radio-group>

		<!-- 	<view class="uni-title uni-common-mt">切换图标</view> -->
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
	const current = ref(0)
	const list = ref([{
		icon: icon1,
		active:icon1Active,
		text: '首页',
		width: '36px',
		height: '36px',
		url: 'pages/home/home',
	},
	{
		icon: icon2,
		active:icon2Active,
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

	const radioChange = (evt) => {
		for (let i = 0; i < colorList.value.length; i++) {
			if (colorList.value[i].value === evt.detail.value) {
				current.value = i;
				break;
			}
		}
		console.log(evt)
		outerApertureBorderColor.value = evt.detail.value
		// iconBackgroundColor.value = evt.detail.value
	}
</script>

<style lang="scss" scoped>
	.bg {
		background-color: #f2f3f7;
		height: calc(100vh - 88px);
		padding: 15rpx;
	}

	.tab-demo {
		height: 300rpx;
		background-color: #f2f3f7;
		padding: 10rpx;
	}

	.flex {
		display: flex;
		margin: 5rpx;
	}
</style>