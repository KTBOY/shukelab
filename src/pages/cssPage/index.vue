<template>
	<view class="css-info">
		<view class="css-border">
			<sh-loading type="1" :visible="true" :wrapperStyle="{position: 'absolute'}" />
		</view>
		<view class="css-border">

			<sh-loading type="2" :wrapperStyle="{position: 'absolute'}" ref="shLoadingRef" />
		</view>
		<view class="css-border">
			<sh-loading type="3" :wrapperStyle="{position: 'absolute'}" :visible="true" />
		</view>
		<view class="css-border">
			<sh-loading type="4" :wrapperStyle="{position: 'absolute'}" :visible="true" />
		</view>
		<view class="css-border">
			<sh-loading type="5" :wrapperStyle="{position: 'absolute'}" :visible="true" />
		</view>
		<view class="css-border">
			<sh-loading type="6" :wrapperStyle="{position: 'absolute'}" :visible="true" />
		</view>

	</view>
</template>

<script lang="ts" setup>
	import { onMounted, ref } from 'vue';
	import breathingLight from './Loading/breathingLight.vue'
	import sleep from './Loading/sleep.vue'

	const shLoadingRef = ref()


	onMounted(() => {
		shLoadingRef.value.open()
		
	})
</script>

<style lang="scss" scoped>
	.css-info {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
	}

	.css-border {
		border: 1rpx solid #d4d4d4;
		width: 45%;
		height: 300rpx;
		border-radius: 20rpx;
		margin: 10rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}
</style>