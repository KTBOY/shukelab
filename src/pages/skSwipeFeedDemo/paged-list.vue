<!--
	案例：usePagedList 分页状态机专项
	组件只管滚动与手势，分页数据流（页码推进、防重入、完成判定、错误重试）全部收敛在这个 composable。
	1. 完成判定三来源：hasMore / total / 短页，三者各自单独给信号时的表现
	2. 判定优先级冲突：hasMore 与 total 结论相反时，hasMore 胜出
	3. 防重入：loading / finished / refreshing 期间的 loadNext 被直接忽略
	4. reset() vs reload()：reset 不发请求只清状态，reload 原地重载且期间保留旧内容
	5. 失败重试：抛错时 pageNo 不推进，再次 loadNext 即重试
	每个块的「实际请求数」由 mock 的 onCall 回调统计，用来证明上述行为真的发生（而不是 UI 看起来像）。
-->
<template>
  <scroll-view class="demo-page" :scroll-y="true" :show-scrollbar="false">
    <!-- 1. 完成判定三来源 -->
    <view class="demo-block">
      <text class="demo-block__title">1 · 完成判定三来源（total 15 条 / pageSize 6，三者应同时在第 3 页到底）</text>
      <view v-for="shape in SHAPES" :key="shape.key" class="shape">
        <view class="shape__head">
          <text class="shape__name">{{ shape.label }}</text>
          <text class="shape__stat">
            pageNo {{ shapeState[shape.key].pageNo }} · list {{ shapeState[shape.key].len }} · finished
            {{ shapeState[shape.key].finished ? 'true' : 'false' }}
          </text>
        </view>
        <sk-scroll-list
          class="demo-list"
          :refreshing="false"
          :loading="shapeState[shape.key].loading"
          :finished="shapeState[shape.key].finished"
          :empty="shapeState[shape.key].len === 0"
          height="120px"
          :refresher-enabled="false"
          @load-more="shapeFeeds[shape.key].loadNext()"
        >
          <view v-for="item in shapeFeeds[shape.key].list.value" :key="item.id" class="row">
            <text class="row__title">{{ item.title }}</text>
          </view>
        </sk-scroll-list>
      </view>
      <view class="demo-tip">
        <text class="demo-tip__text">
          hasMore 只返回 hasMore；total 只返回 total；短页 两者都不返回，靠「本页条数少于 pageSize」判定。第 3 页只回 3 条，三者同时置 finished。
        </text>
      </view>
    </view>

    <!-- 2. 判定优先级冲突 -->
    <view class="demo-block">
      <text class="demo-block__title">2 · 判定优先级：hasMore 优先于 total 优先于短页</text>
      <view class="shape__head">
        <text class="shape__name">total 说「已到底」，hasMore 说「还有」</text>
        <text class="shape__stat">
          pageNo {{ conflict.pageNo.value }} · list {{ conflict.list.value.length }} · finished
          {{ conflict.finished.value ? 'true' : 'false' }}
        </text>
      </view>
      <sk-scroll-list
        class="demo-list"
        :refreshing="false"
        :loading="conflict.loading.value"
        :finished="conflict.finished.value"
        :empty="conflict.list.value.length === 0"
        height="140px"
        :refresher-enabled="false"
        @load-more="conflict.loadNext()"
      >
        <view v-for="item in conflict.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-tip">
        <text class="demo-tip__text">
          接口每页都返回 total=6（第 1 页就够数）但同时 hasMore=true（第 5 页才转 false）。若按 total 判定第 1 页就该 finished，实际能一直加载到第 5 页——证明 hasMore 优先。
        </text>
      </view>
    </view>

    <!-- 3. 防重入 -->
    <view class="demo-block">
      <view class="demo-block__head">
        <text class="demo-block__title">3 · 防重入（连发 10 次 loadNext）</text>
        <text class="demo-block__action" @click="resetBurst">重置</text>
      </view>
      <view class="ctrl">
        <text class="ctrl__btn" @click="burstTen">连发 10 次 loadNext()</text>
      </view>
      <view class="stat">
        <text class="stat__text">
          实际请求数 {{ burstCalls }} · pageNo {{ burst.pageNo.value }} · list {{ burst.list.value.length }} · loading
          {{ burst.loading.value ? 'true' : 'false' }} · finished {{ burst.finished.value ? 'true' : 'false' }}
        </text>
      </view>
      <view class="demo-tip">
        <text class="demo-tip__text">
          延时 600ms 内连发 10 次，只有第 1 次真正发请求（实际请求数 = 1），其余 9 次因 loading=true 被忽略。触底事件在弱网下连发是常态，这一层守卫在 hook 里，页面不用自己写。
        </text>
      </view>
    </view>

    <!-- 4. reset vs reload -->
    <view class="demo-block">
      <text class="demo-block__title">4 · reset() 与 reload() 的区别</text>
      <view class="ctrl">
        <text class="ctrl__btn" @click="rr.loadNext()">loadNext()</text>
        <text class="ctrl__btn" @click="rr.reset()">reset()</text>
        <text class="ctrl__btn" @click="rr.reload()">reload()</text>
      </view>
      <view class="stat">
        <text class="stat__text">
          实际请求数 {{ rrCalls }} · pageNo {{ rr.pageNo.value }} · list {{ rr.list.value.length }} · refreshing
          {{ rr.refreshing.value ? 'true' : 'false' }}
        </text>
      </view>
      <sk-scroll-list
        class="demo-list"
        :refreshing="rr.refreshing.value"
        :loading="rr.loading.value"
        :finished="rr.finished.value"
        :empty="rr.list.value.length === 0"
        height="160px"
        :refresher-enabled="false"
        @load-more="rr.loadNext()"
      >
        <view v-for="item in rr.list.value" :key="item.id" class="row">
          <text class="row__title">{{ item.title }}</text>
        </view>
      </sk-scroll-list>
      <view class="demo-tip">
        <text class="demo-tip__text">
          本例用 immediate:false 创建，初始不发请求。reset() 清空数据、pageNo 归 0，但「实际请求数」不变——它只重置状态不发请求，适合切筛选条件后自行决定何时拉数据。reload() 会发请求，且 refreshing 期间 list 长度不归零（旧内容保留），成功后整体替换。
        </text>
      </view>
    </view>

    <!-- 5. 失败重试 -->
    <view class="demo-block">
      <view class="demo-block__head">
        <text class="demo-block__title">5 · 失败重试（前 2 次请求必抛错）</text>
        <text class="demo-block__action" @click="resetFail">重置</text>
      </view>
      <view class="ctrl">
        <text class="ctrl__btn" @click="fail.loadNext()">loadNext()</text>
      </view>
      <view class="stat">
        <text class="stat__text">
          实际请求数 {{ failCalls }} · pageNo {{ fail.pageNo.value }} · list {{ fail.list.value.length }} · error
          {{ fail.error.value ? '有' : '无' }}
        </text>
      </view>
      <view class="demo-tip">
        <text class="demo-tip__text">
          连点前两次：请求发出去了但抛错，pageNo 停在 0、error 置位、列表为空。第三次成功：pageNo 变 1、error 自动清空。失败不推进页码，所以「重试」就是再调一次 loadNext()，不需要单独的重试 API。
        </text>
      </view>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PageFetcher } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import { usePagedList } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'
