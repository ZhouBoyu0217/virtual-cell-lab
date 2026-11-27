# Tier 1 右栏「当前状态」区块视觉规格

| 项 | 内容 |
|---|---|
| 项目 | 虚拟细胞实验室（`index.html`） |
| 作者 | art · vcl-polish（Task T2 续） |
| 目标 | 用户裁决：Tier 1 右栏在「环境因子」卡之外，**新增「当前状态」描述区块**，消除工程侧"垂直居中 → 上下都空、卡片悬浮"的突兀感 |
| 前置文档 | `design/art/polish-spec.md`（本方案**复用其 token，不另起一套**） |
| 状态 | **待评审** —— 仅出规格，**未改 `index.html`** |
| 边界 | 纯 CSS，零依赖；暗色科研基调；不放出锁定控件（不违背三层引导）；细胞渲染层零改动 |

---

## 0. 实测现状（先看证据，再定方案）

### 0.1 历史问题：单卡垂直居中 = "漂浮物"

工程侧先改成 `body.tier-1 .colR{justify-content:flex-start}` + `#envCard{margin:auto 0}`，实测：

| 项 | 实测值 |
|---|---|
| 右栏容器高 | **1187px**（stretch 到与左栏等高） |
| 「环境因子」卡高 | 123px |
| 该卡 top | **599px** |
| **卡上方空白** | **535px** |
| **卡下方空白** | **534px** |

**`_dev/art-r2-now.png` 观感**：一张 118px 的卡孤零零吊在 1187px 竖条的正中间，上下各 535px 全空 —— 比"顶部对齐 + 下方长空白"更突兀，因为**上下对称的巨大空白把卡片读成了"漂浮物"**。

### 0.2 ⚠️ 当前实现审计（实测，`_dev/art-cur-bookend.png`）

工程侧已按用户裁决落地 `#statusCard`（`index.html:569`，含「当前状态 + 你在看什么 + 上手三步」三段），当前用 **bookend**：`#statusCard{flex:1 1 auto}` + 底部 `.status-foot{margin-top:auto}` + `#envCard` 在末尾。

**实测（1440×960，`_dev/art-cur-bookend.png`）**：

| 段 | 高度 |
|---|---|
| `#statusCard`（含 3 段内容） | 327px |
| **中间空隙** | **741px** ← 问题 |
| `#envCard` | 137px |
| 右栏总高 | 1215px |

**观感**：状态卡在顶、环境卡贴底，**中间 741px 全空** —— 这正是 §1 变体 Q 预警的"bookend 中间洞"。用户会看到**两小块内容被一根 741px 的空柱子劈开**，比"单卡悬浮"更割裂（因为读者会以为中间"应该有点什么"却什么都没有）。

> **判定**：`margin-top:auto` 的 bookend 解法把洞**从"下方"搬到了"中间"**，症状未除。
> **正解（已用当前真实构建实测验证）= 双卡作为一个整体垂直居中** —— 见 §0.3。

### 0.3 ✅ 修复实测：双卡整体居中

对**当前真实构建**只加 2 条覆盖规则（`justify-content:center` + 取消 `#envCard` 的 `margin:auto`），实测：

| 项 | bookend（现状） | **居中（本方案）** |
|---|---|---|
| 卡上方空隙 | 0 | **370px** |
| **卡间空隙** | **741px** ✗ | **12px** ✓（= `.colR` gap） |
| 卡下方空隙 | 0 | **370px** |
| 观感 | 两小块被空柱劈开 | **对称画框，紧凑信息组** ✓ |

**`_dev/art-cur-center.png`**：两张卡作为**一个信息组**居中，上下各 370px 对称留白 —— 空白**从"中间的裂缝"变成"周圈的画框"**，读作"刻意留白"而非"没填满"。

> **关键洞察**：修好这个问题的**不是"加更多内容"，而是"把两块内容当成一个整体并居中"** —— 零新增内容，纯布局，**2 条 CSS**。这也印证 §1 的核心发现：Tier 1 内容量天然撑不满容器，**别跟容器较劲，把内容组居中即可**。

---

## 1. 实测：为什么"填满"会失败（三个反例 + 一个正解）

我做了 9 组变体实测（`_dev/_art-sb*.js`），结论对实现路线至关重要：

