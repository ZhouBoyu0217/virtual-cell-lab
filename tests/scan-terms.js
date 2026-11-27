/**
 * A9 验收：术语改写覆盖率（状态机扫描）
 * ------------------------------------------------------------------
 * 目的：扫描 index.html，把每个「原生术语」的出现分为两类：
 *   - 注释（JS 块注释 / 行注释 / HTML 注释）→ 玩家看不到，**不该改**
 *   - 可见（HTML 文本 / JS 字符串字面量 / 运行时拼接）→ **必须改**
 *
 * 为什么必须是状态机：L1741/1744 处在 `/* ==== ... ==== *​/` 横幅内、
 * L1989 行尾即 `*​/`，这些「块注释内部行」不以 `/*` 或 `*` 开头，
 * 行首正则扫描会把它们误判为「可见」→ 多找 5 处不存在的目标，
 * 甚至误改注释（破坏 L1743 声明"教学上必须准确"的生物学要点）。
 *
 * 用法：
 *   node tests/scan-terms.js [file]        # 默认 index.html
 *   node tests/scan-terms.js index.html --json
 *
 * 判定口径（与 GDD §7.0.2 / team-lead 一致）：
 *   基线「可见/注释」= 溶瘤病毒 13/11、恶性度 3/0、汇合度 1/1、
 *                       免疫强度 4/1、氧气浓度 3/0、突变率 4/0、
 *                       化疗药剂 3/0、营养供给 3/0 …
 * 改造后：所有「原生术语」的可见出现应为 0（新词已全覆盖）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = process.argv[2] && !process.argv[2].startsWith('--')
  ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');
const AS_JSON = process.argv.includes('--json');

/* ---- 术语映射：原生术语 → 改性后的人话（GDD 附录 A） ---- */
const TERMS = {
  '营养供给': '养分', '氧气浓度': '含氧量', '免疫强度': '免疫兵力',
  '突变率': '变异速度', '化疗药剂': '化疗药量', '溶瘤病毒': '病毒剂量',
  '总细胞数': '存活细胞', '肿瘤占比': '坏细胞比例', '汇合度': '铺满度',
  '恶性度': '危险度', '病毒感染': '已被感染', '游离病毒': '游走的病毒',
  '命运判定': '培养皿局势', '实验记录': '发现记录', '发育速度': '演化快慢'
};

/**
 * 状态机 tokenizer：给每个字符打标
 *  kind[i] ∈ 'V'(可见) | 'C'(注释) | 'S'(样式表内，忽略)
 * 规则优先级：注释 > 字符串 > 代码；`<script>/<style>` 切换上下文。
 */
