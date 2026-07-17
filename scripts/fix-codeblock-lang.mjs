// 给 docs/books 下没有语言标识的围栏代码块（markdownlint MD040）推断并补全语言。
//
// 为什么需要它：EPUB / 掘金源迁移进来的代码块常不带 info string（即 ``` 后无语言），
// VitePress 因此无法做语法高亮。本脚本按代码块内容逐块推断语言，能识别代码的标真实
// 语言（bash / java / c / sql / typescript / dockerfile ...），识别不了的（二进制示意、
// 文件树、配置、散文）统一标 text，既满足 MD040 又不产生错误高亮。
//
// 用法：
//   node scripts/fix-codeblock-lang.mjs --dry-run   # 只打印每本书的推断分布与样本，不写文件
//   node scripts/fix-codeblock-lang.mjs             # 写回改动
//
// 设计：围栏位置由 markdownlint 的 MD040 权威判定（避免朴素行扫描把缩进代码块里的 ```
// 误判为围栏而污染内容）；语言推断自包含在 detectLang 里，便于单测。

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, sep, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lint } from "markdownlint/promise";

const normSep = (f) => f.split(sep).join("/");

/** 递归收集目录下的 .md 文件，跳过依赖/构建产物目录。 */
export function walkMd(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (["node_modules", "dist", ".git", ".vitepress"].includes(e)) continue;
    const p = join(dir, e);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walkMd(p, out);
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

/**
 * 按代码块内容推断语言。返回 prism/VitePress 可识别的语言名，拿不准时返回 "text"。
 * @param {string} blockText 围栏内的原始文本（不含围栏行）
 * @returns {string}
 */
export function detectLang(blockText) {
  const lines = blockText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const text = lines.join("\n");
  if (!text) return "text";
  const first = lines[0] || "";

  // PHP
  if (/<\?php|<\?=/.test(text)) return "php";

  // shebang
  if (/^#!\/.*\b(bash|sh|zsh)\b/.test(first)) return "bash";
  if (/^#!\/.*\bpython/.test(first)) return "python";
  if (/^#!\/.*\bnode\b/.test(first)) return "javascript";

  // Dockerfile：FROM 是决定性指令，有 FROM 且至少 2 条指令即判定（注释多的 Dockerfile 也能命中）
  const dockerLines = lines.filter((l) =>
    /^(FROM|RUN|COPY|ADD|WORKDIR|EXPOSE|ENV|ARG|CMD|ENTRYPOINT|LABEL|USER|VOLUME|HEALTHCHECK|MAINTAINER)\s/.test(l)
  );
  const hasFrom = lines.some((l) => /^FROM\s/.test(l));
  if (dockerLines.length >= 2 && (hasFrom || dockerLines.length >= lines.length * 0.5)) return "dockerfile";

  // C（在 Java 之前判断：#include / uintN_t / printf / int main）
  if (
    /#include\s*[<"]/.test(text) ||
    /\b(uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|size_t|u_char)\b/.test(text) ||
    /\bint\s+main\s*\(/.test(text) ||
    /\bprintf\s*\(/.test(text) ||
    /\bstruct\s+\w/.test(text)
  ) {
    if (!/(\bpublic\s+class|\bSystem\.out|\bimport\s+java\.)/.test(text)) return "c";
  }

  // Java
  if (
    /\bpublic\s+(class|static\s+void\s+main|static\s+\w)/.test(text) ||
    /\bSystem\.out\b/.test(text) ||
    /\bimport\s+java\./.test(text) ||
    (/^\s*\w+(<[^>]*>)?\s+\w+\s*[;=(]/.test(text) && /\b(String|int|long|double|boolean|List|Map|ArrayList)\b/.test(text))
  ) {
    return "java";
  }

  // SQL
  if (
    /\b(select|insert\s+into|update\s+\w+\s+set|delete\s+from|create\s+(table|database|index|view)|alter\s+table|drop\s+table|show\s+(tables|columns|databases|create|warnings)|grant\s+|truncate\s+table|explain\s+select)\b/i.test(
      text
    ) ||
    /^\s*mysql>\s/.test(text)
  ) {
    return "sql";
  }

  // Shell / bash：多数行像命令
  const cmdRe =
    /^(\$\s|>\s|sudo\s|apt(-get)?\s|yum\s|dnf\s|brew\s|npm\s|npx\s|pnpm\s|yarn\s|curl\s|wget\s|mkdir\s|cd\s|git\s|systemctl\s|docker\s|chmod\s|chown\s|export\s|cat\s|echo\s|pip\d?\s|node\s|ls\s|cp\s|mv\s|rm\s|kill\s|source\s|tar\s|unzip\s)/;
  const cmdLines = lines.filter((l) => cmdRe.test(l) || /(^|\s)\|\s/.test(l) || /(&&|\|\|)/.test(l));
  if (cmdLines.length > 0 && cmdLines.length >= lines.length * 0.5) return "bash";

  // TypeScript / JavaScript
  const tsish =
    /(^|\n)\s*(import|export)\s/.test("\n" + text) ||
    /\binterface\s+\w/.test(text) ||
    /:\s*(string|number|boolean|any|void|never|unknown)\b/.test(text) ||
    /=>/.test(text) ||
    /@(Get|Post|Put|Delete|Patch|Module|Controller|Injectable|Component)\s*\(/.test(text) ||
    /\bconsole\.(log|error|warn|info)\b/.test(text) ||
    /\bPromise</.test(text) ||
    /\b(async|await)\b/.test(text) ||
    /<[A-Z]\w*\s/.test(text); // JSX 组件
  if (tsish) {
    const isTs =
      /:\s*(string|number|boolean|any|void|never|unknown)\b/.test(text) ||
      /\binterface\s+\w/.test(text) ||
      /@\w+\s*\(/.test(text) ||
      /\b(Promise<|Array<|<T,|<T>)/.test(text) ||
      /import\s+[\w{},\s]*from\s+['"]/.test(text);
    return isTs ? "typescript" : "javascript";
  }

  // Python
  if (/\bdef\s+\w+\s*\(/.test(text) || /\bself\./.test(text) || /\bprint\s*\(/.test(text) || /if\s+__name__\s*==/.test(text)) {
    return "python";
  }

  // JSON：以 { 或 [ 开头且含键值
  if (/^[[{]/.test(text) && /["'][\w-]+["']?\s*:/.test(text) && /[}\]]/.test(text)) return "json";

  // ini / properties / env：每行都是 KEY=value 或 [section] 或注释
  if (
    lines.every(
      (l) =>
        /^\s*#/.test(l) ||
        /^\s*;/.test(l) ||
        /^\s*[A-Za-z_][\w.-]*\s*=/.test(l) ||
        /^\[[\w.-]+\]$/.test(l) ||
        !l.trim()
    )
  ) {
    return "ini";
  }

  // YAML：key: value 行占多数，且无 ;{}、无中文（避免把散文里冒号当 yaml）
  const nonBlank = lines.length;
  const yamlLike = lines.filter((l) => /^[A-Za-z_][\w.-]*\s*:\s/.test(l)).length;
  if (nonBlank >= 3 && yamlLike >= nonBlank * 0.5 && !/[;{}]/.test(text) && !/[一-鿿]/.test(text)) {
    return "yaml";
  }

  // 文件树
  if (/[├└]/.test(text) && /─/.test(text)) return "text";

  // 二进制 / 十六进制示意（mysql-running 大头）
  if (/[01]{8,}/.test(text)) return "text";

  // 兜底
  return "text";
}

/** 判断一行是否是围栏开头，返回 {indent, marker, info} 或 null。 */
function parseFence(line) {
  const m = line.match(/^( *)(`{3,}|~{3,})(.*)$/);
  if (!m) return null;
  return { indent: m[1].length, marker: m[2], info: m[3].trim() };
}

/** 取某个开启围栏（0-based 行号）之后、到闭合围栏之前的文本。 */
function readBlock(lines, fenceIdx) {
  const out = [];
  for (let j = fenceIdx + 1; j < lines.length; j++) {
    if (parseFence(lines[j])) break;
    out.push(lines[j]);
  }
  return out.join("\n");
}

/**
 * 用 markdownlint MD040 权威定位无语言围栏，逐块推断并（可选）写回。
 * @param {string[]} files
 * @param {{write?: boolean}} opts
 * @returns {Promise<{stats:Object, samples:Object, changedFiles:string[], totalBlocks:number}>}
 */
export async function processFiles(files, { write = false } = {}) {
  const result = await lint({ files, config: { default: false, MD040: true }, resultVersion: 3 });
  const stats = {};
  const samples = {};
  const changedFiles = [];
  let totalBlocks = 0;

  for (const [file, errs] of Object.entries(result || {})) {
    if (!errs || errs.length === 0) continue;
    const raw = readFileSync(file, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const lines = raw.split(/\r?\n/);
    const book = (normSep(file).split("/books/")[1] || "").split("/")[0] || "(root)";
    let fileChanged = false;

    for (const e of errs) {
      const idx = e.lineNumber - 1; // markdownlint 给的是 1-based
      const f = parseFence(lines[idx]);
      if (!f) continue;
      const lang = detectLang(readBlock(lines, idx));
      totalBlocks++;
      stats[book] = stats[book] || {};
      stats[book][lang] = (stats[book][lang] || 0) + 1;
      samples[book] = samples[book] || {};
      samples[book][lang] = samples[book][lang] || [];
      if (samples[book][lang].length < 2) {
        const head = (readBlock(lines, idx).split("\n").find((x) => x.trim()) || "").trim().slice(0, 50);
        samples[book][lang].push(`L${idx + 1}: ${head}`);
      }
      const newLine = " ".repeat(f.indent) + f.marker + lang;
      if (newLine !== lines[idx]) {
        lines[idx] = newLine;
        fileChanged = true;
      }
    }

    if (write && fileChanged) {
      writeFileSync(file, lines.join(eol));
      changedFiles.push(file);
    }
  }

  return { stats, samples, changedFiles, totalBlocks };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = walkMd("docs/books");
  const { stats, samples, changedFiles, totalBlocks } = await processFiles(files, { write: !dryRun });

  const bookTotal = (b) => Object.values(stats[b]).reduce((s, n) => s + n, 0);
  for (const book of Object.keys(stats).sort((a, b) => bookTotal(b) - bookTotal(a))) {
    const langRows = Object.entries(stats[book]).sort((x, y) => y[1] - x[1]);
    console.log(`\n### ${book}: ${bookTotal(book)}`);
    for (const [lang, n] of langRows) {
      const ex = (samples[book][lang] || []).map((s) => `      ${s}`).join("\n");
      console.log(`   ${lang.padEnd(11)} ${n}${ex ? "\n" + ex : ""}`);
    }
  }
  console.log(
    `\n=== ${dryRun ? "[DRY-RUN] " : ""}${totalBlocks} blocks across ${Object.keys(stats).length} books; ${changedFiles.length} files written ===`
  );
}

// 仅在直接运行时执行 main（被 import 时不自动跑）
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
