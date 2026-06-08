<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const { frontmatter, isDark } = useData()
const container = ref<HTMLElement | null>(null)
const mounted = ref(false)
const giscusScript = ref<HTMLScriptElement | null>(null)
const shouldRender = computed(() => frontmatter.value.layout === 'doc' && frontmatter.value.comments !== false)
const giscusTheme = computed(() => (isDark.value ? 'dark' : 'light'))

function mountGiscus() {
  if (!container.value || !shouldRender.value) return

  container.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.async = true
  script.setAttribute('data-repo', 'Craftr-X/Craftx-books.github.io')
  script.setAttribute('data-repo-id', 'R_kgDOSm7eVQ')
  script.setAttribute('data-category', 'Announcements')
  script.setAttribute('data-category-id', 'DIC_kwDOSm7eVc4C-wiu')
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', 'preferred_color_scheme')
  script.setAttribute('data-lang', 'zh-CN')
  script.setAttribute('crossorigin', 'anonymous')
  script.setAttribute('loading', 'lazy')

  container.value.appendChild(script)
  giscusScript.value = script
}

onMounted(() => {
  mounted.value = true
  mountGiscus()
})

watch([giscusTheme, shouldRender], () => {
  if (mounted.value) {
    mountGiscus()
  }
})

onBeforeUnmount(() => {
  giscusScript.value?.remove()
  giscusScript.value = null
})
</script>

<template>
  <div v-if="shouldRender" class="comments-section">
    <div class="comments-divider">
      <span class="comments-title">评论讨论</span>
    </div>
    <div ref="container" class="giscus-wrapper">
      <div class="comments-placeholder">加载评论中...</div>
    </div>
  </div>
</template>

<style scoped>
.comments-section {
  margin-top: 64px;
  padding-top: 32px;
}

.comments-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.comments-divider::before,
.comments-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--vp-c-divider), transparent);
}

.comments-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.giscus-wrapper {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  padding: 16px;
  background: var(--vp-c-bg-soft);
}

.comments-placeholder {
  text-align: center;
  padding: 40px;
  color: var(--vp-c-text-3);
  font-size: 14px;
}
</style>
