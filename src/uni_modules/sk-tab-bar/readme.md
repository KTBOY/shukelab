# sk-tab-bar

### 基础使用

不支持与原生tabBar路由跳转使用

```
<template>
	<view class="bg" :style="{'--bg':outerApertureBorderColor}">
		<div class="tab-demo">
			<view class="uni-title uni-common-mt">切换弧度背景样式</view>

			<radio-group @change="radioChange" class="flex">
				<label class="flex" v-for="(item, index) in colorList" :key="item.value">
					<view>
						<radio :value="item.value" :checked="index === current" />
					</view>
					<view :style="{color:index==2?'red': item.value}">{{item.name}}</view>
				</label>
			</radio-group>
		</div>
		<sk-tab-bar :data="list" :iconBackgroundColor="iconBackgroundColor"
			:outerApertureBorderColor="outerApertureBorderColor"></sk-tab-bar>
	</view>
</template>
```

```
<script lang="ts" setup>
	import { ref } from 'vue';
	import icon1Active from "@/static/icon1.png"
	import icon1 from "@/static/66.png"
	import icon2Active from "@/static/icon2.png"
	import icon2 from "@/static/77.png"

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
	const current = ref(0)
	const list = ref([{
		icon: icon1,
		active: icon1Active,
		text: '首页',
		width: '36px',
		height: '36px',
	},
	{
		icon: icon2,
		active: icon2Active,
		text: '资源列表',
		width: '36px',
		height: '36px',
	},
	])

	const outerApertureBorderColor = ref('#f2f3f7')
	const iconBackgroundColor = ref()

	const radioChange = (evt) => {
		for (let i = 0; i < colorList.value.length; i++) {
			if (colorList.value[i].value === evt.detail.value) {
				current.value = i;
				break;
			}
		}
		console.log(evt)
		outerApertureBorderColor.value = evt.detail.value
		// iconBackgroundColor.value = evt.detail.value
	}
</script>
```

## API 参考

### Props

|          属性名          |   类型   |    默认值    |               说明               |
| :----------------------: | :------: | :----------: | :------------------------------: |
|           data           | tabBar[] |              |               数据       |
| outerApertureBorderColor |  String  |   #f2f3f7    | 按钮底层颜色，需要和page颜色相同 |
|   iconBackgroundColor    |  String  | rgb(3, 3, 3) |            按钮背景色            |


### Methods

|      属性名       |      类型      |                  说明                   |
| :---------------: | :------------: | :---------------------------------------: |
|       change       | Functuon |                 tabBar点击回调                 |

**tabBar类型**

| 属性名 |  类型  | 默认值 |      说明      |
| :----: | :----: | :----: | :------------: |
|  text  | String |   无   |    按钮文字    |
|  icon  | String |   无   |    按钮图标    |
| active | String |   无   | 当前选中的图标 |
| width  | String |   无   |    图标宽带    |
| height | String |   无   |    图标高带    |
