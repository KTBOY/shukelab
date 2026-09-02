/**
 * sk-scroll-tabs 公共类型定义
 *
 * 使用方可按需导入：
 * import type { SkScrollTabsItem, ChangePayload, ReClickPayload } from '@/uni_modules/sk-scroll-tabs/components/sk-scroll-tabs/sk-scroll-tabs.types'
 */

/** 标签数据项：name 用于默认渲染，其余字段随 change 事件透出 */
export interface SkScrollTabsItem {
  /** 标签名称，用于默认插槽展示 */
  name?: string
  /** 唯一标识，将优先作为渲染 key，建议必传 */
  id?: number | string
  /** 数字角标（0 或不传不显示，>99 显示 99+） */
  badge?: number
  /** 红点（与 badge 同时设置时 badge 优先） */
  dot?: boolean
  /** 禁用：不响应点击、置灰 */
  disabled?: boolean
  /** 任意自定义字段 */
  [key: string]: any
}

/** change 事件触发来源 */
export type ChangeSource =
  /** 点击标签 */
  | 'click'
  /** 外部受控（v-model:current / scrollToIndex） */
  | 'method'

/** change 事件回调参数 */
export type ChangePayload = SkScrollTabsItem & {
  /** 当前选中标签下标 */
  index: number
  /** 触发来源：click-点击标签 / method-外部受控 */
  source: ChangeSource
}

/** re-click 事件回调参数（再次点击当前已选中的标签） */
export type ReClickPayload = {
  /** 当前标签下标 */
  index: number
  /** 当前标签数据 */
  item: SkScrollTabsItem
}

/** boundingClientRect 测量结果（仅保留组件用到的字段） */
export interface RectInfo {
  left: number
  width: number
}

/** 组件对外暴露的实例方法（配合 ref 使用） */
export interface SkScrollTabsExpose {
  /** 重新测量标签布局。tabs 数据替换后组件会自动调用，字体加载等场景可手动触发 */
  refresh: () => void
  /** 切换到指定标签（更新高亮并把该标签滚入可视区居中） */
  scrollToIndex: (index: number) => void
}
