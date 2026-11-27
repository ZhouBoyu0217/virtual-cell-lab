# QA 验收方案 · 三层渐进引导改造（T2 质量门）

> **质量负责人**：严守真（QA + 测试）
> **被验对象**：`index.html`（工程侧 程基岩 实施中）
> **基线**：`_dev/index.BEFORE-ONBOARDING.html`
> **验收依据**：`design/gdd/onboarding-design.md` §12（A1–A14）+ `design/README.md` 第六节
> **状态**：shift-left 已就绪，工程完成后一键执行

---

## 一、测试分层

| 层 | 工具 | 覆盖 | 触发 |
|---|---|---|---|
| **静态分析** | `scan-terms.js`、`check-balance.js`、`check-constraints.js`(静态部分) | A9 术语、A10 数值、C1/C2/C3a 红线 | 每次工程提交后 |
| **浏览器自动化** | Playwright（超长视口 1500×1600） | A8 白屏、A1/A2/A12/A13/A14/A6/A7、A11 跃迁、C3b/C4、回归烟雾 | 工程完成后 |
| **手动抽查** | 人眼 + 截图 | 视觉观感（A13 权重目视）、A3 三次输入通关、A5 L3 全可达 | 自动化全绿后 |

> 视口固定 **1500×1600**：本项目已知坑——矮视口下 Playwright 点击会触发自动滚动，导致误判。

## 二、验收矩阵（A1–A14 + 回归 + 红线）

| 项 | 内容 | 强制 | 脚本 | 判定标准 |
|---|---|---|---|---|
| **A8** | Storage 禁用/异常不白屏 | ✅ 强制·最高优先 | `verify-a8-storage.js` | 3 场景（正常/读抛/写抛）：`#loading` display=none **且** 轮数增长 **且** 0 未捕获异常 |
| **A9** | 术语改写覆盖率 | ✅ 强制 | `scan-terms.js` | 状态机剔除注释后，**原生术语可见出现 = 0**；且 L1741–1749 生物学注释**未被误改** |
| **A10** | 数值平衡未改动 | ✅ 强制 | `check-balance.js` | env×14 / 任务结构 / 常量 / probe-pass 函数体 / 星级逻辑 全一致 |
| A1 | L1 可操作控件 ≤ 3 | | `verify-dom.js` | 核心控件（btnPlay+immune 滑块+btnHint）≤3；btnExpert 为逃生通道不计入 |
| A2 | 首屏视觉块 ≤ 6 | | `verify-dom.js` | 可见 `.card` + 指标卡 + 皿 计数 ≤ 6 |
| A4 | 通关后 ≤1s L2 滑入 | | 手动+DOM | `body.tier-2` 在完成第 1 题后 1s 内出现 |
| A6 | 专家模式 ≤100ms 全解锁 | | `verify-dom.js` | 点 #btnExpert 后 `body.tier-3` |
| A7 | 刷新后 tier 恢复 | | `verify-dom.js` | 专家模式刷新后仍 tier=3 |
| **A11** | 两条跃迁路径可达 | | `verify-a11-transition.js` | T1→T2：拖≥5次且≥60回合 可达；T2→T3：碰 5 根滑块 可达 |
| A12 | LAYERS 注入 == §4.2 Tier-1 清单 | | `verify-dom.js` | 核心 8 项可见 + 隐藏清单 12 项不可见 |
| A13 | body.tier-N + W 权重 | | `verify-dom.js` | tier 正确切换；`.w-rail` `--w` 值随层变化 |
| A14 | CTA 脉冲交互后停止 | | `verify-dom.js` | 点 #btnPlay 后 `.shell` 含 `interacted` |
| A3 | 3 次输入内通关 | | 手动 | 埋点计数 |
| A5 | L3 全量可达 | | 手动 | 逐项点击 |

**回归项**（不能被破坏）：任务系统 / 病毒系统 / 划痕与接种 / 重置 / 投放癌细胞 / 调速 / 点选观察 / 里程碑 → `verify-dom.js` 的 `REG-*` 组。

**硬约束红线**：
- C1 细胞渲染层零改动（`phaseContrast`/`PHASE_OPTS`/`OUTLINE_COLORS`/`VIRUS_TINT` 定义与基线逐字一致；`.dishwrap` 底色 = `#0d0e10`）
- C2 零新依赖（无 `<script src>` / `import` / `require()` / 外链）
- C3 `#btnPlay` 只剩一套动画（源码无 `breathe`；computed `animation-name` ∈ {focusPulse, none}）
- C4 `R` 快捷键门控到 tier≥2（tier-1 下按 R 不重置）

## 三、一键执行

```bash
node tests/run-all.js                 # 验收 index.html，输出 tests/verification-report.md（约 2 分钟）
node tests/scan-terms.js              # 单跑 A9
node tests/check-balance.js           # 单跑 A10
node tests/verify-a8-storage.js       # 单跑 A8
node tests/verify-dom.js              # 单跑 DOM/回归
node tests/verify-a11-transition.js   # 单跑 A11
node tests/verify-a3a4-completion.js  # 单跑 A3/A4
node tests/check-constraints.js       # 单跑红线
node tests/capture-states.js          # 采集 L1/L2/L3 截图（视觉证据）
```

退出码：`0`=PASS，`1`=FAIL，`2`=未实施。`run-all.js` 总判定：任一阻断项（A8/A9/A10）FAIL → **FAIL**；未实施 → **CONCERNS**。

> **自测夹具**：`tests/_selftest-fixture.html` 是"把 injectTiers/applyTier 接到 boot()"的合成副本，
> 用于在工程未接线时**自检脚本能否正确出判定**（已验证：能正确报告 A1–A7 PASS 并抓到 A12b 的 preset 覆盖 bug）。

## 四、准备阶段已发现并处置的问题

| # | 问题 | 影响 | 处置 |
|---|---|---|---|
| **Q1** | **`check-balance.js`（v1）有假失败缺陷** | probe/pass 正则非贪婪匹配会吞掉整个 mission 对象，把 `tip`/`hint` 文案纳入比较 → A9 要求的术语改写会**误报 A10 FAIL**（实测 2 处） | ✅ 已重写为 v2：花括号配对精确截取函数体，只比逻辑/数值。双向验证（术语改写→PASS；篡改数值→FAIL）通过 |
| **Q2** | A12 口径需与 §4.2 对齐 | `#btnExpert`/`#tierBadge` 是 L1 常驻逃生通道，若计入"可操作控件 ≤3"会误判 | ✅ A1 拆成"核心控件（参与判定）+ 逃生通道（仅报告）" |
| **Q3** | 培养皿底色检查被 CSS 注释干扰 | 新增注释里出现 `#0d0e10` 字样会误报改动 | ✅ 改为剥注释后取 `.dishwrap{background:...}` 实际声明比对 |
| **Q4** | A11 潜在实现顺序风险 | `checkTierUnlock()` 若只埋在 input+finishMission，则"先拖5次再等60回合"可能不自动跃迁 | ⚠️ 脚本按**两种顺序**各测一遍，用于判定是"顺序问题（CONCERN）"还是"死条件（FAIL）"——见 A11 脚本说明 |

## 五、判定原则

- **验证驱动**：没有测试证据的需求不算完成；判定基于截图/数值/日志，不凭感觉。
- **质量门为建议性（advisory）**：给判定，但**发布签字由用户决定**。
- **发现 FAIL 不改**：报回 team-lead，由工程侧修；QA 不碰产品代码。
- **稳定性**：如出现 flaky（同一输入时好时坏），立即标记并隔离，不污染 CI 信号。
