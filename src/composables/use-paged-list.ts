/**
 * usePagedList 通用分页列表状态机
 *
 * 职责分层：组件（如 sk-scroll-list / scroll-view）只管滚动与手势，
 * 分页数据流（页码推进、防重入、完成判定、错误重试）收敛在此 composable，
 * 横滑频道页与纵向列表均可复用。加载中/到底/错误等 UI 由页面自行渲染。
 *
 * 示例：
 * const { list, loading, refreshing, finished, error, loadNext, reload } = usePagedList(fetchPage, { pageSize: 20 })
 * // scroll-view / sk-scroll-list 触底时调用 loadNext()，下拉刷新调用 reload()
 */

import { ref, shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'

/** 单页请求结果 */
export interface PageResult<T> {
  /** 本页数据 */
  list: T[]
  /** 数据总条数，提供后用于完成判定 */
  total?: number
  /** 是否还有下一页，提供后优先于 total 判定 */
  hasMore?: boolean
}

/** 分页请求函数：page 从 1 开始 */
export type PageFetcher<T> = (page: number, pageSize: number) => Promise<PageResult<T>>

export interface UsePagedListOptions {
  /** 每页条数，默认 10 */
  pageSize?: number
  /** 是否在 setup 时立即加载第一页，默认 true */
  immediate?: boolean
}

export interface UsePagedListReturn<T> {
  /** 已加载的全部数据 */
  list: ShallowRef<T[]>
  /** 是否正在加载更多 */
  loading: Ref<boolean>
  /** 下拉刷新请求进行中（reload 期间为 true，供 scroll-view refresher-triggered 绑定） */
  refreshing: Ref<boolean>
  /** 是否已全部加载（无更多数据） */
  finished: Ref<boolean>
  /** 最近一次加载的错误，成功后自动清空 */
  error: Ref<unknown>
  /** 已加载的页数 */
  pageNo: Ref<number>
  /** 加载下一页（防重入）；可传入自定义条数用于补载 */
  loadNext: (count?: number) => Promise<void>
  /** 清空数据并回到第一页（不自动发起请求） */
  reset: () => void
  /** 刷新：原地重新加载第一页，期间保留旧内容，成功后整体替换 */
  reload: () => Promise<void>
}

/**
 * 创建分页列表状态机。
 *
 * 完成判定优先级：hasMore > total > 短页（本页条数少于 pageSize）。
 * 请求失败时 pageNo 不推进，error 置为捕获的异常，再次 loadNext 即重试。
 * loadNext 与 reload 通过请求序号互斥：刷新开始后，在途的加载更多结果会被丢弃。
 */
export function usePagedList<T>(fetcher: PageFetcher<T>, options: UsePagedListOptions = {}): UsePagedListReturn<T> {
  const pageSize = options.pageSize ?? 10

  const list = shallowRef<T[]>([]) as ShallowRef<T[]>
  const pageNo = ref(0)
  const loading = ref(false)
  const refreshing = ref(false)
  const finished = ref(false)
  const error = ref<unknown>(null) as Ref<unknown>

  /** 请求序号：刷新会使在途的加载更多结果过期 */
  let requestSeq = 0

  /** 应用一页数据：replace 为 true 时原地替换（刷新），否则追加（加载更多） */
  function applyPage(res: PageResult<T>, replace: boolean, count: number): void {
    const pageList = res.list ?? []
    list.value = replace ? pageList : list.value.concat(pageList)
    pageNo.value = replace ? 1 : pageNo.value + 1
    if (res.hasMore !== undefined) {
      finished.value = !res.hasMore
    } else if (res.total !== undefined) {
      finished.value = list.value.length >= res.total
    } else {
      finished.value = pageList.length < count
    }
  }

  /** 加载下一页。loading / finished / refreshing 期间的调用会被忽略（防重入） */
  async function loadNext(count = pageSize): Promise<void> {
    if (loading.value || finished.value || refreshing.value) return
    loading.value = true
    error.value = null
    const seq = ++requestSeq
    try {
      const res = await fetcher(pageNo.value + 1, count)
      if (seq !== requestSeq) return
      applyPage(res, false, count)
    } catch (e) {
      if (seq === requestSeq) error.value = e
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  /** 清空数据并回到第一页（不自动发起请求），适用于切换筛选条件 */
  function reset(): void {
    requestSeq++
    list.value = []
    pageNo.value = 0
    finished.value = false
    error.value = null
    loading.value = false
  }

  /**
   * 刷新：原地重新加载第一页。
   * 期间保留旧内容（列表不清空），成功后整体替换，失败保留旧数据并置 error。
   */
  async function reload(): Promise<void> {
    if (refreshing.value) return
    refreshing.value = true
    error.value = null
    loading.value = false
    const seq = ++requestSeq
    try {
      const res = await fetcher(1, pageSize)
      if (seq !== requestSeq) return
      applyPage(res, true, pageSize)
    } catch (e) {
      if (seq === requestSeq) error.value = e
    } finally {
      if (seq === requestSeq) refreshing.value = false
    }
  }

  if (options.immediate !== false) {
    loadNext()
  }

  return { list, pageNo, loading, refreshing, finished, error, loadNext, reset, reload }
}
