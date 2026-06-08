import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const root = join(process.cwd(), 'docs')
const openToken = '{\u200b{'
const closeToken = '}\u200b}'

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, out)
    } else if (extname(full) === '.md') {
      out.push(full)
    }
  }
}

function transform(text) {
  return text
    .replaceAll('&#123;&#123;', openToken)
    .replaceAll('&#125;&#125;', closeToken)
    .replaceAll('{{', openToken)
    .replaceAll('}}', closeToken)
}

const targets = []
walk(root, targets)

for (const file of targets) {
  const input = readFileSync(file, 'utf8')
  const output = transform(input)
  if (output !== input) {
    writeFileSync(file, output, 'utf8')
  }
}
