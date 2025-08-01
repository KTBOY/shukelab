<!--
 * @Author: zlc
 * @Date: 2021-10-14 14:18:22
 * @LastEditTime: 2022-06-28 15:49:33
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \project-template\uni_template\pages\index\components.vue
-->
<template>
	<view class="index">
		<view class="index-components">
			<view class="nav-item" v-for="nav in nav" :key="nav">
				<!-- <view class="nav-name">{{ nav.name }}</view> -->
				<template v-for="packageItem in nav.packages" :key="packageItem">
					<view v-if="packageItem.show" @click="handleRouter(nav,packageItem)">
						<view class="nav-info">
							<view class="child-name">{{ packageItem.enName }} {{ packageItem.cName }}</view>
							<view>
							<uni-icons type="forward" size="20"></uni-icons>
							</view>
						</view>
					</view>
				</template>
			</view>
		</view>
	</view>
</template>
<script lang="ts">
	import { defineComponent, reactive } from "vue";
	import { nav } from  "../../../config.json"
	//defineComponent:对setup的option参数进行封装，在ts下并且正确的类型推断，
	export default {
		name: "doc",
		setup() {
			function handleRouter(nav, packageItem) {
				uni.setStorageSync('moduleData', packageItem)
				uni.navigateTo({
					url: packageItem.pathList ? packageItem.pathList : '/pages/index/list'
				})
			}
			return reactive({
				nav,
				handleRouter
			});
		},
	};
</script>
<style lang="scss" scoped>
	page {
		background: #f7f8fa;

	}

	.index {
		height: 100%;
		width: 100%;

		&-header {
			width: 750rpx;
			height: 234rpx;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			text-align: center;

			>img {
				width: 120rpx;
				height: 120rpx;
				margin-right: 20rpx;
				flex-shrink: 0;
			}

			.info {
				display: flex;
				flex-direction: column;

				h1 {
					height: 48rpx;
					line-height: 48rpx;
					font-size: 34rpx;
					color: rgba(51, 51, 51, 1);
				}

				p {
					height: 18rpx;
					line-height: 18rpx;
					font-size: 12rpx;
					color: rgba(154, 155, 157, 1);
				}
			}
		}

		&-components {
			background: #f7f8fa;
			// border-radius: 80rpx 80rpx 0 0;
			overflow: hidden;
			padding: 60rpx 50rpx;
			height: 100%;

			.nav-name {
				line-height: 40rpx;
				font-size: 26rpx;
				color: rgba(144, 156, 164, 1);
				margin-bottom: 20rpx;

			}

			.nav-info {
				width: 100%;
				height: 85rpx;
				line-height: 85rpx;
				padding: 0 10rpx;
				display: flex;
				align-items: center;
				justify-content: space-between;
				border-radius: 50rpx;
				background: #ffffff;
				//box-shadow: 0rpx 2rpx 8rpx 0rpx rgba(245, 245, 245, 0.1);
				margin-bottom: 20rpx;
				// -webkit-border-radius: 70px;
				// border-radius: 70px;
				// -webkit-box-shadow: 8px 8px 21px#ffffff, -8px -8px 21px #ffffff;
				// box-shadow: 8px 8px 21px #ffffff, -8px -8px 21px #ffffff;
				box-shadow: 0 1px 4px #6666660f;

				.child-name {
					font-size: 15px;
					font-weight: 700;
					display: block;
					color: #333;
				}
			}
		}
	}
</style>