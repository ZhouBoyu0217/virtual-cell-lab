/**
 * 视觉证据采集：L1/L2/L3 三态截图（供 A13 权重目视 + 报告附图）
 * 用法: node tests/capture-states.js [target.html]
 * 输出: _dev/qa-l1.png / qa-l2.png / qa-l3.png
 */
const path = require('path'), fs = require('fs');
const { chromium } = require(
  fs.existsSync(path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright'))
    ? path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright') : 'playwright'
);
const ROOT = path.resolve(__dirname, '..');
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');
const url = 'file:///' + TARGET.replace(/\\/g, '/');
const shot = (p, n) => path.join(ROOT, '_dev', n);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1600 } });
  await p.goto(url, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(6000);
  const impl = await p.evaluate(() => document.querySelectorAll('[data-tier]').length > 0);
  await p.screenshot({ path: shot(p, 'qa-l1.png'), fullPage: true });
  console.log('L1 截图: _dev/qa-l1.png  (tier 已实施=' + impl + ')');
  if (!impl) { await b.close(); return; }

  // L2: 反复拖 immune 5 次 + 等到 60 回合
  const touch = () => p.evaluate(() => { const e = document.querySelector('[data-env="immune"]'); if (!e) return; e.value = String(50 + Math.random() * 20); e.dispatchEvent(new Event('input', { bubbles: true })); });
  for (let i = 0; i < 5; i++) { await touch(); await p.waitForTimeout(150); }
  const t0 = Date.now();
  while (Date.now() - t0 < 22000) {
    const s = await p.evaluate(() => { const m = /第\s*(\d+)\s*轮/.exec((document.getElementById('hud') || {}).textContent || ''); return m ? +m[1] : -1; });
    if (s >= 60) break;
    await p.waitForTimeout(500);
  }
  await touch(); await p.waitForTimeout(1200);
  await p.screenshot({ path: shot(p, 'qa-l2.png'), fullPage: true });
  console.log('L2 截图: _dev/qa-l2.png');

  // L3: 专家模式
  await p.click('#btnExpert').catch(() => { });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot(p, 'qa-l3.png'), fullPage: true });
  console.log('L3 截图: _dev/qa-l3.png');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
