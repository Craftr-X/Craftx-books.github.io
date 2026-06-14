/**
 * reading-time-core.mjs — 阅读时长估算的纯逻辑核心（无文件 IO 依赖）。
 *
 * 抽离字数剥离与时长换算逻辑，使算法可被 node --test 直接测试。
 * generate-content-stats.mjs 负责遍历文件并写入 content-stats.json，从本文件 import 纯逻辑。
 */

/** 阅读速度：中文技术文约 500 字/分钟（已用真实章节校准）。 */
export const CHARS_PER_MINUTE = 500

/**
 * 剥离 Markdown 语法噪声，返回纯正文文本。
 * 依次剔除：frontmatter、代码块、行内代码、图片、链接 URL（保留文字）、
 * HTML 标签、Markdown 符号、空白。
 */
export function stripMarkdown(text) {
  return text
    .replace(/^---[\s\S]*?---/, '') // frontmatter
    .replace(/```[\s\S]*?```/g, '') // 围栏代码块
    .replace(/~~~[\s\S]*?~~~/g, '') // 围栏代码块（波浪号）
    .replace(/`[^`]*`/g, '') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接：保留文字丢 URL
    .replace(/<[^>]+>/g, '') // HTML 标签
    .replace(/^\s{0,3}>\s?/gm, '') // 引用标记
    .replace(/^#{1,6}\s+/gm, '') // 标题井号
    .replace(/^\s*[-*+]\s+/gm, '') // 无序列表标记
    .replace(/^\s*\d+\.\s+/gm, '') // 有序列表标记
    .replace(/^\s*\|/gm, '') // 表格竖线（行首）
    .replace(/\|/g, '') // 表格竖线（行内）
    .replace(/---+/g, '') // 分隔线
    .replace(/[*_~]/g, '') // 强调/删除线
    .replace(/\s/g, '') // 空白
}

/** 统计纯正文文本的字符数（剥离已由 stripMarkdown 完成）。 */
export function countChars(text) {
  return stripMarkdown(text).length
}

/**
 * 根据字符数估算阅读分钟数。
 * 最低 1 分钟（避免过短章节显示 0 分钟）。
 */
export function estimateMinutes(textOrChars, charsPerMinute = CHARS_PER_MINUTE) {
  const chars = typeof textOrChars === 'number' ? textOrChars : countChars(textOrChars)
  if (chars <= 0) return 0
  return Math.max(1, Math.round(chars / charsPerMinute))
}

/**
 * 将分钟数格式化为人类可读的阅读时长。
 * - 0 分钟 → '约 1 分钟'（兜底，前端不应收到 0）
 * - < 60 分钟 → '约 N 分钟'
 * - ≥ 60 分钟 → '约 X 小时 Y 分'（Y 为 0 时省略）
 */
export function formatDuration(minutes) {
  if (minutes <= 0) return '约 1 分钟'
  if (minutes < 60) return `约 ${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `约 ${hours} 小时` : `约 ${hours} 小时 ${rest} 分`
}
