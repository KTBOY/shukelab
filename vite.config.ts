/*
 * @Description: uni-app + vite 配置
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'

/**
 * 本地 HTTPS（可选，用于 H5 摄像头等需要“安全上下文”的能力）。
 *
 * 说明：
 * - http://localhost 与 http://127.0.0.1 本身即安全上下文，桌面端无需证书即可调用摄像头；
 * - 如需通过局域网 IP / HTTPS 访问，安装 vite-plugin-mkcert 后本配置会“自动启用”，无需改代码：
 *     pnpm add -D vite-plugin-mkcert
 * - 未安装该插件时静默跳过，dev server 以 http 启动，不影响项目运行。
 */
async function resolveHttpsPlugins(): Promise<any[]> {
	try {
		// 使用变量形式的动态 import，避免未安装时在打包阶段报错
		const name = 'vite-plugin-mkcert'
		const mkcert = (await import(name)).default
		return [mkcert()]
	} catch (e) {
		return []
	}
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
	const httpsPlugins = await resolveHttpsPlugins()
	return {
		resolve: {
			alias: [
				{
					find: '@',
					replacement: resolve(__dirname, 'src'),
				},
			],
		},
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: ['legacy-js-api'],
				},
			},
		},
		// vite-plugin-mkcert 存在时会在其 config 钩子内注入本地受信任证书并启用 https
		plugins: [uni(), ...httpsPlugins],
	}
})
