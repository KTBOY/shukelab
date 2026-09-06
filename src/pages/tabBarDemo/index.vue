<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<div class="tab-demo">
			<view class="uni-title uni-common-mt">更多案例</view>
			<view class="nav-list">
				<view class="nav-item" v-for="nav in demoNavs" :key="nav.path" @click="goDemo(nav.path)">
					{{ nav.name }}
				</view>
			</view>

			<view class="uni-title uni-common-mt">切换形态</view>
			<radio-group @change="radioChangeMode" class="flex">
				<label class="flex" v-for="(item, index) in modeList" :key="item.value">
					<view>
						<radio :value="item.value" :checked="index === currentMode" />
					</view>
					<view>{{item.name}}</view>
				</label>
			</radio-group>

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

			<view class="uni-title uni-common-mt">切换角标</view>
			<radio-group @change="radioChangeBadge" class="flex">
				<label class="flex" v-for="(item, index) in badgeList" :key="item.value">
					<view>
						<radio :value="item.value" :checked="index === currentBadge" />
					</view>
					<view>{{item.name}}</view>
				</label>
			</radio-group>
			<view class="tips">角标加在「资源列表」上：数字超 99 显示 99+，为 0 自动隐藏</view>


		</div>
		<sk-tab-bar :data="list" :mode="mode" :iconBackgroundColor="iconBackgroundColor"
			:outerApertureBorderColor="outerApertureBorderColor"></sk-tab-bar>


	</view>
</template>

<script lang="ts" setup>
	import { ref } from 'vue';
	import type { SkTabBarMode } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type';
	import icon1Active from "@/static/icon1.png"
	import icon1 from "@/static/66.png"
	import icon2Active from "@/static/icon2.png"
	import icon2 from "@/static/77.png"
	import airec from "@/static/airec.png"
	import car from "@/static/car.png"
		import fightingGame2 from "@/static/fighting-game2.png"
			import fightingGame from "@/static/fighting-game.png"

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
		active: airec,
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
		icon: fightingGame,
		active: fightingGame2,
		text: '游戏中心',
		width: '32px',
		height: '32px',
		url: 'pages/goods/category/index',
	},
	{
		icon: icon2,
		active: icon2Active,
		text: '资源列表',
		width: '36px',
		height: '36px',
		url: 'pages/goods/category/index',
		badge: 0,
		dot: false,
	},


	])

	const outerApertureBorderColor = ref('#f2f3f7')
	const iconBackgroundColor = ref()
	const iconNmae = ref()

	/** 形态切换：concave / canvas / plain 就地对比，无需跳转演示页（filter 融合暂不开放） */
	const modeList = ref([
		{ name: 'concave 伪类', value: 'concave' },
		{ name: 'canvas 画布', value: 'canvas' },
		{ name: 'plain 纯净', value: 'plain' },
	])
	const currentMode = ref(0)
	const mode = ref<SkTabBarMode>('concave')
	const radioChangeMode = (evt) => {
		mode.value = evt.detail.value as SkTabBarMode
		currentMode.value = modeList.value.findIndex((m) => m.value === evt.detail.value)
	}

	/** 角标切换：红点 / 数字 / 超上限 99+ 就地演示，无需跳转 badge 演示页 */
	const badgeList = ref([
		{ name: '无角标', value: 'none' },
		{ name: '红点 dot', value: 'dot' },
		{ name: '数字角标', value: 'num' },
		{ name: '超上限 99+', value: 'over' },
	])
	const currentBadge = ref(0)
	const radioChangeBadge = (evt) => {
		const value = evt.detail.value
		currentBadge.value = badgeList.value.findIndex((b) => b.value === value)
		const item = list.value[2]
		item.dot = value === 'dot'
		item.badge = value === 'num' ? 8 : value === 'over' ? 120 : 0
	}

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
		for (let i = 0; i < colorList2.value.length; i++) {
			if (colorList2.value[i].value === evt.detail.value) {
				current2.value = i;
				break;
			}
		}
		iconBackgroundColor.value = evt.detail.value

	}

	const demoNavs = [
		{ name: '四背景形态对比', path: '/pages/tabBarDemo/filter' },
		{ name: '受控与拦截', path: '/pages/tabBarDemo/control' },
		{ name: '路由联动', path: '/pages/tabBarDemo/route-a' },
		{ name: '旧版角标(兼容)', path: '/pages/tabBarDemo/corner' },
	]

	const goDemo = (url : string) => {
		uni.navigateTo({ url })
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
		background-color: #f2f3f7;
		padding: 10rpx;
	}

	.flex {
		display: flex;
		margin: 5rpx;
	}

	.tips {
		font-size: 24rpx;
		color: #666;
	}

	.nav-list {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin: 12rpx 0;
	}

	.nav-item {
		padding: 10rpx 24rpx;
		background-color: #fff;
		border-radius: 30rpx;
		font-size: 24rpx;
		color: #333;
		border: 1rpx solid #e5e5e5;
	}
</style>