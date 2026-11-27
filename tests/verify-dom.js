/**
 * A1/A2/A4/A6/A7/A12/A13/A14 验收 + 既有功能回归烟雾测试
 * ==================================================================
 * 浏览器侧（Playwright，超长视口 1500x1600 排除滚动干扰）。
 * 所有判定基于证据（computed style / class / DOM 查询 / 数值），不凭感觉。
 *
 * 覆盖：
 *   A1  清 localStorage 后 L1 可操作控件 ≤ 3
 *   A2  L1 首屏可见视觉块 ≤ 6
 *   A4  完成第 1 题后 ≤1s 内 L2 元素滑入（body.tier-2）
 *   A6  点「专家模式」后 ≤100ms body.tier-3
 *   A7  刷新后 tier 正确恢复（localStorage）
 *   A12 LAYERS 注入结果 == GDD §4.2 Tier-1 清单
 *   A13 body.tier-N 切换 + W 权重（.w-rail --w）
 *   A14 首次交互后 CTA 脉冲停止（.shell.interacted）
 *   R   回归烟雾：任务/病毒/划痕/重置/投放/调速/点选观察
 *
 * 用法：node tests/verify-dom.js [target.html]
 * 退出码：0 = 全部 PASS，1 = 有 FAIL，2 = 未实施（无 data-tier）
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require(
  fs.existsSync(path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright'))
    ? path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright')
    : 'playwright'
);

const ROOT = path.resolve(__dirname, '..');
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');
const fileUrl = 'file:///' + TARGET.replace(/\\/g, '/');

/* GDD §4.2 Tier-1 清单（应可见）与隐藏清单（data-tier>=2） */
const T1_VISIBLE = [
  '#dish', '#hud', '#evt', '#hint2', '#missionCard',
  '#metricGrid #mTumor', '[data-env="immune"]', '#btnPlay',
  '#btnHint', '#btnExpert', '#tierBadge'   // 后 3 个为 LAYERS 里的 L1 常驻
];
const T1_VISIBLE_CORE8 = ['#dish', '#hud', '#evt', '#hint2', '#missionCard', 'METRIC', '[data-env="immune"]', '#btnPlay'];
const T1_HIDDEN = [
  '#hud2', '#legend', '#mileCard', '#toolCard', '#chartCard', '#presetCard',
  '#speedCard', '#fateCard', '#inspCard', '#mStars', '#mLeft', '#btnNext',
  '[data-env="nutrient"]', '[data-env="oxygen"]', '[data-env="mutation"]',
  '[data-env="chemo"]', '[data-env="virus"]', '#devspeedRange'
];

const R = [];   // 结果收集
function rec(id, pass, evidence) { R.push({ id, pass, evidence }); console.log(`  ${pass === true ? '✓ PASS' : pass === 'NI' ? '· 未实施' : '✗ FAIL'} [${id}] ${evidence}`); }

async function visible(page, sel) {
  return page.evaluate((s) => {
    const parts = s.split(' ');
    let el = document.querySelector(parts[0]);
    if (parts.length === 2) el = el ? el.querySelector(parts[1]) : null;
    if (!el) return 'missing';
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 'hidden';
    return 'visible';
  }, sel);
}
const tierOf = (page) => page.evaluate(() => {
  const m = /\btier-(\d)\b/.exec(document.body.className || '');
  return m ? +m[1] : 0;
});
const clearLS = (page) => page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });

