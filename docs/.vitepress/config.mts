import { defineConfig } from 'vitepress'
import { readFileSync } from 'fs'
import { join } from 'path'

// 读取生成的侧边栏配置
const sidebarPath = join(__dirname, '../../sidebar-generated.json')
let sidebarConfig = {}
try {
  sidebarConfig = JSON.parse(readFileSync(sidebarPath, 'utf-8'))
} catch {
  sidebarConfig = {}
}

// 小册元数据
const books = [
  { slug: 'claude-code-dev', title: 'Claude Code 企业级全链路开发实战', desc: '一个人用 Claude Code 造一个简版 Dify' },
  { slug: 'claude-code-legacy', title: 'Claude Code 企业级老项目改造实战', desc: '用 AI 重构遗留代码的实战指南' },
  { slug: 'mysql-running', title: 'MySQL 是怎样运行的', desc: '从根儿上理解 MySQL' },
  { slug: 'typescript-intro', title: 'TypeScript 入门教程', desc: '从 JavaScript 到 TypeScript 的第一步' },
  { slug: 'typescript-advanced', title: 'TypeScript 全面进阶指南', desc: '深入理解 TypeScript 类型系统' },
  { slug: 'low-code-platform', title: '从 0 打造通用型低代码产品', desc: '低代码平台架构与实现' },
  { slug: 'cicd-guide', title: '从 0 到 1 实现一套 CI/CD 流程', desc: 'Jenkins + Kubernetes 持续集成部署' },
  { slug: 'redis7', title: '说透 Redis 7', desc: '深度解析 Redis 核心原理与实战' },
  { slug: 'chrome-devtools', title: '你不知道的 Chrome 调试技巧', desc: '提升前端调试效率的实用技巧' },
  { slug: 'docker-guide', title: '开发者必备的 Docker 实践指南', desc: '容器化技术从入门到实践' },
  { slug: 'programmer-essential', title: '程序员的必修课', desc: '计算机基础与编程素养' },
  { slug: 'career-guide', title: '程序员职业小白书', desc: '如何规划和经营你的职业' },
  { slug: 'wechat-miniprogram', title: '微信小程序开发入门', desc: '从 0 到 1 实现天气小程序' },
  { slug: 'build-agent-harness', title: '从0开始构建AgentHarness', desc: '从零开始构建 Agent Harness 的完整指南' },
]

export default defineConfig({
  title: 'CraftX Books',
  description: '技术小册合集 — 沉浸式阅读体验',
  lang: 'zh-CN',
  base: '/Craftx-books.github.io/',
  outDir: '../dist',
  cleanUrls: true,
  ignoreDeadLinks: true,
  vite: {
    build: {
      // Local search emits a large index chunk; regular page chunks should remain small.
      chunkSizeWarningLimit: 9000,
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'referrer', content: 'no-referrer' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'CraftX Books' }],
    ['meta', { name: 'og:description', content: '技术小册合集 — 沉浸式阅读体验' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'CraftX Books',

    nav: [
      { text: '首页', link: '/' },
      {
        text: '小册目录',
        items: books.map(b => ({ text: b.title, link: `/books/${b.slug}/` }))
      },
    ],

    sidebar: sidebarConfig,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Craftr-X/Craftx-books.github.io' },
    ],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除搜索条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3],
    },

    lastUpdated: {
      text: '最后更新于',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true,
    },
  },
})
