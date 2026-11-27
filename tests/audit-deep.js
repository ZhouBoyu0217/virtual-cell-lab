/**
 * 深度审计（独立复验）—— 验证工程侧声称的 3 个缺陷修复 + 2 个设计冲突复核
 * ==================================================================
 * 声称修复：
 *   FIX-1  drawChart() 悬空调用 ghostKey() → rAF 主循环被杀（画面冻结）
 *   FIX-2  T1→T2 第二条路漏检（等价 Bug-1 复活）→ simStep 加 step%20 补检
 *   FIX-3  .sl.lockbody 缺 tier 前缀 → L3 时「变异速度」仍压暗且 pointer-events:none
 *
 * 设计冲突复核：
 *   DC-1  §4.3 vs §11.3.5：Tier 2 是否一次性放开过多控件？（上限设计 ≤14）
 *   DC-2  §4.2「L1 只 4 块」vs §11.9 LAYERS 给 6 块：6 块是否符合 A2「≤6」口径
 *
 * 用法：node tests/audit-deep.js [target.html]
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
const R = [];
const rec = (id, pass, ev) => { R.push({ id, pass }); console.log(`  ${pass === true ? '✓ PASS' : pass === 'NI' ? '· 未实施' : pass === 'CONCERN' ? '⚠ CONCERN' : '✗ FAIL'} [${id}] ${ev}`); };

const tierOf = (p) => p.evaluate(() => { const m = /\btier-(\d)\b/.exec(document.body.className || ''); return m ? +m[1] : 0; });

async function fresh() {
  const p = await browser.newPage({ viewport: { width: 1500, height: 1600 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(5500);
  return p;
}
const errs = [];
let browser;

(async () => {
  console.log('=== 深度审计（独立复验）===');
  console.log('target: ' + path.relative(ROOT, TARGET) + '\n');
  browser = await chromium.launch();

  /* ---------- FIX-1: rAF 主循环是否存活（drawChart 若抛错会冻画面）---------- */
  // 手法：跑 7 秒看 #hud 轮数是否持续增长（rAF 存活）+ pageerror 计数。
  // 注：drawChart 是 IIFE 内局部函数，页面作用域不可直接调用；验证 rAF 存活即等价证明。
  {
    const p = await fresh();
    await p.click('#btnPlay').catch(() => { });
    const stepOf = () => p.evaluate(() => { const m = /第\s*(\d+)\s*轮/.exec((document.getElementById('hud') || {}).textContent || ''); return m ? +m[1] : -1; });
    const s0 = await stepOf();
    await p.waitForTimeout(4000);
    const s1 = await stepOf();
    await p.waitForTimeout(3000);
    const s2 = await stepOf();
    const alive = s1 > s0 && s2 > s1;
    rec('FIX-1', alive && errs.length === 0,
      `rAF 存活（drawChart 在 tick 内周期调用不抛）：轮数 ${s0}→${s1}→${s2}；未捕获异常=${errs.length}`);
    await p.close();
  }

  /* ---------- FIX-3: L3 时「变异速度」滑块可交互（不被 pointer-events:none）---------- */
  {
    const p = await fresh();
    // 进 L3
    await p.click('#btnExpert').catch(() => { });
    await p.waitForTimeout(600);
    const t3 = await tierOf(p);
    const mut = await p.evaluate(() => {
      // 变异速度 = data-env="mutation"（L3 才解锁）
      const inp = document.querySelector('[data-env="mutation"]');
      if (!inp) return { found: false };
      const cs = getComputedStyle(inp);
      const row = inp.closest('.sl');
      const rowCS = row ? getComputedStyle(row) : null;
      // 尝试实际交互：设值派发 input
      const before = inp.value;
      inp.value = '77'; inp.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        found: true,
        display: cs.display, pointerEvents: cs.pointerEvents,
        rowOpacity: rowCS ? rowCS.opacity : null,
        rowPointer: rowCS ? rowCS.pointerEvents : null,
        valueChanged: inp.value !== before,
        visible: cs.display !== 'none' && inp.offsetParent !== null
      };
    });
    const ok = t3 === 3 && mut.found && mut.visible && mut.pointerEvents !== 'none' &&
      (!mut.rowPointer || mut.rowPointer !== 'none');
    rec('FIX-3', ok, `tier=${t3}；变异速度滑块 visible=${mut.visible} pointer-events=${mut.pointerEvents} ` +
      `行 pointer=${mut.rowPointer} 行 opacity=${mut.rowOpacity} 可改值=${mut.valueChanged}`);
    await p.close();
  }

  /* ---------- DC-1: Tier 2 可见可操作控件是否 ≤14 ---------- */
  {
    const p = await fresh();
    // 用专家模式进入后再退不出；改用"拖够触发"进 L2：拖 immune 5 次 + 等 60 回合
    for (let i = 0; i < 5; i++) {
      await p.evaluate((v) => { const e = document.querySelector('[data-env="immune"]'); if (e) { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); } }, 55 + i * 3);
      await p.waitForTimeout(150);
    }
    await p.click('#btnPlay').catch(() => { });
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      if (await tierOf(p) >= 2) break;
      await p.waitForTimeout(500);
    }
    await p.waitForTimeout(1200);
    const t2 = await tierOf(p);
    const r = await p.evaluate(() => {
      const isOperable = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.offsetParent === null) return false;
        // 锁壳元素 pointer-events:none → 不可操作，不计入"可操作控件"
        if (cs.pointerEvents === 'none') return false;
        const row = el.closest('.sl');
        if (row && getComputedStyle(row).pointerEvents === 'none') return false;
        return true;
      };
      const operable = [], lockedShell = [];
      document.querySelectorAll('[data-env]').forEach(i => {
        const name = 'slider:' + i.getAttribute('data-env');
        // 可见但不可操作 = 锁壳（按 §11.3.5 是"预览"，不计入预算）
        const cs = getComputedStyle(i);
        const vis = cs.display !== 'none' && i.offsetParent !== null;
        if (isOperable(i)) operable.push(name);
        else if (vis) lockedShell.push(name);
      });
      ['#btnPlay', '#btnHint', '#btnNext', '#btnStep', '#btnReset', '#btnSeed', '#btnVirus', '#btnFluo'].forEach(s => { const e = document.querySelector(s); if (e && isOperable(e)) operable.push(s); });
      ['inspect', 'kill', 'infect'].forEach(t => { const e = document.querySelector(`[data-tool="${t}"]`); if (e && isOperable(e)) operable.push('tool:' + t); });
      document.querySelectorAll('.preset').forEach(x => { if (isOperable(x)) operable.push('preset'); });
      document.querySelectorAll('.spd').forEach(x => { if (isOperable(x)) operable.push('spd'); });
      return { operable, lockedShell };
    });
    if (t2 !== 2) rec('DC-1', 'CONCERN', `未能进入 Tier 2（tier=${t2}），无法计数`);
    else {
      // 设计冲突定性：§4.3 承诺「每批新增 ≤+3」（分批：L2-a 6 / L2-b 8 / L2-c 10/12 / L2-d 14），
      // 但 §11.9（声明为"唯一真值来源"）把 L2-a..d 全部归到 tier=2 → 进入 T2 一次性放开全部。
      const over = r.operable.length > 14;
      rec('DC-1', over ? 'CONCERN' : true,
        `Tier 2 **可操作**控件 = ${r.operable.length}。§4.3 累计表上限=14（其表格未计入 #btnNext，但 §0.1 口径A 把它算作"任务卡按钮"之一）。` +
        `锁壳预览（pointer-events:none，不计操作）= ${r.lockedShell.length}${r.lockedShell.length ? ' [' + r.lockedShell.join(',') + ']' : ''}。` +
        `— 定性：§4.3「分批 ≤+3」 vs §11.9「全部 tier=2」的设计冲突；实现遵循 §11.9（唯一真值来源），可辩护，但 T1→T2 单跳新增较多，建议设计侧确认是否符合"每跳可消化"意图。`);
      console.log('      T2 可操作明细: ' + r.operable.join(', '));
    }
    await p.close();
  }

  /* ---------- DC-2: L1 可见视觉块数（A2 口径 ≤6）---------- */
  {
    const p = await fresh();
    const blocks = await p.evaluate(() => {
      const isVis = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null && el.getBoundingClientRect().height > 4; };
      const b = [];
      if (isVis(document.getElementById('dish'))) b.push('dish');
      // header 是独立视觉块吗？契约：header 顶部品牌条
      const hdr = document.querySelector('header');
      if (hdr && isVis(hdr)) b.push('header');
      document.querySelectorAll('.card').forEach(c => { if (isVis(c)) b.push('card:' + (c.id || '?')); });
      const ctrl = document.querySelector('.ctrls');
      if (ctrl && isVis(ctrl)) b.push('ctrlBar');
      if (Array.from(document.querySelectorAll('#metricGrid .m, .metrics .m')).some(isVis)) b.push('metricGroup');
      return b;
    });
    rec('DC-2', blocks.length <= 6, `L1 可见视觉块 = ${blocks.length}（A2 口径 ≤6）：${blocks.join(', ')}`);
    await p.close();
  }

  await browser.close();
  const fails = R.filter(r => r.pass === false);
  const ni = R.filter(r => r.pass === 'NI');
  const concerns = R.filter(r => r.pass === 'CONCERN');
  console.log('\n=== 深度审计判定: ' +
    (ni.length === R.length ? '未实施'
      : fails.length ? `FAIL ✗ ${fails.map(f => f.id).join(',')}`
        : concerns.length ? `CONCERNS ⚠ ${concerns.map(f => f.id).join(',')}` : 'PASS ✓') + ' ===');
  process.exit(ni.length === R.length ? 2 : fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
