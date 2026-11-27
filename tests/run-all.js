/**
 * QA 主运行器（验收总入口）
 * ==================================================================
 * 一次运行全部验收项，汇总为 tests/verification-report.md。
 * 每个子脚本独立可跑，退出码语义一致：0=PASS 1=FAIL 2=未实施。
 *
 * 用法：
 *   node tests/run-all.js                # 验收 index.html
 *   node tests/run-all.js path/to.html   # 验收指定文件
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');

const SUITES = [
  { id: 'A8', name: 'Storage 禁用/异常不白屏（强制·最高优先）', script: 'verify-a8-storage.js', weight: 'blocker' },
  { id: 'A10', name: '数值平衡未被改动', script: 'check-balance.js', static: true, weight: 'blocker' },
  { id: 'A9', name: '术语改写覆盖率（可见残留=0）', script: 'scan-terms.js', static: true, weight: 'blocker' },
  { id: 'A1/A2/A12/A13/A14/A6/A7', name: 'DOM/视觉验收 + 回归烟雾', script: 'verify-dom.js', weight: 'major' },
  { id: 'A11', name: '两条跃迁路径可达', script: 'verify-a11-transition.js', weight: 'major' },
  { id: 'A3/A4', name: '首战保底成功 → L2 解锁（≤3 输入）', script: 'verify-a3a4-completion.js', weight: 'major' },
  { id: 'C', name: '硬约束核查', script: 'check-constraints.js', weight: 'major' },
  { id: 'AUDIT', name: '深度审计（工程声称 3 修复 + 2 设计冲突复核）', script: 'audit-deep.js', weight: 'audit' },
];

const results = [];
console.log('################################################');
console.log('# QA 主运行器');
console.log('# target: ' + path.relative(ROOT, TARGET));
console.log('################################################\n');

for (const s of SUITES) {
  console.log('\n' + '='.repeat(64));
  console.log(`# ${s.id} — ${s.name}`);
  console.log('='.repeat(64));
  let code = 0, out = '';
  const args = [path.join(__dirname, s.script)];
  if (!s.static) args.push(TARGET);
  try {
    out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    code = 0;
  } catch (e) {
    code = e.status === undefined ? 1 : e.status;
    out = (e.stdout || '') + (e.stderr || '');
  }
  process.stdout.write(out);
  results.push({ ...s, code, out });
}

/* ---------- 汇总 ---------- */
const hasConcern = (r) => /CONCERN/.test(r.out) && r.code === 0;
const statusOf = (r) => r.code === 2 ? '未实施' : r.code === 1 ? 'FAIL' : hasConcern(r) ? 'CONCERN' : 'PASS';
const blockers = results.filter(r => r.weight === 'blocker' && r.code !== 0);
const majors = results.filter(r => r.weight === 'major' && r.code === 1);
const concerns = results.filter(r => hasConcern(r));
let verdict;
if (blockers.length || majors.length) verdict = 'FAIL';
else if (concerns.length) verdict = 'CONCERNS';
else if (results.some(r => r.code === 2)) verdict = 'CONCERNS（部分未实施）';
else verdict = 'PASS';

console.log('\n' + '#'.repeat(64));
console.log('# 汇总');
console.log('#'.repeat(64));
for (const r of results) console.log(`  [${statusOf(r).padEnd(7)}] ${r.id.padEnd(30)} ${r.name}`);
console.log(`\n>>> 总判定: ${verdict}`);
console.log(`    阻断项失败: ${blockers.map(b => b.id).join(', ') || '无'}`);
console.log(`    重要项失败: ${majors.map(b => b.id).join(', ') || '无'}`);
console.log(`    设计/口径 CONCERN: ${concerns.map(b => b.id).join(', ') || '无'}`);

/* ---------- 生成报告 ---------- */
const crypto = require('crypto');
const verHash = crypto.createHash('md5').update(fs.readFileSync(TARGET)).digest('hex');
const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
const lines = [];
lines.push('# 验收报告 · 三层渐进引导改造（T2 质量门）');
lines.push('');
lines.push(`- **趋势**: QA 主运行器 \`tests/run-all.js\``);
lines.push(`- **被验对象**: \`${path.relative(ROOT, TARGET)}\` · md5 \`${verHash}\``);
lines.push(`- **基线**: \`_dev/index.BEFORE-ONBOARDING.html\``);
lines.push(`- **生成时间**: ${now}`);
lines.push(`- **总判定**: **${verdict}**`);
lines.push(`- **质量门性质**: 建议性（advisory）—— 最终发布放行由用户决定`);
lines.push('');
lines.push('## 判定摘要');
lines.push('');
lines.push('| 项 | 名称 | 结果 |');
lines.push('|---|---|---|');
for (const r of results) lines.push(`| ${r.id} | ${r.name} | ${statusOf(r)} |`);
lines.push('');
lines.push('## 证据明细');
lines.push('');
for (const r of results) {
  lines.push(`### ${r.id} · ${r.name} — ${statusOf(r)}`);
  lines.push('');
  lines.push('```');
  lines.push(r.out.trim().slice(0, 6000));
  lines.push('```');
  lines.push('');
}
fs.writeFileSync(path.join(__dirname, 'verification-report.md'), lines.join('\n'), 'utf8');
console.log(`\n报告已写入: tests/verification-report.md`);

process.exit(verdict === 'PASS' ? 0 : 1);
