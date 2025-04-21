<template>
	<view class="toolbar">
		<view class="finish">
			<view class="wirter-border">
				<view class="finish-type_agian" @tap="handleClickClose">关闭</view>
			</view>
			<view class="wirter-border take">
				<view class=" finish-type_submit" @tap="handleClickTake">拍照</view>
			</view>
			<view class="wirter-border">
				<view class="finish-type_agian" v-if="device == 'front'" @click="handleClickDevice('back')"> 后置 </view>
				<view class="finish-type_agian" v-else @click="handleClickDevice('front')"> 前置 </view>
			</view>

		</view>
	</view>
</template>
<script setup lang="ts">import { ref } from 'vue';

	defineProps({
		cameralType: {
			type: String,
			default: 'face'
		},
		routCameralType: {
			type: Boolean,
			default: false,
		},
	});
	const emits = defineEmits(['handleClickTake', 'handleClickDevice']);
	const device = ref('front');
	const handleClickClose = () => {
		let currentPages = getCurrentPages();
		if (currentPages.length <= 1) {
			uni.reLaunch({
				url: '/pages/index/index',
			});
		} else {
			uni.navigateBack();
		}
	};
	const handleClickTake = () => {
		emits('handleClickTake');
	};
	const handleClickDevice = (value : string) => {
		device.value = value;
		emits('handleClickDevice', value);
	};
</script>
<style lang="scss" scope>
	.toolbar {
		height: 100rpx;
		// width: 630rpx;
		display: flex;
		margin-top: 80rpx;
		display: flex;
		justify-content: space-around;
		align-items: center;
	}

	.finish {
		flex: 1;
		padding: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		font-size: 40rpx;
		// background-color: #fff;
		// border-radius: 24rpx;
		overflow: hidden;
		margin: 0 10rpx;
		font-weight: 700;

		.wirter-border {
			//width: 292rpx;
			height: 126rpx;
			border: 3rpx solid #ffffff;
			border-radius: 12rpx;
			display: flex;
			align-items: center;
			justify-content: center;

		}

		.finish-type_agian {
			width: 172rpx;
			height: 116rpx;
			margin: 6rpx;
			line-height: 116rpx;
			border-radius: 8rpx;
			background-color: #fff;
			text-align: center;
		}

		.finish-type_submit {
			width: 192rpx;
			height: 116rpx;
			margin: 6rpx;
			line-height: 116rpx;
			border-radius: 8rpx;
			background: #1f8fff;
			text-align: center;
			color: #fff;


		}

		.take {
			margin: 0 15rpx;
		}

	}
</style>