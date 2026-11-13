// incomelens —— 多收入源个人 AI 财务顾问（A组真空②组件化）
// 定位：为一人公司/多副业个人做的收入健康仪表。不用 AGPL 的 sure，
// 自实现三条规则（源自正明 Meta-Cog OS）：
//   R-杠铃: 单一收入源占比过高 = 脆弱
//   R-遍历性(0.03): 现金跑道 < 6 个月 = 生存红线告警
//   R-证据: 每个结论带计算式，拒绝黑箱数字
// 零依赖。MIT。
import fs from 'node:fs';

// 台账条目: { date:'2026-11-01', source:'AI音乐课', amountCNY:+2990, kind:'income'|'expense', track:'main'|'side'|'infra' }
export function validateEntry(e, i) {
  const errs = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) errs.push(`entry[${i}] date 格式须 YYYY-MM-DD`);
  if (typeof e.amountCNY !== 'number' || Number.isNaN(e.amountCNY) || e.amountCNY === 0) errs.push(`entry[${i}] amountCNY 须为非零数字`);
  if (!['income', 'expense'].includes(e.kind)) errs.push(`entry[${i}] kind 须 income|expense`);
  if (!['main', 'side', 'infra'].includes(e.track)) errs.push(`entry[${i}] track 须 main|side|infra`);
  if (!e.source) errs.push(`entry[${i}] 缺 source`);
  return errs;
}

export function buildLedger(entries) {
  const errors = entries.flatMap((e, i) => validateEntry(e, i));
  return { ok: errors.length === 0, errors, entries };
}

// 汇总：按 source 聚合收入与支出（约定：expense 条目 amountCNY 为负值，聚合时取绝对值展示）
export function summarize(ledger) {
  const bySource = new Map();
  for (const e of ledger.entries) {
    if (!bySource.has(e.source)) bySource.set(e.source, { income: 0, expense: 0 });
    const b = bySource.get(e.source);
    if (e.kind === 'income') b.income += e.amountCNY;
    else b.expense += Math.abs(e.amountCNY);
  }
  return [...bySource.entries()].map(([source, b]) => ({
    source, incomeCNY: b.income, expenseCNY: b.expense, netCNY: b.income - b.expense,
  })).sort((a, b) => b.incomeCNY - a.incomeCNY);
}

// 规则引擎：返回 warnings（每条带证据计算式）
export function rules(ledger, summary, { cashCNY, monthlyBurnCNY, barbellMaxPct = 40 } = {}) {
  const warnings = [];
  const totalIncome = summary.reduce((s, x) => s + x.incomeCNY, 0);
  if (totalIncome > 0) {
    for (const s of summary) {
      const pct = Math.round((s.incomeCNY / totalIncome) * 100);
      if (pct >= barbellMaxPct && summary.length > 1) {
        warnings.push({
          rule: 'R-杠铃', level: pct >= 80 ? 'RED' : 'AMBER',
          evidence: `${s.source} 收入占比=${pct}%（阈值${barbellMaxPct}%），单一收入源 ${summary.length > 1 ? '过度集中' : '孤源'}`,
        });
      }
    }
  }
  if (typeof cashCNY === 'number' && typeof monthlyBurnCNY === 'number' && monthlyBurnCNY > 0) {
    const runway = Math.floor(cashCNY / monthlyBurnCNY);
    if (runway < 6) warnings.push({ rule: 'R-遍历性0.03', level: 'RED', evidence: `跑道=${runway}个月（现金${cashCNY}/月耗${monthlyBurnCNY}），<6 个月=生存红线` });
    else if (runway < 12) warnings.push({ rule: 'R-遍历性0.03', level: 'AMBER', evidence: `跑道=${runway}个月，<12 个月黄灯` });
  }
  const expenses = ledger.entries.filter(e => e.kind === 'expense' && e.track === 'main');
  const mainSpend = expenses.reduce((s, x) => s + Math.abs(x.amountCNY), 0);
  if (typeof cashCNY === 'number' && cashCNY > 0 && mainSpend / cashCNY > 0.10) {
    warnings.push({ rule: 'R-杠铃仓位', level: 'AMBER', evidence: `主赛道投入占比=${Math.round((mainSpend / cashCNY) * 100)}%（铁律 ≤10%），计算: ${mainSpend}/${cashCNY}` });
  }
  return warnings;
}

// 报告双形态：Markdown（人读）+ JSON（机读）
export function renderMarkdown(ledger, summary, warnings) {
  const lines = ['# 多收入源健康报告', '', '| 收入源 | 收入 | 支出 | 净额 |', '|---|---|---|---|'];
  for (const s of summary) lines.push(`| ${s.source} | ¥${s.incomeCNY} | ¥${s.expenseCNY} | ¥${s.netCNY} |`);
  lines.push('', '## 规则告警', '');
  if (!warnings.length) lines.push('- 无告警：杠铃配置与遍历性均达标');
  for (const w of warnings) lines.push(`- [${w.level}] ${w.rule}: ${w.evidence}`);
  return lines.join('\n');
}

export function report(entries, opts = {}) {
  const ledger = buildLedger(entries);
  if (!ledger.ok) return { ok: false, errors: ledger.errors };
  const summary = summarize(ledger);
  const warnings = rules(ledger, summary, opts);
  return { ok: true, summary, warnings, markdown: renderMarkdown(ledger, summary, warnings) };
}

// CLI: node incomelens.mjs selftest | node incomelens.mjs <ledger.json>
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const a = process.argv[2];
  if (a === 'selftest') { await import('../test/selftest.mjs'); }
  else if (a && fs.existsSync(a)) {
    const j = JSON.parse(fs.readFileSync(a, 'utf8'));
    const r = report(j.entries, j.opts || {});
    if (!r.ok) { r.errors.forEach(e => console.error(e)); process.exit(1); }
    console.log(r.markdown);
  } else { console.error('用法: node incomelens.mjs selftest|<ledger.json>'); process.exit(2); }
}
