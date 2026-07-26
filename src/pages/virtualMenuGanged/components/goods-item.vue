<!-- 案例集共享商品卡片 -->
<template>
	<view class="goods-item">
		<image :src="data.image" class="goods-thumb" mode="aspectFill"></image>
		<view class="goods-info">
			<view class="goods-name">{{ data.goodsName }}</view>
			<view class="goods-desc">{{ data.desc }}</view>
			<view class="goods-bottom">
				<text class="goods-price">￥{{ Number(data.price).toFixed(1) }}</text>
				<view class="goods-add">+</view>
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
	defineProps({
		data: {
			type: Object,
			default: () => ({}),
		},
	})
</script>

<style lang="scss" scoped>
	.goods-item {
		display: flex;
		padding: 20rpx;

		.goods-thumb {
			width: 160rpx;
			height: 160rpx;
			border-radius: 12rpx;
			background: #f2f4f6;
			flex-shrink: 0;
		}

		.goods-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			padding-left: 16rpx;
			overflow: hidden;

			.goods-name {
				font-size: 28rpx;
				font-weight: 600;
				color: #222;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}

			.goods-desc {
				margin-top: 8rpx;
				font-size: 22rpx;
				color: #999;
				display: -webkit-box;
				overflow: hidden;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
			}

			.goods-bottom {
				margin-top: auto;
				display: flex;
				justify-content: space-between;
				align-items: center;

				.goods-price {
					font-size: 30rpx;
					font-weight: 600;
					color: #ff5339;
				}

				.goods-add {
					width: 44rpx;
					height: 44rpx;
					border-radius: 50%;
					background: #000;
					color: #fff;
					font-size: 32rpx;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}
		}
	}
</style>
