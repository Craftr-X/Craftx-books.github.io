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

const booksPath = join(__dirname, '../../books.json')
let books: Array<{ slug: string; title: string; desc?: string }> = []
try {
  books = JSON.parse(readFileSync(booksPath, 'utf-8'))
} catch {
  books = []
}

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