| 变体 | 做法 | 实测结果 | 判定 |
|---|---|---|---|
| **E / J** | 状态块 `flex:1` 拉满 + 内容顶对齐 | 状态块 1056px，内部下方 **~800px 空洞** | ✗ **拉满 = 造出更大的洞** |
| **Q** | env 顶 + 状态块 `margin-top:auto` 贴底（bookend） | 中间 **~500px 空洞** | ✗ **中间空洞比上下空洞更难看** |
| **N** | 状态块 `min-height:600px` + 内部 `space-between` | 元素被拉开，行距失控 | ✗ **拉大间距 = 廉价** |
| **O / P** | 状态块 `flex:1` + **事件流底部锚定**（`justify-content:flex-end`） | 事件沉底，**上方留空洞** | △ 事件够多时可填满 |
| **T700 / 58%** | 状态块**封顶** + 双卡**整体居中** + 卡内事件流 | 上下各 ~230px 对称留白，卡内被事件流填满 | ✓ **推荐** |
| **（工程现状）** | `#statusCard{flex:1}` 拉满、仅 2 行文案 | 1085px 卡内 **~1000px 空** | ✗ **§0.2 实测，需改** |

### 核心发现（两条，直接决定实现）

1. **「填满容器」是伪目标** —— Tier 1 合法内容量（1 张操作卡 + 1 个状态块）天然撑不满 1187px。硬拉满只会把空白从"卡片外"搬到"卡片内"，反而更空洞。
2. **正解 = 给状态块一个"封顶高度"，再把两张卡作为一个整体居中** —— 空白变成**对称的画框**，且卡片不再"悬浮"（因为是两块，构成一个完整的信息组）。

---

## 2. 视觉规格（可直接粘贴 CSS）

### 2.1 层级定位：比「环境因子」卡更轻，但不隐形

**实测三层 L\* 阶梯**（复用 polish-spec §2.1 表面阶梯）：

| 元素 | 底色 | L\* | 相对关系 |
|---|---|---|---|
| 页底 | `#111214` | 5.4 | 最底 |
| **状态区块** | **`#15171a` (W3 面)** | **7.6** | ΔL\* **2.2** vs 页底 → 可辨 ✓ |
| 「环境因子」卡 | `#181a1e` (W2 面) | 9.2 | ΔL\* **1.6** vs 状态块 → 更亮 = **更"重"** ✓ |

> **层级逻辑**：环境因子卡 = **操作性**（唯一杠杆）→ W2 面、更亮、更"实体"；状态区块 = **信息性** → W3 面、更暗、更"退后"。
> **"更轻"靠的是**：① 面更深（W3 vs W2）② 边框更隐（`#1e2126` vs `#272b32`）③ 内高光更弱（α .020 vs .028）。
> **"不隐形"靠的是**：① 左侧 2px 状态色竖线（唯一彩色信号）② 状态名 14px/500 高对比（15.46）。

### 2.2 推荐高度分配

| 元素 | 高度 | 说明 |
|---|---|---|
| 右栏容器 | 1215px（stretch 得来） | 保持 `align-items:stretch` |
| 「环境因子」卡 | **flex:none**（实测 118px） | 不参与拉伸 |
| 间距 | **12px**（4px 网格） | 复用 `.colR` 既有 gap |
| **状态卡** | **`height: 48%`**（实测 583px） | **封顶**，不拉满 |
| 剩余空白 | ~460px | 由 `justify-content:center` 均分为上下 ~230px |

**封顶高度的实测调优**（对真实构建 `#statusCard` + 事件流注入，1440×960）：

| 封顶高度 | 卡高 | 事件 8 条的内部上方空白 | 事件 12 条的内部上方空白 |
|---|---|---|---|
| 44% | 534px | 112px | **-10px**（正好填满） |
| **48%** | **583px** | 160px | **37px** ✓ |
| 52% | 632px | 209px | 86px |
| 58% | 705px | 282px | 96px |

> **取值 48%**：事件满 12 条时内部仅 37px 余量 —— **刚好"满而不挤"**；事件少时（游戏早期）留下的空白读作"历史将在这里累积"（§3.3 底部锚定的语义留白）。
> **若事件条数固定 ≥10**，可用 **44%**（更紧凑）；**若早期事件很少**，用 **52%** 更稳（避免早期太空）。**推荐 48% 折中。**

