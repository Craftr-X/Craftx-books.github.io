/**
 * routePath.ts — 路径归一化工具。
 *
 * 问题：配置了 `base`（如 '/Craftx-books.github.io/'）时，`useRoute().path` 会包含
 * base 前缀；且含中文的路径会被 URL 编码（%E4%BD%A0...）。直接用 route.path 做
 * 正则匹配或查表都会失败。
 *
 * 本工具统一剥离 base 前缀 + decodeURIComponent，返回干净的逻辑路径，
 * 如 '/books/claude-code-dev/01-你是架构师...'，供所有依赖路由判断的组件使用。
 */

import { useData, useRoute } from 'vitepress'
import { computed, type ComputedRef } from 'vue'

/** 剥离 base 前缀（如有）并 decode URL 编码，返回干净的逻辑路径。 */
export function normalizePath(rawPath: string, base = '/'): string {
  let p = rawPath
  // 剥离 base 前缀（base 形如 '/Craftx-books.github.io/'）
  if (base !== '/' && p.startsWith(base)) {
    p = p.slice(base.length - 1) // 保留开头的 '/'
  }
  // decode 中文等 URL 编码
  try {
    p = decodeURIComponent(p)
  } catch {
    // decode 失败时保留原值（不应发生）
  }
  // cleanUrls: 去掉可能的 .html 后缀
  if (p.endsWith('.html')) {
    p = p.slice(0, -5)
  }
  return p
}

/**
 * 返回当前页面的归一化路径（响应式）。
 * 自动从 useData().site 读取 base，无需调用方关心。
 */
export function useNormalizedPath(): ComputedRef<string> {
  const route = useRoute()
  const { site } = useData()
  return computed(() => normalizePath(route.path, site.value.base))
}
