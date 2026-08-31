/*
 * @Description: uni-app + vite 配置
 */
import { defineConfig, type Plugin } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve, extname, normalize, sep } from 'path'
import { existsSync, statSync, createReadStream, cpSync } from 'fs'

/**
 * H5 专属静态资源（根目录 h5-static/，如 MediaPipe wasm、人脸检测模型）。
 *
 * 为什么不放 src/static：uni-app 会把 src/static 全量拷入所有平台产物，
 * 23MB 的 wasm 会撑爆微信小程序主包。这里仅在 H5 平台：
 * - dev：以中间件在原路径 /static/* 提供文件（.wasm 使用正确 MIME）；
 * - build：构建结束后拷贝到产物 static/ 下。
 * 其他平台（mp-weixin、App 等）为空操作，不产生任何拷贝。
 */
function h5OnlyStatic(): Plugin {
	const platform = process.env.UNI_PLATFORM || 'h5'
	if (platform !== 'h5') {
		return { name: 'sk-h5-only-static(noop)' }
	}
	const baseDir = resolve(__dirname, 'h5-static')
	const mimeTypes: Record<string, string> = {
		'.wasm': 'application/wasm',
		'.js': 'text/javascript',
		'.tflite': 'application/octet-stream',
		'.json': 'application/json',
	}
	let outDir = ''
	let isBuild = false
	let base = '/'
	return {
		name: 'sk-h5-only-static',
		configResolved(config) {
			outDir = config.build.outDir
			isBuild = config.command === 'build'
			base = config.base || '/'
		},
		configureServer(server) {
			server.middlewares.use((req: any, res: any, next: any) => {
				// 与页面同源的资源路径带部署 base（如 /shukelab/static/...），本地 base 为 / 时即 /static/...
				const prefix = base + 'static/'
				const url: string = req.url || ''
				if (!url.startsWith(prefix)) return next()
				const rel = normalize(url.slice(prefix.length).split('?')[0])
				const file = resolve(baseDir, rel)
				if (!file.startsWith(baseDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
					return next()
				}
				res.setHeader('Content-Type', mimeTypes[extname(file)] || 'application/octet-stream')
				createReadStream(file).pipe(res)
			})
		},
		closeBundle() {
			if (!isBuild || !outDir || !existsSync(baseDir)) return
			cpSync(baseDir, resolve(outDir, 'static'), { recursive: true })
		},
	}
}

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
		plugins: [uni(), h5OnlyStatic(), ...httpsPlugins],
	}
})
