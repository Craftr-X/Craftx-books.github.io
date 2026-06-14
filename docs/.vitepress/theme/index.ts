import DefaultTheme from 'vitepress/theme'
import { h, Fragment } from 'vue'
import type { Theme } from 'vitepress'
import './custom.css'
import HomePage from './components/HomePage.vue'
import BookComment from './components/BookComment.vue'
import ReadingProgressBar from './components/ReadingProgressBar.vue'
import BookIndexProgress from './components/BookIndexProgress.vue'
import ChapterReadingTime from './components/ChapterReadingTime.vue'
import { installImageFallback } from './imageFallback'
import { installImageZoom } from './imageZoom'
import { installSidebarAutoExpand } from './sidebarAutoExpand'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'doc-footer-before': () => h(BookComment),
    // doc-before 同槽挂两个组件：BookIndexProgress 仅书 index 页、ChapterReadingTime 仅章节页，互斥
    'doc-before': () => h(Fragment, null, [
      h(BookIndexProgress),
      h(ChapterReadingTime),
    ]),
    'layout-top': () => h(ReadingProgressBar),
  }),
  enhanceApp({ app, router }) {
    // 注册全局组件
    app.component('HomePage', HomePage)
    app.component('BookComment', BookComment)
    // ReadingProgressBar / BookIndexProgress 仅通过 Layout 插槽渲染，无需全局注册
    installImageFallback()
    installImageZoom(router)
    installSidebarAutoExpand(router)
  }
} satisfies Theme
