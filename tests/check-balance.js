/**
 * A10 验收：数值平衡与判定逻辑未被改动（v2 · 复核并重写）
 * ==================================================================
 * 比对「改造前基线」(_dev/index.BEFORE-ONBOARDING.html) 与「改造后」(index.html)
 *
 * ⚠️ v1 的致命缺陷（已由 QA 复核发现并修复）：
 *   v1 用 `/(probe|pass):\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/g`
 *   提取 probe/pass，但由于 probe/pass 是「单行函数」，非贪婪匹配
 *   `([\s\S]*?)\n\s*\}` 会一路吞到**整个 mission 对象结束的 `}`**，
 *   把 `tip` / `hint` 等**文案字段**也纳入比较。
 *   → 结果：术语通俗化改写（A9 要求的改动）会让 A10 误报 FAIL。
 *   实测：仅做术语替换就会产生 2 处 spurious FAIL。
 *   v2 改用**花括号配对**精确截取函数体，只比数值/逻辑，不比文案。
 *
 * 检查维度（只比「逻辑与数值」，绝不比文案）：
 *   [1] 6 道任务 + 8 个预设的 env 数值组
 *   [2] 任务结构：id / turns / hold
 *   [3] 关键常量（只取数值表达式，忽略尾随注释）
 *   [4] probe / pass 函数体（花括号配对精确截取）
 *   [5] 星级逻辑 finishMission 内的 base / speedBonus 表达式
 *
 * 用法：node tests/check-balance.js
 * 退出码：0 = PASS，1 = FAIL
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
/* 基线优先取仓库内的 tests/baseline/，兼容本地开发时的 _dev/ */
const BEFORE = [
  path.join(__dirname, 'baseline', 'index.BEFORE-ONBOARDING.html'),
  path.join(ROOT, '_dev', 'index.BEFORE-ONBOARDING.html')
].find(p => fs.existsSync(p)) || path.join(__dirname, 'baseline', 'index.BEFORE-ONBOARDING.html');
const AFTER = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');

const read = (p) => fs.readFileSync(p, 'utf8');
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/* ---- [1] env 数值组（含 missions 与 presets）---- */
function envs(src) {
  return (src.match(/env:\s*\{[^}]*\}/g) || []).map(norm);
}

/* ---- [2] 任务结构 id / turns / hold ---- */
function missionStruct(src) {
  const out = [];
  const re = /id:\s*'([^']+)'[^}]*?turns:\s*(\d+)/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1] + '|turns=' + m[2]);
  // hold 单独抓（6 道题）
  const holds = (src.match(/hold:\s*(true|false)/g) || []).map(norm);
  return out.map((s, i) => s + '|' + (holds[i] || '?'));
}

/* ---- [3] 关键常量（只取数值表达式，去尾随注释）---- */
function consts(src) {
  const keys = ['TARGET_CELLS', 'CELL_AREA', 'DISH_AREA', 'GRID_SZ', 'SPR', 'BLOB_R',
    'VARIANTS', 'MISSION_MIN_TURNS', 'STEP_MS', 'MAX_VIRIONS', 'RAD'];
  const out = {};
  for (const k of keys) {
    const m = src.match(new RegExp('(?:var\\s+)?\\b' + k + '\\s*=\\s*([^,;\\n]+)'));
    let v = m ? m[1] : '(未找到)';
    v = v.replace(/\/\/.*$/, '').trim();          // 去行注释
    out[k] = norm(v);
  }
  return out;
}

/* ---- [4] probe / pass 函数体（花括号配对精确截取）---- */
function fns(src) {
  const out = [];
  const re = /(probe|pass)\s*:\s*function\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex, depth = 1;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    out.push(m[1] + '(' + norm(m[2]) + '): ' + norm(src.slice(re.lastIndex, i - 1)));
  }
  return out;
}