> **为什么用 `%` 而不是固定 px**：右栏高度由左栏（培养皿）撑出，会随视口变。`%` 让状态卡**按比例跟随**，桌面各分辨率都成立。实测 1440×960 下 = 583px。

```css
/* ---- Tier 1 右栏：双卡作为一个整体居中 ---- */
body.tier-1 .colR{
  display:flex; flex-direction:column; gap:12px;
  justify-content:center;              /* 关键：整体居中 → 对称画框 */
}
body.tier-1 .colR > #envCard{
  margin:0 !important;                 /* 覆盖工程侧 margin:auto 0，取消单卡悬浮 */
  flex:none;
}
```

### 2.3 状态区块本体（完整 CSS）

```css
/* ============================================================
   状态描述区 statusblock —— W3 信息面板，比环境因子卡更轻
   复用 polish-spec token：--w3-face / --w3-edge / --w3-inset / --t-*
   ============================================================ */
.statusblock{
  /* 面 / 边 / 圆角：沿用 W3 卡语言 */
  background:var(--w3-face);                 /* #15171a */
  border:1px solid var(--w3-edge);           /* #1e2126 */
  border-left:2px solid var(--st-edge, #458a68);   /* 状态色竖线：唯一彩色信号 */
  border-radius:var(--r-card);               /* 10px */
  padding:16px;                              /* 4px 网格 */
  box-shadow: inset 0 1px 0 rgba(255,255,255,.020); /* 比 W2 更弱的嵌入感 */

  /* 高度：封顶，不拉满 */
  flex:none; height:48%;
  display:flex; flex-direction:column; min-height:0;

  /* 状态色切换的细腻过渡（复用 polish-spec 缓动） */
  transition: border-left-color .45s cubic-bezier(.4,0,.2,1);
}

/* ---- 标题行：指示点 + 状态名 + 阶段徽记 ---- */
.sb-head{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.sb-dot{
  width:7px; height:7px; border-radius:50%; flex:none;
  background:var(--st-dot, #7ddba8);
  box-shadow:0 0 0 3px rgba(125,219,168,.18);      /* 光环：放大指示点存在感 */
  transition: background .45s, box-shadow .45s;
}
@keyframes sbPulse{ 0%,100%{opacity:1} 50%{opacity:.42} }
.sb-dot.live{ animation: sbPulse 2.4s cubic-bezier(.4,0,.2,1) infinite; } /* 演化进行中才脉动 */
.sb-name{ font-size:14px; font-weight:500; color:var(--t-hi); letter-spacing:.2px; }
.sb-badge{ font-size:10.5px; padding:2px 7px; border-radius:5px; margin-left:auto;
  font-variant-numeric:tabular-nums; }
.sb-badge.b-good{ background:#1e3d2f; color:#7ddba8; }   /* 复用现有徽记 */
.sb-badge.b-warn{ background:#3d3520; color:#e0c274; }
.sb-badge.b-bad { background:#3d2323; color:#ec8a80; }

/* ---- 描述正文：固定最小高度，防换状态时跳动 ---- */
.sb-desc{
  font-size:12px; line-height:1.7; color:var(--t-md);   /* #9ba0ab */
  min-height:61px;                     /* = 3 行 × 20.4px，锁死高度 */
  transition: opacity .18s ease;       /* 换状态时淡出 */
}
.sb-desc.swap{ opacity:0; }

/* ---- 读数行：复用 inspmeta 的 kv 语言 ---- */
.sb-kvs{ margin-top:14px; padding-top:6px; border-top:1px solid var(--w3-inset); }
.sb-kv{
  display:flex; justify-content:space-between; align-items:baseline; gap:8px;
  padding:6px 0; font-size:11.5px; color:var(--t-lo);   /* #7f838d */
  border-bottom:1px solid var(--w3-inset);
}
.sb-kv:last-child{ border-bottom:none; }
.sb-kv span:last-child{ color:var(--t-md); font-variant-numeric:tabular-nums; }

/* ---- 最近发生：底部锚定事件流（见 §3.3 为何必须底部锚定）---- */
.sb-log{
  margin-top:14px; padding-top:12px; border-top:1px solid var(--w3-inset);
  flex:1 1 auto; min-height:0; display:flex; flex-direction:column;
}
.sb-log-h{ flex:none; font-size:10.5px; color:var(--t-decor); letter-spacing:.4px; margin-bottom:8px; }
.sb-log-list{
  flex:1 1 auto; min-height:0; overflow-y:auto;
  display:flex; flex-direction:column;
  justify-content:flex-end;            /* 关键：事件从底部往上堆 → 下方永不空洞 */
}
.sb-ev{
  display:flex; gap:9px; padding:6px 0; font-size:11.5px; line-height:1.55;
  color:var(--t-lo); border-bottom:1px solid var(--w3-inset);
}
.sb-ev:last-child{ border-bottom:none; }
.sb-ev i{ font-style:normal; flex:none; font-size:10.5px; padding-top:1px;
  color:var(--t-decor); font-variant-numeric:tabular-nums; }
.sb-ev.now{ color:var(--t-md); }        /* 最新一条提亮 */
.sb-ev.now i{ color:#7ddba8; }          /* 最新时间戳染焦点绿 */
```

