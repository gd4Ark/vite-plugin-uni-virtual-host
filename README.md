# vite-plugin-uni-virtual-host

自动为 uni-app 组件注入 `virtualHost: true` 配置，让微信小程序的组件行为与 App/H5 端保持一致。

## 为什么需要这个插件？

在 uni-app 多端开发中，微信小程序的组件会多一层虚拟节点，导致样式和属性透传行为与 App/H5 端不一致。通过给组件配置 `virtualHost: true`，可以让小程序组件表现更接近标准 Vue 组件：

- ✅ 支持父组件样式透传到子组件根元素
- ✅ 支持 `class`、`style`、`id` 等属性透传
- ✅ 减少跨端开发的心智负担

详细背景请参考：[uni-app 多端组件属性与样式透传行为一致性实践](https://4ark.me/posts/2025-10-28-uni-app-component-props-style-pass-through/)

## 安装

```bash
pnpm add vite-plugin-uni-virtual-host -D
```

## 使用

在 `vite.config.ts` 中引入插件（建议配合 mergeVirtualHostAttributes 选项使用）：

```ts
import fs from 'node:fs'

import { parseJson } from '@dcloudio/uni-cli-shared'
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
// @ts-nocheck
import uniVirtualHost from 'vite-plugin-uni-virtual-host'

const uniPlugin = uni() as any

const isEnabled = process.env.UNI_PLATFORM === 'mp-weixin'
  && parseJson(fs.readFileSync('./src/manifest.json', 'utf-8'), false, './src/manifest.json')['mp-weixin']
    .mergeVirtualHostAttributes

export default defineConfig({
  plugins: [
    uniPlugin,
    isEnabled && uniVirtualHost({
      ignore: [
        'src/App.vue',
        'src/App.ku.vue',
        '**/uni_modules/**',
      ],
    }),
  ].filter(Boolean),
})
```

插件会自动为所有组件（页面和 App.vue 除外）注入以下配置：

```ts
defineOptions({
  options: {
    virtualHost: true
  }
})
```

## 配置

### 忽略特定组件

默认会跳过 `App.vue`、`App.ku.vue` 和 `pages.json` 中的页面。如需排除其他目录（如 `uni_modules`），可配置 `ignore` 选项：

```ts
uniVirtualHost({
  ignore: [
    '**/App.vue',
    '**/App.ku.vue',
    '**/uni_modules/**', // 忽略 uni_modules 目录
  ],
})
```

支持 glob 语法：`**`、`*`、`?`，路径分隔符统一使用 `/`。

## License

MIT
