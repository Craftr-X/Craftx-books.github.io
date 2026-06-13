import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'path'
import { inflateRawSync } from 'zlib'
import { fileURLToPath } from 'url'
import { updateSidebarForBook } from './generate-sidebar.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsBooksDir = join(root, 'docs', 'books')
const booksPath = join(root, 'books.json')

function parseArgs(argv) {
  const args = { force: false, dryRun: false }
  const positionals = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--force') args.force = true
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--slug') args.slug = argv[++i]
    else if (arg === '--title') args.title = argv[++i]
    else if (arg === '--desc') args.desc = argv[++i]
    else if (arg === '--help' || arg === '-h') args.help = true
    else if (arg.startsWith('--')) throw new Error(`未知参数：${arg}`)
    else positionals.push(arg)
  }
  args.input = positionals[0]
  return args
}

function usage() {
  return [
    '用法：node scripts/import-book.mjs <markdown-folder|book.epub> [--slug slug] [--title title] [--desc desc] [--force] [--dry-run]',
    '',
    '仅支持 Markdown 文件夹或 EPUB 文件。',
  ].join('\n')
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function hashText(text) {
  let hash = 0
  for (const ch of text) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return Math.abs(hash).toString(36)
}

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `book-${hashText(String(value || 'book')).slice(0, 6)}`
}

function titleFileSegment(value) {
  const segment = cleanTitle(value)
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return segment
}

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, predicate, out)
    else if (predicate(full)) out.push(full)
  }
  return out
}

function firstHeading(file) {
  const text = readFileSync(file, 'utf8')
  const match = text.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

function markdownTitle(file) {
  return basename(file, '.md')
}

function markdownDisplayTitle(file) {
  return firstHeading(file) || basename(file, '.md')
}

function orderKey(file) {
  const name = basename(file, '.md')
  const numeric = name.match(/^(\d+)/)
  return {
    numeric: numeric ? Number(numeric[1]) : Number.MAX_SAFE_INTEGER,
    name,
  }
}

function sortMarkdown(a, b) {
  const ak = orderKey(a)
  const bk = orderKey(b)
  if (ak.numeric !== bk.numeric) return ak.numeric - bk.numeric
  return ak.name.localeCompare(bk.name, 'zh-CN', { numeric: true })
}

function markdownLinkFromTarget(bookDir, file) {
  const rel = relative(bookDir, file).split(sep).join('/')
  return `./${rel}`
}

function writeIndex(bookDir, title, desc, mdFiles) {
  const lines = [
    '---',
    'layout: doc',
    `title: ${title}`,
    desc ? `description: ${desc}` : '',
    'aside: false',
    'editLink: false',
    '---',
    '',
    `# ${title}`,
    '',
  ].filter(line => line !== '')

  if (desc) {
    lines.push(`> ${desc}`, '')
  }

  lines.push('## 目录', '')
  for (const file of mdFiles) {
    lines.push(`- [${markdownDisplayTitle(file)}](${markdownLinkFromTarget(bookDir, file)})`)
  }
  writeFileSync(join(bookDir, 'index.md'), `${lines.join('\n')}\n`, 'utf8')
}

function detectMarkdownFolder(inputPath, args) {
  const mdFiles = walk(inputPath, file => extname(file).toLowerCase() === '.md')
  if (mdFiles.length === 0) {
    throw new Error('仅支持 Markdown 文件夹或 EPUB 文件：Markdown 文件夹内至少需要包含一个 .md 文件。')
  }
  const ordered = mdFiles.sort(sortMarkdown)
  const chapters = ordered.filter(file => basename(file).toLowerCase() !== 'index.md')
  const titleSource = chapters[0] || ordered[0]
  const title = args.title || firstHeading(titleSource) || basename(inputPath)
  return {
    kind: 'markdown',
    title,
    desc: args.desc || '',
    slug: slugify(args.slug || title || basename(inputPath)),
    chapterCount: chapters.length,
    warnings: [],
  }
}

function importMarkdownFolder(inputPath, tempDir, info) {
  cpSync(inputPath, tempDir, { recursive: true })
  const mdFiles = walk(tempDir, file => extname(file).toLowerCase() === '.md' && basename(file).toLowerCase() !== 'index.md').sort(sortMarkdown)
  writeIndex(tempDir, info.title, info.desc, mdFiles)
}

function readZipEntries(file) {
  const data = readFileSync(file)
  const entries = new Map()
  let offset = 0
  while (offset < data.length - 30) {
    if (data.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1
      continue
    }
    const flags = data.readUInt16LE(offset + 6)
    const method = data.readUInt16LE(offset + 8)
    const compressedSize = data.readUInt32LE(offset + 18)
    const fileNameLength = data.readUInt16LE(offset + 26)
    const extraLength = data.readUInt16LE(offset + 28)
    const nameStart = offset + 30
    const name = data.subarray(nameStart, nameStart + fileNameLength).toString('utf8')
    const bodyStart = nameStart + fileNameLength + extraLength

    if (flags & 0x1) throw new Error('EPUB 文件可能已加密或包含 DRM，无法导入。')
    if (flags & 0x8) throw new Error('暂不支持使用 ZIP data descriptor 的 EPUB，请先用常规 EPUB 工具重新打包。')

    const body = data.subarray(bodyStart, bodyStart + compressedSize)
    let content
    if (method === 0) content = body
    else if (method === 8) content = inflateRawSync(body)
    else throw new Error(`暂不支持 EPUB 内部压缩方法：${method}`)

    entries.set(name, content)
    offset = bodyStart + compressedSize
  }
  return entries
}

function textEntry(entries, name) {
  const body = entries.get(name)
  return body ? body.toString('utf8') : ''
}

function attr(text, name) {
  const match = text.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))
  return match ? match[1] : ''
}