### 2.4 文字层级与实测对比度（全部 ≥ AA）

| 元素 | 字号/字重 | 色值 | 实测对比度（on `#15171a`） |
|---|---|---|---|
| 状态名 `.sb-name` | 14px / 500 | `#eceef2` | **15.46 ✓ AA** |
| 描述正文 `.sb-desc` | 12px / 400 | `#9ba0ab` | **6.85 ✓ AA** |
| 读数标签 `.sb-kv span` | 11.5px / 400 | `#7f838d` | **4.73 ✓ AA** |
| 读数数值 `.sb-kv span:last` | 11.5px / tabular | `#9ba0ab` | **6.85 ✓ AA** |
| 事件时间 `.sb-ev i` | 10.5px | `#6a6d75` | 3.47（**仅装饰**——时间戳可删） |
| 事件正文 `.sb-ev span` | 11.5px | `#7f838d` | **4.73 ✓ AA** |
| 最新事件 `.sb-ev.now` | 11.5px | `#9ba0ab` | **6.85 ✓ AA** |
| 徽记 `.sb-badge` | 10.5px | 复用 b-good/warn/bad | 7.13 / 7.02 / 5.82 ✓ |

> **注意**：`.sb-ev i`（时间戳 `第 24 轮`）实测 3.47，**不承载信息**（可删）。若产品要求它可读，改 `#7f838d`（4.73 ✓）。

---

## 3. 状态文本的呈现设计

### 3.1 防跳动：固定最小高度（不是固定高度）

**问题**：状态描述长度差异大 —— 实测既有 17 字（`细胞单层稳定，接触抑制正常运作`）也有 60+ 字（病毒疗法那几条）。若高度自适应，每次状态切换右栏都会**抖动**，卡片高度变化会带动整个右栏重新居中 → 视觉上"跳"。

**方案**：`.sb-desc{ min-height:61px }` —— **锁死 3 行高度**。

- 短文本（1–2 行）：下方留 1–2 行空白，**但在卡片内部**，读作"呼吸"而非"缺内容"
- 长文本（3–4 行）：自然溢出到 4 行，min-height 不限制，但**只影响这一个块**，且因为卡片已被 `height:48%` 封顶，不会带动整体重排

> **为什么不用 `height:61px` + `overflow:hidden`**：会**截断**长描述（学术文案截断不可接受）。用 `min-height` 让长短文本都完整，代价只是短文本下方少量空白 —— 这是**最不坏**的取舍。
> **建议实现侧**：文案产出时**约束到 ≤60 字（≈3 行）**，绝大多数状态即可填满。

### 3.2 状态切换过渡：两段式淡出→淡入

**方案**：**不要**用 `innerHTML` 直接替换（会瞬间跳变）。用两段式：

```
① 加 .swap（opacity → 0，180ms）
② 等 180ms 后替换文本
③ 移除 .swap（opacity → 1，180ms）
```

