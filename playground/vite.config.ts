/* eslint-disable node/prefer-global/process */
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