import type { CompletionShape, SimpleRow } from './mock'
import { makeFetcher, makeShapeFetcher } from './mock'

// ===== 1. 完成判定三来源 =====
const SHAPES: { key: CompletionShape; label: string }[] = [
  { key: 'hasMore', label: 'hasMore' },
  { key: 'total', label: 'total' },
  { key: 'shortPage', label: '短页判定' },
]

const shapeFeeds = {
  hasMore: usePagedList(makeShapeFetcher('hasMore', 15, { delayMs: 400 }), { pageSize: 6 }),
  total: usePagedList(makeShapeFetcher('total', 15, { delayMs: 400 }), { pageSize: 6 }),
  shortPage: usePagedList(makeShapeFetcher('shortPage', 15, { delayMs: 400 }), { pageSize: 6 }),
}

/** 三个列表的读数集中到一处，模板里按 key 取，避免重复写三遍表达式 */
const shapeState = computed(() => {
  const out = {} as Record<CompletionShape, { pageNo: number; len: number; loading: boolean; finished: boolean }>
  for (const { key } of SHAPES) {
    const feed = shapeFeeds[key]
    out[key] = {
      pageNo: feed.pageNo.value,
      len: feed.list.value.length,
      loading: feed.loading.value,
      finished: feed.finished.value,
    }
  }
  return out
})

