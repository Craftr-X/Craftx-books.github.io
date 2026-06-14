import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const displayTextByBookAndLink = {
  'renzhi-qudong': new Map([
    ['/books/renzhi-qudong/02-扉页', '扉页'],
    ['/books/renzhi-qudong/03-版权信息', '版权信息'],
    ['/books/renzhi-qudong/06-前言-为什么我们很努力却总是看不到希望', '前言'],
    ['/books/renzhi-qudong/07-上篇-做成一件事的心法', '上篇　做成一件事的心法'],
    ['/books/renzhi-qudong/08-第一章-价值——改变自己的关键是创造价值', '01-第一章-价值——改变自己的关键是创造价值'],
    ['/books/renzhi-qudong/09-第一节-复制：不要浪费生命给你的无限可能', '02-第一节-复制：不要浪费生命给你的无限可能'],
    ['/books/renzhi-qudong/10-第二节-价值：用价值规律看问题，你的人生会发生巨变', '03-第二节-价值：用价值规律看问题，你的人生会发生巨变'],
    ['/books/renzhi-qudong/11-第三节-利他：毋庸置疑，利他是最好的人生', '04-第三节-利他：毋庸置疑，利他是最好的人生'],
    ['/books/renzhi-qudong/12-第四节-镜子：所有的社交都是一面镜子', '05-第四节-镜子：所有的社交都是一面镜子'],
    ['/books/renzhi-qudong/13-第五节-内向：被动社交，内向成长者的制胜之道', '06-第五节-内向：被动社交，内向成长者的制胜之道'],
    ['/books/renzhi-qudong/14-第二章-身份——一切从信念开始', '07-第二章-身份——一切从信念开始'],
    ['/books/renzhi-qudong/15-第一节-层次：你在这个世界的哪一层', '08-第一节-层次：你在这个世界的哪一层'],
    ['/books/renzhi-qudong/16-第二节-身份：改变自己的终极力量', '09-第二节-身份：改变自己的终极力量'],
    ['/books/renzhi-qudong/17-第三节-语言：美好人生从好好说话开始', '10-第三节-语言：美好人生从好好说话开始'],
    ['/books/renzhi-qudong/18-第四节-理性：成功，最怕一开始就对自己说不可能', '11-第四节-理性：成功，最怕一开始就对自己说不可能'],
    ['/books/renzhi-qudong/19-第三章-心理——清除成事路上的情绪障碍', '12-第三章-心理——清除成事路上的情绪障碍'],
    ['/books/renzhi-qudong/20-第一节-负面偏好：为什么你总是不快乐', '13-第一节-负面偏好：为什么你总是不快乐'],
    ['/books/renzhi-qudong/21-第二节-二元对立：恭喜你走出二元对立，来到真正的成人世界', '14-第二节-二元对立：恭喜你走出二元对立，来到真正的成人世界'],
    ['/books/renzhi-qudong/22-第三节-一劳永逸：想要一劳永逸？还是死了这条心吧', '15-第三节-一劳永逸：想要一劳永逸？还是死了这条心吧'],
    ['/books/renzhi-qudong/23-下篇-做成一件事的技法', '下篇　做成一件事的技法'],
    ['/books/renzhi-qudong/24-第四章-策略——方法和路径', '16-第四章-策略——方法和路径'],
    ['/books/renzhi-qudong/25-第一节-认知驱动：做一个真正的长期主义者', '17-第一节-认知驱动：做一个真正的长期主义者'],
    ['/books/renzhi-qudong/26-第二节-写下来：我们都低估了“写下来”的力量', '18-第二节-写下来：我们都低估了“写下来”的力量'],
    ['/books/renzhi-qudong/27-第三节-假设：什么能力可以让自己快速进步', '19-第三节-假设：什么能力可以让自己快速进步'],
    ['/books/renzhi-qudong/28-第四节-降低期待：命运一定钟爱那些愿意慢慢变好的人', '20-第四节-降低期待：命运一定钟爱那些愿意慢慢变好的人'],
    ['/books/renzhi-qudong/29-第五节-深度练习：跨越从普通到卓越的分水岭', '21-第五节-深度练习：跨越从普通到卓越的分水岭'],
    ['/books/renzhi-qudong/30-第六节-跨界：如果你想与众不同，不妨试着跨界潜行', '22-第六节-跨界：如果你想与众不同，不妨试着跨界潜行'],
    ['/books/renzhi-qudong/31-第五章-战略——环境与多维', '23-第五章-战略——环境与多维'],
    ['/books/renzhi-qudong/32-第一节-环境：真相扎心了，“偷懒”比努力更重要', '24-第一节-环境：真相扎心了，“偷懒”比努力更重要'],
    ['/books/renzhi-qudong/33-第二节-多维：不读书的人，没什么好焦虑的', '25-第二节-多维：不读书的人，没什么好焦虑的'],
    ['/books/renzhi-qudong/34-第六章-成事——做到，是最高等级的成长', '26-第六章-成事——做到，是最高等级的成长'],
    ['/books/renzhi-qudong/35-第一节-目标觉醒：如何找到自己的人生目标', '27-第一节-目标觉醒：如何找到自己的人生目标'],
    ['/books/renzhi-qudong/36-第二节-成事之旅：如何达成自己的人生目标', '28-第二节-成事之旅：如何达成自己的人生目标'],
    ['/books/renzhi-qudong/37-结语-顶级的生活不是奢华，而是创造', '结语'],
    ['/books/renzhi-qudong/38-后记-你的一生至少要主动做成一件对他人很有用的事', '后记　你的一生至少要主动做成一件对他人很有用的事'],
    ['/books/renzhi-qudong/39-参考文献', '参考文献'],
  ]),
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function walkMarkdown(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkMarkdown(full, out)
    } else if (extname(entry).toLowerCase() === '.md' && entry.toLowerCase() !== 'index.md') {
      out.push(full)
    }
  }
  return out
}

