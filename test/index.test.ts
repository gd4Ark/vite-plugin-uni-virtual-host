// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { DEFAULT_IGNORE_PATTERNS, insertVirtualHostOptions, isVueComponent } from '../src/index'

describe('isVueComponent', () => {
  it('should return false for App.vue files', () => {
    const rootPath = '/src'
    const pagesJson = ['/src/pages/Home.vue', '/src/pages/About.vue']

    expect(isVueComponent(rootPath, pagesJson, '/src/App.vue')).toBe(false) // App.vue 文件应当返回 false
    expect(isVueComponent(rootPath, pagesJson, '/src/App.ku.vue')).toBe(false) // App.ku.vue 文件应当返回 false
  })

  it('should return true for valid Vue components', () => {
    const rootPath = '/src'
    const pagesJson = ['/src/pages/Home.vue', '/src/pages/About.vue']
    const id = '/src/components/MyComponent.vue'

    const result = isVueComponent(rootPath, pagesJson, id)
    expect(result).toBe(true) // 组件文件应该被认为是 Vue 组件
  })

  it('should return false for files not in the root path', () => {
    const rootPath = '/src'
    const pagesJson = ['/src/pages/Home.vue', '/src/pages/About.vue']
    const id = 'node_modules/other/MyComponent.vue'

    const result = isVueComponent(rootPath, pagesJson, id)
    expect(result).toBe(false) // 不在 rootPath 下应当返回 false
  })

  it('should return false for page files listed in pagesJson', () => {
    const rootPath = '/src'
    const pagesJson = [
      '/src/pages/Home.vue',
      '/src/pages/About.vue',
      '/src/components/MyComponent.vue',
    ]
    const id = '/src/components/MyComponent.vue' // 该文件出现在 pagesJson 中

    const result = isVueComponent(rootPath, pagesJson, id)
    expect(result).toBe(false) // pagesJson 中的文件不应被认为是有效的 Vue 组件
  })

  it('should return false for non-Vue files', () => {
    const rootPath = '/src'
    const pagesJson = ['/src/pages/Home.vue', '/src/pages/About.vue']
    const id = '/src/components/MyComponent.js' // 非 Vue 文件

    const result = isVueComponent(rootPath, pagesJson, id)
    expect(result).toBe(false) // 非 .vue 文件应当返回 false
  })

  it('should allow ignoring additional directories with glob patterns', () => {
    const rootPath = '/src'
    const pagesJson = ['/src/pages/Home.vue', '/src/pages/About.vue']
    const id = '/src/uni_modules/uni-ui/components/uni-ui.vue'
    const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, '**/uni_modules/**']

    const result = isVueComponent(rootPath, pagesJson, id, ignorePatterns)
    expect(result).toBe(false) // 自定义 ignore 应当过滤掉该组件
  })
})

describe('insertVirtualHostOptions', () => {
  it('should insert virtualHost option into a basic template', async () => {
    const code = '<template><div></div></template>'

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `<script setup>
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>

<template><div></div></template>`,
    )
  })

  it('should insert virtualHost option into a minimal script setup', async () => {
    const code = '<script setup></script><template><div></div></template>'

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `<script setup>
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>

<script setup></script><template><div></div></template>`,
    )
  })

  it('should not interfere with existing console log statements', async () => {
    const code = '<script setup>console.log(2)</script><template><div></div></template>'

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `<script setup>console.log(2)
defineOptions({
  options: {
    virtualHost: true
  }
})
</script><template><div></div></template>`,
    )
  })

  it('should retain existing defineOptions properties while adding virtualHost', async () => {
    const code = `
<script setup>
import {ref} from 'vue'
defineOptions({
  name: 'Name',
})
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
import {ref} from 'vue'
defineOptions({
  name: 'Name',
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should populate virtualHost option when options is an empty object', async () => {
    const code = `
<script setup>
defineOptions({
  name: 'Name',
  options: {}
})
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
defineOptions({
  name: 'Name',
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should not modify existing virtualHost option when it is already set to true', async () => {
    const code = `
<script setup>
defineOptions({
  name: 'Name',
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
defineOptions({
  name: 'Name',
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should not modify existing virtualHost option when it is already set to false', async () => {
    const code = `
<script setup>
defineOptions({
  name: 'Name',
  options: {
    virtualHost: false
  }
})
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
defineOptions({
  name: 'Name',
  options: {
    virtualHost: false
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should retain existing virtualHost option if set to false', async () => {
    const code = `
<script setup>
defineOptions()
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should insert virtualHost option into empty defineOptions call in script setup', async () => {
    const code = `
<script setup>
import {ref} from 'vue'
defineOptions()
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
import {ref} from 'vue'
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should handle comments in script setup without affecting insertion', async () => {
    const code = `
<script setup>
// This is a comment
defineOptions()
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
// This is a comment
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should insert virtualHost option while preserving complex template structure', async () => {
    const code = `
<script setup>
defineOptions()
</script>
<template>
<div>
  <h1>Hello</h1>
  <p>This is a test.</p>
</div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div>
  <h1>Hello</h1>
  <p>This is a test.</p>
</div>
</template>`,
    )
  })

  it('should not modify a regular script tag without defineOptions', async () => {
    const code = `
<script>
console.log("Regular script")
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `<script setup>
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>


<script>
console.log("Regular script")
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should gracefully handle incomplete defineOptions without crashing', async () => {
    const code = `
<script setup>
defineOptions({
  name: 'Test'
</script>
<template>
<div></div>
</template>`

    await expect(insertVirtualHostOptions(code)).rejects.toThrow()
  })

  it('should handle mixed property types in defineOptions', async () => {
    const code = `
<script setup>
defineOptions({
  name: 'Test',
  methods: {},
  data: []
})
</script>
<template>
<div></div>
</template>`

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `
<script setup>
defineOptions({
  name: 'Test',
  methods: {},
  data: [],
  options: {
    virtualHost: true
  }
})
</script>
<template>
<div></div>
</template>`,
    )
  })

  it('should handle empty input without errors', async () => {
    const code = ''

    const ms = await insertVirtualHostOptions(code)

    expect(ms?.toString()).toEqual(
      `<script setup>
defineOptions({
  options: {
    virtualHost: true
  }
})
</script>

`,
    )
  })
})