/* ---- [5] 星级逻辑（finishMission 内）---- */
function starLogic(src) {
  const base = src.match(/var base = ([^;]+);/);
  const bonus = src.match(/var speedBonus = ([^;]+);/);
  return { base: base ? norm(base[1]) : '(未找到)', speedBonus: bonus ? norm(bonus[1]) : '(未找到)' };
}

const b = read(BEFORE), a = read(AFTER);
let fail = 0, checks = 0;
const diffs = [];
function cmp(label, bv, av, showDetail) {
  checks++;
  const bs = JSON.stringify(bv), as = JSON.stringify(av);
  if (bs !== as) {
    fail++;
    diffs.push({ label, bv, av });
    console.log(`  ✗ ${label} 被改动`);
    if (showDetail) { console.log(`      基线: ${bs.slice(0, 200)}`); console.log(`      现况: ${as.slice(0, 200)}`); }
  } else {
    console.log(`  ✓ ${label} 一致`);
  }
}

console.log('=== A10 数值平衡比对 v2 ===');
console.log('基线: ' + path.relative(ROOT, BEFORE));
console.log('现况: ' + path.relative(ROOT, AFTER) + '\n');

/* [1] env */
const eb = envs(b), ea = envs(a);
checks++;
if (eb.length !== ea.length) {
  fail++;
  console.log(`  ✗ env 数值组数量变化: ${eb.length} → ${ea.length}`);
  diffs.push({ label: 'env 数量', bv: eb.length, av: ea.length });
} else {
  let ok = true;
  for (let i = 0; i < eb.length; i++) if (eb[i] !== ea[i]) { ok = false; diffs.push({ label: `env #${i + 1}`, bv: eb[i], av: ea[i] }); }
  if (ok) console.log(`  ✓ env 数值组 ${eb.length} 组完全一致（6 任务 + 8 预设）`);
  else { fail++; console.log(`  ✗ env 数值组有改动`); diffs.filter(d => d.label.startsWith('env #')).forEach(d => { console.log(`      [${d.label}] ${d.bv} → ${d.av}`); }); }
}

/* [2] 任务结构 */
cmp('任务结构 (id/turns/hold)', missionStruct(b), missionStruct(a), true);

/* [3] 常量 */
const cb = consts(b), ca = consts(a);
let cOk = true;
for (const k of Object.keys(cb)) if (cb[k] !== ca[k]) { cOk = false; fail++; console.log(`  ✗ 常量 ${k}: "${cb[k]}" → "${ca[k]}"`); diffs.push({ label: k, bv: cb[k], av: ca[k] }); }
checks++;
if (cOk) console.log('  ✓ 关键常量全部未变');

/* [4] probe/pass */
const pb = fns(b), pa = fns(a);
checks++;
if (pb.length !== pa.length) { fail++; console.log(`  ✗ probe/pass 数量变化: ${pb.length} → ${pa.length}`); }
else {
  let pOk = true;
  for (let i = 0; i < pb.length; i++) if (pb[i] !== pa[i]) { pOk = false; fail++; diffs.push({ label: `fn#${i + 1}`, bv: pb[i], av: pa[i] }); console.log(`  ✗ ${pb[i].split(':')[0]}(${i % 2 ? 'pass' : 'probe'}) 被改动`); console.log(`      基线: ${pb[i].slice(0, 160)}`); console.log(`      现况: ${pa[i].slice(0, 160)}`); }
  if (pOk) console.log(`  ✓ probe/pass 函数体 ${pb.length} 条全部未变（已精确隔离，不受文案改写影响）`);
}

/* [5] 星级逻辑 */
const sb = starLogic(b), sa = starLogic(a);
cmp('星级 base 表达式', sb.base, sa.base, true);
cmp('星级 speedBonus 表达式', sb.speedBonus, sa.speedBonus, true);

console.log('\n=== 判定: ' + (fail === 0
  ? `PASS ✓ 共 ${checks} 项检查，数值与逻辑未被改动`
  : `FAIL ✗ ${fail}/${checks} 项发现改动`) + ' ===');
process.exit(fail === 0 ? 0 : 1);
