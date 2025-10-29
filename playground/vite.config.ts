import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
// @ts-nocheck
import uniVirtualHost from 'vite-plugin-uni-virtual-host'

const uniPlugin = uni() as any

export default defineConfig({
  plugins: [
    uniPlugin,
    uniVirtualHost({
      ignore: [
        'src/App.vue',
        'src/App.ku.vue',
        '**/uni_modules/**',
      ],
    }),
  ],
})
