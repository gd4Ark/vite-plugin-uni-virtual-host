import type { ObjectExpression, ObjectMethod, ObjectProperty } from '@babel/types'
import type { SFCBlock } from 'vue/compiler-sfc'
import type { ParsedSFC } from './compiler-sfc'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { isCallOf, isTypeOf, walkAST } from 'ast-kit'
import { MagicStringAST } from 'magic-string-ast'
import { createFilter } from 'vite'
import { MagicString } from 'vue/compiler-sfc'
import { parseSFC } from './compiler-sfc'
import { createViteUniPlugin, getRootPath } from './create-vite-uni-plugin'

type ObjectExpressionProperty = ObjectExpression['properties'][number]

export interface VirtualHostPluginOptions {
  ignore?: string[]
}

export const DEFAULT_IGNORE_PATTERNS = ['**/App.vue', '**/App.ku.vue']

/**
 * 自动在组件中插入 virtualHost options
 */
export default createViteUniPlugin<VirtualHostPluginOptions>('vite-plugin-uni-virtual-host', ({ getPagesJson }, options) => {
  const rootPath = getRootPath()
  const ignorePatterns = (options?.ignore?.length ? options.ignore : DEFAULT_IGNORE_PATTERNS).map(pattern =>
    normalizePath(pattern),
  )

  return {
    async transform(code: string, id: string) {
      if (isVueComponent(rootPath, getPagesJson(), id, ignorePatterns)) {
        const result = await insertVirtualHostOptions(code)
        if (result) {
          return {
            code: result.toString(),
            map: result.generateMap({ hires: true }),
          }
        }
      }
      return code
    },
  }
})

/**
 * 自动插入 virtualHost options
 */
export async function insertVirtualHostOptions(
  code: string,
): Promise<MagicString | MagicStringAST | null> {
  const [sfc, ms] = await Promise.all([parseSFC(code), Promise.resolve(new MagicString(code))])

  const scriptLoc = sfc.scriptSetup?.loc
  const virtualHostCode = createVirtualHostCode()

  // 如果没有 script setup 标签，创建一个新的并添加所需代码
  if (!scriptLoc) {
    ms.appendLeft(0, `<script setup>\n${virtualHostCode}\n</script>\n\n`)
    return ms
  }

  const scriptCode = sfc?.scriptSetup?.content
  if (scriptCode?.includes('defineOptions')) {
    const setupAst = sfc.getSetupAst()
    if (!setupAst)
      return ms
    return insertIntoExistingDefineOptions(setupAst, ms.toString())
  }

  return addDefineOptionsToExistingScript(ms, scriptLoc, virtualHostCode)
}

function createVirtualHostCode(): string {
  return `defineOptions({
  options: {
    virtualHost: true
  }
})`
}

function addDefineOptionsToExistingScript(
  ms: MagicString,
  scriptLoc: SFCBlock['loc'],
  virtualHostCode: string,
): MagicString {
  ms.appendLeft(scriptLoc.end.offset, `\n${virtualHostCode.trim()}\n`)

  return ms
}

type SetupAST = NonNullable<ReturnType<ParsedSFC['getSetupAst']>>

async function insertIntoExistingDefineOptions(setupAst: SetupAST, content: string): Promise<MagicStringAST> {
  const s = new MagicStringAST(content)

  walkAST(setupAst, {
    enter(node) {
      if (isCallOf(node, 'defineOptions')) {
        updateDefineOptions(node as t.CallExpression)

        const { code } = generate(node, {
          minified: false,
          retainLines: false,
          jsescOption: {
            quotes: 'single',
            minimal: true,
          },
        })

        s.overwriteNode(node, code)
      }
    },
  })

  return s
}

function updateDefineOptions(node: t.CallExpression) {
  const createDefineOptions = () =>
    t.objectExpression([
      t.objectProperty(
        t.identifier('options'),
        t.objectExpression([t.objectProperty(t.identifier('virtualHost'), t.booleanLiteral(true))]),
      ),
    ])

  const ensureOptionsProperty = (
    properties: ObjectExpression['properties'],
  ): t.ObjectProperty => {
    const existing = findObjectProperty(properties, 'options')

    if (existing && t.isObjectProperty(existing)) {
      if (!t.isObjectExpression(existing.value)) {
        existing.value = t.objectExpression([])
      }
      return existing
    }

    const optionsProperty = t.objectProperty(
      t.identifier('options'),
      t.objectExpression([]),
    )
    properties.push(optionsProperty)
    return optionsProperty
  }

  const setVirtualHostTrue = (optionsProperty: ObjectProperty) => {
    if (!t.isObjectExpression(optionsProperty.value)) {
      optionsProperty.value = t.objectExpression([])
    }

    const virtualHostProperty = findObjectProperty(
      optionsProperty.value.properties,
      'virtualHost',
    )

    if (!virtualHostProperty) {
      optionsProperty.value.properties.push(
        t.objectProperty(t.identifier('virtualHost'), t.booleanLiteral(true)),
      )
    }
  }

  // defineOptions 没有参数，直接添加
  if (!node.arguments.length || !isTypeOf(node.arguments[0], 'ObjectExpression')) {
    node.arguments = [createDefineOptions()]
    return
  }

  const objectExpression = node.arguments[0] as ObjectExpression

  // 确保有 options 参数
  const optionsProperty = ensureOptionsProperty(objectExpression.properties)

  // 设置 options.virtualHost = true
  setVirtualHostTrue(optionsProperty)
}

function findObjectProperty(
  properties: ObjectExpression['properties'],
  name: string,
): ObjectExpressionProperty | undefined {
  return properties.find(prop => isNamedProperty(prop, name))
}

function isNamedProperty(prop: ObjectExpressionProperty, name: string): prop is ObjectProperty | ObjectMethod {
  if (t.isObjectMethod(prop) || t.isObjectProperty(prop)) {
    if (t.isIdentifier(prop.key)) {
      return prop.key.name === name
    }
    if (t.isStringLiteral(prop.key)) {
      return prop.key.value === name
    }
  }
  return false
}

export function isVueComponent(
  rootPath: string,
  pagesJson: string[],
  id: string,
  ignorePatterns: string[] = DEFAULT_IGNORE_PATTERNS,
): boolean {
  const normalizedId = normalizePath(id)
  const normalizedRoot = normalizePath(rootPath)

  if (!normalizedId.startsWith(normalizedRoot) || !normalizedId.endsWith('.vue')) {
    return false
  }

  const filter = createFilter(
    ['**/*.vue'],
    [...pagesJson.map(normalizePath), ...ignorePatterns],
    { resolve: rootPath },
  )

  return filter(normalizedId)
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/')
}
