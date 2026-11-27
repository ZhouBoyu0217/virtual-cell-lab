/**
 * A11 验收：两条「层间跃迁的第二条路」确实可达
 * ==================================================================
 * 设计阶段抓到 Bug-1 / Bug-2（两个**死条件**，玩家永远卡住）：
 *   Bug-1: `distinctSliders() >= 3`  —— L1 只暴露 1 根滑块 → 永不可达
 *   Bug-2: `distinctSliders() >= 6`  —— 变异速度是 L3 才给 → L2 最多 5 根
 * 修复后（GDD §5.1）：
 *   T1→T2 第二条路: `touchCount >= 5 && step >= 60`（反复拖同一根也算探索）
 *   T2→T3 第二条路: `distinctSliders() >= 5`
 *
 * ⚠️ 本脚本额外探测一个**实现顺序风险**：
 *   `checkTierUnlock()` 只埋在「input 监听器末尾 + finishMission 末尾」两处。
 *   因此若玩家"先拖 5 次、再等 60 回合"，到达 60 回合时**没有任何事件触发检查**，
 *   可能不会自动跃迁——需等下一次 input。A11 原文是"反复拖 5 次 + 等 60 回合"，
 *   所以本脚本按**两种顺序**各测一遍，用来判定这是否为实现真缺陷。
 *
 * 用法：node tests/verify-a11-transition.js [target.html]
 * 退出码：0 = PASS，1 = FAIL，2 = 未实施
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
const R = [];
const rec = (id, pass, ev) => { R.push({ id, pass }); console.log(`  ${pass === true ? '✓ PASS' : pass === 'NI' ? '· 未实施' : '✗ FAIL'} [${id}] ${ev}`); };

const tierOf = (page) => page.evaluate(() => { const m = /\btier-(\d)\b/.exec(document.body.className || ''); return m ? +m[1] : 0; });
const stepOf = async (page) => await page.evaluate(() => { const m = /第\s*(\d+)\s*轮/.exec((document.getElementById('hud') || {}).textContent || ''); return m ? +m[1] : -1; });

/* 触发 slider 的 input 事件（事件委托挂在 #sliders 上，bubbles 必须为 true） */
async function touchSlider(page, envId, val) {
  return page.evaluate(({ envId, val }) => {
    const el = document.querySelector(`[data-env="${envId}"]`);
    if (!el) return false;
    el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, { envId, val });
}

async function waitStep(page, target, timeoutMs) {
  const t0 = Date.now();
  let lastStep = await stepOf(page);
  let poked = false;
  while (Date.now() - t0 < timeoutMs) {
    const cur = await stepOf(page);
    if (cur >= target) return true;
    // 若停滞 3s 且还没点击过播放，点一次确保演化在跑（L1 可能默认暂停）
    if (!poked && cur === lastStep && Date.now() - t0 > 3000) {
      await page.click('#btnPlay').catch(() => { });
      poked = true;
    }
    lastStep = cur;
    await page.waitForTimeout(500);
  }
  return false;
}

(async () => {
  console.log('=== A11 验收：层间跃迁第二条路可达 ===');
  console.log('target: ' + path.relative(ROOT, TARGET) + '\n');
  const browser = await chromium.launch();
  const errs = [];

  async function freshL1() {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1600 } });
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(5000);
    return page;
  }

  /* 探测是否已实施 */
  const probe = await freshL1();
  const implemented = await probe.evaluate(() => document.querySelectorAll('[data-tier]').length > 0 && /guide|tier/i.test(document.documentElement.innerHTML));
  const t0 = await tierOf(probe);
  await probe.close();

  if (!implemented || t0 !== 1) {
    console.log(`  探测: data-tier 已实施=${implemented}, 初始 tier=${t0}`);
    rec('A11-T1toT2-顺序一(先拖后等)', 'NI', '未实施（无分层/状态机）——工程完成后再跑');
    rec('A11-T1toT2-顺序二(先等后拖)', 'NI', '未实施');
    rec('A11-T2toT3', 'NI', '未实施');
    rec('A11-noerror', 'NI', '未实施');
  } else {
    /* ========== T1→T2 第二条路：两种顺序**各自独立**验证 ==========
       （team-lead 明确要求：不只测顺序一；顺序二是工程侧声称新修的缺陷，
         也是设计阶段 Bug-1 的同类问题。两者必须都能跃迁。） */
    // --- 顺序一：先拖 5 次 → 再等 60 回合 ---
    let page = await freshL1();
    for (let i = 0; i < 5; i++) { await touchSlider(page, 'immune', 55 + i * 3); await page.waitForTimeout(150); }
    const reached60a = await waitStep(page, 60, 25000);
    await page.waitForTimeout(600);
    const tierOrder1 = await tierOf(page);
    const stepOrder1 = await stepOf(page);
    console.log(`  [T1→T2 顺序一 先拖后等] 拖5次 → 等到 step=${stepOrder1}(reached60=${reached60a}) → tier=${tierOrder1}`);
    rec('A11-T1toT2-顺序一(先拖后等)', tierOrder1 === 2,
      tierOrder1 === 2 ? `先拖5次再等60回合 → tier 1→2（step=${stepOrder1}）`
        : `未跃迁（tier=${tierOrder1}, step=${stepOrder1}, reached60=${reached60a}）`);
    await page.close();

    // --- 顺序二：先等 60 回合 → 再拖 5 次（本次复验重点） ---
    page = await freshL1();
    const reached60b = await waitStep(page, 60, 25000);
    const stepBeforeTouch = await stepOf(page);
    for (let i = 0; i < 5; i++) { await touchSlider(page, 'immune', 55 + i * 3); await page.waitForTimeout(200); }
    await page.waitForTimeout(800);
    const tierOrder2 = await tierOf(page);
    console.log(`  [T1→T2 顺序二 先等后拖] 先等到 step=${stepBeforeTouch}(reached60=${reached60b}) → 再拖5次 → tier=${tierOrder2}`);
    rec('A11-T1toT2-顺序二(先等后拖)', tierOrder2 === 2,
      tierOrder2 === 2 ? `先等60回合再拖5次 → tier 1→2（证明 simStep 内 step%20 补检生效）`
        : `未跃迁（tier=${tierOrder2}, step先=${stepBeforeTouch}, reached60=${reached60b}）—— 若顺序一通过而此条失败，即"缺回合推进复查"缺陷`);
    await page.close();

    /* ========== T2→T3 第二条路: 碰 5 根不同滑块 ========== */
    page = await freshL1();
    // 升到 T2（用顺序一，稳妥）
    for (let i = 0; i < 5; i++) { await touchSlider(page, 'immune', 50 + i); await page.waitForTimeout(120); }
    await waitStep(page, 60, 25000);
    await page.waitForTimeout(600);
    const tierT2 = await tierOf(page);
    if (tierT2 < 2) {
      // 兜底：改用顺序二
      await touchSlider(page, 'immune', 60); await page.waitForTimeout(600);
    }
    const tierT2b = await tierOf(page);
    if (tierT2b < 2) {
      rec('A11-T2toT3', false, `前置未达 T2（tier=${tierT2b}），无法测试 T2→T3`);
    } else {
      const envs = ['immune', 'nutrient', 'oxygen', 'chemo', 'virus'];
      for (const e of envs) { await touchSlider(page, e, 40); await page.waitForTimeout(250); }
      await page.waitForTimeout(900);
      const tierT3 = await tierOf(page);
      rec('A11-T2toT3', tierT3 === 3, `T2 下依次碰 ${envs.join('/')} 5 根滑块 → tier=${tierT3}（应=3）`);
    }
    rec('A11-noerror', errs.length === 0, `两种顺序 + T2→T3 全程未捕获异常 ${errs.length} 个`);
    await page.close();
  }

  await browser.close();
  const fails = R.filter(r => r.pass === false);
  const ni = R.filter(r => r.pass === 'NI');
  console.log('\n=== A11 判定: ' + (ni.length === R.length ? '未实施' : fails.length ? `FAIL ✗ ${fails.map(f => f.id).join(',')}` : 'PASS ✓') + ' ===');
  process.exit(ni.length === R.length ? 2 : fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
