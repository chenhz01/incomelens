// incomelens selftest
import assert from 'node:assert';
import { buildLedger, summarize, report } from '../src/incomelens.mjs';

const results = [];
const t = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', `${name} :: ${e.message}`]); } };

const good = [
  { date: '2026-11-01', source: 'AI音乐课', amountCNY: 2990, kind: 'income', track: 'main' },
  { date: '2026-11-03', source: '跨境电商AI服务', amountCNY: 980, kind: 'income', track: 'side' },
  { date: '2026-11-05', source: 'AI音乐课', amountCNY: -150, kind: 'expense', track: 'main' },
  { date: '2026-11-06', source: '服务器', amountCNY: -50, kind: 'expense', track: 'infra' },
];

t('合法台账通过', () => { const l = buildLedger(good); assert.equal(l.ok, true); });
t('非法条目逐条报错不静默', () => {
  const l = buildLedger([{ date: 'bad', amountCNY: 0, kind: 'x', track: 'y' }]);
  assert.equal(l.ok, false);
  assert.equal(l.errors.length, 5); // date错+amount零+kind错+track错+source缺
  assert.ok(l.errors.every(e => e.startsWith('entry[0]')));
});
t('按源聚合净额正确', () => {
  const s = summarize(buildLedger(good));
  const music = s.find(x => x.source === 'AI音乐课');
  assert.equal(music.netCNY, 2840);
});
t('R-杠铃：单源占比 75% 触发 AMBER', () => {
  const r = report([...good, { date: '2026-11-08', source: '带货', amountCNY: 10, kind: 'income', track: 'side' }], {});
  const w = r.warnings.find(x => x.rule === 'R-杠铃');
  assert.ok(w && w.evidence.includes('75%'));
});
t('R-遍历性：跑道 <6 月触发 RED', () => {
  const r = report(good, { cashCNY: 20000, monthlyBurnCNY: 5000 }); // 4个月
  const w = r.warnings.find(x => x.rule === 'R-遍历性0.03');
  assert.ok(w && w.level === 'RED' && w.evidence.includes('4个月'));
});
t('R-遍历性：跑道 34 月无告警', () => {
  const r = report(good, { cashCNY: 170000, monthlyBurnCNY: 5000 });
  assert.ok(!r.warnings.some(x => x.rule === 'R-遍历性0.03'));
});
t('主赛道投入 >10% 触发杠铃仓位告警', () => {
  const entries = [...good, { date: '2026-11-09', source: '设备采购', amountCNY: -20000, kind: 'expense', track: 'main' }];
  const r = report(entries, { cashCNY: 100000, monthlyBurnCNY: 5000 });
  assert.ok(r.warnings.some(x => x.rule === 'R-杠铃仓位'));
});
t('报告含 Markdown 表格与告警段', () => {
  const r = report(good, { cashCNY: 20000, monthlyBurnCNY: 5000 });
  assert.ok(r.markdown.includes('| 收入源 |') && r.markdown.includes('## 规则告警'));
});
t('确定性：两次运行摘要一致', () => {
  const a = report(good, { cashCNY: 20000, monthlyBurnCNY: 5000 });
  const b = report(good, { cashCNY: 20000, monthlyBurnCNY: 5000 });
  assert.deepEqual(a.summary, b.summary);
});

let fail = 0;
for (const [s, n] of results) { console.log(`${s}  ${n}`); if (s === 'FAIL') fail++; }
console.log(`incomelens selftest: ${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