function tagText(text, tag) {
  const match = text.match(new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, 'i'))
  return match ? cleanTitle(match[1]) : ''
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '')
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
}

function cleanTitle(value) {
  const decoded = decodeHtml(String(value || ''))
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<a\b[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const title = decoded
    .replace(/^#+\s*/, '')
    .replace(/^\[[^\]]*\]\(#?[^)]*\)\s*$/, '')
    .trim()

  if (!title) return ''
  if (/^chapter[-_\s]*\d+$/i.test(title)) return ''
  if (/^第\s*\d+\s*章$/.test(title)) return ''
  if (/^#?[a-z]*\d{1,4}$/i.test(title)) return ''
  if (/^[\[\]().#\-\s\d]+$/.test(title)) return ''
  if (/^a-class-[a-z0-9-]+$/i.test(title)) return ''
  return title
}

function dirnamePosix(path) {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function joinPosix(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}

function normalizePosix(path) {
  const parts = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function normalizeHref(href, baseDir = '') {
  const withoutFragment = String(href || '').split('#')[0]
  const withoutQuery = withoutFragment.split('?')[0]
  return normalizePosix(joinPosix(baseDir, decodeHtml(withoutQuery)))
}

function normalizeHrefWithFragment(href, baseDir = '') {
  const raw = String(href || '')
  const fragment = raw.includes('#') ? raw.split('#').slice(1).join('#') : ''
  const normalized = normalizeHref(raw, baseDir)
  return fragment ? `${normalized}#${decodeHtml(fragment)}` : normalized
}

function firstChildTagContent(text, tag) {
  const match = text.match(new RegExp(`<[^:>]*:?${tag}\\b[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, 'i'))
  return match ? match[1] : ''
}

function parseNavDocToc(navHtml, navPath = '') {
  const navDir = dirnamePosix(navPath)
  const toc = new Map()
  const navBlocks = [...navHtml.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi)]
  const candidates = navBlocks.length > 0 ? navBlocks.map(match => match[0]) : [navHtml]

  for (const block of candidates) {
    const isToc = /\bepub:type=["'][^"']*\btoc\b[^"']*["']/i.test(block) || /\brole=["']doc-toc["']/i.test(block)
    if (!isToc && navBlocks.length > 0) continue
    for (const match of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = normalizeHref(match[1], navDir)
      const title = cleanTitle(match[2])
      if (href && title && !toc.has(href)) toc.set(href, title)
    }
    for (const match of block.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>\s*<ol\b[\s\S]*?<\/ol>/gi)) {
      const title = cleanTitle(match[1])
      if (title) continue
    }
    if (toc.size > 0) break
  }

  return toc
}

function parseNcxToc(ncxXml, ncxPath = '') {
  const ncxDir = dirnamePosix(ncxPath)
  const toc = new Map()
  /** @type {Map<string, Array<{fragment: string, title: string}>>} */
  const anchors = new Map()
  for (const match of ncxXml.matchAll(/<content\b[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
    const navPointStart = ncxXml.lastIndexOf('<navPoint', match.index)
    const blockBeforeContent = navPointStart === -1 ? ncxXml.slice(0, match.index) : ncxXml.slice(navPointStart, match.index)
    const labelMatches = [...blockBeforeContent.matchAll(/<navLabel\b[^>]*>[\s\S]*?<\/navLabel>/gi)]
    const labelBlock = labelMatches.length > 0 ? labelMatches[labelMatches.length - 1][0] : ''
    const src = decodeHtml(match[1])
    const label = firstChildTagContent(labelBlock, 'text')
    const href = normalizeHref(src, ncxDir)
    const title = cleanTitle(label)
    if (href && title && !toc.has(href)) toc.set(href, title)
    // Track anchor-based entries for splitting multi-chapter HTML files
    const rawSrc = src
    const fragment = rawSrc.includes('#') ? rawSrc.split('#').slice(1).join('#') : ''
    if (fragment && href && title) {
      if (!anchors.has(href)) anchors.set(href, [])
      anchors.get(href).push({ fragment, title })
    }
  }
  return { toc, anchors }
}

function mergeTocTitleMap(target, source) {
  for (const [href, title] of source) {
    if (href && title && !target.has(href)) target.set(href, title)
  }
  return target
}

function mergeAnchors(target, source) {
  for (const [href, items] of source) {
    if (!target.has(href)) target.set(href, [])
    target.get(href).push(...items)
  }
}

function parseOpf(entries) {
  const container = textEntry(entries, 'META-INF/container.xml')
  const opfPath = attr(container.match(/<rootfile\b[^>]*>/i)?.[0] || '', 'full-path')
  if (!opfPath) throw new Error('EPUB 缺少 META-INF/container.xml 或 rootfile。')
  const opf = textEntry(entries, opfPath)
  if (!opf) throw new Error(`EPUB 缺少 OPF 文件：${opfPath}`)

  const opfDir = dirnamePosix(opfPath)
  const manifest = new Map()
  for (const match of opf.matchAll(/<item\b[^>]*>/gi)) {
    const item = match[0]
    const id = attr(item, 'id')
    const href = attr(item, 'href')
    if (id && href) {
      manifest.set(id, {
        id,
        href: normalizePosix(joinPosix(opfDir, href)),
        mediaType: attr(item, 'media-type'),
        properties: attr(item, 'properties'),
      })
    }
  }

  const spine = []
  const spineTag = opf.match(/<spine\b[^>]*>/i)?.[0] || ''
  const spineTocId = attr(spineTag, 'toc')
  for (const match of opf.matchAll(/<itemref\b[^>]*>/gi)) {
    const idref = attr(match[0], 'idref')
    if (manifest.has(idref)) spine.push(manifest.get(idref))
  }

  const tocTitleMap = new Map()
  /** @type {Map<string, Array<{fragment: string, title: string}>>} */
  const fileAnchors = new Map()
  const navItems = [...manifest.values()].filter(item => /\bnav\b/i.test(item.properties || ''))
  for (const item of navItems) {
    const navHtml = textEntry(entries, item.href)
    if (navHtml) mergeTocTitleMap(tocTitleMap, parseNavDocToc(navHtml, item.href))
  }
  if (tocTitleMap.size === 0) {
    const ncxItems = [
      spineTocId ? manifest.get(spineTocId) : null,
      ...[...manifest.values()].filter(item => item.mediaType === 'application/x-dtbncx+xml' || /\.ncx$/i.test(item.href)),
    ].filter(Boolean)
    for (const item of ncxItems) {
      const ncxXml = textEntry(entries, item.href)
      if (ncxXml) {
        const result = parseNcxToc(ncxXml, item.href)
        const tocMap = result instanceof Map ? result : result.toc
        mergeTocTitleMap(tocTitleMap, tocMap)
        if (!(result instanceof Map) && result.anchors) mergeAnchors(fileAnchors, result.anchors)
      }
      if (tocTitleMap.size > 0) break
    }
  }

  return {
    title: tagText(opf, 'title'),
    creator: tagText(opf, 'creator'),
    opfDir,
    manifest,
    spine,
    tocTitleMap,
    fileAnchors,
  }
}

function htmlToMarkdown(html, assets, chapterPath, links = new Map()) {
  let body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html
  body = body.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  body = body.replace(/<style\b[\s\S]*?<\/style>/gi, '')
  body = body.replace(/<!--[\s\S]*?-->/g, '')
  body = body.replace(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, content) => {
    return `\n\n${'#'.repeat(Number(tag[1]))} ${decodeHtml(stripTags(content)).trim()}\n\n`
  })
  body = body.replace(/<img\b[^>]*>/gi, tag => {
    const src = attr(tag, 'src')
    const alt = attr(tag, 'alt')
    if (!src) return ''
    const resolved = normalizePosix(joinPosix(dirnamePosix(chapterPath), src.split('#')[0]))
    const local = assets.get(resolved)
    return local ? `\n\n![${decodeHtml(alt)}](${local})\n\n` : `\n\n[图片未找到：${src}]\n\n`
  })
  body = body.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, content) => {
    const label = decodeHtml(stripTags(content)).trim()
    const decodedHref = decodeHtml(href)
    const baseDir = dirnamePosix(chapterPath)
    const target = links.get(normalizeHrefWithFragment(decodedHref, baseDir)) || links.get(normalizeHref(decodedHref, baseDir)) || decodedHref
    return `[${label}](${target})`
  })
  body = body.replace(/<\/(p|div|section|article|header|footer|blockquote)>/gi, '\n\n')
  body = body.replace(/<br\s*\/?>/gi, '\n')
  body = body.replace(/<li\b[^>]*>/gi, '\n- ')
  body = body.replace(/<\/li>/gi, '')
  body = body.replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n')
  body = body.replace(/<tr\b[^>]*>/gi, '\n')
  body = body.replace(/<\/t[dh]>/gi, ' | ')
  body = body.replace(/<t[dh]\b[^>]*>/gi, '| ')
  body = body.replace(/<[^>]+>/g, '')
  body = decodeHtml(body)
  body = body.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return body ? `${body}\n` : ''
}

function safeFileName(index, title, used = new Set()) {
  const compact = titleFileSegment(title)
  const fallback = `chapter-${String(index + 1).padStart(2, '0')}`
  const prefix = String(index + 1).padStart(2, '0')
  let fileName = `${prefix}-${compact || fallback}.md`
  if (!used.has(fileName)) {
    used.add(fileName)
    return fileName
  }
  fileName = `${prefix}-${compact || fallback}-${hashText(title).slice(0, 4)}.md`
  used.add(fileName)
  return fileName
}

function detectEpub(inputPath, args) {
  const entries = readZipEntries(inputPath)
  const opf = parseOpf(entries)
  if (opf.spine.length === 0) throw new Error('EPUB 没有可导入的阅读顺序章节。')
  const title = args.title || opf.title || basename(inputPath, extname(inputPath))
  return {
    kind: 'epub',
    title,
    desc: args.desc || (opf.creator ? `作者：${opf.creator}` : ''),
    slug: slugify(args.slug || title),
    chapterCount: (() => {
      if (!opf.fileAnchors || opf.fileAnchors.size === 0) return opf.spine.length
      let total = 0
      for (const item of opf.spine) {
        const href = normalizeHref(item.href)
        const anchors = opf.fileAnchors.get(href)
        total += (anchors && anchors.length > 0) ? anchors.length : 1
      }
      return total
    })(),
    warnings: ['EPUB 转 Markdown 会丢弃复杂 CSS 样式；表格会尽量转为文本管道格式。'],
    entries,
    opf,
  }
}

function importEpub(tempDir, info) {
  const assetsDir = join(tempDir, '_assets')
  mkdirSync(assetsDir, { recursive: true })
  const assets = new Map()
  let assetIndex = 1

  for (const item of info.opf.manifest.values()) {
    if (!item.mediaType.startsWith('image/')) continue
    const body = info.entries.get(item.href)
    if (!body) continue
    const ext = extname(item.href) || `.${item.mediaType.split('/')[1] || 'bin'}`
    const fileName = `image-${String(assetIndex).padStart(3, '0')}${ext}`
    assetIndex += 1
    copyBuffer(body, join(assetsDir, fileName))
    assets.set(item.href, `_assets/${fileName}`)
  }

  const chapters = []
  const usedFileNames = new Set()
  const plannedChapters = []
  let chapterIndex = 0
  const planChapter = (title, item, html, fragment = '') => {
    const fileName = safeFileName(chapterIndex, title, usedFileNames)
    chapterIndex += 1
    const targetPath = join(tempDir, fileName)
    plannedChapters.push({ title, item, html, targetPath, fileName, fragment })
    chapters.push(targetPath)
    return fileName
  }
  info.opf.spine.forEach((item) => {
    const html = textEntry(info.entries, item.href)
    if (!html) {
      info.warnings.push(`章节缺失：${item.href}`)
      return
    }
    const normalizedHref = normalizeHref(item.href)
    const itemAnchors = (info.opf.fileAnchors && info.opf.fileAnchors.get(normalizedHref)) || []
    const h1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || ''
    const fallbackTitle = cleanTitle(info.opf.tocTitleMap.get(normalizedHref) || '') || tagText(html, 'title') || cleanTitle(h1) || `第 ${chapterIndex + 1} 章`

    if (itemAnchors.length > 0) {
      const bodyHtml = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html
      const splitPoints = []
      for (const anc of itemAnchors) {
        const escapedFragment = anc.fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const anchorRe = new RegExp(`<[^>]*(?:name|id)=["']${escapedFragment}["'][^>]*>`, 'i')
        const m = bodyHtml.match(anchorRe)
        if (m) splitPoints.push({ pos: m.index, title: anc.title, fragment: anc.fragment })
      }
      splitPoints.sort((a, b) => a.pos - b.pos)
      if (fallbackTitle && splitPoints.length > 0 && splitPoints[0].pos > 0) {
        splitPoints.unshift({ pos: 0, title: fallbackTitle })
      }

      if (splitPoints.length > 0) {
        for (let i = 0; i < splitPoints.length; i++) {
          const start = splitPoints[i].pos
          const end = i + 1 < splitPoints.length ? splitPoints[i + 1].pos : bodyHtml.length
          const chunk = bodyHtml.slice(start, end)
          planChapter(splitPoints[i].title, item, chunk, splitPoints[i].fragment || '')
        }
        return
      }

      info.warnings.push(`章节锚点未匹配，已按完整章节导入：${item.href}`)
    } else {
      planChapter(fallbackTitle, item, html)
      return
    }

    planChapter(fallbackTitle, item, html)
  })

  const links = new Map()
  for (const chapter of plannedChapters) {
    const href = normalizeHref(chapter.item.href)
    const local = `./${chapter.fileName}`
    if (!links.has(href)) links.set(href, local)
    if (chapter.fragment) links.set(`${href}#${chapter.fragment}`, local)
  }
  for (const chapter of plannedChapters) {
    const md = htmlToMarkdown(chapter.html, assets, chapter.item.href, links)
    writeFileSync(chapter.targetPath, md || `# ${chapter.title}\n`, 'utf8')
  }

  info.chapterCount = chapters.length
  writeIndex(tempDir, info.title, info.desc, chapters)
}

function copyBuffer(buffer, target) {
  writeFileSync(target, buffer)
}

function preview(info, targetDir) {
  console.log('导入预览')
  console.log(`- 类型：${info.kind === 'epub' ? 'EPUB' : 'Markdown 文件夹'}`)
  console.log(`- 书名：${info.title}`)
  console.log(`- slug：${info.slug}`)
  console.log(`- 章节数量：${info.chapterCount}`)
  console.log(`- 目标路径：${targetDir}`)
  if (info.warnings.length > 0) {
    console.log('- 可疑项：')
    for (const warning of info.warnings) console.log(`  - ${warning}`)
  } else {
    console.log('- 可疑项：无')
  }
}

function updateBooks(info) {
  const books = readJson(booksPath, [])
  const next = books.filter(book => book.slug !== info.slug)
  next.push({
    slug: info.slug,
    title: info.title,
    desc: info.desc,
    category: info.kind === 'epub' ? 'ebook' : 'booklet',
  })
  writeJson(booksPath, next)
}

function commitTarget(tempDir, targetDir, force) {
  let backupDir = ''
  if (existsSync(targetDir)) {
    if (!force) throw new Error(`目标书籍已存在：${targetDir}。如需覆盖，请显式传入 --force。`)
    backupDir = `${targetDir}.backup-${Date.now()}`
    renameSync(targetDir, backupDir)
  }
  try {
    try {
      renameSync(tempDir, targetDir)
    } catch (error) {
      if (error && (error.code === 'EPERM' || error.code === 'EXDEV')) {
        cpSync(tempDir, targetDir, { recursive: true })
        rmSync(tempDir, { recursive: true, force: true })
      } else {
        throw error
      }
    }
    if (backupDir) rmSync(backupDir, { recursive: true, force: true })
  } catch (error) {
    if (backupDir && existsSync(backupDir) && !existsSync(targetDir)) renameSync(backupDir, targetDir)
    throw error
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.input) {
    console.log(usage())
    return
  }

  const inputPath = resolve(args.input)
  if (!existsSync(inputPath)) throw new Error(`输入路径不存在：${inputPath}`)

  const stat = statSync(inputPath)
  let info
  if (stat.isDirectory()) {
    info = detectMarkdownFolder(inputPath, args)
  } else if (stat.isFile() && extname(inputPath).toLowerCase() === '.epub') {
    info = detectEpub(inputPath, args)
  } else {
    throw new Error('仅支持 Markdown 文件夹或 EPUB 文件。')
  }

  const targetDir = join(docsBooksDir, info.slug)
  preview(info, targetDir)

  if (existsSync(targetDir) && !args.force) {
    throw new Error(`目标书籍已存在：${targetDir}。如需覆盖，请显式传入 --force。`)
  }
  if (args.dryRun) return

  const tempParent = mkdtempSync(join(docsBooksDir, `.import-${info.slug}-`))
  const tempDir = join(tempParent, info.slug)
  mkdirSync(tempDir)

  try {
    if (info.kind === 'markdown') importMarkdownFolder(inputPath, tempDir, info)
    else importEpub(tempDir, info)

    commitTarget(tempDir, targetDir, args.force)
    rmSync(tempParent, { recursive: true, force: true })
    updateBooks(info)
    updateSidebarForBook(info)
    console.log('导入完成。')
  } catch (error) {
    rmSync(tempParent, { recursive: true, force: true })
    throw error
  }
}

export {
  cleanTitle,
  normalizeHref,
  parseNavDocToc,
  parseNcxToc,
  parseOpf,
  importEpub,
  safeFileName,
  titleFileSegment,
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
