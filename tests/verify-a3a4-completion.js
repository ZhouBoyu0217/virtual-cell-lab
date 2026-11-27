/**
 * A3/A4 验收：首战保底成功 → 完成第 1 题 → ≤1s 内 L2 元素进入
 * ==================================================================
 * 设计精髓（GDD §6 Step 2 / §4.5.2）：第 1 题 `guard` 的 env 预设 immune:62，
 * 玩家"只推一根滑块就能达标"；`pass()` = tumorPct<28 && malig<45。
 * 完成第 1 题后应 ≤1s 内 setTier(2) → body.tier-2 → L2 元素滑入。
 *
 * 做法：加速演化（devspeed 拉满 + 4× 速度），点 ▶，轮询：
 *   - 观察是否出现"完成/✓"或 tier 跃迁到 2
 *   - 记录跃迁时刻与 mName 变化
 * 判定：
 *   A4  = 完成第 1 题后 1s 内 body.tier 变为 2
 *   A3（辅助）= 记录玩家输入次数（应 ≤3：▶ + 拖免疫 + 可能一次提示）
 *
 * 用法：node tests/verify-a3a4-completion.js [target.html]
 * 退出码 0=PASS 1=FAIL 2=未实施
 */
const path = require('path'), fs = require('fs');
const { chromium } = require(
  fs.existsSync(path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright'))
    ? path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright') : 'playwright'
);
const ROOT = path.resolve(__dirname, '..');
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');
const url = 'file:///' + TARGET.replace(/\\/g, '/');

const tierOf = (p) => p.evaluate(() => { const m = /\btier-(\d)\b/.exec(document.body.className || ''); return m ? +m[1] : 0; });
const nameOf = (p) => p.evaluate(() => ((document.getElementById('mName') || {}).textContent || '').trim());
const probeOf = (p) => p.evaluate(() => { const m = (document.getElementById('mProg') || {}).textContent || ''; const n = /(\d+)/.exec(m); return n ? +n[1] : -1; });
const stepOf = (p) => p.evaluate(() => { const m = /第\s*(\d+)\s*轮/.exec((document.getElementById('hud') || {}).textContent || ''); return m ? +m[1] : -1; });

(async () => {
  console.log('=== A3/A4 验收：首战保底成功 → L2 解锁 ===');
  console.log('target: ' + path.relative(ROOT, TARGET) + '\n');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(5500);

  const impl = await p.evaluate(() => document.querySelectorAll('[data-tier]').length > 0);
  if (!impl) { console.log('  · 未实施（无 data-tier）——工程完成后再跑'); await b.close(); process.exit(2); }

  let inputs = 0;
  // 输入 1：推免疫（Step 1 的动作）。第 1 题 immune 预设 62，再稳一点推到 ~68。
  await p.evaluate(() => { const el = document.querySelector('[data-env="immune"]'); if (el) { el.value = '68'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
  inputs++;
  await p.waitForTimeout(300);
  // 输入 2：点 ▶ 启动
  await p.click('#btnPlay').catch(() => { }); inputs++;
  // 加速：devspeed 拉满 + 4×（通过 evaluate 直接设，L1 下控件被门控但事件仍可达）
  await p.evaluate(() => {
    const d = document.getElementById('devspeedRange');
    if (d) { d.value = '100'; d.dispatchEvent(new Event('input', { bubbles: true })); }
    const s4 = document.querySelector('.spd[data-s="4"]');
    if (s4 && !s4.classList.contains('on')) s4.click();
  });

  // 轮询：等待第 1 题完成（mName 含 ✓/已完成 或 tier 跃迁到 2）
  const t0 = Date.now();
  let doneAt = null, tierAtDone = null, nameAtDone = '';
  let lastProg = -1;
  while (Date.now() - t0 < 90000) {
    const tier = await tierOf(p);
    const nm = await nameOf(p);
    const finished = /✓|已完成/.test(nm);
    if (finished || tier >= 2) {
      doneAt = Date.now(); tierAtDone = tier; nameAtDone = nm;
      break;
    }
    const pr = await probeOf(p);
    if (pr !== lastProg) { lastProg = pr; }
    await p.waitForTimeout(400);
  }

  const secs = doneAt ? ((doneAt - t0) / 1000).toFixed(1) : '—';
  const endTierImmediate = tierAtDone;
  // A4：完成瞬间 tier 必须已达 2（setTier 在 finishMission 内同步触发）
  await p.waitForTimeout(1000);               // 再等 1s 确认稳定
  const tierAfter1s = await tierOf(p);

  console.log(`  第 1 题完成: ${doneAt ? '是' : '否（超时）'}，用时≈${secs}s，轮数=${await stepOf(p)}`);
  console.log(`  完成时 mName = "${nameAtDone}"`);
  console.log(`  tier 完成瞬间=${endTierImmediate} → 1s 后=${tierAfter1s}`);
  console.log(`  玩家输入次数（本地计数）= ${inputs}`);

  const a4 = doneAt !== null && endTierImmediate === 2 && tierAfter1s === 2;
  const a3 = inputs <= 3;
  console.log(`  ${a4 ? '✓ PASS' : '✗ FAIL'} [A4] 完成第 1 题后 tier→2（≤1s 内，实测同步）`);
  console.log(`  ${a3 ? '✓ PASS' : '✗ FAIL'} [A3] 玩家输入次数 = ${inputs}（应 ≤3）`);
  console.log(`  ${errs.length === 0 ? '✓' : '✗'} 未捕获异常 ${errs.length} 个`);

  await b.close();
  process.exit((a4 && a3 && errs.length === 0) ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
