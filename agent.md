# agent.md

本文件为 AI 编码助手（Agent）提供本仓库的项目背景、开发规范与操作指引。

## 项目概览

**shuke 实验室小程序**：基于 uni-app (Vue 3 + TypeScript + Vite) 的跨端实验/组件演示项目，主要用于开发、演示并发布 uni-app 插件（uni_modules），支持编译到微信小程序、H5、App 等多端。

已发布的插件：

| 插件 | 目录 | 说明 |
| --- | --- | --- |
| sk-linkage-menu | `src/uni_modules/sk-linkage-menu` | 左右联动菜单列表（插件市场 id=22894） |
| sk-tab-bar | `src/uni_modules/sk-tab-bar` | 自定义 tabBar（插件市场 id=24578） |
| sh-loading | `src/uni_modules/sh-loading` | 多种 Loading 动画组件 |
| take-photos | `src/uni_modules/take-photos` | 拍照组件（含 H5 相机） |

## 技术栈

- **框架**：uni-app 3.x（`@dcloudio/*` 版本 `3.0.0-4060620250520001`）
- **前端**：Vue 3（Composition API + `<script setup lang="ts">`）、TypeScript 4.7、Vuex 4、vue-i18n
- **构建**：Vite 5 + `@dcloudio/vite-plugin-uni`
- **样式**：SCSS（sass），全局图标样式在 `pubilc/style/icon.scss`（注意目录名拼写就是 `pubilc`，勿"纠正"）
- **代码规范**：ESLint（vue3-recommended + @vue/typescript）+ Prettier
- **包管理**：存在 `pnpm-lock.yaml` 与 `package-lock.json`，优先使用 `pnpm`

## 常用命令

```bash
pnpm install              # 安装依赖

# 开发
pnpm dev:h5               # H5 端开发
pnpm dev:mp-weixin        # 微信小程序开发（产物在 dist/dev/mp-weixin，用微信开发者工具打开）
pnpm dev:app              # App 端开发

# 构建
pnpm build:h5
pnpm build:mp-weixin
```

无单元测试脚本；验证方式为运行 H5 端或在微信开发者工具中预览小程序。

## 目录结构说明

```
src/
├── pages/            # 页面（每个 demo 一个目录）
│   ├── index/        # 首页/组件列表入口
│   ├── virtualMenuGanged/  # 联动菜单 demo
│   ├── tabBarDemo/   # 自定义 tabBar demo
│   ├── takePhotoDemo/# 拍照 demo（页面在 pages.json 中被注释）
│   └── cssPage/      # CSS 魔法（Loading 动画等）
├── components/       # 项目内部公共组件（custom-tab-bar、list 等）
├── uni_modules/      # 插件源码（核心产出物，遵循 uni_modules 规范）
├── static/           # 静态图片资源
├── pages.json        # 页面路由注册（新增页面必须在此注册）
├── manifest.json     # 各端应用配置
├── App.vue / main.ts # 应用入口（createSSRApp）
```

## 开发规范

### 代码风格（遵循 Prettier 配置）

- 缩进 2 空格、不使用分号、单引号、行宽 120、箭头函数参数始终带括号
- 组件使用 Vue 3 `<script setup lang="ts">` 写法
- 全局变量 `uni`、`wx` 可直接使用（已在 ESLint globals 中声明）
- `no-unused-vars`、`vue/multi-word-component-names` 已关闭，不必为此调整代码

### uni-app 约定

- 新增页面：在 `src/pages/` 下建目录，并在 `src/pages.json` 的 `pages` 数组中注册（数组第一项为启动页）
- 跨端 API 一律使用 `uni.xxx`，避免直接用浏览器/微信专有 API；端差异用条件编译 `#ifdef H5 / MP-WEIXIN / APP-PLUS` 处理
- 尺寸单位优先使用 `rpx`
- 路径别名：`@` 指向 `src/`

### uni_modules 插件规范

- 插件目录结构：`src/uni_modules/<插件id>/components/<插件id>/<插件id>.vue`（组件名与插件 id 一致，才能被 easycom 自动引入）
- 每个插件必须维护 `package.json`（uni_modules 元数据）、`readme.md`、`changelog.md`
- 修改插件功能后需同步更新对应 `changelog.md` 与版本号
- 插件代码需保持跨端兼容（至少微信小程序 + H5），不要引入仅单端可用的依赖

## 注意事项

- `dist/` 为编译产物目录，不要手动修改
- `pages.json` 中含注释（uni-app 支持带注释的 JSON），编辑时保留此风格
- `sk-linkage-menu`、`sk-tab-bar` 等插件已发布到 DCloud 插件市场，改动其对外 API（props/events）时需考虑向后兼容
- README.md 中的截图/GIF 引用了 GitHub 附件与 `README_files/` 目录，勿随意删除相关图片