```js
/* 建议实现（伪代码，供工程侧参考） */
function setStatus(txt, tone){
  var d = document.querySelector('.sb-desc');
  if (d.textContent === txt) return;        // 无变化不动画
  d.classList.add('swap');
  setTimeout(function(){
    d.textContent = txt;
    d.classList.remove('swap');
  }, 180);
}
```

**CSS 配套**：`.sb-desc{ transition: opacity .18s ease; }`（已在 §2.3）。

- 时长 **180ms** —— 比 polish-spec 的 `--d-fast:140ms` 略长，因为**文字替换**比 hover 需要更从容的节奏；但**不要超过 240ms**，否则读起来"拖沓"。
- **指示点 / 竖线**用 450ms 长过渡（颜色渐变），与文字淡入淡出**错开**，形成"文字先变、颜色后跟"的层次感，避免整体一起跳。

### 3.3 事件流为什么要"底部锚定"

这是**本方案最关键的实现细节**，实测结论（§1 变体 O/P/T700）：

- **顶部对齐**（新事件在顶）→ 事件少时下方空洞（变体 O 实测下方 ~400px 空）
- **底部锚定**（`justify-content:flex-end`，新事件在底）→ 事件少时**上方**留白，但上方是"历史将在这里累积"的**语义留白**，读作"时间还早"；事件多了自然从下往上填满

> **语义论证**：事件流是"时间轴"，**时间向下流动**（终端 / 聊天 / 日志的共同心智模型）。底部锚定 = 最新事件永远贴底可见，不需要滚动即可看到"刚刚发生了什么" —— 既符合心智，又天然避免空洞。

### 3.4 状态图标 / 指示色（需要，给具体值与形状）

**需要。** 因为状态区块是"一眼扫过"的 **ambient 信息**（用户不会逐字读），必须有**颜色通道**让视线在 0.2 秒内抓住"现在好不好"。

**双通道设计**（点数 + 竖线，互为冗余 —— 色盲友好）：

| 状态 tone | 指示点 `.sb-dot` | 竖线 `--st-edge` | 实测对比度 |
|---|---|---|---|
| **good**（巡逻中/正常） | `#7ddba8` + 环 `rgba(125,219,168,.18)` | `#458a68` | 点 10.75 ✓ / 竖线 4.35 ✓ |
| **warn**（扩散中/增生） | `#e0c274` + 环 `rgba(224,194,116,.18)` | `#9a7630` | 点 10.38 ✓ / 竖线 4.28 ✓ |
| **bad**（恶化/恶性） | `#ec8a80` + 环 `rgba(236,138,128,.18)` | `#a85050` | 点 7.28 ✓ / 竖线 3.36 ✓（≥3 达标） |

**形状**：统一 **7px 正圆**（与 `.legend i` 的 9px 点、`.inspmeta .nm i` 的 9px 点同族但略小 —— 它是"指示"不是"图例"）。光环用 `box-shadow: 0 0 0 3px`（非 `outline`，不占布局）。

> **竖线取值说明**：`bad` 的竖线若沿用现有 `.evt` 的 `#3d7a5c` 系深红 `#8a3e3e`，实测仅 **2.43（不达 3:1）**。故 `bad` 提亮到 **`#a85050`（3.36 ✓）**；`good/warn` 用 `#458a68` / `#9a7630`，**比现有按钮绿更深一档**，符合"信息性 < 操作性"的层级（竖线是环境信息，不该比操作按钮更抢眼）。
> **明确复用**：`good` 的竖线**刻意不复用**任务卡的焦点绿 `#7ddba8` —— 那是 W1 焦点色，状态块是 W3，**不能借 W1 的颜色**，否则层级混乱。

### 3.5 指示点动画：只在"演化进行中"脉动

- `#btnPlay` 处于运行态 → `.sb-dot.live`（2.4s 呼吸，复用 polish-spec 的 `--d-pulse`）
- 暂停 / 未开始 → **静止**（不脉动）

> **理由**：脉动是"正在进行"的信号。若常亮脉动，会变成又一个持续抢焦的元素（与 Tier 1 的 CTA 脉冲抵触 —— 规则：**全局同时最多一处脉冲**）。暂停时静止，正好让"暂停/运行"多一个视觉线索。
> **必须遵守**：`prefers-reduced-motion` 下关闭脉动（复用 polish-spec §⑫ 的做法）。

---