function classify(src) {
  const n = src.length;
  const kind = new Array(n).fill('V');
  let i = 0;
  let ctx = 'html';      // html | script | style
  let inBlock = false, inLine = false, inHtml = false;
  let inStr = null;      // 当前字符串引号
  const mark = (from, to, k) => { for (let j = from; j < to && j < n; j++) kind[j] = k; };

  while (i < n) {
    const ch = src[i];
    const two = src.substr(i, 2);
    const closeScript = src.substr(i, 9).toLowerCase() === '</script>';
    const closeStyle = src.substr(i, 8).toLowerCase() === '</style>';

    if (inHtml) {                       // HTML 注释
      if (src.substr(i, 3) === '-->') { mark(i, i + 3, 'C'); i += 3; inHtml = false; }
      else { kind[i] = 'C'; i++; }
      continue;
    }
    if (inBlock) {                      // JS/CSS 块注释
      if (two === '*/') { mark(i, i + 2, 'C'); i += 2; inBlock = false; }
      else { kind[i] = 'C'; i++; }
      continue;
    }
    if (inLine) {                       // JS 行注释
      if (ch === '\n') { inLine = false; kind[i] = 'V'; i++; }
      else { kind[i] = 'C'; i++; }
      continue;
    }
    if (inStr) {                        // 字符串字面量（内容算可见）
      if (ch === '\\') { i += 2; continue; }
      if (ch === inStr) { inStr = null; i++; continue; }
      kind[i] = 'V'; i++; continue;
    }

    /* ---- 非注释、非字符串 ---- */
    if (ctx === 'html') {
      if (src.substr(i, 4) === '<!--') { mark(i, i + 4, 'C'); i += 4; inHtml = true; continue; }
      if (/^<script[\s>]/i.test(src.substr(i, 8))) {
        const gt = src.indexOf('>', i); mark(i, gt + 1, 'V'); i = gt + 1; ctx = 'script'; continue;
      }
      if (/^<style[\s>]/i.test(src.substr(i, 7))) {
        const gt = src.indexOf('>', i); mark(i, gt + 1, 'S'); i = gt + 1; ctx = 'style'; continue;
      }
      kind[i] = 'V'; i++; continue;
    }
    if (ctx === 'script') {
      if (closeScript) { mark(i, i + 9, 'V'); i += 9; ctx = 'html'; continue; }
      if (two === '//') { mark(i, i + 2, 'C'); i += 2; inLine = true; continue; }
      if (two === '/*') { mark(i, i + 2, 'C'); i += 2; inBlock = true; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { kind[i] = 'V'; inStr = ch; i++; continue; }
      kind[i] = 'V'; i++; continue;
    }
    if (ctx === 'style') {
      if (closeStyle) { mark(i, i + 8, 'S'); i += 8; ctx = 'html'; continue; }
      if (two === '/*') { mark(i, i + 2, 'C'); i += 2; inBlock = true; continue; }
      if (ch === "'" || ch === '"') { kind[i] = 'S'; inStr = ch; i++; continue; }
      kind[i] = 'S'; i++; continue;
    }
  }
  return kind;
}

function lineIndex(src) {
  const lines = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lines.push(i + 1);
  return (idx) => {
    let lo = 0, hi = lines.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lines[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

const src = fs.readFileSync(FILE, 'utf8');
const kind = classify(src);
const toLine = lineIndex(src);

/* ---- A9 附加项：源码声明的"生物学要点（教学上必须准确）"注释必须【未被误改】----
   位置：L1740–1749 的块注释横幅。若工程侧"过度改写"把注释里的术语也改了，反而是错误。
   判定：这些关键句仍原样存在。 */
const BIO_MUST_KEEP = [
  '生物学要点（教学上必须准确）',
  '溶瘤病毒（如呼肠孤病毒、腺病毒改造株）偏好感染肿瘤细胞',
  '免疫系统同时会清除游离病毒和已感染细胞，所以免疫强度高时病毒疗法效果会打折'
];
const bioMissing = BIO_MUST_KEEP.filter(s => src.indexOf(s) === -1);
const bioOK = bioMissing.length === 0;

const report = {};
let totalVisible = 0, totalComment = 0, totalStyle = 0;
for (const t of Object.keys(TERMS)) {
  const vis = [], com = [], sty = [];
  let from = 0, idx;
  while ((idx = src.indexOf(t, from)) !== -1) {
    const k = kind[idx];
    const ln = toLine(idx);
    if (k === 'C') com.push(ln);
    else if (k === 'S') sty.push(ln);
    else vis.push(ln);
    from = idx + t.length;
  }
  report[t] = { visible: vis, comment: com, style: sty, mapped: TERMS[t] };
  totalVisible += vis.length; totalComment += com.length; totalStyle += sty.length;
}

if (AS_JSON) {
  console.log(JSON.stringify({ file: FILE, report, totals: { visible: totalVisible, comment: totalComment, style: totalStyle } }, null, 2));
  process.exit(0);
}

console.log('=== A9 术语扫描（状态机）===');
console.log('file: ' + path.relative(ROOT, FILE) + '\n');
console.log('术语'.padEnd(8) + '可见'.padEnd(6) + '注释'.padEnd(6) + '样式'.padEnd(6) + '可见行号');
console.log('-'.repeat(84));
for (const t of Object.keys(TERMS)) {
  const r = report[t];
  console.log(
    t.padEnd(6) + String(r.visible.length).padEnd(7) +
    String(r.comment.length).padEnd(7) + String(r.style.length).padEnd(7) +
    (r.visible.join(', ') || (r.visible.length === 0 ? '（无）' : ''))
  );
}
console.log('-'.repeat(84));
console.log(`合计: 可见 ${totalVisible} / 注释 ${totalComment} / 样式 ${totalStyle}`);
console.log(bioOK
  ? '✓ A9-附加：L1740–1749「生物学要点」注释未被误改（3/3 关键句原样保留）'
  : `✗ A9-附加：生物学要点注释被误改，缺失 ${bioMissing.length} 句：\n   - ${bioMissing.join('\n   - ')}`);
console.log(totalVisible === 0 && bioOK
  ? '\n✓ PASS：无可原生术语可见残留，且教学注释未被误改'
  : `\n✗ ${totalVisible > 0 ? `仍有 ${totalVisible} 处原生术语可见；` : ''}${bioOK ? '' : '教学注释被误改'} → 见上表行号`);
process.exit(totalVisible === 0 && bioOK ? 0 : 1);
