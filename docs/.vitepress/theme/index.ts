import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import type { Theme } from 'vitepress'
import './custom.css'
import HomePage from './components/HomePage.vue'
import BookComment from './components/BookComment.vue'
import { installImageFallback } from './imageFallback'
import { installImageZoom } from './imageZoom'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'doc-footer-before': () => h(BookComment),
  }),
  enhanceApp({ app, router }) {
    // 注册全局组件
    app.component('HomePage', HomePage)
    app.component('BookComment', BookComment)
    installImageFallback()
    installImageZoom(router)
  }
} satisfies Theme
