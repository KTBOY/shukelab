<template>
	<view class="page">
		<!-- width / height / radius -->
		<view class="section">
			<view class="section__title">width / height / radius — 尺寸控制</view>
			<view class="section__desc">数字按 rpx，字符串原样传入；radius 缺省为高度一半（药丸形）。</view>
			<sk-flux-capsule :ref="collectCapsule" :colors="['#14e094', '#2e7aff']" :width="560" :height="140" :radius="20" title="宽560 高140 圆角20" :seed="10" />
		</view>

		<!-- speed -->
		<view class="section">
			<view class="section__title">speed — 流速</view>
			<view class="section__desc">speed 控制流体基础流速，默认 0.22。左慢(0.08) 右快(0.6)。</view>
			<view class="duo">
				<sk-flux-capsule :ref="collectCapsule" :colors="['#002ea6', '#ff5c1f']" :speed="0.08" subtitle="0.08 慢" :seed="20" />
				<sk-flux-capsule :ref="collectCapsule" :colors="['#002ea6', '#ff5c1f']" :speed="0.6" subtitle="0.6 快" :seed="21" />
			</view>
		</view>

		<!-- gloss -->
		<view class="section">
			<view class="section__title">gloss — 玻璃高光</view>
			<view class="section__desc">默认开启顶部 iOS 镜面高光层，:gloss="false" 关闭。</view>
			<sk-flux-capsule :ref="collectCapsule" :colors="['#7a3dff', '#b8d43d']" :gloss="false" subtitle="gloss=false（关闭高光）" :seed="30" />
		</view>

		<!-- interactive -->
		<view class="section">
			<view class="section__title">interactive — 交互开关</view>
			<view class="section__desc">默认开启按压/搅动交互，:interactive="false" 时触摸无响应。</view>
			<sk-flux-capsule :ref="collectCapsule" :colors="['#ffb82e', '#ff5747']" :interactive="false" subtitle="interactive=false 无触摸反馈" :seed="40" />
		</view>

		<!-- paused -->
		<view class="section">
			<view class="section__title">paused — 受控暂停</view>
			<view class="section__desc">paused prop 受控暂停/恢复渲染循环。</view>
			<view class="row">
				<button size="mini" @click="isPaused = !isPaused">
					{{ isPaused ? '▶ 恢复' : '⏸ 暂停' }}
				</button>
				<text class="tips">当前：{{ isPaused ? '已暂停' : '运行中' }}</text>
			</view>
			<sk-flux-capsule :ref="collectCapsule" :colors="['#8c8c8c', '#d1d1d1']" :paused="isPaused" subtitle="受控暂停演示" :seed="50" />
		</view>

		<!-- seed -->
		<view class="section">
			<view class="section__title">seed — 多实例不同纹理</view>
			<view class="section__desc">相同 colors 传入不同 seed，纹理完全不同、永不同步。</view>
			<view class="duo">
				<sk-flux-capsule :ref="collectCapsule" :colors="['#ff4f9e', '#ff8c40', '#b83dff']" subtitle="seed=60" :seed="60" />
				<sk-flux-capsule :ref="collectCapsule" :colors="['#ff4f9e', '#ff8c40', '#b83dff']" subtitle="seed=61" :seed="61" />
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { onBeforeUpdate, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'

const isPaused = ref(false)

type CapsuleExposed = { pause(): void; resume(): void }
let capsules: CapsuleExposed[] = []

function collectCapsule(el: unknown): void {
	if (el) capsules.push(el as CapsuleExposed)
}

onBeforeUpdate(() => {
	capsules = []
})

onHide(() => capsules.forEach((c) => c.pause()))
onShow(() => capsules.forEach((c) => c.resume()))
</script>

<style lang="scss" scoped>
page {
	background: #f7f8fa;
}

.page {
	padding: 40rpx 32rpx 80rpx;
}

.section {
	margin-bottom: 60rpx;

	&__title {
		font-size: 28rpx;
		font-weight: 700;
		color: #111;
		margin-bottom: 12rpx;
	}

	&__desc {
		font-size: 22rpx;
		color: #888;
		margin-bottom: 24rpx;
		line-height: 1.6;
	}
}

.duo {
	display: flex;
	gap: 20rpx;
}

.row {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.tips {
	font-size: 24rpx;
	color: #666;
}
</style>
