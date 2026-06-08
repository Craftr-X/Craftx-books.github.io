<script setup lang="ts">
import { useData } from 'vitepress'

const { frontmatter } = useData()

const stats = [
  { label: '技术小册', value: '13', icon: '📚' },
  { label: '文章总数', value: '368+', icon: '📄' },
  { label: '技术方向', value: '10+', icon: '🎯' },
  { icon: '⚡', label: '持续更新', value: '进行中' },
]
</script>

<template>
  <div class="home-stats">
    <div v-for="item in stats" :key="item.label" class="stat-card">
      <span class="stat-icon">{{ item.icon }}</span>
      <span class="stat-value">{{ item.value }}</span>
      <span class="stat-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.home-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 40px 20px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  min-width: 140px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 24px rgba(99, 102, 241, 0.15);
  transform: translateY(-4px);
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--vp-c-brand-1), #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

@media (max-width: 768px) {
  .home-stats {
    gap: 12px;
  }
  .stat-card {
    min-width: 120px;
    padding: 16px 20px;
  }
  .stat-value {
    font-size: 22px;
  }
}
</style>
