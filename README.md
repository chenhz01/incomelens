# incomelens — 多收入源个人 AI 财务顾问

[![selftest](https://img.shields.io/badge/selftest-9%2F9%20PASS-brightgreen)](./test/selftest.mjs) [![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

**解决什么问题**：开源个人财务 app 的头部项目（14k★，全场增速第二）证明「个人多收入源管理」是真需求，但它有两个不满足：① 单机账本思维，不适配「一人公司多业务线」结构；② 许可 AGPL-3.0 挡住了商业跟风。incomelens 自实现，MIT，专为「同时跑 3-5 条副业线的个人」设计。

## 三条规则引擎（不是黑箱打分，每条告警带计算式）

| 规则 | 判定 | 告警示例 |
|---|---|---|
| R-杠铃 | 单一收入源占比 ≥40% AMBER / ≥80% RED | `AI音乐课 收入占比=75%（阈值40%），过度集中` |
| R-遍历性 0.03 | 现金跑道 <6 月 RED / <12 月 AMBER | `跑道=4个月（现金20000/月耗5000），生存红线` |
| R-杠铃仓位 | 主赛道投入 >10% 总资金 AMBER | `主赛道投入占比=20%（铁律 ≤10%）` |

## 快速开始

```bash
node src/incomelens.mjs selftest          # 9/9 PASS
node src/incomelens.mjs my-ledger.json    # 台账 → Markdown 报告
```

台账格式：`{ entries: [{ date, source, amountCNY(支出为负), kind: 'income'|'expense', track: 'main'|'side'|'infra' }], opts: { cashCNY, monthlyBurnCNY } }`

## 复现挑战（欢迎来吵）

`node test/selftest.mjs` 一条命令复现 9/9。**认为阈值定错了（40%/10%/6 月）、或有你的收入结构跑出的反例，直接开 issue 附台账片段，逐条对账**——真讨论比 star 有用。

## 设计

按 REV70 双七发表门禁逐维表自查（D1–D7 工程尺 × F1–F7 发表族，**无综合分**）见 [DESIGN.md](./DESIGN.md)；Agent 入口见 [AGENTS.md](./AGENTS.md)。

## 未做清单（边界）

- 不做记账录入 UI（输入就是 JSON，导入层交给使用者）
- 不做投资建议（凯利仓位/具体标的——那是另一个组件的事）
- 不联网拉账单（CSV/JSON 手工导入，避免凭证进入第三方）