function titleFromMarkdown(file) {
  return basename(file, '.md').replace(/^\d+-/, '')
}

function sidebarVisible(file) {
  const content = readFileSync(file, 'utf8')
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatter) return true
  return !/^sidebar:\s*false\s*$/m.test(frontmatter[1])
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

function toLink(docsBooksDir, slug, file) {
  const rel = relative(join(docsBooksDir, slug), file)
  const withoutExt = rel.slice(0, -extname(rel).length).split(sep).join('/')
  return `/books/${slug}/${withoutExt}`
}

/**
 * 递归收集一个 sidebar 节点树下的所有叶子 item（带 link 的项）。
 * 用于兼容扁平结构与 collapsible 分组结构。
 */
function collectLeafItems(nodes) {
  const out = []
  for (const node of nodes || []) {
    if (node.link) {
      out.push(node)
    } else if (node.items) {
      out.push(...collectLeafItems(node.items))
    }
  }
  return out
}

/**
 * 折叠分组阈值与每组大小。
 * 章节数超过 GROUP_THRESHOLD 才分组；每组 GROUP_SIZE 章。
 */
const GROUP_THRESHOLD = 20
const GROUP_SIZE = 10

/**
 * 从章节 link 中提取数字前缀（如 /books/x/02-标题 → 2）；无前缀返回 -1。
 */
function numericPrefixFromLink(link) {
  const segment = (link || '').split('/').pop() || ''
  const m = segment.match(/^(\d+)/)
  return m ? Number(m[1]) : -1
}

/**
 * 把扁平的章节 items 按数字前缀每 GROUP_SIZE 章分一组，生成 collapsible 分组结构。
 * 仅当 items 数 > GROUP_THRESHOLD 时分组，否则原样返回（保持短书扁平）。
 *
 * 分组策略：
 *  - 有数字前缀的章节按前缀分组：前缀 1-10 一组、11-20 一组……
 *  - 无数字前缀的章节（如「开篇词」「书名页」）归入最前的「其他」组
 *  - 每组最多 GROUP_SIZE 个章节；不足 GROUP_SIZE 的尾组按实际数量命名
 */
