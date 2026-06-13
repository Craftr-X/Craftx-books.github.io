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

function existingTextByLink(sidebarEntry) {
  const map = new Map()
  for (const section of sidebarEntry || []) {
    for (const item of section.items || []) {
      if (item.link && item.text) map.set(item.link, item.text)
    }
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
    const items = walkMarkdown(bookDir)
      .sort(sortMarkdown)
      .filter(sidebarVisible)
      .map(file => {
        const link = toLink(docsBooksDir, book.slug, file)
        return {
          text: displayTextForLink(book, link, existingTexts.get(link) || titleFromMarkdown(file)),
          link,
        }
      })

    sidebar[key] = [
      {
        text: book.title,
        items,
      },
    ]
  }

  for (const key of Object.keys(sidebar)) {
    if (key.startsWith('/books/') && !activeBookKeys.has(key)) {
      delete sidebar[key]
    }
  }

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')
  return sidebar
}

export function updateSidebarForBook(book, options = {}) {
  const root = options.root || defaultRoot
  const { docsBooksDir, sidebarPath } = pathsFor(root)
  const bookDir = join(docsBooksDir, book.slug)
  if (!existsSync(bookDir)) throw new Error(`书籍目录不存在：${bookDir}`)

  const sidebar = readJson(sidebarPath, {})
  const items = walkMarkdown(bookDir)
    .sort(sortMarkdown)
    .filter(sidebarVisible)
    .map(file => ({
      link: toLink(docsBooksDir, book.slug, file),
    }))
    .map(item => ({
      text: displayTextForLink(book, item.link, titleFromMarkdown(`${item.link}.md`)),
      link: item.link,
    }))

  sidebar[`/books/${book.slug}/`] = [
    {
      text: book.title,
      items,
    },
  ]

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateSidebar()
}

export { generateSidebar }
