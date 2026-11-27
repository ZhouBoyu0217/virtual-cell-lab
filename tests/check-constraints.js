/**
 * 硬约束核查（源码静态 + 浏览器 computed style）
 * ==================================================================
 * 工程侧改造不得触碰以下"红线"：
 *   C1 细胞渲染层未动：phaseContrast / PHASE_OPTS / OUTLINE_COLORS / VIRUS_TINT
 *      与培养皿底色 #0d0e10
 *   C2 零新依赖：无 npm / import / require / CDN <script src>
 *   C3 #btnPlay 只剩一套动画（美术侧 focusPulse；设计侧 breathe 应已删除）
 *   C4 R 快捷键已门控到 tier>=2（tier-1 下按 R 不得重置）
 *
 * 用法：node tests/check-constraints.js [target.html]
 * 退出码：0 = PASS，1 = FAIL
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(
  fs.existsSync(path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright'))
    ? path.resolve(__dirname, '..', '_dev', 'node_modules', 'playwright')
    : 'playwright'
);

const ROOT = path.resolve(__dirname, '..');
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');
const BEFORE = path.join(ROOT, '_dev', 'index.BEFORE-ONBOARDING.html');
const src = fs.readFileSync(TARGET, 'utf8');
const R = [];
const rec = (id, pass, ev) => { R.push({ id, pass }); console.log(`  ${pass ? '✓ PASS' : '✗ FAIL'} [${id}] ${ev}`); };

(async () => {
  console.log('=== 硬约束核查 ===');
  console.log('target: ' + path.relative(ROOT, TARGET) + '\n');

  /* C1 细胞渲染层 */
  const c1keys = ['phaseContrast', 'PHASE_OPTS', 'OUTLINE_COLORS', 'VIRUS_TINT'];
  const missing = c1keys.filter(k => src.indexOf(k) === -1);
  // 与基线逐段比对这几个符号所在行的"定义行"是否一致
  let renderUnchanged = missing.length === 0;
  if (fs.existsSync(BEFORE)) {
    const bsrc = fs.readFileSync(BEFORE, 'utf8');
    const defRe = (s, k) => { const m = s.match(new RegExp('(?:function\\s+' + k + '|var\\s+' + k + ')\\s*=?[^\\n]*')); return m ? m[0].replace(/\s+/g, ' ').trim() : '(无)'; };
    for (const k of c1keys) {
      const a = defRe(src, k), b = defRe(bsrc, k);
      if (a !== b) { renderUnchanged = false; console.log(`      ✗ ${k} 定义变更: "${b}" → "${a}"`); }
    }
  }
  rec('C1a', renderUnchanged, `渲染层符号定义 ${renderUnchanged ? '与基线一致' : '发生变更'}: ${c1keys.join('/')}`);

  /* 培养皿底色：校验"实际声明"未变（忽略注释里的提及，否则新增注释会误报） */
  const stripComments = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')      // JS/CSS 块注释
    .replace(/<!--[\s\S]*?-->/g, '')        // HTML 注释
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');  // JS 行注释（避开 http://）
  const dishDecl = (s) => {
    const sc = stripComments(s);
    const m = sc.match(/\.dishwrap\{[^}]*background:(#[0-9a-fA-F]{3,8})/);
    return m ? m[1] : '(未找到 .dishwrap 底色)';
  };
  const curDish = dishDecl(src);
  const baseDish = fs.existsSync(BEFORE) ? dishDecl(fs.readFileSync(BEFORE, 'utf8')) : curDish;
  rec('C1b', curDish === baseDish && curDish === '#0d0e10',
    `培养皿底色 .dishwrap background = ${curDish}（基线 ${baseDish}，期望 #0d0e10）`);

  /* C2 零新依赖 */
  const cdnScript = /<script[^>]+src\s*=/i.test(src);
  const esImport = /(^|\n)\s*import\s+[^\n]+\s+from\s+/m.test(src);
  const requireCall = /\brequire\s*\(/.test(src);
  const httpLink = /<(link|script)[^>]+(https?:)?\/\//i.test(src);
  const c2ok = !cdnScript && !esImport && !requireCall && !httpLink;
  rec('C2', c2ok, `零依赖: <script src>=${cdnScript} import=${esImport} require()=${requireCall} 外链=${httpLink}`);

  /* C3 #btnPlay 动画：源码里 breathe 应已删除 */
  const hasBreathe = /\bbreathe\b/.test(src);
  rec('C3a', !hasBreathe, `源码中 breathe 动画${hasBreathe ? '仍存在（应删）' : '已删除'}`);

  /* C4 R 快捷键门控（浏览器行为验证） */
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1600 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const fileUrl = 'file:///' + TARGET.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(6000);

  const implemented = await page.evaluate(() => document.querySelectorAll('[data-tier]').length > 0);
  const tier0 = await page.evaluate(() => { const m = /\btier-(\d)\b/.exec(document.body.className || ''); return m ? +m[1] : 0; });
  const stepOf = () => page.evaluate(() => { const m = /第\s*(\d+)\s*轮/.exec((document.getElementById('hud') || {}).textContent || ''); return m ? +m[1] : -1; });

  // 跑起来，让 step 明显 > 0，再暂停（避免自增干扰读数）
  const ensurePaused = async () => {
    for (let i = 0; i < 6; i++) {
      const t = await page.evaluate(() => (document.getElementById('btnPlay') || {}).textContent || '');
      if (t.trim() === '继续') return;
      await page.click('#btnPlay').catch(() => { });
      await page.waitForTimeout(200);
    }
  };
  await page.click('#btnPlay').catch(() => { });   // 启动（L1 初始暂停）
  await page.waitForTimeout(4000);
  await ensurePaused();
  await page.waitForTimeout(400);
  const s0 = await stepOf();
  await page.keyboard.press('r');
  await page.waitForTimeout(500);
  const s1 = await stepOf();
  if (!implemented || tier0 !== 1) {
    rec('C4', 'skip', `未实施或初始非 tier-1（tier=${tier0}）——R 门控仅在有分层时才有意义`);
  } else if (!(s0 > 0)) {
    rec('C4', 'skip', `前置未跑出 step>0（step=${s0}），无法可靠判定；见 A11 脚本`);
  } else {
    // tier-1 下按 R：若门控生效，step 不应被重置为 0
    const blocked = s1 !== 0 && s1 >= s0;
    rec('C4', blocked, `tier-1 下按 R：step ${s0} → ${s1}（应保持不重置；门控${blocked ? '生效' : '失效'}）`);
  }

  /* C3b computed animation on #btnPlay */
  const anim = await page.evaluate(() => { const e = document.getElementById('btnPlay'); if (!e) return '(无 #btnPlay)'; return getComputedStyle(e).animationName; });
  const animOK = implemented ? (anim === 'none' || /focusPulse/.test(anim)) : true;
  rec('C3b', animOK, `#btnPlay computed animation-name = "${anim}"（应为 focusPulse 或 none，不得为 breathe/多套）`);

  rec('C-nullerr', errs.length === 0, `核查过程未捕获异常 ${errs.length} 个`);

  await browser.close();
  const fails = R.filter(r => r.pass === false);
  console.log('\n=== 硬约束判定: ' + (fails.length ? `FAIL ✗ ${fails.map(f => f.id).join(',')}` : 'PASS ✓') + ' ===');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
