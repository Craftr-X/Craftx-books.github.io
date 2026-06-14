/**
 * readingProgress.ts — 章节阅读进度记忆（纯 localStorage，零后端）。
 *
 * 存储设计：
 *   key:   craftx:reading-progress
 *   value: { "<章节路径>": { scrollRatio, maxScrollRatio, updatedAt } }
 *
 * - 用 scrollRatio（0-1 比例）而非像素，适配不同屏幕/字号
 * - 单 key 存所有章节，LRU 淘汰，上限 MAX_ENTRIES（避免撑爆 localStorage）
 * - 纯逻辑（阈值判定/LRU/合并）在 readingProgressCore.mjs，可被 node --test 直测
 * - 阈值：maxScrollRatio >= READ_THRESHOLD 视为「已读」，< START_THRESHOLD 视为「未读」
 */

import {
  statusOf as statusOfCore,
  trimByLRU,
  mergeProgress,
  STORAGE_KEY,
  READ_THRESHOLD,
  START_THRESHOLD,
} from './readingProgressCore.mjs'

// 节流间隔（毫秒）
const FLUSH_INTERVAL = 500

export type ChapterProgress = {
  scrollRatio: number
  maxScrollRatio: number
  updatedAt: number
}

type ProgressMap = Record<string, ChapterProgress>

/** 读取整张进度表。SSR 或读取失败时返回空表。 */
function readAll(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** 写入整张进度表（带 LRU 淘汰）。 */
function writeAll(map: ProgressMap) {
  if (typeof window === 'undefined') return
  const trimmed = trimByLRU(map)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage 满或被禁用，静默忽略
  }
}

/** 获取某章节的进度（无记录返回 null）。 */
export function getProgress(path: string): ChapterProgress | null {
  return readAll()[path] || null
}

/** 更新某章节的滚动进度。 */
export function updateProgress(path: string, scrollRatio: number) {
  if (typeof window === 'undefined') return
  const map = readAll()
  map[path] = mergeProgress(map[path], scrollRatio)
  writeAll(map)
}

/** 章节状态：unread / reading / read。 */
export type ChapterStatus = 'unread' | 'reading' | 'read'

/** 根据进度判断章节状态（逻辑委派给 core）。 */
export function statusOf(progress: ChapterProgress | null): ChapterStatus {
  return statusOfCore(progress)
}

export const PROGRESS_CONSTANTS = {
  READ_THRESHOLD,
  START_THRESHOLD,
  STORAGE_KEY,
}

/**
 * 绑定滚动监听（window 滚动，VitePress 默认主题用 window 而非内部 div），
 * 节流写入进度。返回清理函数。
 *
 * 用法：
 *   const cleanup = trackScroll(() => route.path)
 *   onBeforeUnmount(cleanup)
 */
export function trackScroll(getPath: () => string) {
  if (typeof window === 'undefined') return () => {}

  let ticking = false
  let lastFlush = 0

  const computeRatio = () => {
    const el = document.documentElement
    const scrollHeight = el.scrollHeight - el.clientHeight
    if (scrollHeight <= 0) return 0
    return Math.min(1, Math.max(0, el.scrollTop / scrollHeight))
  }

  const onScroll = () => {
    if (ticking) return
    ticking = true
    window.requestAnimationFrame(() => {
      ticking = false
      const ratio = computeRatio()
      const now = Date.now()
      if (now - lastFlush >= FLUSH_INTERVAL) {
        lastFlush = now
        updateProgress(getPath(), ratio)
      }
    })
  }

  // 进入页面立即记录一次（标记为「开始读」）
  updateProgress(getPath(), computeRatio())

  window.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    // 离开前 flush 最后一次（确保进度被保存）
    updateProgress(getPath(), computeRatio())
    window.removeEventListener('scroll', onScroll)
  }
}

/**
 * 平滑滚动 window 到指定比例位置。
 */
export function scrollToRatio(ratio: number) {
  const el = document.documentElement
  const scrollHeight = el.scrollHeight - el.clientHeight
  if (scrollHeight <= 0) return
  window.scrollTo({ top: scrollHeight * ratio, behavior: 'smooth' })
}
