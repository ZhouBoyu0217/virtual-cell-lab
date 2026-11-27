# 验收报告 · 三层渐进引导改造（T2 质量门）

- **趋势**: QA 主运行器 `tests/run-all.js`
- **被验对象**: `index.html` · md5 `234abb0efb839c22c0e8ecb9465f7f56`
- **基线**: `_dev/index.BEFORE-ONBOARDING.html`
- **生成时间**: 2026-11-27 05:50:25
- **总判定**: **CONCERNS**
- **质量门性质**: 建议性（advisory）—— 最终发布放行由用户决定

## 判定摘要

| 项 | 名称 | 结果 |
|---|---|---|
| A8 | Storage 禁用/异常不白屏（强制·最高优先） | PASS |
| A10 | 数值平衡未被改动 | PASS |
| A9 | 术语改写覆盖率（可见残留=0） | PASS |
| A1/A2/A12/A13/A14/A6/A7 | DOM/视觉验收 + 回归烟雾 | PASS |
| A11 | 两条跃迁路径可达 | PASS |
| A3/A4 | 首战保底成功 → L2 解锁（≤3 输入） | PASS |
| C | 硬约束核查 | PASS |
| AUDIT | 深度审计（工程声称 3 修复 + 2 设计冲突复核） | CONCERN |

## 证据明细

### A8 · Storage 禁用/异常不白屏（强制·最高优先） — PASS

```
=== A8 验收：Storage 禁用/异常不白屏 ===
target: index.html

[S0 对照（正常 Storage）]
  ① #loading display = "none" ✓ 已隐藏
  ② 点 ▶ 后轮数增长: 第 0 轮 → 第 16 轮 ✓ 演化运行中（boot 完整）（初始 第 0 轮）
  ③ 未捕获异常: ✓ 0 个
  loadTxt = "正在初始化培养皿…"
  → PASS ✓

[S1 读抛异常（getter throw）]
  ① #loading display = "none" ✓ 已隐藏
  ② 点 ▶ 后轮数增长: 第 0 轮 → 第 16 轮 ✓ 演化运行中（boot 完整）（初始 第 0 轮）
  ③ 未捕获异常: ✓ 0 个
  loadTxt = "正在初始化培养皿…"
  → PASS ✓

[S2 写抛异常（setItem throw）]
  ① #loading display = "none" ✓ 已隐藏
  ② 点 ▶ 后轮数增长: 第 0 轮 → 第 16 轮 ✓ 演化运行中（boot 完整）（初始 第 0 轮）
  ③ 未捕获异常: ✓ 0 个
  loadTxt = "正在初始化培养皿…"
  → PASS ✓

=== A8 判定: PASS ✓ 三种场景均无白屏、无未捕获异常 ===
```

### A10 · 数值平衡未被改动 — PASS

```
=== A10 数值平衡比对 v2 ===
基线: _dev\index.BEFORE-ONBOARDING.html
现况: index.html

  ✓ env 数值组 14 组完全一致（6 任务 + 8 预设）
  ✓ 任务结构 (id/turns/hold) 一致
  ✓ 关键常量全部未变
  ✓ probe/pass 函数体 12 条全部未变（已精确隔离，不受文案改写影响）
  ✓ 星级 base 表达式 一致
  ✓ 星级 speedBonus 表达式 一致

=== 判定: PASS ✓ 共 6 项检查，数值与逻辑未被改动 ===
```

### A9 · 术语改写覆盖率（可见残留=0） — PASS

```
=== A9 术语扫描（状态机）===
file: index.html

术语      可见    注释    样式    可见行号
------------------------------------------------------------------------------------
营养供给  0      0      0      （无）
氧气浓度  0      0      0      （无）
免疫强度  0      1      0      （无）
突变率   0      0      0      （无）
化疗药剂  0      0      0      （无）
溶瘤病毒  0      11     0      （无）
总细胞数  0      0      0      （无）
肿瘤占比  0      4      0      （无）
汇合度   0      1      0      （无）
恶性度   0      0      0      （无）
病毒感染  0      4      0      （无）
游离病毒  0      4      0      （无）
命运判定  0      1      0      （无）
实验记录  0      2      0      （无）
发育速度  0      2      0      （无）
------------------------------------------------------------------------------------
合计: 可见 0 / 注释 30 / 样式 0
✓ A9-附加：L1740–1749「生物学要点」注释未被误改（3/3 关键句原样保留）

✓ PASS：无可原生术语可见残留，且教学注释未被误改
```

### A1/A2/A12/A13/A14/A6/A7 · DOM/视觉验收 + 回归烟雾 — PASS

