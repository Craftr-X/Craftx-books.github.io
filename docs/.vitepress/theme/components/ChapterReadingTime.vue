<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { useNormalizedPath } from '../routePath'
// @ts-expect-error content-stats.json 是构建时生成的 JSON，无类型声明
import contentStats from '../../../../content-stats.json'

const { frontmatter } = useData()
const path = useNormalizedPath()

// 仅在「章节页」渲染：与 ReadingProgressBar.vue 的 shouldRender 判断保持一致
const isBookIndex = computed(() => /^\/books\/[^/]+\/?$/.test(path.value))
const isHomePage = computed(() => path.value === '/' || path.value === '/index.html')
const shouldRender = computed(() => {
  const layout = frontmatter.value.layout
  return (
    frontmatter.value.comments !== false &&
    layout !== 'home' &&
    layout !== 'page' &&
    !isBookIndex.value &&
    !isHomePage.value &&
    /^\/books\/[^/]+\//.test(path.value)
  )
})

/**
 * 从归一化路径解析 slug 与章节 basename，在 content-stats 中查表得阅读分钟。
 * 路径形如 /books/<slug>/<basename>
 * stats.chapters 的 key 是 basename（无 .md）
 */
const minutes = computed<number | null>(() => {
  if (!shouldRender.value) return null
  const match = path.value.match(/^\/books\/([^/]+)\/([^/]+)/)
  if (!match) return null
  const slug = match[1]
  const chapterKey = match[2]
  const book = contentStats.books?.[slug]
  if (!book?.chapters) return null
  return book.chapters[chapterKey] ?? null
})

function formatDuration(min: number): string {
  if (min < 60) return `约 ${min} 分钟`
  const hours = Math.floor(min / 60)
  const rest = min % 60
  return rest === 0 ? `约 ${hours} 小时` : `约 ${hours} 小时 ${rest} 分`
}
</script>

<template>
  <div v-if="shouldRender && minutes !== null" class="chapter-reading-time">
    <span class="rt-icon">⏱</span>
    <span class="rt-text">{{ formatDuration(minutes) }}阅读</span>
  </div>
</template>

<style scoped>
.chapter-reading-time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
}

.rt-icon {
  font-size: 14px;
  line-height: 1;
}

.rt-text {
  font-weight: 500;
}
</style>