// ===== 2. 判定优先级冲突 =====
const conflictBase = makeFetcher(30, { delayMs: 400 })
/** total 恒等于 pageSize（第 1 页就"够数"），hasMore 到第 5 页才转 false */
const conflictFetcher: PageFetcher<SimpleRow> = async (page, pageSize) => {
  const res = await conflictBase(page, pageSize)
  return { list: res.list, total: pageSize, hasMore: page < 5 }
}
const conflict = usePagedList(conflictFetcher, { pageSize: 6 })

// ===== 3. 防重入 =====
const burstCalls = ref(0)
const burst = usePagedList(
  makeFetcher(100, { delayMs: 600, onCall: () => burstCalls.value++ }),
  { pageSize: 5, immediate: false }
)

/** 同一 tick 内连发 10 次，验证只有 1 次真正落到请求 */
const burstTen = () => {
  for (let i = 0; i < 10; i++) burst.loadNext()
}

const resetBurst = () => {
  burst.reset()
  burstCalls.value = 0
}

// ===== 4. reset vs reload =====
const rrCalls = ref(0)
const rr = usePagedList(makeFetcher(50, { delayMs: 600, onCall: () => rrCalls.value++ }), {
  pageSize: 5,
  immediate: false,
})

// ===== 5. 失败重试 =====
const failCalls = ref(0)
const fail = usePagedList(
  makeFetcher(20, { failFirst: 2, delayMs: 500, onCall: () => failCalls.value++ }),
  { pageSize: 5, immediate: false }
)

const resetFail = () => {
  fail.reset()
  failCalls.value = 0
}
</script>

<style lang="scss" scoped>
/* App.vue 全局 page{height:100%;overflow:hidden} 关掉了原生滚动，所以根节点用 scroll-view，需要确定高度 */
.demo-page {
  height: 100%;
  box-sizing: border-box;
  background: #f7f8fa;
  padding-bottom: 40rpx;
}

.demo-block {
  margin: 24rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }

  &__title {
    display: block;
    margin-bottom: 20rpx;
    font-size: 26rpx;
    color: #666;
  }

  &__action {
    flex-shrink: 0;
    font-size: 24rpx;
    color: #1677ff;
  }
}

.shape {
  margin-bottom: 20rpx;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10rpx;
  }

  &__name {
    font-size: 24rpx;
    color: #333;
    font-weight: 600;
  }

  &__stat {
    font-size: 20rpx;
    color: #999;
  }
}

.demo-list {
  border: 2rpx solid #eef0f2;
  border-radius: 12rpx;
  overflow: hidden;
}

.row {
  padding: 18rpx 28rpx;
  border-bottom: 2rpx solid #f2f3f5;

  &__title {
    font-size: 24rpx;
    color: #444;
  }
}

.ctrl {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16rpx;

  &__btn {
    padding: 8rpx 24rpx;
    margin-right: 16rpx;
    font-size: 24rpx;
    color: #fff;
    background: #1677ff;
    border-radius: 24rpx;
  }
}

.stat {
  padding: 12rpx 16rpx;
  margin-bottom: 16rpx;
  background: #f7f8fa;
  border-radius: 8rpx;

  &__text {
    font-size: 22rpx;
    color: #666;
  }
}

.demo-tip {
  padding-top: 16rpx;

  &__text {
    font-size: 22rpx;
    line-height: 1.6;
    color: #aaa;
  }
}
</style>
