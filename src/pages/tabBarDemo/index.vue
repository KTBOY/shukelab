<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<div class="tab-demo">
			<view class="uni-title uni-common-mt">切换弧度背景样式</view>

			<radio-group @change="radioChange" class="flex">
				<label class="flex" v-for="(item, index) in colorList" :key="item.value">
					<view>
						<radio :value="item.value" :checked="index === current" />
					</view>
					<view :style="{color:index==2?'red': item.value}">{{item.name}}</view>
				</label>
			</radio-group>
			<view class="uni-title uni-common-mt">切换按钮颜色</view>
			<radio-group @change="radioChange2" class="flex">
				<label class="flex" v-for="(item, index) in colorList2" :key="item.value">
					<view>
						<radio :value="item.value" :checked="index === current2" />
					</view>
					<view :style="{color:index==2?'#030303': item.value}">{{item.name}}</view>
				</label>
			</radio-group>

			<view class="uni-title uni-common-mt">自定义图标</view>
			<radio-group @change="radioChange3" class="flex">
				<label class="flex" v-for="(item, index) in iconList3" :key="item.name">
					<view>
						<radio :value="item.name" :checked="index === current3" />
					</view>
					<view>{{item.name}}</view>
				</label>
			</radio-group>


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

	const radioChange = (evt) => {
		for (let i = 0; i < colorList.value.length; i++) {
			if (colorList.value[i].value === evt.detail.value) {
				current.value = i;
				break;
			}
		}
		outerApertureBorderColor.value = evt.detail.value
	}


	const radioChange2 = (evt) => {
		console.log(evt)
		for (let i = 0; i < colorList2.value.length; i++) {
			if (colorList.value[i].value === evt.detail.value) {
				current2.value = i;
				break;
			}
		}
		iconBackgroundColor.value = evt.detail.value

	}

	const radioChange3 = (evt) => {

		console.log(evt)
		for (let i = 0; i < iconList3.value.length; i++) {
			if (iconList3.value[i].name === evt.detail.value) {
				current3.value = i
				console.log(iconList3.value[i])
				list.value[i].icon = iconList3.value[i].icon
				list.value[i].active = iconList3.value[i].active
				break;
			}
		}

		console.log(list.value)


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