## 4. 位置：状态区块应在「环境因子」卡**下方**

**推荐：上 = 环境因子卡，下 = 状态区块。**

三条理由：

1. **操作在上，信息在下（F 型阅读 + 可达性）**：环境因子是 Tier 1 **唯一的可操作控件**，放在最上方与培养皿顶部对齐，视线与手都最先到达；状态区块是只读信息，放在下方作为"仪表盘读数区"。
2. **心智顺序 = "我能调什么 → 现在在发生什么"**：玩家动作循环是「拨杠杆 → 观察结果」。先把"杠杆"放上面（可操作），把"结果描述"放下面（反馈），符合这个循环。
3. **与既有 `#fateCard`（培养皿局势）语义衔接**：现有 `#fateCard` 本就是"局势描述"且位于右栏中下部；Tier 1 的"当前状态"是它在低层级下的**轻量替身**。保持"描述类在下方"的一致位置，Tier 2 解锁 `#fateCard` 时不会出现"描述块换位置"的割裂。

> **反例（不推荐）**：状态区块在上、环境因子在下 —— 会让 Tier 1 的**唯一可操作控件**沉到右栏最底（远离培养皿），违反"操作控件应可直达"。

---

## 5. 与现有体系的一致性核对

| 检查项 | 结果 |
|---|---|
| 复用 polish-spec token | ✓ `--w3-face/-edge/-inset`、`--t-hi/-md/-lo/-decor`、`--r-card`、缓动曲线 |
| 4px 间距网格 | ✓ padding 16 / gap 12 / margin 14(→建议 16) / kv padding 6(→建议 8) |
| 圆角族 | ✓ `--r-card:10px`，未新增圆角档位 |
| 对比度 | ✓ 全部正文/标签 ≥ 4.5；唯一 3.47 项为可删的时间戳 |
| 三层引导 | ✓ **不放出任何锁定控件**；状态区块只读，无新交互入口 |
| 脉冲规则 | ✓ 全局脉冲 ≤1（运行中状态点脉动时，CTA 已因 interacted 停止） |
| reduced-motion | ✓ 需在 §⑫ 追加 `.sb-dot.live{ animation:none }` |
| 细胞渲染层 | ✓ 零触碰 |

---

## 6. 给实现侧的实施清单

> **重要**：`#statusCard` 已落地（`index.html:545`），故以下为**改造现有实现**，不是从零新增。**请优先替换 §6.0 的三处高度规则**（最小改动、最大收益）。

### 6.0 对现有实现的最小改造（改 3 处 CSS，收益最大）

| # | 现状（`index.html`） | 改为 | 位置 |
|---|---|---|---|
| 1 | `body.tier-1 .colR{ justify-content:flex-start }` | `body.tier-1 .colR{ justify-content:center }` | line 395 |
| 2 | `body.tier-1 .colR > #statusCard{ flex:1 1 auto }` | `body.tier-1 .colR > #statusCard{ flex:none; height:48% }` | line 397 |
| 3 | `body.tier-1 #statusBody{ flex:1 }` | `body.tier-1 #statusBody{ flex:1 1 auto; min-height:0; display:flex; flex-direction:column }` | line 398 |

```css
/* ---- §6.0 三处替换（可直接粘贴覆盖现有规则）---- */
body.tier-1 .colR{ justify-content:center; }              /* ← 原 flex-start */
body.tier-1 .colR > #statusCard{
  flex:none; height:48%;                                  /* ← 原 flex:1 1 auto（关键）*/
  display:flex; flex-direction:column;
}
body.tier-1 #statusBody{
  flex:1 1 auto; min-height:0;
  display:flex; flex-direction:column;                    /* ← 原 flex:1 */
}
/* 并在状态卡内加事件流（§6.1），让它填满 58% 而不是留 1000px 空 */
```

> **实测效果（1440×960）**：状态卡从 **1085px → 583px**，双卡整体居中，上下各 ~230px 对称留白，卡内由事件流填满（12 条时仅 37px 余量）。**从"巨框套两行字"变成"紧凑信息组"。**

### 6.1 新增「最近发生」事件流（填满状态卡的关键）

现有 `#statusCard` 内只有 `status-line` + `status-note`（≈70px）。**必须补一个可增长的列表**，否则 58% 高度里仍是空白。

