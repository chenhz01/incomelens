# incomelens · Agent 第二入口

- **这是什么**：多收入源个人 AI 财务顾问。台账 JSON 进 → 三规则引擎（R-杠铃 / R-遍历性 0.03 / R-杠铃仓位）→ 逐条带计算式的告警 + Markdown 报告。
- **入口**：人类读 [README.md](./README.md)；机器先跑 `node test/selftest.mjs`（9/9 PASS exit=0）再读 `src/incomelens.mjs`。
- **证据目录**：逐维门禁表 [DESIGN.md](./DESIGN.md)（REV70 双七制，无综合分；D6 缺口如实挂牌）。
- **改动约定**：规则阈值改动必须留 git 提交说明依据；新增规则必须带触发用例与计算式断言。
- **讨论入口**：阈值默认值（40%/10%/6 月）是否适合你的业务结构？跑出不同告警？开 issue 附台账片段，逐条对账。请勿刷 issue。
