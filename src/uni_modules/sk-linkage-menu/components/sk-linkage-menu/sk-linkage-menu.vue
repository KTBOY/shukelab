<!--
 * @Author: sk
 * @Date: 2022-09-07 15:22:27
 * @LastEditTime: 2022-10-20 14:06:05
 * @LastEditors: sk
 * @Description: 菜单虚拟列表
 * @FilePath: \shuke-lab\src\components\VirtualMenuGanged\VirtualMenuGanged.vue
-->
<template>
	<view class="virtual-menu-ganged" >
		<view class="menu-vessel">
			<view class="vessel-info">
				<view class="left-vessel">
					<scroll-view class="left-scroll" :scroll-y="true" :scroll-into-view="leftVesselState.leftIntoView"
						:scroll-with-animation="true" :style="{ height: `${virtualMenuHeight}px` }">
						<view v-if="list.length" class="info">
							<view class="item-active" :style="{ transform: `translateY(${leftVesselState.moveY}px)` }">
								<text class="active-name">{{ list[leftVesselState.currenIndex].name }}</text>
							</view>
							<view v-for="(item, index) in list" :id="`left-${index}`" :key="index" class="item"
								@click="leftFun.leftClickButton(index)">
								<text class="name">{{ item.name }}</text>
							</view>
						</view>
					</scroll-view>
				</view>
				<view class="right-vessel">
					<scroll-view :scroll-y="true" class="right-scroll" :style="{ height: `${virtualMenuHeight}px` }"
						:scroll-top="rightVesselState.scrollTop" :scroll-with-animation="true"
						@scroll="rightFun.scroll">
						<view class="info">
							<view v-for="(item, index) in list" :id="'right-' + index" :key="item.id"
								class="item-parent">
								<block v-for="(item1, index2) in item.data" :key="index2">
									<slot :data="{...item,...item1}"></slot>
								</block>
							</view>
						</view>

						<!-- 占位符 -->
						<view class="fill-last" :style="{ height: state.fillHeight + 'px' }"></view>
					</scroll-view>
				</view>
			</view>
		</view>
	</view>
</template>
<script lang="ts" setup>
	import { ref, reactive, defineProps, onMounted, computed, PropType, nextTick, WritableComputedRef } from 'vue'
	interface stateType {
		scrollTopSize : number
		fillHeight : number
		currenHeight : any
		windowItemCount : WritableComputedRef<number>
	}

	interface leftVesselStateType {
		currenIndex : number
		currenHeight : number
		moveY : number
		leftIntoView : WritableComputedRef<string>
	}
	interface rightVesselStateType {
		scrollTop : number
		oldScrollTop : number
		topArrList : Array<any>
	}

	interface MenuDataItem {
		name : string
		data : Array<any>
		id : number
	}

	const props = defineProps({
		virtualMenuHeight: {
			type: Number,
			default: uni.getSystemInfoSync().windowHeight - 44,
		},
		list: {
			type: Array as PropType<MenuDataItem[]>,
			default: () => {
				return []
			},
		},
		itemHeight: {
			type: Number,
			default: 130,
		},

	})
	const query = uni.createSelectorQuery().in(this)
	const observer = uni.createIntersectionObserver(this)
	const a = ref()
	const state = reactive<stateType>({
		scrollTopSize: 0,
		fillHeight: 0,
		currenHeight: {
			isLookList: [],
		},
		windowItemCount: computed(() => {
			return Math.ceil(props.virtualMenuHeight / synthesizeItemHeight.value[leftVesselState.currenIndex].count)
		}),
	})

	const leftVesselState = reactive<leftVesselStateType>({
		currenIndex: 0,
		currenHeight: 0,
		moveY: 0,
		leftIntoView: computed(() => {
			return `left-${leftVesselState.currenIndex > 1 ? leftVesselState.currenIndex - 2 : 0}`
		}),
	})
	const rightVesselState = reactive<rightVesselStateType>({
		scrollTop: 0,
		oldScrollTop: 0,
		topArrList: [],
	})
	const synthesizeItemHeight : WritableComputedRef<any> = computed(() => {
		if (!props.list.length) return
		const countList : Array<object> = []
		for (let index = 0; index < props.list.length; index++) {
			const data : any = {
				list: [],
				count: 0,
			}
			const element = props.list[index]
			const len = element.data.length
			data.list.push(len * props.itemHeight)
			data.count = data.list.length * props.itemHeight
			countList.push(data)
		}

		return countList
	})
	const leftFun = {
		async leftClickButton(value : number) {
			rightVesselState.scrollTop = rightVesselState.oldScrollTop
			await nextTick()
			rightVesselState.scrollTop = rightVesselState.topArrList[value]
			await nextTick()
			setTimeout(() => {
				leftVesselState.currenIndex = value
			}, 1000)
		},

		getClassifyElement() {
			query
				.select('.item')
				.boundingClientRect((data : any) => {
					return new Promise((resolve, reject) => {
						leftVesselState.currenHeight = data.height //获取第一个item的高度
						resolve(data)
					}).catch((err) => {
						leftVesselState.currenHeight = 50
					})
				})
				.exec()
		},
	}

	const rightFun = {
		//切换分类
		scroll(e) {
			console.log(rightVesselState)

			const { scrollTop, scrollHeight, deltaY } = e.detail
			let index = 0
			for (let i = rightVesselState.topArrList.length - 1; i >= 0; i--) {
				if (scrollTop + 2 >= rightVesselState.topArrList[i]) {
					index = i
					break
				}
			}
			rightVesselState.oldScrollTop = rightVesselState.topArrList[index]
			leftVesselState.currenIndex = index < 0 ? 0 : index
			leftVesselState.moveY = leftVesselState.currenIndex * leftVesselState.currenHeight
			console.log(leftVesselState)
		},

		//获取数据头部距离
		getElementTop() {
			return new Promise((resolve, reject) => {
				query
					.selectAll('.item-parent')
					.boundingClientRect((data) => {
						resolve(data)
					})
					.exec()
			}).then((res : any) => {
				rightVesselState.topArrList = res.map((item) => {
					return item.top - state.scrollTopSize
				})
				//剩余多少高度撑满屏幕
				const last = res[res.length - 1].height

				if (last - 20 < props.virtualMenuHeight) {
					state.fillHeight = props.virtualMenuHeight - last
				} else {
					state.fillHeight = 100
				}
			})
		},
	}

	onMounted(async () => {
		await nextTick()
		leftFun.getClassifyElement()
		await rightFun.getElementTop()
	})
</script>
<style scoped>
	@import './sk-linkage-menu.css';
</style>