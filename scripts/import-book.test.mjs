import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cleanTitle,
  importEpub,
  lintFixBook,
  normalizeHref,
  parseNavDocToc,
  parseNcxToc,
  parseOpf,
  safeFileName,
  titleFileSegment,
} from './import-book.mjs'

test('parses EPUB3 nav toc titles by normalized href', () => {
  const toc = parseNavDocToc(`
    <html><body>
      <nav epub:type="toc">
        <ol>
          <li><a href="../Text/chapter-01.xhtml#top">实践论</a></li>
          <li><a href="../Text/chapter-02.xhtml">矛盾论</a></li>
          <li><a href="../Text/chapter-02.xhtml#note">重复锚点不覆盖</a></li>
        </ol>
      </nav>
    </body></html>
  `, 'OPS/nav/nav.xhtml')

  assert.equal(toc.get('OPS/Text/chapter-01.xhtml'), '实践论')
  assert.equal(toc.get('OPS/Text/chapter-02.xhtml'), '矛盾论')
})

test('parses EPUB2 NCX toc titles by normalized href', () => {
  const toc = parseNcxToc(`
    <ncx>
      <navMap>
        <navPoint>
          <navLabel><text>第一卷</text></navLabel>
          <content src="Text/vol1.xhtml#toc"/>
          <navPoint>
            <navLabel><text>中国社会各阶级的分析</text></navLabel>
            <content src="Text/chapter-001.xhtml"/>
          </navPoint>
        </navPoint>
      </navMap>
    </ncx>
  `, 'OPS/toc.ncx')

  assert.equal(toc.toc.get('OPS/Text/vol1.xhtml'), '第一卷')
  assert.equal(toc.toc.get('OPS/Text/chapter-001.xhtml'), '中国社会各阶级的分析')
  assert.deepEqual(toc.anchors.get('OPS/Text/vol1.xhtml'), [{ fragment: 'toc', title: '第一卷' }])
})

