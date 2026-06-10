import type { Router } from 'vitepress'
import type { Zoom } from 'medium-zoom'

const ZOOM_SELECTOR = '.vp-doc img:not(.medium-zoom-image):not([data-no-zoom])'

let zoom: Zoom | undefined

function getOverlayBackground() {
  return document.documentElement.classList.contains('dark')
    ? 'rgba(10, 10, 26, 0.92)'
    : 'rgba(255, 255, 255, 0.92)'
}

async function bindImageZoom() {
  const { default: mediumZoom } = await import('medium-zoom')

  if (!zoom) {
    zoom = mediumZoom({
      margin: 24,
      background: getOverlayBackground(),
      scrollOffset: 40,
    })
  }

  zoom.update({ background: getOverlayBackground() })
  zoom.detach()
  zoom.attach(ZOOM_SELECTOR)
}

function scheduleBindImageZoom() {
  window.requestAnimationFrame(() => {
    bindImageZoom()
  })
}

export function installImageZoom(router: Router) {
  if (typeof window === 'undefined') return

  scheduleBindImageZoom()

  router.onAfterRouteChange = () => {
    scheduleBindImageZoom()
  }
}
