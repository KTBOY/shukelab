/**
 * sk-scroll-list 公共类型定义
 *
 * 使用方可按需导入：
 * import type { SkScrollListExpose, SkScrollListRefresherState } from '@/uni_modules/sk-scroll-list/components/sk-scroll-list/sk-scroll-list.types'
 */

/**
 * 下拉头状态（内置指示器与 #refresher 插槽作用域参数共用）
 * idle-未下拉 / pulling-下拉未达阈值 / loosing-已达阈值待松手 / refreshing-刷新中 / success|failed-刷新结果驻留
 */
export type SkScrollListRefresherState = 'idle' | 'pulling' | 'loosing' | 'refreshing' | 'success' | 'failed'

/** 组件对外暴露的实例方法（配合 ref 使用） */
export interface SkScrollListExpose {
  /** 列表回到顶部 */
  scrollToTop: (smooth?: boolean) => void
  /** 读取当前滚动位置（px），配合 setScrollTop 做页面级滚动位置记忆 */
  getScrollTop: () => number
  /** 滚动到指定位置（px） */
  setScrollTop: (top: number, smooth?: boolean) => void
}
