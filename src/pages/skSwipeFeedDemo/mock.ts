/**
 * sk-swipe-feed 案例集共享 mock 数据
 *
 * 全部为本地假数据，不依赖网络。fetcher 统一支持 onCall 回调，
 * 供「防重入」类案例统计真实请求次数。
 */
import type { PageFetcher, PageResult } from '@/uni_modules/sk-swipe-feed/components/sk-scroll-list/use-paged-list'

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

/** 通用简单行（非频道类案例使用） */
export interface SimpleRow {
  id: string
  title: string
}

/** fetcher 构造选项 */
export interface FetcherOptions {
  /** 前 N 次请求必定抛错，用于演示首屏失败重试 */
  failFirst?: number
  /** 恒返回空列表，用于演示空态 */
  empty?: boolean
  /** 模拟接口延时（ms），默认 400 */
  delayMs?: number
  /** 每次真实发起请求时回调，用于统计请求次数（验证防重入 / reset 不发请求） */
  onCall?: (page: number) => void
}

/** 完成判定形状：hasMore 优先于 total，两者都不给则退化为短页判定 */
export type CompletionShape = 'hasMore' | 'total' | 'shortPage'

/** 生成频道列表 */
export function createChannels(count = 8): Channel[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: i < CHANNEL_NAMES.length ? CHANNEL_NAMES[i] : `频道${i + 1}`,
  }))
}

/** 生成某频道的分页接口（每个频道独立数据源与总条数） */
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
    // 首屏延时贴近真实网络，让骨架屏可见；300ms 时加载态一闪而过，等于没做
    await delay(page === 1 ? 900 : 500)
    const start = (page - 1) * pageSize
    const end = Math.min(start + pageSize, total)
    return { list: items.slice(start, end), total }
  }
}

/** 生成通用假分页接口：total 为总条数，page 从 1 开始 */
export function makeFetcher(total: number, opts: FetcherOptions = {}): PageFetcher<SimpleRow> {
  let calls = 0
  return async (page, pageSize) => {
    await delay(opts.delayMs ?? 600)
    calls++
    opts.onCall?.(page)
    if (opts.failFirst && calls <= opts.failFirst) {
      throw new Error('mock network error')
    }
    if (opts.empty) return { list: [], total: 0 }
    const start = (page - 1) * pageSize
    const end = Math.min(start + pageSize, total)
    const list = Array.from({ length: Math.max(end - start, 0) }, (_, i) => ({
      id: `t${total}-${start + i}`,
      title: `条目 ${start + i + 1}`,
    }))
    return { list, total }
  }
}

/**
 * 生成指定「完成判定形状」的假分页接口，用于对照 usePagedList 的判定优先级。
 * - hasMore：只返回 hasMore
 * - total：只返回 total
 * - shortPage：两者都不返回，由「本页条数 < pageSize」判定到底
 */
export function makeShapeFetcher(
  shape: CompletionShape,
  total: number,
  opts: FetcherOptions = {}
): PageFetcher<SimpleRow> {
  const base = makeFetcher(total, opts)
  return async (page, pageSize) => {
    const res = await base(page, pageSize)
    const loaded = (page - 1) * pageSize + res.list.length
    if (shape === 'hasMore') {
      return { list: res.list, hasMore: loaded < total }
    }
    if (shape === 'total') {
      return { list: res.list, total }
    }
    return { list: res.list } as PageResult<SimpleRow>
  }
}

/** 模拟接口延时 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 获取内容区可用高度（px），offset 为 tabs 等页面内其他元素占用高度 */
export function getContentHeight(offset = 0): number {
  const info = (uni as any).getWindowInfo ? (uni as any).getWindowInfo() : uni.getSystemInfoSync()
  return info.windowHeight - offset
}
