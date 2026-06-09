import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanTitle,
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

  assert.equal(toc.get('OPS/Text/vol1.xhtml'), '第一卷')
  assert.equal(toc.get('OPS/Text/chapter-001.xhtml'), '中国社会各阶级的分析')
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
