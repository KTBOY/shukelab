/**
 * sk-swipe-page 案例集共享 mock 数据
 */
import { usePagedList } from '@/composables/use-paged-list'
import type { PageFetcher, UsePagedListReturn } from '@/composables/use-paged-list'

/** 本地测试图池：按下标伪随机分配，保证多次渲染结果稳定 */
const FEED_IMAGES = ['/static/test/test1.jpg', '/static/test/test2.jpg', '/static/test/test3.jpg']

const CHANNEL_NAMES = ['推荐', '热榜', '资讯', '视频', '攻略', '开黑', '二手', '夜话']

/** 频道（对应一个横滑页） */
export interface Channel {
  id: number
  name: string
}

/** 频道信息流条目 */
export interface FeedItem {
  id: string
  channelId: number
  title: string
  desc: string
  image: string
  views: number
}

/** 生成频道列表 */
export function createChannels(count = 8): Channel[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: i < CHANNEL_NAMES.length ? CHANNEL_NAMES[i] : `频道${i + 1}`,
  }))
}

/** 生成某频道的分页接口（模拟服务端，每个频道独立数据源与总条数） */
export function createChannelFetcher(channelId: number, total = 60): PageFetcher<FeedItem> {
  const items: FeedItem[] = Array.from({ length: total }, (_, i) => ({
    id: `c${channelId}-${i}`,
    channelId,
    title: `频道${channelId + 1}·资讯 ${i + 1}`,
    desc: '整页横滑频道页：每页独立列表、独立分页，滑走再滑回滚动位置保留',
    image: FEED_IMAGES[(channelId * 5 + i) % FEED_IMAGES.length],
    views: ((channelId * 97 + i * 13) % 9000) + 100,
  }))
  return async (page, pageSize) => {
    await delay(300)
    const start = (page - 1) * pageSize
    const end = Math.min(start + pageSize, total)
    return { list: items.slice(start, end), total }
  }
}

/** 模拟接口延时 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 信息流每页条数 */
const FEED_PAGE_SIZE = 10

/**
 * 频道信息流状态：数据实例 + 滚动位置。
 * 存活期在页面层，与 channel-feed 组件挂载解耦——LRU 淘汰后回滑不重复请求、滚动位置还原。
 */
export interface ChannelFeedState {
  feed: UsePagedListReturn<FeedItem>
  /** 组件卸载时记录的滚动位置（px） */
  lastScrollTop: number
  /** 首次挂载时拉起第一页，已加载过则跳过 */
  start: () => void
}

/** 创建频道信息流状态（首屏不自动请求，由 start() 触发） */
export function createChannelFeedState(channelId: number): ChannelFeedState {
  const feed = usePagedList<FeedItem>(createChannelFetcher(channelId), {
    pageSize: FEED_PAGE_SIZE,
    immediate: false,
  })
  return {
    feed,
    lastScrollTop: 0,
    start: () => {
      if (feed.pageNo.value === 0) feed.loadNext()
    },
  }
}

/** 获取内容区可用高度（px），offset 为 tabs 等页面内其他元素占用高度 */
export function getContentHeight(offset = 0): number {
  const info = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : uni.getSystemInfoSync()
  return info.windowHeight - offset
}
