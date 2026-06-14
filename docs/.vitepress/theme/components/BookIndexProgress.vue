<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { getProgress, statusOf, type ChapterStatus } from '../readingProgress'
import { useNormalizedPath } from '../routePath'
// @ts-expect-error content-stats.json 是构建时生成的 JSON，无类型声明
import contentStats from '../../../../content-stats.json'

const path = useNormalizedPath()
const mounted = ref(false)
const totalChapters = ref(0)
const readCount = ref(0)
const readingCount = ref(0)

const isBookIndex = computed(() => /^\/books\/[^/]+\/?$/.test(path.value))

// 本书总阅读时长（分钟），从 content-stats 查表
const bookReadingMinutes = computed<number | null>(() => {
  const match = path.value.match(/^\/books\/([^/]+)/)
  if (!match) return null
  return contentStats.books?.[match[1]]?.readingMinutes ?? null
})

function formatDuration(min: number): string {
  if (min < 60) return `约 ${min} 分钟`
  const hours = Math.floor(min / 60)
  const rest = min % 60
  return rest === 0 ? `约 ${hours} 小时` : `约 ${hours} 小时 ${rest} 分`
}

const overallRatio = computed(() => {
  if (totalChapters.value === 0) return 0
  // 已读计 1，在读计 0.5，未读计 0
  return (readCount.value + readingCount.value * 0.5) / totalChapters.value
})

const STATUS_SYMBOL: Record<ChapterStatus, string> = {
  unread: '○',
  reading: '◐',
  read: '●',
}

function chapterPathFromLink(href: string, basePath: string): string {
  // href 形如 ./01-xx.md 或 01-xx.md；转成 /books/<slug>/01-xx
  let clean = href.replace(/^\.\//, '').replace(/\.md$/, '')
  // 拼成绝对路径（与 localStorage key 一致）
  return `${basePath.replace(/\/$/, '')}/${clean}`
}

function refresh() {
  if (!isBookIndex.value) return
  // 等待 DOM 渲染完成（书首页 ## 目录 区块的链接）
  nextTick(() => {
    const docEl = document.documentElement
    const tocLinks: HTMLAnchorElement[] = []
    // 找 .vp-doc 里的目录区块链接
    const docContent = docEl.querySelector('.vp-doc')
    if (!docContent) return
    // 跳过非目录区的链接（hero、评论等）；目录项在 ul > li > a
    const anchors = Array.from(
      docContent.querySelectorAll('ul a[href]'),
    ) as HTMLAnchorElement[]
    const basePath = path.value.endsWith('/') ? path.value : path.value + '/'

    let read = 0
    let reading = 0
    let total = 0

    for (const a of anchors) {
      const href = a.getAttribute('href') || ''
      // 只处理指向本章节的相对 md 链接（排除外链、锚点）
      if (!/^\.{0,2}\//.test(href) && !href.startsWith('./') && !/^\d/.test(href)) {
        if (/^https?:|^#|^mailto:/.test(href)) continue
      }
      if (/^https?:|^#|^mailto:|^tel:/.test(href)) continue
      const chapterPath = chapterPathFromLink(href, basePath)
      if (!/^\/books\/[^/]+\//.test(chapterPath)) continue
      const status = statusOf(getProgress(chapterPath))
      total += 1
      if (status === 'read') read += 1
      else if (status === 'reading') reading += 1

      // 在链接后插入状态圆点（避免重复插入）
      const parent = a.parentElement
      if (parent && !parent.querySelector('.chapter-status-dot')) {
        const dot = document.createElement('span')
        dot.className = `chapter-status-dot status-${status}`
        dot.textContent = STATUS_SYMBOL[status]
        dot.title =
          status === 'read' ? '已读' : status === 'reading' ? '在读' : '未读'
        parent.appendChild(dot)
      } else if (parent) {
        // 已存在则更新状态
        const dot = parent.querySelector('.chapter-status-dot')
        if (dot) {
          dot.className = `chapter-status-dot status-${status}`
          dot.textContent = STATUS_SYMBOL[status]
          dot.title =
            status === 'read' ? '已读' : status === 'reading' ? '在读' : '未读'
        }
      }
    }

    // 移除其他书遗留的 dot（切换书时）
    docContent.querySelectorAll('.chapter-status-dot').forEach(dot => {
      const li = dot.parentElement
      if (li && !li.querySelector('a[href]')?.getAttribute('href')) {
        dot.remove()
      }
    })

    totalChapters.value = total
    readCount.value = read
    readingCount.value = reading
  })
}

onMounted(() => {
  mounted.value = true
  refresh()
})

watch(path, () => {
  if (mounted.value && isBookIndex.value) refresh()
})

// 用户从章节页返回书首页时，localStorage 已更新，需刷新
watch(isBookIndex, (v) => {
  if (v && mounted.value) refresh()
})

onBeforeUnmount(() => {
  // 清理注入的 dot
  document.querySelectorAll('.chapter-status-dot').forEach(d => d.remove())
})
</script>

<template>
  <div v-if="isBookIndex && totalChapters > 0" class="book-progress-overview">
    <div class="progress-summary">
      <span class="progress-label">
        阅读进度：<strong>{{ readCount }}</strong> / {{ totalChapters }} 章
        <span v-if="readingCount > 0" class="progress-reading">（{{ readingCount }} 章在读）</span>
        <span v-if="bookReadingMinutes !== null" class="progress-duration">· {{ formatDuration(bookReadingMinutes) }}</span>
      </span>
      <span class="progress-percent">{{ Math.round(overallRatio * 100) }}%</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: `${overallRatio * 100}%` }" />
    </div>
  </div>
</template>

<style scoped>
.book-progress-overview {
  margin: 0 0 24px;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.progress-summary {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.progress-label {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.progress-label strong {
  color: var(--vp-c-brand-1);
  font-size: 18px;
  font-weight: 700;
}

.progress-reading {
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.progress-duration {
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 500;
}

.progress-percent {
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--vp-c-brand-1), #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.progress-track {
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--vp-c-brand-1), #06b6d4);
  border-radius: 3px;
  transition: width 0.4s ease;
}
</style>

<style>
/* 章节状态圆点（全局样式，因为是 JS 动态注入的） */
.vp-doc .chapter-status-dot {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  line-height: 1;
  vertical-align: middle;
}

.vp-doc .chapter-status-dot.status-unread {
  color: var(--vp-c-text-3);
  opacity: 0.4;
}

.vp-doc .chapter-status-dot.status-reading {
  color: var(--vp-c-brand-1);
}

.vp-doc .chapter-status-dot.status-read {
  color: #10b981;
}
</style>
