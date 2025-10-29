import type { SFCBlock, SFCDescriptor } from 'vue/compiler-sfc'
import { babelParse } from 'ast-kit'
import { parse as parseSfc } from 'vue/compiler-sfc'

type SetupAST = ReturnType<typeof babelParse>

export interface ParsedSFC extends SFCDescriptor {
  getSetupAst: () => SetupAST | null
}

export async function parseSFC(code: string): Promise<ParsedSFC> {
  try {
    const { descriptor } = parseSfc(code, { pad: 'space' })

    return Object.assign({}, descriptor, {
      getSetupAst(): SetupAST | null {
        if (!descriptor.scriptSetup)
          return null

        return babelParse(descriptor.scriptSetup.content, descriptor.scriptSetup.lang, {
          plugins: [['importAttributes', { deprecatedAssertSyntax: true }]],
          cache: true,
        })
      },
    }) as ParsedSFC
  }
  catch {
    throw new Error('Vue\'s version must be 3.2.13 or higher.')
  }
}

/**
 * 从 sfc 的 template 中寻找某个标签
 */
export function findNode(
  sfc: SFCDescriptor,
  rawTagName: string,
): unknown {
  const templateSource = sfc.template?.content

  if (!templateSource) {
    return null
  }

  let tagName = ''

  if (templateSource.includes(`<${toKebabCase(rawTagName)}`)) {
    tagName = toKebabCase(rawTagName)
  }
  else if (templateSource.includes(`<${toPascalCase(rawTagName)}`)) {
    tagName = toPascalCase(rawTagName)
  }

  if (!tagName) {
    return null
  }

  const nodeAst = sfc.template?.ast

  if (!nodeAst) {
    return null
  }

  return nodeAst.children.find((node) => {
    return typeof node === 'object'
      && node !== null
      && 'type' in node
      && (node as { type: number }).type === 1
      && 'tag' in node
      && (node as { tag: string }).tag === tagName
  })
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

function toPascalCase(str: string): string {
  return str.replace(/(^\w|-+\w)/g, match => match.toUpperCase().replace(/-/g, ''))
}

export type { SFCBlock }
