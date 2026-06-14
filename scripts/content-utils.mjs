/**
 * content-utils.mjs — 内容处理共享工具函数。
 *
 * 抽取自 generate-sidebar / generate-content-stats / import-book 中重复的实现，
 * 统一维护读取 JSON、遍历章节 Markdown、章节排序、统计章节数等逻辑。
 *
 * 设计约定：
 * - walkMarkdown 递归收集 .md（大小写不敏感），并排除 index.md。
 * - sortMarkdown 按文件名数字前缀升序，无前缀（如「开篇词」）排到末尾，
 *   同前缀内按中文 localeCompare 兜底。
 * - loadBooks / countChapters 以 books.json（顶层数组）为单一数据源。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

/**
 * 读取 JSON 文件；解析失败时返回 fallback。
 */
export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

/**
 * 递归收集目录下所有 .md 文件（大小写不敏感），排除 index.md。
 * 目录不存在时返回 out（空数组）。
 */
export function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkMarkdown(full, out)
    } else if (extname(entry).toLowerCase() === '.md' && entry.toLowerCase() !== 'index.md') {
      out.push(full)
    }
  }
  return out
}

/**
 * 计算章节排序键：文件名数字前缀优先，无前缀置为最大值排到末尾。
 */
export function orderKey(file) {
  const name = basename(file, '.md')
  const numeric = name.match(/^(\d+)/)
  return {
    numeric: numeric ? Number(numeric[1]) : Number.MAX_SAFE_INTEGER,
    name,
  }
}

/**
 * 章节排序：数字前缀升序 → 无前缀排末尾 → 同前缀按中文 localeCompare。
 */
export function sortMarkdown(a, b) {
  const ak = orderKey(a)
  const bk = orderKey(b)
  if (ak.numeric !== bk.numeric) return ak.numeric - bk.numeric
  return ak.name.localeCompare(bk.name, 'zh-CN', { numeric: true })
}

/**
 * 读取 books.json（顶层数组格式），失败返回 fallback（默认 []）。
 *
 * 预留：为后续内容质量检查脚本（check-content-quality.mjs）准备的统一入口，
 * 当前 3 个消费脚本各自有等价逻辑，尚未迁移到此处。
 */
export function loadBooks(root, fallback = []) {
  return readJson(join(root, 'books.json'), fallback)
}

/**
 * 统计单本书的章节数（排除 index.md）。
 *
 * 预留：为后续内容质量检查脚本准备，当前尚无调用方。
 */
export function countChapters(root, slug) {
  return walkMarkdown(join(root, 'docs', 'books', slug)).length
}
