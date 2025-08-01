<!--
 * @Author: zlc
 * @Date: 2021-12-29 16:59:24
 * @LastEditTime: 2022-09-07 17:00:42
 * @LastEditors: zlc
 * @Description: 业务-列表组件
 * @FilePath: \project-template\uni_template\components\list\listPages\index.vue
-->
<template>
	<view class="list-pages">
		<view class="nav-item">
			<view class="nav-name">{{ nav.cName||nav.name }}</view>
			<template v-for="packageItem in nav.packages" :key="packageItem">
				<view v-if="packageItem.show">
					<view class="nav-info" :url="packageItem.path" @click="handlerPageRouter(packageItem)">
						<view class="child-name">{{ packageItem.name }} {{ packageItem.cName }}</view>
						<view><uni-icons type="forward" size="20"></uni-icons></view>
					</view>
				</view>
			</template>
		</view>
	</view>
</template>
<script>
	import {
		defineComponent
	} from 'vue';

	export default defineComponent({
		props: {
			nav: {
				type: Object,
				default: () => {
					return {};
				}
			}
		},
		setup(props) {
			function handlerPageRouter(val) {
				console.log(val)
				uni.navigateTo({
					url: val.path
				});
			}

			return {
				handlerPageRouter
			};
		}
	});
</script>
<style lang="scss" scoped>

	.list-pages {
		background: #f7f8fa;
		overflow: hidden;
		padding: 60rpx 50rpx;
		height: 100vh;
		.nav-item {
			flex: 1;

		}
		.nav-name {
			line-height: 40rpx;
			font-size: 26rpx;
			color: rgba(144, 156, 164, 1);
			margin-bottom: 20rpx;

		}
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
		box-shadow: 0rpx 2rpx 8rpx 0rpx rgba(102, 102, 102, 0.06);
		margin-bottom: 20rpx;

		.child-name {
			font-size: 15px;
			font-weight: 700;
			color: #333;
		}
	}
</style>