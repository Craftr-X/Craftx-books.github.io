const IMAGE_PROXY_PREFIX = 'https://images.weserv.nl/?url='

function proxiedUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return `${IMAGE_PROXY_PREFIX}${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`
  } catch {
    return ''
  }
}

function replaceWithFallback(img: HTMLImageElement, originalSrc: string) {
  const fallback = document.createElement('a')
  fallback.className = 'image-fallback-card'
  fallback.href = originalSrc
  fallback.target = '_blank'
  fallback.rel = 'noreferrer'
  fallback.innerHTML = [
    '<strong>图片加载失败</strong>',
    '<span>点击在新标签页打开原始图片</span>',
    `<code>${originalSrc}</code>`,
  ].join('')
  img.replaceWith(fallback)
}

export function installImageFallback() {
  if (typeof window === 'undefined') return

  window.addEventListener(
    'error',
    event => {
      const target = event.target
      if (!(target instanceof HTMLImageElement)) return

      const originalSrc = target.dataset.originalSrc || target.currentSrc || target.src
      if (!originalSrc) return

      if (!target.dataset.originalSrc) {
        target.dataset.originalSrc = originalSrc
      }

      if (target.dataset.proxyTried !== 'true') {
        const nextSrc = proxiedUrl(originalSrc)
        if (nextSrc && nextSrc !== target.src) {
          target.dataset.proxyTried = 'true'
          target.referrerPolicy = 'no-referrer'
          target.src = nextSrc
          return
        }
      }

      replaceWithFallback(target, originalSrc)
    },
    true,
  )
}
