import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { dirname, extname, join } from 'path'

const root = join(process.cwd(), 'docs')

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

function localAssetExists(file, assetPath) {
  return existsSync(join(dirname(file), assetPath))
}

function normalize(file, input) {
  let output = input

  output = output.replace(
    /!?\[([^\]]*)\]\((_assets\/[^)]+)\)/g,
    (match, alt, assetPath) => {
      if (localAssetExists(file, assetPath)) return match
      return `[${alt || '缺失资源'}：${assetPath}]`
    },
  )

  output = output.replace(
    /<audio\s+controls\s+src="(_assets\/[^"]+)"\s*><\/audio>/g,
    (match, assetPath) => {
      if (localAssetExists(file, assetPath)) return match
      return ''
    },
  )

  return output
}

const files = []
walk(root, files)

for (const file of files) {
  const input = readFileSync(file, 'utf8')
  const output = normalize(file, input)
  if (output !== input) {
    writeFileSync(file, output, 'utf8')
  }
}