```
=== DOM/视觉验收 + 回归烟雾 ===
target: index.html

  ✓ PASS [A1] L1 核心可操作控件 = 3 (#btnPlay, slider:immune, #btnHint)，要求 ≤3；逃生通道可见: #btnExpert
  ✓ PASS [A2] L1 可见视觉块 = 4 (dish, card:missionCard, card:envCard, metricGroup)，要求 ≤6；皿上浮层: #hud, #evt, #hint2
  ✓ PASS [A12a] LAYERS 条目 48 个；核心 8 项（皿/回合/旁白/气泡/任务卡/坏细胞比例/免疫滑块/播放）L1 可见 8/8
  ✓ PASS [A12b] 派生 fidelity（first-wins 语义，覆盖 55 个元素）：全部一致
  ✓ PASS [A13] body.tier=1（应1）；持久权重：T1 时 .w-rail --w-b="1"，模拟 T3 时 --w-b=".78"（应≈0.78）；T3 .w-rail filter="brightness(0.72) saturate(0.9)"（应含 brightness(0.78…)）；#missionCard filter="none"（焦点卡不压暗）
  ✓ PASS [A14] 点 #btnPlay 前 shell="shell focusing" 后 shell="shell focusing interacted"（应含 interacted）
  ✓ PASS [A6] 点专家模式后 body.tier=3（应=3），耗时≈226ms
  ✓ PASS [A7] 专家模式后刷新，body.tier=3（应恢复到 3）

--- 回归烟雾（既有功能不可破坏）---
  ✓ PASS [REG-mission] 任务卡 mName="守住防线" bar=0%
  ✓ PASS [REG-reset] 暂停=true → 重置后 第 0 轮（应第 0 轮）
  ✓ PASS [REG-seed] 投放癌细胞 64 → 67
  ✓ PASS [REG-kill] 划痕清除 67 → 44（控件可见=true）
  ✓ PASS [REG-inspect] 放大面板 meta="凋亡中细胞收缩变圆、折光增强，即将碎裂为凋亡小体。细胞类型正常细胞直径46.3 单位存活…"
  ✓ PASS [REG-virus] 投放病毒后病毒指标卡可见=true
  ✓ PASS [REG-speed] 4× 调速按钮可点击并激活=true
  ✓ PASS [REG-noerror] 全程未捕获异常 0 个

=== 判定: PASS — PASS 16 / FAIL 0 / NI 0 ===
```

### A11 · 两条跃迁路径可达 — PASS

```
=== A11 验收：层间跃迁第二条路可达 ===
target: index.html

  [T1→T2 顺序一 先拖后等] 拖5次 → 等到 step=66(reached60=true) → tier=2
  ✓ PASS [A11-T1toT2-顺序一(先拖后等)] 先拖5次再等60回合 → tier 1→2（step=66）
  [T1→T2 顺序二 先等后拖] 先等到 step=63(reached60=true) → 再拖5次 → tier=2
  ✓ PASS [A11-T1toT2-顺序二(先等后拖)] 先等60回合再拖5次 → tier 1→2（证明 simStep 内 step%20 补检生效）
  ✓ PASS [A11-T2toT3] T2 下依次碰 immune/nutrient/oxygen/chemo/virus 5 根滑块 → tier=3（应=3）
  ✓ PASS [A11-noerror] 两种顺序 + T2→T3 全程未捕获异常 0 个

=== A11 判定: PASS ✓ ===
```

### A3/A4 · 首战保底成功 → L2 解锁（≤3 输入） — PASS

```
=== A3/A4 验收：首战保底成功 → L2 解锁 ===
target: index.html

  第 1 题完成: 是，用时≈3.4s，轮数=200
  完成时 mName = "✓ 守住防线已完成"
  tier 完成瞬间=2 → 1s 后=2
  玩家输入次数（本地计数）= 2
  ✓ PASS [A4] 完成第 1 题后 tier→2（≤1s 内，实测同步）
  ✓ PASS [A3] 玩家输入次数 = 2（应 ≤3）
  ✓ 未捕获异常 0 个
```

### C · 硬约束核查 — PASS

```
=== 硬约束核查 ===
target: index.html

  ✓ PASS [C1a] 渲染层符号定义 与基线一致: phaseContrast/PHASE_OPTS/OUTLINE_COLORS/VIRUS_TINT
  ✓ PASS [C1b] 培养皿底色 .dishwrap background = #0d0e10（基线 #0d0e10，期望 #0d0e10）
  ✓ PASS [C2] 零依赖: <script src>=false import=false require()=false 外链=false
  ✓ PASS [C3a] 源码中 breathe 动画已删除
  ✓ PASS [C4] tier-1 下按 R：step 25 → 25（应保持不重置；门控生效）
  ✓ PASS [C3b] #btnPlay computed animation-name = "none"（应为 focusPulse 或 none，不得为 breathe/多套）
  ✓ PASS [C-nullerr] 核查过程未捕获异常 0 个

=== 硬约束判定: PASS ✓ ===
```

### AUDIT · 深度审计（工程声称 3 修复 + 2 设计冲突复核） — CONCERN

```
=== 深度审计（独立复验）===
target: index.html

  ✓ PASS [FIX-1] rAF 存活（drawChart 在 tick 内周期调用不抛）：轮数 1→25→43；未捕获异常=0
  ✓ PASS [FIX-3] tier=3；变异速度滑块 visible=true pointer-events=auto 行 pointer=auto 行 opacity=1 可改值=true
  ⚠ CONCERN [DC-1] Tier 2 **可操作**控件 = 15。§4.3 累计表上限=14（其表格未计入 #btnNext，但 §0.1 口径A 把它算作"任务卡按钮"之一）。锁壳预览（pointer-events:none，不计操作）= 1 [slider:mutation]。— 定性：§4.3「分批 ≤+3」 vs §11.9「全部 tier=2」的设计冲突；实现遵循 §11.9（唯一真值来源），可辩护，但 T1→T2 单跳新增较多，建议设计侧确认是否符合"每跳可消化"意图。
      T2 可操作明细: slider:nutrient, slider:oxygen, slider:immune, slider:chemo, slider:virus, #btnPlay, #btnHint, #btnNext, #btnStep, #btnReset, tool:inspect, tool:kill, tool:infect, preset, preset
  ✓ PASS [DC-2] L1 可见视觉块 = 6（A2 口径 ≤6）：dish, header, card:missionCard, card:envCard, ctrlBar, metricGroup

=== 深度审计判定: CONCERNS ⚠ DC-1 ===
```
