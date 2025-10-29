/* eslint-disable node/prefer-global/process */
import type { FSWatcher } from 'chokidar'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import chokidar from 'chokidar'
import { parse as jsonParse } from 'jsonc-parser'

export interface VitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  buildStart?: () => void | Promise<void>
  buildEnd?: () => void | Promise<void>
  [key: string]: unknown
}

export interface UniPluginContext {
  getPagesJson: () => string[]
}

export type UniPluginFactory<TOptions extends object | undefined = undefined> = (
  context: UniPluginContext,
  options: TOptions | undefined,
) => Partial<VitePlugin> | undefined

interface PagesJson {
  pages?: Array<{ path?: string }>
  subPackages?: Array<{ root?: string, pages?: Array<{ path?: string }> }>
}

export function createViteUniPlugin<TOptions extends object | undefined = undefined>(
  name: string,
  pluginFn: UniPluginFactory<TOptions>,
): (options?: TOptions) => VitePlugin {
  if (process.env.NODE_ENV === 'test') {
    return () => ({ name } as VitePlugin)
  }

  return (options?: TOptions) => {
    const pagesPath = getPageJsonPath()

    let pagesJson = loadPagesJson()
    let watcher: FSWatcher | null = null

    const pluginOptions: Partial<VitePlugin> = pluginFn({
      getPagesJson: () => pagesJson,
    }, options) ?? {}

    return {
      name,
      enforce: 'pre',
      buildStart() {
        watcher = chokidar.watch(pagesPath).on('all', (event) => {
          if (event === 'add' || event === 'change') {
            pagesJson = loadPagesJson()
          }
        })
      },
      buildEnd() {
        watcher?.close()
      },
      ...pluginOptions,
    }
  }
}

function loadPagesJson(): string[] {
  const rootPath = getRootPath()
  const pagesJsonRaw = readFileSync(getPageJsonPath(), 'utf-8')
  const parsed = jsonParse(pagesJsonRaw) as PagesJson

  const pages = Array.isArray(parsed.pages) ? parsed.pages : []
  const subPackages = Array.isArray(parsed.subPackages) ? parsed.subPackages : []

  return [
    ...pages
      .map(page => formatPagePath(rootPath, page?.path))
      .filter((path): path is string => Boolean(path)),
    ...subPackages.flatMap((pkg) => {
      const pkgRoot = pkg?.root ?? ''
      const pkgPages = Array.isArray(pkg?.pages) ? pkg.pages : []

      return pkgPages
        .map(page => formatPagePath(join(rootPath, pkgRoot), page?.path))
        .filter((path): path is string => Boolean(path))
    }),
  ]
}

/**
 * 获取项目 src 目录（绝对路径）
 */
export function getRootPath(): string {
  return process.env.UNI_INPUT_DIR || `${process.env.INIT_CWD}\\src`
}

/**
 * 获取项目 pages.json 路径（绝对路径）
 */
export function getPageJsonPath(): string {
  return resolve(getRootPath(), 'pages.json')
}

function formatPagePath(root: string, path: string | undefined): string | null {
  if (!path)
    return null
  return normalizePath(`${join(root, path)}.vue`)
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}
