/**
 * sidebarAutoExpand.ts — 折叠分组下，自动展开当前章节所在的组 + 侧边栏滚到当前项。
 *
 * 配合 E1 的 collapsible 分组使用：
 *   - 进入页面后，找侧边栏 .is-active（当前章节）的祖先可折叠组
 *   - 对处于 collapsed 状态的祖先，触发 .caret.click() 展开
 *   - 让当前项 scrollIntoView（长侧边栏时尤其有用）
 *
 * 复用 imageZoom.ts 的 router.onAfterRouteChange 钩子模式。
 */

import type { Router } from 'vitepress'

const MAX_WAIT_MS = 3000
const POLL_INTERVAL_MS = 50

/**
 * 等待侧边栏渲染出当前章节的 .is-active 项。
 * VitePress 异步渲染侧边栏，需要轮询直到元素出现。
 */
function waitForActiveItem(signal: AbortSignal): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      if (signal.aborted) return resolve(null)
      const active = document.querySelector<HTMLElement>(
        '.VPSidebar .VPSidebarItem.is-active',
      )
      if (active) return resolve(active)
      if (Date.now() - start >= MAX_WAIT_MS) return resolve(null)
      setTimeout(check, POLL_INTERVAL_MS)
    }
    check()
  })
}

/**
 * 从当前激活项向上展开所有处于 collapsed 状态的祖先分组。
 */
function expandAncestorGroups(activeItem: HTMLElement) {
  let node: HTMLElement | null = activeItem
  while (node && node !== document.body) {
    if (
      node.classList.contains('VPSidebarItem') &&
      node.classList.contains('collapsed')
    ) {
      // 找该分组的 caret 按钮并点击展开
      const caret = node.querySelector<HTMLElement>(':scope > .item .caret')
      if (caret) caret.click()
    }
    // VPSidebarItem 嵌套结构：向上找最近的 .VPSidebarItem 祖先
    node = node.parentElement
  }
}

/**
 * 让当前激活项在侧边栏视口内可见。
 */
function scrollActiveIntoView(activeItem: HTMLElement) {
  const sidebar = document.querySelector<HTMLElement>('.VPSidebar')
  if (!sidebar) return
  // 仅当当前项在侧边栏视口外时才滚动
  const sidebarRect = sidebar.getBoundingClientRect()
  const itemRect = activeItem.getBoundingClientRect()
  const margin = 80
  if (
    itemRect.top < sidebarRect.top + margin ||
    itemRect.bottom > sidebarRect.bottom - margin
  ) {
    activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

async function runAutoExpand() {
  const controller = new AbortController()
  const active = await waitForActiveItem(controller.signal)
  if (!active) return
  expandAncestorGroups(active)
  // 展开后 DOM 高度变化，等一帧再滚动定位
  requestAnimationFrame(() => scrollActiveIntoView(active))
}

export function installSidebarAutoExpand(router: Router) {
  if (typeof window === 'undefined') return

  // 首次加载
  runAutoExpand()

  const previousOnAfterRouteChange = router.onAfterRouteChange

  router.onAfterRouteChange = async (to) => {
    await previousOnAfterRouteChange?.(to)
    runAutoExpand()
  }
}