function groupByDecade(items) {
  if (items.length <= GROUP_THRESHOLD) return items

  const buckets = []
  const others = []
  for (const item of items) {
    const prefix = numericPrefixFromLink(item.link)
    if (prefix < 0) {
      others.push(item)
    } else {
      const idx = Math.floor((prefix - 1) / GROUP_SIZE)
      if (!buckets[idx]) buckets[idx] = []
      buckets[idx].push(item)
    }
  }

  const groups = []
  if (others.length > 0) {
    groups.push({
      text: '其他',
      collapsible: true,
      collapsed: false,
      items: others,
    })
  }
  for (let i = 0; i < buckets.length; i += 1) {
    if (!buckets[i] || buckets[i].length === 0) continue
    const start = i * GROUP_SIZE + 1
    const end = start + GROUP_SIZE - 1
    groups.push({
      text: `第 ${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')} 章`,
      collapsible: true,
      collapsed: true,
      items: buckets[i],
    })
  }
  return groups
}

/**
 * 构建单本书的扁平章节 items（未分组）。
 * 抽取自 generateSidebar / updateSidebarForBook，避免分组逻辑修改时两处不同步。
 *
 * @param docsBooksDir docs/books 绝对路径
 * @param book 书籍元数据（含 slug/title）
 * @param existingTexts 可选：旧 sidebar 的 link→text 映射，用于保留已存在的显示文本
 * @returns 扁平的 [{text, link}]（未分组；分组由调用方按需用 groupByDecade 处理）
 */
function buildBookItems(docsBooksDir, book, existingTexts) {
  const bookDir = join(docsBooksDir, book.slug)
  return walkMarkdown(bookDir)
    .sort(sortMarkdown)
    .filter(sidebarVisible)
    .map(file => {
      const link = toLink(docsBooksDir, book.slug, file)
      const fallback = (existingTexts && existingTexts.get(link)) || titleFromMarkdown(file)
      return {
        text: displayTextForLink(book, link, fallback),
        link,
      }
    })
}

function existingTextByLink(sidebarEntry) {
  const map = new Map()
  for (const node of collectLeafItems(sidebarEntry || [])) {
    if (node.link && node.text) map.set(node.link, node.text)
  }
  return map
}

function displayTextForLink(book, link, fallback) {
  return displayTextByBookAndLink[book.slug]?.get(link) || fallback
}

function pathsFor(root) {
  return {
    docsBooksDir: join(root, 'docs', 'books'),
    booksPath: join(root, 'books.json'),
    sidebarPath: join(root, 'sidebar-generated.json'),
  }
}

/**
 * 目录区块标题（兼容历史样式 ## 📖 目录），统一重写为 ## 目录。
 */
const TOC_HEADING_RE = /^## (📖\s*)?目录\s*$/m

/**
 * 从 index.md 现有目录区块抽取 segment → {order, text} 映射。
 * - order：在该区块中出现的序号，用于保留用户手写的章节顺序
 * - text：手写的显示文本，优先于 sidebar 的自动文本
 */
function existingEntriesBySegment(content) {
  const map = new Map()
  const linkRe = /^-\s+\[([^\]]*)\]\(([^)]+)\)/gm
  let m
  let order = 0
  while ((m = linkRe.exec(content)) !== null) {
    const key = m[2].replace(/^\.\//, '').replace(/\.md$/, '')
    if (!map.has(key)) {
      map.set(key, { order: order += 1, text: m[1] })
    }
  }
  return map
}

/**
 * 幂等重写单本书 index.md 的「## 目录」区块。
 * - 只重写该区块（## 目录 / ## 📖 目录 到下一个 ## 之间），保留 frontmatter 和其他内容
 * - 章节顺序：沿用 index.md 现有顺序；新增章节（不在 index.md 里的）追加到末尾
 * - 显示文本优先级：index.md 现有手写文本 > sidebar items 的 text
 * - 若 index.md 没有目录区块，跳过（不破坏手写结构）
 * 返回 true 表示文件被修改，false 表示无变化。
 */