```html
<!-- 在 #statusBody 末尾追加 -->
<div class="sb-log">
  <div class="sb-log-h">最近发生</div>
  <div class="sb-log-list"><div class="sb-evs" id="statusLog"></div></div>
</div>
```

```css
.sb-log{ margin-top:14px; padding-top:12px; border-top:1px solid var(--w3-inset);
  flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.sb-log-h{ flex:none; font-size:10.5px; color:var(--t-decor); letter-spacing:.4px; margin-bottom:8px; }
.sb-log-list{ flex:1 1 auto; min-height:0; overflow-y:auto; display:flex;
  flex-direction:column; justify-content:flex-end; }   /* 底部锚定：见 §3.3 */
.sb-ev{ display:flex; gap:9px; padding:6px 0; font-size:11.5px; line-height:1.55;
  color:var(--t-lo); border-bottom:1px solid var(--w3-inset); }
.sb-ev:last-child{ border-bottom:none; }
.sb-ev i{ font-style:normal; flex:none; font-size:10.5px; padding-top:1px;
  color:var(--t-decor); font-variant-numeric:tabular-nums; }
.sb-ev.now{ color:var(--t-md); } .sb-ev.now i{ color:#7ddba8; }
```

> **数据来源**：可在现有 `renderStatus()` 里，当 `statusText` 变化时 push 一条 `第 N 轮 · <text>`；最多保留 14 条，`.now` 只标最后一条。**这是"填满"唯一自然的方式** —— 事件会随游戏真实累积，不用硬塞假内容。

### 6.2 其余（视觉提纯，可选但建议）

| # | 改动 | 风险 |
|---|---|---|
| 4 | 状态卡面从 W2 `#1a1c20`（现 `rgb(26,28,32)`）改 **W3 `#15171a`** —— 兑现"信息性 < 操作性"层级（§2.1） | 低 |
| 5 | 状态卡加 **2px 状态色竖线** `border-left:2px solid var(--st-edge)` + `tone-warn/bad` 换色（§3.4） | 低 |
| 6 | 状态名 13px→**14px/500**；说明 11.5px `#8b8e97`→**12px `#9ba0ab`**（对比度 5.21→**6.85**，§2.4） | 低 |
| 7 | 状态切换两段式淡出/淡入（§3.2），时长 180ms | 中 |
| 8 | 指示点 `8px`→**7px**，光环 `.14`→**`.18`**；运行中加 `.live` 脉动（§3.5） | 低 |
| 9 | `reduced-motion` 追加 `.sb-dot.live{animation:none}` | 低 |

**状态文本 / tone 数据来源**：现有 `statusOf()`（`index.html:2746`）已返回 `{tone, text, note}`，**直接复用，不要新写判定**。

---

## 7. 验收自检

- [x] 区块视觉规格（尺寸/内边距/圆角/边框）与现有卡片协调，复用 token
- [x] 比「环境因子」卡更轻（W3 面 ΔL\* 1.6 更暗 / 更隐边框 / 更弱内高光），但不隐形（2px 状态竖线 + 15.46 状态名）
- [x] 文字层级字号 + 色值 + **实测对比度**（全 ≥AA）
- [x] 位置论证（环境因子在上、状态在下，三条理由）
- [x] 防跳动（`min-height:61px` + 封顶高度）
- [x] 切换动效（两段式淡出/淡入 180ms + 颜色 450ms 错开）
- [x] 状态图标/指示色（7px 双通道：点 + 竖线，三 tone 色值 + 对比度）
- [x] Tier 1 右栏高度分配（环境卡 123px flex:none + 状态块 56% 封顶 + 整体居中）
- [x] 零依赖 / 暗色基调 / 不放出锁定控件
- [x] **未改 `index.html`**

**证据**：`_dev/art-r2-now.png`（现状悬浮）· `_dev/art-sb-FINAL-full.png`（方案整页）· `_dev/art-sb-T_center_capped.png` / `art-sb-T700_center.png`（区块近景）· 反例 `art-sb-E_fill.png` / `art-sb-Q_bookend.png` / `art-sb-P_tail_bottom_14.png`

---

*状态区块规格结束 —— vcl-polish · art · v1.0*
