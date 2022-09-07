/*
 * @Author: zlc
 * @Date: 2022-09-06 16:39:43
 * @LastEditTime: 2022-09-07 09:50:33
 * @LastEditors: zlc
 * @Description:
 * @FilePath: \project-template-ui-plus\vite.config.ts
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src'),
      },
    ],
  },
  plugins: [uni()],
})
