import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import type { Theme } from 'vitepress'
import './custom.css'
import HomePage from './components/HomePage.vue'
import BookComment from './components/BookComment.vue'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'doc-after': () => h(BookComment),
  }),
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('HomePage', HomePage)
    app.component('BookComment', BookComment)
  }
} satisfies Theme
