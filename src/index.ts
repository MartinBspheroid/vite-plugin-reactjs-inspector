import fs from 'node:fs'
import path from 'node:path'

import { fileURLToPath } from 'node:url'
import { cwd } from 'node:process'
import { type UnpluginFactory, createUnplugin } from 'unplugin'
import { normalizePath } from 'vite'
import { parseSync, traverse } from '@babel/core'
import MagicString from 'magic-string'
import type { PluginOptions } from './types'
import { idToFile, parseJSXIdentifier, parseReactRequest } from './utils'

function getInspectorPath() {
  const pluginPath = normalizePath(
    path.dirname(fileURLToPath(import.meta.url)),
  )
  return pluginPath.replace(/\/dist$/, '/src')
}

const plugin: UnpluginFactory<PluginOptions | undefined> = (options = {}) => {
  const inspectorPath = getInspectorPath()
  const rootPath = cwd().replaceAll('\\', '/')

  // Set default options
  const defaultOptions: PluginOptions = {
    keyboardShortcut: 'alt+x',
    position: 'top-right',
    theme: {
      primary: '#61DBFB',
      secondary: '#20232A',
      disabled: '#6B7280',
    },
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    theme: {
      ...defaultOptions.theme,
      ...options.theme,
    },
  }

  return {
    name: 'vite-plugin-reactjs-inspector',
    enforce: 'pre',
    apply(_: any, { command }: any) {
      // apply only on serve and not for test
      return command === 'serve' && process.env.NODE_ENV !== 'test'
    },
    config: () => {
      return {
        optimizeDeps: {
          include: ['react', 'react-dom'],
        },
      }
    },
    resolveId(importee: string) {
      if (importee.startsWith('virtual:react-inspector-options')) {
        return importee
      }
      if (importee.startsWith('virtual:react-inspector-path:')) {
        const resolved = importee.replace(
          'virtual:react-inspector-path:',
          `${inspectorPath}/`,
        )
        return resolved
      }
    },

    async load(id) {
      if (id === 'virtual:react-inspector-options') {
        return `export default {
          cwdPath: '${rootPath}/',
          keyboardShortcut: '${mergedOptions.keyboardShortcut}',
          position: '${mergedOptions.position}',
          theme: {
            primary: '${mergedOptions.theme?.primary}',
            secondary: '${mergedOptions.theme?.secondary}',
            disabled: '${mergedOptions.theme?.disabled}'
          }
        }`
      }
      if (id.startsWith(inspectorPath)) {
        const { query } = parseReactRequest(id)
        if (query.type)
          return
        // read file ourselves to avoid getting shut out by vites fs.allow check
        const file = idToFile(id)
        if (fs.existsSync(file)) {
          return await fs.promises.readFile(file, 'utf-8')
        }
        else {
          console.error(
            `failed to find file for react-inspector: ${file}, referenced by id ${id}.`,
          )
        }
      }
    },
    transform: (code, id) => {
      const { filename } = parseReactRequest(id)

      const isJsx = filename.endsWith('.jsx') || filename.endsWith('.tsx')

      if (isJsx) {
        const transformedCode = code
        const s = new MagicString(transformedCode)
        const ast = parseSync(code, {
          configFile: false,
          filename: id,
          ast: true,
          presets: [
            '@babel/preset-env',
            '@babel/preset-react',
            '@babel/preset-typescript',
          ],
        })
        traverse(ast as any, {
          enter({ node }) {
            if (node.type === 'JSXElement') {
              // @ts-expect-error
              if (node?.openingElement?.name?.object?.name === 'React')
                return

              const { start } = node
              const { column, line } = node?.loc?.start as any
              const toInsertPosition
                = start
                + parseJSXIdentifier(node.openingElement.name as any).length
                + 1
              const content = ` data-react-inspector="${filename.replace(`${rootPath}/`, '')}:${line}:${column}"`
              s.appendLeft(toInsertPosition, content)
            }
          },
        })
        const sourceMap = s.generateMap({
          source: id,
          includeContent: true,
        })
        return {
          code: s.toString(),
          map: sourceMap,
        }
      }
    },
    transformIndexHtml(html: any) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head',
            attrs: {
              type: 'module',
              src: `/@id/virtual:react-inspector-path:load.js`,
            },
          },
        ],
      }
    },
  }
}

const VitePluginReactInspector = /* #__PURE__ */ createUnplugin(plugin)

export default VitePluginReactInspector
