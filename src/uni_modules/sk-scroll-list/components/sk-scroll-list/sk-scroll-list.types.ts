/**
 * sk-scroll-list 公共类型定义
 *
 * 使用方可按需导入：
 * import type { SkScrollListExpose, SkScrollListRefresherState } from '@/uni_modules/sk-scroll-list/components/sk-scroll-list/sk-scroll-list.types'
 */

/** 自定义下拉头状态（#refresher 插槽作用域参数） */
export type SkScrollListRefresherState = 'idle' | 'pulling' | 'loosing' | 'refreshing'

/** 组件对外暴露的实例方法（配合 ref 使用） */
export interface SkScrollListExpose {
  /** 列表回到顶部 */
  scrollToTop: (smooth?: boolean) => void
}
