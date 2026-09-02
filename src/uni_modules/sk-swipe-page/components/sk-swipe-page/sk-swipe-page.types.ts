/**
 * sk-swipe-page 公共类型定义
 *
 * 使用方可按需导入：
 * import type { ChangePayload } from '@/uni_modules/sk-swipe-page/components/sk-swipe-page/sk-swipe-page.types'
 */

/** change 事件触发来源 */
export type ChangeSource =
  /** 用户左右滑动翻页 */
  | 'swipe'
  /** 外部受控（v-model:current 赋值，如点击 tab） */
  | 'method'

/** change 事件回调参数 */
export type ChangePayload = {
  /** 切换后的页面下标 */
  index: number
  /** 触发来源：swipe-用户滑动 / method-外部受控 */
  source: ChangeSource
}

/** transition 事件回调参数（翻页手势/动画进行中） */
export type TransitionPayload = {
  /** x 轴实时位移（px，透传 swiper） */
  dx: number
  /** y 轴实时位移（px，透传 swiper） */
  dy: number
  /** 页面进度（dx / 容器宽度，可用于标题栏渐变、视差等联动效果） */
  progress: number
}
