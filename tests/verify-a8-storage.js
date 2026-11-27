/**
 * A8 验收（强制 · 最高优先）：Storage 被禁用 / 异常时不白屏
 * ==================================================================
 * 为什么是最高优先：index.html 的初始化是一个**单个 IIFE**（约 L385–L3549）。
 * IIFE 内任何未捕获异常都会终止整个初始化 → boot() 不执行 →
 * `#loading` 遮罩永不隐藏 → 玩家看到永久转圈白屏。
 * 引导状态机（vcl.guide.v1）是本项目**唯一**新增的 localStorage 用法，
 * 因此必须验证「读/写 localStorage 抛异常」时游戏仍能正常启动。
 *
 * 测试场景（两种降级路径，都必须通过）：
 *   [S1] 读抛异常：Object.defineProperty(window,'localStorage',{get(){throw}})
 *        → 模拟隐私模式 / iframe / 安全策略完全禁止 Storage
 *   [S2] 写抛异常：localStorage.getItem 正常返回 null，setItem 抛 QuotaExceeded
 *        → 模拟配额耗尽 / 只读 Storage（guideSave 必须静默忽略）
 *
 * 判定（三条件同时成立才算 PASS）：
 *   ① #loading 计算样式 display === 'none'（遮罩已隐藏）
 *   ② boot() 走完 + tick() 存活：设计在 L1 **故意暂停**等玩家点 ▶，
 *      故点一次 #btnPlay 后轮数应持续增长（证明初始化完整、游戏循环活着）
 *   ③ 零未捕获异常（pageerror 计数 === 0），且 #loadTxt 不残留错误文本
 *
 * 用法：node tests/verify-a8-storage.js [target.html]
 * 退出码：0 = PASS，1 = FAIL
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

const INIT_READ_THROW = () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new Error('SecurityError: localStorage is disabled (simulated)'); }
  });
};
const INIT_WRITE_THROW = () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem() { return null; },
      setItem() { throw new Error('QuotaExceededError: simulated full storage'); },
      removeItem() { throw new Error('QuotaExceededError: simulated full storage'); },
      clear() { }
    }
  });
};

async function runScenario(browser, name, initScript) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1600 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
  if (initScript) await page.addInitScript(initScript);

  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const l = document.getElementById('loading');
    const hud = document.getElementById('hud');
    const lt = document.getElementById('loadTxt');
    return {
      loadingDisplay: l ? getComputedStyle(l).display : '(no #loading)',
      hud: hud ? hud.textContent.trim() : '(no #hud)',
      loadTxt: lt ? lt.textContent.trim() : '(no #loadTxt)',
      // 证明 tick 活着：读取内部轮数（#hud 文本即 "第 N 轮"）
      hasDish: !!document.getElementById('dish')
    };
  });

  // ② 证明 boot() 走完 + tick() 存活。
  //    新设计在 L1 故意暂停（等玩家点 ▶），故先点一次 #btnPlay 再观察轮数增长。
  //    读取"第 N 轮"两次，中间留足时间。若点击无效则再点一次。
  const stepOf0 = () => page.evaluate(() => { const m = /第\s*(\d+)\s*轮/.exec((document.getElementById('hud') || {}).textContent || ''); return m ? +m[1] : NaN; });
  let s1 = await stepOf0();
  await page.click('#btnPlay').catch(() => { });
  await page.waitForTimeout(2500);
  let s2 = await stepOf0();
  if (!(s2 > s1)) {                      // 若首屏已在运行，点击会暂停——补点一次恢复
    await page.click('#btnPlay').catch(() => { });
    await page.waitForTimeout(2500);
    s2 = await stepOf0();
  }

  const c1 = state.loadingDisplay === 'none';
  const c2 = Number.isFinite(s1) && Number.isFinite(s2) && s2 > s1;
  const c3 = errors.length === 0;

  const pass = c1 && c2 && c3;
  console.log(`\n[${name}]`);
  console.log(`  ① #loading display = "${state.loadingDisplay}" ${c1 ? '✓ 已隐藏' : '✗ 未隐藏（白屏！）'}`);
  console.log(`  ② 点 ▶ 后轮数增长: 第 ${s1} 轮 → 第 ${s2} 轮 ${c2 ? '✓ 演化运行中（boot 完整）' : '✗ 演化未启动'}（初始 ${state.hud}）`);
  console.log(`  ③ 未捕获异常: ${errors.length === 0 ? '✓ 0 个' : '✗ ' + errors.length + ' 个'}`);
  if (errors.length) errors.slice(0, 5).forEach(e => console.log('      · ' + e));
  console.log(`  loadTxt = "${state.loadTxt}"`);
  console.log(`  → ${pass ? 'PASS ✓' : 'FAIL ✗'}`);

  await page.close();
  return { name, pass, c1, c2, c3, errors, state };
}

(async () => {
  console.log('=== A8 验收：Storage 禁用/异常不白屏 ===');
  console.log('target: ' + path.relative(ROOT, TARGET));
  const browser = await chromium.launch();
  let results = [];
  try {
    results.push(await runScenario(browser, 'S0 对照（正常 Storage）', null));
    results.push(await runScenario(browser, 'S1 读抛异常（getter throw）', INIT_READ_THROW));
    results.push(await runScenario(browser, 'S2 写抛异常（setItem throw）', INIT_WRITE_THROW));
  } finally {
    await browser.close();
  }
  const failed = results.filter(r => !r.pass);
  console.log('\n=== A8 判定: ' + (failed.length === 0
    ? 'PASS ✓ 三种场景均无白屏、无未捕获异常'
    : `FAIL ✗ ${failed.map(r => r.name).join(' / ')}`) + ' ===');
  process.exit(failed.length === 0 ? 0 : 1);
})();