(async () => {
  console.log('=== DOM/视觉验收 + 回归烟雾 ===');
  console.log('target: ' + path.relative(ROOT, TARGET) + '\n');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1600 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(fileUrl, { waitUntil: 'load' });
  await clearLS(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(6000);

  const implemented = await page.evaluate(() => document.querySelectorAll('[data-tier]').length > 0);

  /* ---------- A1: L1 可操作控件 ≤ 3 ----------
     口径：GDD §12 A1 明确数的是 `#btnPlay` + `immune` 滑块 + `#btnHint`。
     `#btnExpert`/`#tierBadge` 是设计上「L1 起常驻」的逃生通道与徽章，
     不计入「可操作控件」预算（否则 3 个预算根本装不下）。
     故本项分两栏报告：核心控件（参与 ≤3 判定）+ 逃生通道（仅报告）。 */
  const a1 = await page.evaluate(() => {
    const isVisible = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null; };
    const core = [], escape = [];
    if (isVisible(document.getElementById('btnPlay'))) core.push('#btnPlay');
    document.querySelectorAll('[data-env]').forEach(i => { if (isVisible(i)) core.push('slider:' + i.getAttribute('data-env')); });
    if (isVisible(document.getElementById('btnHint'))) core.push('#btnHint');
    ['#btnStep', '#btnReset', '#btnSeed', '#btnVirus', '#btnFluo', '#btnNext']
      .forEach(s => { const e = document.querySelector(s); if (e && isVisible(e)) core.push(s); });
    ['inspect', 'kill', 'infect'].forEach(t => { const e = document.querySelector(`[data-tool="${t}"]`); if (e && isVisible(e)) core.push('tool:' + t); });
    document.querySelectorAll('.preset').forEach(p => { if (isVisible(p)) core.push('preset'); });
    document.querySelectorAll('.spd').forEach(s => { if (isVisible(s)) core.push('spd'); });
    ['#btnExpert'].forEach(s => { const e = document.querySelector(s); if (e && isVisible(e)) escape.push(s); });
    return { core, escape };
  });
  if (!implemented) rec('A1', 'NI', `无 data-tier（未实施）。当前核心可见控件 ${a1.core.length}`);
  else rec('A1', a1.core.length <= 3,
    `L1 核心可操作控件 = ${a1.core.length} (${a1.core.join(', ')})，要求 ≤3；逃生通道可见: ${a1.escape.join(', ') || '无'}`);

  /* ---------- A2: 首屏可见视觉块 ≤ 6 ----------
     口径（对齐 GDD §4.2「43 → 4 个视觉块」）：视觉块 = 皿 + 可见卡片 + 指标组(1)。
     #hud/#evt/#hint2 是皿（.dishwrap）上的浮层，不单独计块。 */
  const a2 = await page.evaluate(() => {
    const isVisible = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null && el.getBoundingClientRect().height > 4; };
    const blocks = [];
    const dish = document.getElementById('dish'); if (dish && isVisible(dish)) blocks.push('dish');
    document.querySelectorAll('.card').forEach(c => { if (isVisible(c)) blocks.push('card:' + (c.id || c.className.split(' ').slice(0, 2).join('.'))); });
    const anyMetric = Array.from(document.querySelectorAll('#metricGrid .m, .metrics .m')).some(isVisible);
    if (anyMetric) blocks.push('metricGroup');
    const overlays = ['#hud', '#evt', '#hint2'].filter(s => { const e = document.querySelector(s); return e && isVisible(e); });
    return { blocks, overlays };
  });
  if (!implemented) rec('A2', 'NI', `未实施。当前可见视觉块 ${a2.blocks.length}`);
  else rec('A2', a2.blocks.length <= 6, `L1 可见视觉块 = ${a2.blocks.length} (${a2.blocks.join(', ')})，要求 ≤6；皿上浮层: ${a2.overlays.join(', ')}`);

  /* ---------- A12: LAYERS 注入结果一致性 ----------
     权威口径（§11.9「LAYERS = 唯一真值来源」）：injectTiers() 后，
     每个 LAYERS 选择器的实际可见性必须与其声明层一致：
       value==1 → L1 可见；value>=2 → L1 不可见。
     LAYERS 定义在 IIFE 内部（页面作用域不可见），故从**源文件文本**里解析该对象字面量。 */
  if (!implemented) {
    rec('A12', 'NI', '未实施（无 data-tier 注入）');
  } else {
    // 从源码解析 LAYERS 对象字面量
    let layers = null;
    try {
      const src = fs.readFileSync(TARGET, 'utf8');
      const m = src.match(/var\s+LAYERS\s*=\s*\{/);
      if (m) {
        let i = src.indexOf('{', m.index), depth = 0, j = i;
        for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } } }
        const literal = src.slice(i, j);
        layers = eval('(' + literal + ')');
      }
    } catch (e) { layers = null; }

    if (!layers) {
      rec('A12a', false, '源码中未找到可解析的 LAYERS 常量');
      rec('A12b', false, '源码中未找到可解析的 LAYERS 常量');
    } else {
      /* 语义（与实现一致）：injectTiers() 采用「首个匹配的 LAYERS 键胜出」（first-wins）。
         故某元素的期望层 = LAYERS 键顺序中【第一个】匹配它的 selector 的值。
         这能正确处理「精确项 + 兜底项」（如 .preset[data-pid=...] 与 .preset）。 */
      const a12 = await page.evaluate(({ layers, CORE }) => {
        const isVis = (el) => { if (!el) return null; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null; };
        const order = Object.keys(layers);
        const resolve = (sel) => {
          let el = document.querySelector(sel); if (el) return el;
          const sp = sel.lastIndexOf(' ');
          if (sp > 0) { const box = document.querySelector(sel.slice(0, sp)); return box ? box.querySelector(sel.slice(sp + 1)) : null; }
          return null;
        };
        // 先算"期望层"：对每个 LAYERS selector 命中的元素，取首个匹配键的层
        const expected = new Map();
        const missingSelectors = [];
        order.forEach((sel) => {
          let nodes;
          try { nodes = document.querySelectorAll(sel); } catch (e) { nodes = []; }
          if (!nodes.length && !document.querySelector(sel)) missingSelectors.push(sel);
          Array.prototype.forEach.call(nodes, (n) => {
            if (expected.has(n)) return;   // first-wins
            expected.set(n, { tier: layers[sel], sel });
          });
        });
        const violations = [];
        expected.forEach((info, el) => {
          const attr = el.getAttribute('data-tier');
          if (String(attr) !== String(info.tier)) violations.push(`${info.sel}(期望 ${info.tier}, 实际 ${attr})`);
          const vis = isVis(el);
          if (info.tier === 1 && vis === false) violations.push(`${info.sel}(层1应可见, 实隐藏)`);
          if (info.tier >= 2 && vis === true) violations.push(`${info.sel}(层${info.tier}应隐藏, 实可见)`);
        });
        // 核心 8 项锚点
        const metricToken = () => {
          const card = document.getElementById('mTumorCard');
          if (card) return isVis(card) === true;
          const v = document.getElementById('mTumor'); return v ? isVis(v.closest('.m')) === true : false;
        };
        const coreMissing = CORE.filter(s => s === 'METRIC' ? !metricToken() : isVis(resolve(s)) !== true);
        return { violations, missingSelectors, coreMissing, matched: expected.size };
      }, { layers, CORE: T1_VISIBLE_CORE8 });

      const coreOK = a12.coreMissing.length === 0;
      const derivOK = a12.violations.length === 0;
      rec('A12a', coreOK, `LAYERS 条目 ${Object.keys(layers).length} 个；核心 8 项（皿/回合/旁白/气泡/任务卡/坏细胞比例/免疫滑块/播放）L1 可见 ${8 - a12.coreMissing.length}/8`);
      rec('A12b', derivOK,
        `派生 fidelity（first-wins 语义，覆盖 ${a12.matched} 个元素）：${derivOK ? '全部一致' : `${a12.violations.length} 处不一致`}` +
        `${a12.violations.length ? ' → ' + a12.violations.slice(0, 10).join(', ') : ''}`);
      if (a12.missingSelectors.length) console.log('      LAYERS 中未匹配到 DOM 的选择器: ' + a12.missingSelectors.join(', '));
      if (a12.coreMissing.length) console.log('      核心 8 项缺失: ' + a12.coreMissing.join(', '));
    }
  }

  /* ---------- A13: body.tier-N 切换 + W 权重（持久权重，"可见≠同权重"） ---------- */
  if (!implemented) rec('A13', 'NI', '未实施');
  else {
    const t1 = await tierOf(page);
    // 读 .w-rail 的持久亮度权重。**非破坏性**：临时把 body 切到 tier-3 读权重，再还原，
    // 避免影响后续 A14/A6/A7 的状态。
    const w = await page.evaluate(() => {
      const body = document.body;
      const saved = body.className;
      const read = () => {
        const e = document.querySelector('.w-rail');
        const m = document.getElementById('missionCard');
        const g = (el, v) => el ? getComputedStyle(el).getPropertyValue(v).trim() : null;
        return { wb: g(e, '--w-b'), railFilter: g(e, 'filter'), missionFilter: g(m, 'filter') };
      };
      const t1w = read();
      body.className = saved.replace(/\btier-\d\b/g, '').trim() + ' tier-3';
      const t3w = read();
      body.className = saved;                    // 还原
      return { t1w, t3w };
    });
    const dimmed = /0?\.78/.test(w.t3w.wb || '');
    rec('A13', t1 === 1 && dimmed,
      `body.tier=${t1}（应1）；持久权重：T1 时 .w-rail --w-b="${w.t1w.wb}"，模拟 T3 时 --w-b="${w.t3w.wb}"（应≈0.78）；` +
      `T3 .w-rail filter="${w.t3w.railFilter}"（应含 brightness(0.78…)）；#missionCard filter="${w.t3w.missionFilter}"（焦点卡不压暗）`);
  }

  /* ---------- A14: CTA 脉冲首次交互后停止 ---------- */
  if (!implemented) rec('A14', 'NI', '未实施');
  else {
    const before = await page.evaluate(() => document.querySelector('.shell') ? document.querySelector('.shell').className : '');
    await page.click('#btnPlay').catch(() => { });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.querySelector('.shell') ? document.querySelector('.shell').className : '');
    rec('A14', /\binteracted\b/.test(after), `点 #btnPlay 前 shell="${before}" 后 shell="${after}"（应含 interacted）`);
  }

  /* ---------- A6: 专家模式 ≤100ms 全解锁 ---------- */
  if (!implemented) rec('A6', 'NI', '未实施');
  else {
    const hasExpert = await page.evaluate(() => !!document.getElementById('btnExpert'));
    if (!hasExpert) rec('A6', false, '#btnExpert 不存在');
    else {
      const t0 = Date.now();
      await page.click('#btnExpert');
      await page.waitForTimeout(120);
      const t3 = await tierOf(page);
      rec('A6', t3 === 3, `点专家模式后 body.tier=${t3}（应=3），耗时≈${Date.now() - t0}ms`);
    }
  }

  /* ---------- A7: 刷新后 tier 恢复 ---------- */
  if (!implemented) rec('A7', 'NI', '未实施');
  else {
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(5500);
    const t = await tierOf(page);
    rec('A7', t === 3, `专家模式后刷新，body.tier=${t}（应恢复到 3）`);
  }

  /* ---------- 回归烟雾 ---------- */
  console.log('\n--- 回归烟雾（既有功能不可破坏）---');
  // 用正常模式重新加载
  const p2 = await browser.newPage({ viewport: { width: 1500, height: 1600 } });
  p2.on('pageerror', e => errors.push('[p2] ' + e.message));
  await p2.goto(fileUrl, { waitUntil: 'load' });
  await clearLS(p2);
  await p2.reload({ waitUntil: 'load' });
  await p2.waitForTimeout(5500);
  // 若已实施，用专家模式解锁全部面板以便回归（保证控件可见）
  if (await p2.$('#btnExpert')) { await p2.click('#btnExpert').catch(() => { }); await p2.waitForTimeout(400); }

  const readTotal = () => p2.evaluate(() => (document.getElementById('mTotal') || {}).textContent || '');
  const readHud = () => p2.evaluate(() => (document.getElementById('hud') || {}).textContent || '');
  const num = (s) => { const m = /(\d+)/.exec(s || ''); return m ? +m[1] : NaN; };
  // 暂停演化：btnPlay 文案 '暂停'（运行中）↔ '继续'（已暂停）
  const ensurePaused = async () => {
    for (let i = 0; i < 6; i++) {
      const t = await p2.evaluate(() => (document.getElementById('btnPlay') || {}).textContent || '');
      if (t.trim() === '继续') return true;
      await p2.click('#btnPlay').catch(() => { });
      await p2.waitForTimeout(200);
    }
    return (await p2.evaluate(() => (document.getElementById('btnPlay') || {}).textContent || '')).trim() === '继续';
  };
  const isVisible = (sel) => p2.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null;
  }, sel);

  // R1 任务系统：mName 有内容 + 进度条存在
  const missionOK = await p2.evaluate(() => {
    const n = (document.getElementById('mName') || {}).textContent || '';
    const bar = document.getElementById('mBarFill');
    return { name: n.trim().slice(0, 30), bar: bar ? bar.style.width : '(无)' };
  });
  rec('REG-mission', missionOK.name.length > 0 && !/等待开始/.test(missionOK.name), `任务卡 mName="${missionOK.name}" bar=${missionOK.bar}`);

  // R2 重置：确保暂停 → 重置 → 读第 0 轮（暂停后 step 不再自增，读数确定）
  const paused = await ensurePaused();
  await p2.waitForTimeout(500);
  await p2.click('#btnReset').catch(() => { });
  await p2.waitForTimeout(700);
  const hudAfterReset = num(await readHud());
  rec('REG-reset', paused && hudAfterReset === 0, `暂停=${paused} → 重置后 ${await readHud()}（应第 0 轮）`);

  // R3 投放癌细胞（暂停状态下读数稳定）
  await ensurePaused();
  const t0 = num(await readTotal());
  await p2.click('#btnSeed').catch(() => { });
  await p2.waitForTimeout(1400);
  const t1v = num(await readTotal());
  rec('REG-seed', Number.isFinite(t0) && Number.isFinite(t1v) && t1v > t0, `投放癌细胞 ${t0} → ${t1v}`);

  // R4 划痕清除（暂停状态下，划除必减细胞数）
  await ensurePaused();
  const killVisible = await isVisible('[data-tool="kill"]');
  await p2.click('[data-tool="kill"]').catch(() => { });
  await p2.waitForTimeout(200);
  const box = await p2.$eval('#dish', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const k0 = num(await readTotal());
  for (const fy of [0.42, 0.5, 0.58, 0.34, 0.66]) {
    const y = box.y + box.h * fy;
    await p2.mouse.move(box.x + box.w * 0.30, y); await p2.mouse.down();
    await p2.mouse.move(box.x + box.w * 0.70, y, { steps: 14 }); await p2.mouse.up();
    await p2.waitForTimeout(250);
  }
  await p2.waitForTimeout(700);
  const k1 = num(await readTotal());
  rec('REG-kill', killVisible && Number.isFinite(k0) && Number.isFinite(k1) && k1 < k0, `划痕清除 ${k0} → ${k1}（控件可见=${killVisible}）`);

  // R5 点选观察（inspect）→ 放大面板更新
  await p2.click('[data-tool="inspect"]').catch(() => { });
  const placeholders = '点击培养皿里任意一个细胞';
  let insp = '';
  const pts = [[0.5, 0.5], [0.35, 0.4], [0.6, 0.55], [0.45, 0.62], [0.55, 0.38], [0.3, 0.55], [0.65, 0.45]];
  for (const [fx, fy] of pts) {
    await p2.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
    await p2.waitForTimeout(400);
    insp = await p2.evaluate(() => (document.getElementById('inspMeta') || {}).textContent || '');
    if (insp.length > 0 && insp.indexOf(placeholders) === -1) break;
  }
  rec('REG-inspect', insp.length > 0 && insp.indexOf(placeholders) === -1, `放大面板 meta="${insp.slice(0, 44)}…"`);

  // R6 投放病毒
  await p2.click('#btnVirus').catch(() => { });
  await p2.waitForTimeout(1200);
  const virShown = await p2.evaluate(() => {
    const c = document.getElementById('mVirCard');
    return c ? getComputedStyle(c).display !== 'none' : null;
  });
  rec('REG-virus', virShown === true || virShown === null, `投放病毒后病毒指标卡可见=${virShown}`);

  // R7 调速按钮
  const speedOK = await p2.evaluate(() => {
    const btn = document.querySelector('.spd[data-s="4"]');
    if (!btn) return false; btn.click(); return btn.classList.contains('on');
  });
  rec('REG-speed', speedOK, `4× 调速按钮可点击并激活=${speedOK}`);

  /* ---------- 零未捕获异常 ---------- */
  rec('REG-noerror', errors.length === 0, `全程未捕获异常 ${errors.length} 个${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);

  await browser.close();

  /* ---------- 汇总 ---------- */
  const fails = R.filter(r => r.pass === false);
  const ni = R.filter(r => r.pass === 'NI');
  console.log('\n=== 判定: ' + (ni.length && !fails.length ? '未实施 / PARTIAL' : fails.length === 0 ? 'PASS' : 'FAIL') +
    ` — PASS ${R.filter(r => r.pass === true).length} / FAIL ${fails.length} / NI ${ni.length} ===`);
  process.exit(fails.length ? 1 : (ni.length ? 2 : 0));
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
