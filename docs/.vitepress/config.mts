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
let books: Array<{ slug: string; title: string; desc?: string; category?: string }> = []
try {
  books = JSON.parse(readFileSync(booksPath, 'utf-8'))
} catch {
  books = []
}

const navItems = (category: string) => books
  .filter(book => (book.category || 'booklet') === category)
  .map(book => ({ text: book.title, link: `/books/${book.slug}/` }))

function renderMissingAssetPlaceholders(md: any) {
  const pattern = /\[(图片|缺失资源)：([^\]]+)\]/g

  md.core.ruler.after('inline', 'render_missing_asset_placeholders', state => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue

      const nextChildren = []
      for (const child of token.children) {
        if (child.type !== 'text' || !pattern.test(child.content)) {
          pattern.lastIndex = 0
          nextChildren.push(child)
          continue
        }

        pattern.lastIndex = 0
        let lastIndex = 0
        for (const match of child.content.matchAll(pattern)) {
          const index = match.index ?? 0
          if (index > lastIndex) {
            const text = new state.Token('text', '', 0)
            text.content = child.content.slice(lastIndex, index)
            nextChildren.push(text)
          }

          const kind = md.utils.escapeHtml(match[1])
          const assetPath = md.utils.escapeHtml(match[2])
          const html = new state.Token('html_inline', '', 0)
          html.content = [
            `<span class="missing-asset-card" data-asset-kind="${kind}" data-asset-src="${assetPath}">`,
            '<strong>图片资源未随文档入库</strong>',
            '<span>未下载全量图片，可按这个路径回源或补入单张资源。</span>',
            `<code>${assetPath}</code>`,
            '</span>',
          ].join('')
          nextChildren.push(html)
          lastIndex = index + match[0].length
        }

        if (lastIndex < child.content.length) {
          const text = new state.Token('text', '', 0)
          text.content = child.content.slice(lastIndex)
          nextChildren.push(text)
        }
      }

      token.children = nextChildren
    }
  })
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
        text: '技术小册',
        items: navItems('booklet')
      },
      {
        text: '电子书',
        items: navItems('ebook')
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
    config(md) {
      renderMissingAssetPlaceholders(md)
    },
  },
})
