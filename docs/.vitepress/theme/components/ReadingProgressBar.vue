<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import {
  getProgress,
  trackScroll,
  scrollToRatio,
  PROGRESS_CONSTANTS,
} from '../readingProgress'

const { frontmatter } = useData()
const route = useRoute()

const ratio = ref(0)
const showResumeHint = ref(false)
const resumeRatio = ref(0)
let cleanup: (() => void) | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null

// 仅在「章节页」渲染：排除 home/page 布局、comments:false、书 index 页、首页
const isBookIndex = computed(() => /^\/books\/[^/]+\/?$/.test(route.path))
const isHomePage = computed(() => route.path === '/' || route.path === '/index.html')
const shouldRender = computed(() => {
  const layout = frontmatter.value.layout
  return (
    frontmatter.value.comments !== false &&
    layout !== 'home' &&
    layout !== 'page' &&
    !isBookIndex.value &&
    !isHomePage.value &&
    /^\/books\/[^/]+\//.test(route.path) // 必须是书内章节
  )
})

function updateRatio() {
  const el = document.documentElement
  const scrollHeight = el.scrollHeight - el.clientHeight
  ratio.value = scrollHeight <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / scrollHeight))
}

function checkResumeHint(path: string) {
  const progress = getProgress(path)
  // 仅当之前读过一定深度（避免刚打开就提示），且当前不在顶部附近时显示
  if (
    progress &&
    progress.maxScrollRatio >= PROGRESS_CONSTANTS.START_THRESHOLD &&
    progress.maxScrollRatio < 0.99 &&
    document.documentElement.scrollTop < 100
  ) {
    resumeRatio.value = progress.maxScrollRatio
    showResumeHint.value = true
    if (hintTimer) clearTimeout(hintTimer)
    hintTimer = setTimeout(() => {
      showResumeHint.value = false
    }, 6000)
  } else {
    showResumeHint.value = false
  }
}

function resumeReading() {
  scrollToRatio(resumeRatio.value)
  showResumeHint.value = false
  if (hintTimer) clearTimeout(hintTimer)
}

function dismissHint() {
  showResumeHint.value = false
  if (hintTimer) clearTimeout(hintTimer)
}

function bind() {
  unbind()
  if (!shouldRender.value) return
  // 滚动监听写入进度 + 更新顶部进度条
  cleanup = trackScroll(() => route.path)
  window.addEventListener('scroll', updateRatio, { passive: true })
  updateRatio()
  // 延迟一帧检查「回到上次位置」提示（等 DOM 高度稳定）
  requestAnimationFrame(() => checkResumeHint(route.path))
}

function unbind() {
  if (cleanup) {
    cleanup()
    cleanup = null
  }
  window.removeEventListener('scroll', updateRatio)
  if (hintTimer) {
    clearTimeout(hintTimer)
    hintTimer = null
  }
}

onMounted(() => {
  if (!shouldRender.value) return
  bind()
})

watch([shouldRender, () => route.path], () => {
  if (shouldRender.value) {
    bind()
  } else {
    unbind()
  }
})

onBeforeUnmount(unbind)
</script>

<template>
  <div v-if="shouldRender" class="reading-progress-wrapper">
    <!-- 顶部进度条 -->
    <div class="reading-progress-bar" :style="{ transform: `scaleX(${ratio})` }" />
    <!-- 回到上次阅读位置 -->
    <Transition name="resume-hint">
      <div v-if="showResumeHint" class="resume-hint">
        <button class="resume-btn" @click="resumeReading">
          <span class="resume-icon">↑</span>
          回到上次阅读的位置（{{ Math.round(resumeRatio * 100) }}%）
        </button>
        <button class="resume-close" aria-label="关闭" @click="dismissHint">×</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reading-progress-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
}

.reading-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--vp-c-brand-1), #06b6d4);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
  transition: transform 0.1s ease-out;
}

.resume-hint {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.resume-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.resume-btn:hover {
  color: var(--vp-c-brand-1);
}

.resume-icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
}

.resume-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}

.resume-close:hover {
  background: var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.resume-hint-enter-active,
.resume-hint-leave-active {
  transition: all 0.3s ease;
}

.resume-hint-enter-from,
.resume-hint-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
</style>