test('imports EPUB spine files split by NCX anchors', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'import-book-anchor-'))
  try {
    const info = {
      title: '锚点书',
      desc: '测试',
      warnings: [],
      entries: new Map([
        ['OPS/Text/vol.xhtml', Buffer.from(`
          <html><body>
            <p><a href="vol.xhtml#chapter-two">跳到第二章</a></p>
            <p>卷首内容</p>
            <h2 id="chapter-one">第一章</h2><p>第一章正文</p>
            <h2 name="chapter-two">第二章</h2><p>第二章正文</p>
          </body></html>
        `)],
      ]),
      opf: {
        manifest: new Map(),
        spine: [{ href: 'OPS/Text/vol.xhtml' }],
        tocTitleMap: new Map([['OPS/Text/vol.xhtml', '卷首']]),
        fileAnchors: new Map([[
          'OPS/Text/vol.xhtml',
          [
            { fragment: 'chapter-one', title: '第一章' },
            { fragment: 'chapter-two', title: '第二章' },
          ],
        ]]),
      },
    }

    importEpub(tempDir, info)

    const files = readdirSync(tempDir).filter(file => file.endsWith('.md')).sort()
    assert.deepEqual(files, ['01-卷首.md', '02-第一章.md', '03-第二章.md', 'index.md'])
    assert.match(readFileSync(join(tempDir, '01-卷首.md'), 'utf8'), /\[跳到第二章\]\(\.\/03-第二章\.md\)/)
    assert.match(readFileSync(join(tempDir, '02-第一章.md'), 'utf8'), /第一章正文/)
    assert.match(readFileSync(join(tempDir, '03-第二章.md'), 'utf8'), /第二章正文/)
    assert.equal(info.chapterCount, 3)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('imports full EPUB spine file when NCX anchors are missing in HTML', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'import-book-missing-anchor-'))
  try {
    const info = {
      title: '缺失锚点书',
      desc: '测试',
      warnings: [],
      entries: new Map([
        ['OPS/Text/vol.xhtml', Buffer.from('<html><body><p>完整正文</p></body></html>')],
      ]),
      opf: {
        manifest: new Map(),
        spine: [{ href: 'OPS/Text/vol.xhtml' }],
        tocTitleMap: new Map([['OPS/Text/vol.xhtml', '完整章节']]),
        fileAnchors: new Map([[
          'OPS/Text/vol.xhtml',
          [{ fragment: 'missing-anchor', title: '不会匹配' }],
        ]]),
      },
    }

    importEpub(tempDir, info)

    const files = readdirSync(tempDir).filter(file => file.endsWith('.md')).sort()
    assert.deepEqual(files, ['01-完整章节.md', 'index.md'])
    assert.match(readFileSync(join(tempDir, '01-完整章节.md'), 'utf8'), /完整正文/)
    assert.match(info.warnings.join('\n'), /章节锚点未匹配/)
    assert.equal(info.chapterCount, 1)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('cleans noisy titles and keeps Chinese punctuation', () => {
  assert.equal(cleanTitle('<a class="zy" href="#id1">1</a>'), '')
  assert.equal(cleanTitle('chapter-118'), '')
  assert.equal(cleanTitle('&#x5b9e;&#36341;&#35770;（一九三七年七月）'), '实践论（一九三七年七月）')
  assert.equal(titleFileSegment('中国革命战争的战略问题（一九三六年十二月）'), '中国革命战争的战略问题（一九三六年十二月）')
})

test('normalizes hrefs and creates title-based filenames', () => {
  assert.equal(normalizeHref('../Text/a.xhtml?id=1#x', 'OPS/nav'), 'OPS/Text/a.xhtml')
  const used = new Set()
  assert.equal(safeFileName(0, '实践论', used), '01-实践论.md')
  assert.equal(safeFileName(1, '', used), '02-chapter-02.md')
})

test('parseOpf prefers nav toc titles while preserving spine order', () => {
  const entries = new Map([
    ['META-INF/container.xml', Buffer.from('<container><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>')],
    ['OPS/content.opf', Buffer.from(`
      <package>
        <metadata><dc:title>测试书</dc:title><dc:creator>作者</dc:creator></metadata>
        <manifest>
          <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
          <item id="chap1" href="Text/c1.xhtml" media-type="application/xhtml+xml"/>
          <item id="chap2" href="Text/c2.xhtml" media-type="application/xhtml+xml"/>
        </manifest>
        <spine>
          <itemref idref="chap2"/>
          <itemref idref="chap1"/>
        </spine>
      </package>
    `)],
    ['OPS/nav.xhtml', Buffer.from(`
      <nav epub:type="toc">
        <ol>
          <li><a href="Text/c1.xhtml">第一章</a></li>
          <li><a href="Text/c2.xhtml">第二章</a></li>
        </ol>
      </nav>
    `)],
  ])

  const opf = parseOpf(entries)
  assert.deepEqual(opf.spine.map(item => item.href), ['OPS/Text/c2.xhtml', 'OPS/Text/c1.xhtml'])
  assert.equal(opf.tocTitleMap.get('OPS/Text/c1.xhtml'), '第一章')
  assert.equal(opf.tocTitleMap.get('OPS/Text/c2.xhtml'), '第二章')
})

test('parseOpf falls back to spine when no toc exists', () => {
  const entries = new Map([
    ['META-INF/container.xml', Buffer.from('<container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>')],
    ['content.opf', Buffer.from(`
      <package>
        <metadata><dc:title>无目录书</dc:title></metadata>
        <manifest><item id="chap1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest>
        <spine><itemref idref="chap1"/></spine>
      </package>
    `)],
  ])

  const opf = parseOpf(entries)
  assert.deepEqual(opf.spine.map(item => item.href), ['c1.xhtml'])
  assert.equal(opf.tocTitleMap.size, 0)
})

test('lintFixBook folds consecutive blank lines and surrounds headings with blanks', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const testDir = join(repoRoot, `.import-lint-test-${process.pid}-${Date.now()}`)
  mkdirSync(join(testDir, 'sub'), { recursive: true })
  const md = join(testDir, 'sub', '01-测试.md')
  // 连续空行(MD012) + 标题下方缺空行(MD022) —— EPUB/掘金源最常漏的两类
  writeFileSync(md, '# 标题\n段落一\n\n\n\n段落二\n')
  try {
    lintFixBook(testDir)
    const fixed = readFileSync(md, 'utf8')
    assert.ok(!/\n{3,}/.test(fixed), '连续空行应被折叠为最多 1 个空行（MD012）')
    assert.match(fixed, /# 标题\n\n/, '标题下方应补空行（MD022）')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
})
