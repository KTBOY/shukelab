<template>
	<view>
		<sk-linkage-menu :list="state.test" :height="500" @chang="leftName">
			<template v-slot="{data}">
				<view>
					<view class="class-item">
						<view class="thumb-box item-food">
							<view class="left-info">
								<image :src="data.image" class="item-image"></image>
							</view>
							<view class="right-info">
								<view class="goods-title"> {{ data.name }}</view>
							</view>
						</view>
					</view>
				</view>
			</template>
		</sk-linkage-menu>
	</view>
</template>

<script lang="ts">
	import { onMounted, reactive } from 'vue'
	type stateType = {
		test : any
	}
	export default{
		setup(props) {
			const state = reactive<stateType>({
				test: [],
			})

			onMounted(() => {
				for (let index = 0; index < 100; index++) {
					state.test.push({
						name: `${index}号`,
						data: [
							{
								classify: `${index}号2`,
								lazyLoad: false,
								defaut: '/static/image/commer/defaut.png',
								image: 'https://img2.baidu.com/it/u=3995102021,1242293358&fm=253&fmt=auto&app=138&f=JPEG?w=774&h=500',
								id: index,
							},
							{
								classify: `${index}号`,
								lazyLoad: false,
								defaut: '/static/image/commer/defaut.png',
								image: 'https://img2.baidu.com/it/u=3995102021,1242293358&fm=253&fmt=auto&app=138&f=JPEG?w=774&h=500',
								id: index,
							},
						],
					})
				}
			})
			
				
			const leftName=(v)=>{
				console.log(v)
			}
			return {
				state,
				leftName
			}
		},
	}
</script>


<style lang="scss" scoped>
	.class-item {
		.item-title {
			font-size: 28rpx;
			font-family: Source Han Sans CN;
			color: #222222;
			font-weight: bold;
		}

		.thumb-box {
			width: 100%;
			display: flex;
			height: 260rpx;
			padding: 33rpx 0;

			//左侧缩略图
			.left-info {
				width: 220rpx;
				height: 220rpx;
				border-radius: 15rpx;
				background: #f2f4f6;
				overflow: hidden !important;
				text-align: center;
				line-height: 220rpx;

				.item-image {
					width: 90rpx;
					height: 90rpx;
				}
			}

			//右侧商品说明
			.right-info {
				padding: 0 0 0 15rpx;
				width: 320rpx;

				.goods-title {
					display: -webkit-box;
					overflow: hidden;
					-webkit-box-orient: vertical;
					-webkit-line-clamp: 2;
					font-size: 32rpx;
					height: 90rpx;
					word-wrap: break-word;
				}

				.bottom {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
			}
		}
	}
</style>