<!-- 案例：三种形态（concave / filter / plain）在纯色·渐变·图片背景下的对比。
	重点演示：plain 不依赖背景色，任意背景都干净；
	concave(box-shadow) 与 filter(blur+contrast) 的光圈/融合底色需与页面背景同色，
	背景为渐变或图片时无法用单一颜色匹配，会穿帮。 -->
<template>
	<view class="stage" :style="stageStyle">
		<scroll-view class="content" scroll-y>
			<view class="card">
				<view class="uni-title">形态 mode</view>
				<view class="chips">
					<view
						v-for="m in modeList"
						:key="m.value"
						class="chip"
						:class="{ 'chip--on': m.value === mode }"
						@click="mode = m.value"
					>
						{{ m.name }}
					</view>
				</view>

				<view class="uni-title">页面背景</view>
				<view class="chips">
					<view
						v-for="b in bgList"
						:key="b.name"
						class="chip"
						:class="{ 'chip--on': b.name === bgName }"
						@click="bgName = b.name"
					>
						{{ b.name }}
					</view>
				</view>

				<view class="uni-title">原理与取舍</view>
				<view class="tips">
					<view>· concave（组件默认）：伪类 + 实色 box-shadow 填内凹，光圈须与页面背景同色。</view>
					<view>· filter：blur+contrast 让同色底栏与圆钮融合出平滑内凹，曲线比 concave 更自然、切换更有机；但 contrast() 只作用颜色通道、不硬化 alpha，融合层仍须铺一层与页面背景同色的实底 —— 背景依赖与 concave 相同，且小程序低版本基础库可能不支持 contrast()（已加 @supports 降级为实心底栏）。</view>
					<view>· plain：无内凹、无缺口，实心栏 + 圆钮悬浮，不依赖背景色。</view>
					<view class="tips--warn">试试把背景切到「渐变」或「图片」：plain 依旧干净，concave / filter 因光圈色无法匹配复杂背景而穿帮。</view>
				</view>
			</view>
		</scroll-view>

		<sk-tab-bar
			v-model:current="current"
			:data="list"
			:mode="mode"
			:outer-aperture-border-color="apertureColor"
		/>
	</view>
</template>

<script lang="ts" setup>
	import { computed, ref } from 'vue'
	import type { SkTabBarItem, SkTabBarMode } from '@/uni_modules/sk-tab-bar/components/sk-tab-bar/sk-tab-bar.type'
	import icon1 from '@/static/66.png'
	import icon1Active from '@/static/icon1.png'
	import icon2 from '@/static/77.png'
	import icon2Active from '@/static/icon2.png'
	import car from '@/static/car.png'
	import logo from '@/static/logo.png'

	const modeList: { name: string; value: SkTabBarMode }[] = [
		{ name: 'concave 伪类', value: 'concave' },
		{ name: 'filter 融合', value: 'filter' },
		{ name: 'plain 纯净', value: 'plain' },
	]

	/** 各背景对应的“页面底色”；concave/filter 的光圈只能取单一色，渐变/图片下必然与实际背景不符 */
	const bgList = [
		{ name: '纯色', style: { background: '#f2f3f7' }, aperture: '#f2f3f7' },
		{
			name: '渐变',
			style: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 45%, #f093fb 100%)' },
			aperture: '#9a6fd0',
		},
		{
			name: '图片',
			style: { backgroundImage: `url(${logo})`, backgroundSize: 'cover', backgroundPosition: 'center' },
			aperture: '#ffffff',
		},
	]

	const mode = ref<SkTabBarMode>('filter')
	const bgName = ref('纯色')
	const current = ref(0)

	const activeBg = computed(() => bgList.find((b) => b.name === bgName.value) ?? bgList[0])
	const stageStyle = computed(() => activeBg.value.style)
	const apertureColor = computed(() => activeBg.value.aperture)

	const list = computed<SkTabBarItem[]>(() => [
		{ text: '首页', icon: icon1, active: icon1Active },
		{ text: '分类', icon: icon2, active: icon2Active },
		{ text: '购物车', icon: car, active: car, width: '32px', height: '32px' },
	])
</script>

<style lang="scss" scoped>
	.stage {
		position: relative;
		box-sizing: border-box;
		width: 100%;
		height: 100vh;
		/* 底部留出 tabBar 高度，避免内容被遮挡 */
		padding-bottom: 120rpx;
	}

	.content {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 20rpx;
	}

	.card {
		padding: 20rpx 24rpx 32rpx;
		background: rgba(255, 255, 255, 0.92);
		border-radius: 16rpx;
	}

	.uni-title {
		margin: 20rpx 0 12rpx;
		font-size: 28rpx;
		font-weight: bold;
		color: #222;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.chip {
		padding: 10rpx 24rpx;
		font-size: 24rpx;
		color: #333;
		background: #f2f3f7;
		border: 1rpx solid #e5e5e5;
		border-radius: 30rpx;
	}

	.chip--on {
		color: #fff;
		background: #333;
		border-color: #333;
	}

	.tips {
		font-size: 24rpx;
		line-height: 1.7;
		color: #666;
	}

	.tips--warn {
		margin-top: 12rpx;
		color: #d4380d;
	}
</style>
