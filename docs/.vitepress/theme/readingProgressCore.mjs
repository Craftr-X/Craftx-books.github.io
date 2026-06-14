/**
 * readingProgressCore.mjs — 阅读进度的纯逻辑核心（无 window/DOM 依赖）。
 *
 * 抽离自 readingProgress.ts，使阈值判定与状态计算可被 node --test 直接测试。
 * readingProgress.ts 负责存储与滚动交互，从本文件 import 纯逻辑。
 */

export const READ_THRESHOLD = 0.85
export const START_THRESHOLD = 0.15
export const STORAGE_KEY = 'craftx:reading-progress'
export const MAX_ENTRIES = 200

/** @typedef {'unread'|'reading'|'read'} ChapterStatus */

/**
 * 根据进度判断章节状态。
 * - 无记录 → unread
 * - maxScrollRatio >= READ_THRESHOLD → read
 * - maxScrollRatio < START_THRESHOLD → unread
 * - 其余 → reading
 */
export function statusOf(progress) {
  if (!progress) return 'unread'
  if (progress.maxScrollRatio >= READ_THRESHOLD) return 'read'
  if (progress.maxScrollRatio < START_THRESHOLD) return 'unread'
  return 'reading'
}

/**
 * LRU 淘汰：当条目超过上限，按 updatedAt 升序删除最旧的。
 * 返回裁剪后的新 map（不修改原对象）。
 */
export function trimByLRU(map, maxEntries = MAX_ENTRIES) {
  const entries = Object.entries(map)
  if (entries.length <= maxEntries) return map
  entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt)
  const kept = entries.slice(entries.length - maxEntries)
  const trimmed = {}
  for (const [k, v] of kept) trimmed[k] = v
  return trimmed
}

/**
 * 合并一次新的滚动进度到已有进度记录。
 * 返回新的记录对象（不可变更新）。
 */
export function mergeProgress(prev, scrollRatio) {
  const maxScrollRatio = prev ? Math.max(prev.maxScrollRatio, scrollRatio) : scrollRatio
  return {
    scrollRatio,
    maxScrollRatio,
    updatedAt: Date.now(),
  }
}
