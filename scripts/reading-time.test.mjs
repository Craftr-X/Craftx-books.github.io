import test from 'node:test'
import assert from 'node:assert/strict'
import {
  stripMarkdown,
  countChars,
  estimateMinutes,
  formatDuration,
  CHARS_PER_MINUTE,
} from './reading-time-core.mjs'

// ===== stripMarkdown 噪声剔除 =====

test('stripMarkdown 移除 frontmatter', () => {
  const text = '---\ntitle: 测试\n---\n正文内容'
  assert.equal(stripMarkdown(text), '正文内容')
})

test('stripMarkdown 移除围栏代码块（反引号）', () => {
  const text = '前文\n```js\nconst x = 1\n```\n后文'
  assert.equal(stripMarkdown(text), '前文后文')
})

test('stripMarkdown 移除围栏代码块（波浪号）', () => {
  const text = '前文\n~~~js\nconst x = 1\n~~~\n后文'
  assert.equal(stripMarkdown(text), '前文后文')
})

test('stripMarkdown 移除行内代码', () => {
  const text = '使用 `npm install` 安装依赖'
  assert.equal(stripMarkdown(text), '使用安装依赖')
})

test('stripMarkdown 移除图片，保留 alt 文本不计数', () => {
  const text = '![示意图](https://example.com/a.png)正文'
  assert.equal(stripMarkdown(text), '正文')
})

test('stripMarkdown 链接保留文字、丢弃 URL', () => {
  const text = '参见[官方文档](https://example.com)即可'
  assert.equal(stripMarkdown(text), '参见官方文档即可')
})

test('stripMarkdown 移除 HTML 标签，保留内部文本', () => {
  const text = '前文<span class="x">高亮</span>后文'
  assert.equal(stripMarkdown(text), '前文高亮后文')
})

test('stripMarkdown 移除标题井号', () => {
  const text = '## 标题\n### 子标题'
  assert.equal(stripMarkdown(text), '标题子标题')
})

test('stripMarkdown 移除列表标记', () => {
  const text = '- 第一项\n1. 第二项'
  assert.equal(stripMarkdown(text), '第一项第二项')
})

test('stripMarkdown 移除表格竖线，保留单元格内容', () => {
  const text = '| 名称 | 数值 |\n| --- | --- |\n| a | 1 |'
  assert.equal(stripMarkdown(text), '名称数值a1')
})

test('stripMarkdown 移除强调与删除线符号', () => {
  const text = '**加粗** _斜体_ ~~删除~~'
  assert.equal(stripMarkdown(text), '加粗斜体删除')
})

test('stripMarkdown 空字符串返回空', () => {
  assert.equal(stripMarkdown(''), '')
})

test('stripMarkdown 纯英文也正常剥离', () => {
  const text = '## Hello World\nUse `code` to run.'
  const result = stripMarkdown(text)
  // 行内代码 `code` 整体移除；句末 . 不在代码内，保留
  assert.equal(result, 'HelloWorldUsetorun.')
})

// ===== countChars =====

test('countChars 对纯文本返回字符数', () => {
  assert.equal(countChars('你好世界'), 4)
})

test('countChars 剥离后再计数', () => {
  const text = '![图](x.png)[链接](y.com)代码`code`'
  assert.equal(countChars(text), '链接代码'.length)
})

// ===== estimateMinutes =====

test('estimateMinutes 速度常数符合预期', () => {
  assert.equal(CHARS_PER_MINUTE, 500)
})

test('estimateMinutes 空文本返回 0 分钟', () => {
  assert.equal(estimateMinutes(''), 0)
})

test('estimateMinutes 短文本最低 1 分钟', () => {
  assert.equal(estimateMinutes('短文'), 1)
})

test('estimateMinutes 校准值：约 2500 字 → 5 分钟', () => {
  // 2500 字 / 500 = 5
  const text = '字'.repeat(2500)
  assert.equal(estimateMinutes(text), 5)
})

test('estimateMinutes 接受数字入参（已剥离的字符数）', () => {
  assert.equal(estimateMinutes(2500), 5)
  assert.equal(estimateMinutes(2501), 5) // round(5.002) = 5
})

test('estimateMinutes 支持自定义速度', () => {
  assert.equal(estimateMinutes(600, 300), 2)
})

// ===== formatDuration =====

test('formatDuration 0 分钟兜底为约 1 分钟', () => {
  assert.equal(formatDuration(0), '约 1 分钟')
})

test('formatDuration 小于 60 分钟显示分钟', () => {
  assert.equal(formatDuration(5), '约 5 分钟')
})

test('formatDuration 59 分钟边界显示分钟', () => {
  assert.equal(formatDuration(59), '约 59 分钟')
})

test('formatDuration 60 分钟边界显示小时', () => {
  assert.equal(formatDuration(60), '约 1 小时')
})

test('formatDuration 125 分钟显示小时加分', () => {
  assert.equal(formatDuration(125), '约 2 小时 5 分')
})

test('formatDuration 整小时省略分钟', () => {
  assert.equal(formatDuration(120), '约 2 小时')
})
