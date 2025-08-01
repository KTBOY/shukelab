# sk-linkage-menu

## 代码演示

| <img src="https://pnglog.com/SrBsfq.gif" style="zoom:50%;" /> | <img src="https://pnglog.com/OT5SEx.png" alt="微信截图_20250403111810.png" style="zoom:50%;" /> |
| :----------------------------------------------------------: | :----------------------------------------------------------: |



### 基础使用

```
<template>
	<view>
		<sk-linkage-menu :list="state.test" :height="500">
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

```

```
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
								id: index,
							},
							{
								classify: `${index}号`,
								lazyLoad: false,
								defaut: '/static/image/commer/defaut.png',
								id: index,
							},
						],
					})
				}
			})
			return {
				state,
			}
		},
	}
</script>
```

## API 参考

### Props

|      属性名       |      类型      |                  默认值                   |        说明        |
| :---------------: | :------------: | :---------------------------------------: | :----------------: |
| virtualMenuHeight |     Number     | uni.getSystemInfoSync().windowHeight - 44 |      组件高度      |
|       list        | MenuDataItem[] |                                           |  右侧滚动内容列表  |
|    itemHeight     |     Number     |                    130                    |    每一项的高度    |
|   leftBarStyle    |     Object     |                                           | 左侧未选中菜单样式 |
|  leftBarUnStyle   |     Object     |                                           | 左侧已选中菜单样式 |


### Methods

|      属性名       |      类型      |                  说明                   |
| :---------------: | :------------: | :---------------------------------------: |
|       change       | Functuon |                 左侧选中的回调，参数是点击当前项的数据                 |

**MenuDataItem类型**

| 属性名 |    类型    | 默认值 |            说明            |
| :----: | :--------: | :----: | :------------------------: |
|  name  |   String   |        | 左侧菜单名称，必传不能为空 |
|  data  | Array<any> |        |      右侧滚动内容列表      |
|   id   |   number   |        |    菜单id，必传不能为空    |