function regenerateBookIndex(root, slug, items) {
  const indexPath = join(root, 'docs', 'books', slug, 'index.md')
  if (!existsSync(indexPath)) return false
  const original = readFileSync(indexPath, 'utf8')
  const match = original.match(TOC_HEADING_RE)
  if (!match) return false

  const lines = original.split('\n')
  let startIdx = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (TOC_HEADING_RE.test(lines[i])) {
      startIdx = i
      break
    }
  }
  if (startIdx === -1) return false

  // 找下一个 ## 标题作为区块结束（排除 split 产生的末尾空串）
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      endIdx = i
      break
    }
  }
  // 收集区块后的剩余内容（trim 掉纯空行元素）
  const trailing = lines.slice(endIdx).filter(l => l !== '')
  // 区块内（startIdx 到 endIdx，含标题）的现有顺序与文本
  const blockContent = lines.slice(startIdx, endIdx).join('\n')
  const existing = existingEntriesBySegment(blockContent)

  // 按现有顺序排在前；新增章节（不在 index.md 里的）按 sidebar 顺序追加
  const segmentOf = (item) => (item.link || '').split(`/books/${slug}/`)[1] || ''
  const ordered = [...items].sort((a, b) => {
    const sa = segmentOf(a)
    const sb = segmentOf(b)
    const oa = existing.get(sa)?.order
    const ob = existing.get(sb)?.order
    if (oa !== undefined && ob !== undefined) return oa - ob
    if (oa !== undefined) return -1
    if (ob !== undefined) return 1
    return 0 // 都不在 index.md：保持 sidebar 原序
  })

  const newBlock = ['## 目录', '']
  for (const item of ordered) {
    const segment = segmentOf(item)
    const key = segment.replace(/\.md$/, '')
    const text = existing.get(key)?.text ?? item.text ?? ''
    newBlock.push(`- [${text}](./${segment}.md)`)
  }

  const next = [
    ...lines.slice(0, startIdx),
    ...newBlock,
    // 区块后若还有内容，补一个空行分隔
    ...(trailing.length > 0 ? ['', ...trailing] : []),
  ]
  const updated = `${next.join('\n')}\n`
  if (updated === original) return false
  writeFileSync(indexPath, updated, 'utf8')
  return true
}

function generateSidebar(options = {}) {
  const root = options.root || defaultRoot
  const { docsBooksDir, booksPath, sidebarPath } = pathsFor(root)
  const books = readJson(booksPath, [])
  const sidebar = readJson(sidebarPath, {})
  const activeBookKeys = new Set()

  for (const book of books) {
    const bookDir = join(docsBooksDir, book.slug)
    if (!existsSync(bookDir)) continue
    const key = `/books/${book.slug}/`
    activeBookKeys.add(key)

    const existingTexts = existingTextByLink(sidebar[key])
    const items = buildBookItems(docsBooksDir, book, existingTexts)

    sidebar[key] = [
      {
        text: book.title,
        collapsible: true,
        items: groupByDecade(items),
      },
    ]
  }

  for (const key of Object.keys(sidebar)) {
    if (key.startsWith('/books/') && !activeBookKeys.has(key)) {
      delete sidebar[key]
    }
  }

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')

  // 幂等刷新各书 index.md 的目录区块。
  // 注意：index.md 用扁平的完整章节列表（书首页是阅读入口，不折叠），
  // 即便 sidebar 已分了 collapsible 组，这里也要拍平传给 index.md。
  for (const book of books) {
    const entry = sidebar[`/books/${book.slug}/`]
    const flatItems = collectLeafItems(entry?.[0] ? [entry[0]] : [])
    regenerateBookIndex(root, book.slug, flatItems)
  }

  return sidebar
}

export function updateSidebarForBook(book, options = {}) {
  const root = options.root || defaultRoot
  const { docsBooksDir, sidebarPath } = pathsFor(root)
  const bookDir = join(docsBooksDir, book.slug)
  if (!existsSync(bookDir)) throw new Error(`书籍目录不存在：${bookDir}`)

  const sidebar = readJson(sidebarPath, {})
  const items = buildBookItems(docsBooksDir, book)

  sidebar[`/books/${book.slug}/`] = [
    {
      text: book.title,
      collapsible: true,
      items: groupByDecade(items),
    },
  ]

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateSidebar()
}

export { generateSidebar, regenerateBookIndex, collectLeafItems }
