<!--
 * @Author: zlc
 * @Date: 2022-10-13 14:47:57
 * @LastEditTime: 2022-10-14 16:50:00
 * @LastEditors: zlc
 * @Description: 
 * @FilePath: \shuke-lab\src\pages\virtualMenuGanged\index.vue
-->
<template>
  <view><virtual-menu-ganged :list="state.test"></virtual-menu-ganged></view>
</template>

<script lang="ts">
import VirtualMenuGanged from '@/components/VirtualMenuGanged/VirtualMenuGanged.vue'

import { onMounted, reactive } from 'vue'
type stateType = {
  test: any
}
export default {
  components: {
    'virtual-menu-ganged': VirtualMenuGanged,
  },

  setup(props) {
    const state = reactive<stateType>({
      test: [],
    })

    onMounted(() => {
      for (let index = 0; index < 8; index++) {
        state.test.push({
          name: `${index}人`,
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
    return {
      state,
    }
  },
}
</script>
