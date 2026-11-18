import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCsv, columns } from '../fieldwork.js';

// Synthetic fixtures are ONLY for tests, never assignment evidence.
const header = columns.join(',');
const row = (id, minutes, category = 'groceries') => `${id},2026-11-17T10:00:00+05:30,Test market,Test hostel round trip,${category},${minutes},Synthetic automated test`;
test('reports median, source IDs and insufficient sample groups', () => {
  const report = analyzeCsv([header, row('a', 10), row('b', 14), row('c', 90), row('d', 4, 'stationery')].join('\n'));
  assert.equal(report.estimates[0].estimatedMinutes, 14);
  assert.deepEqual(report.estimates[0].observationIds, ['a', 'b', 'c']);
  assert.equal(report.estimates[1].estimatedMinutes, null);
  assert.equal(report.meetsRowCount, false);
});
test('rejects invalid durations, duplicate IDs and missing timezone without hiding errors', () => {
  const report = analyzeCsv([header, row('a', 10), row('a', 12), row('c', -3), row('d', 5).replace('+05:30', ''), row('e', 'NaN')].join('\n'));
  assert.equal(report.validRows, 1);
  assert.deepEqual(report.errors.map(e => e.record), [3, 4, 5, 6]);
});
test('supports quoted commas and distinguishes 20 valid observations from 20 submitted rows', () => {
  const rows = Array.from({ length: 20 }, (_, i) => row(`test-${i}`, i + 1).replace('Test market', '"Test market, west"'));
  assert.equal(analyzeCsv([header, ...rows].join('\r\n')).meetsRowCount, true);
  rows[0] = row('bad', 0);
  assert.equal(analyzeCsv([header, ...rows].join('\n')).meetsRowCount, false);
});
test('empty evidence produces no invented output; threshold is configurable', () => {
  assert.equal(analyzeCsv(header).estimates.length, 0);
  assert.equal(analyzeCsv([header, row('a', 12)].join('\n'), { minSamples: 1 }).estimates[0].estimatedMinutes, 12);
  assert.throws(() => analyzeCsv('wrong,header'), /header/);
  assert.throws(() => analyzeCsv(header, { minSamples: 0 }), /positive integer/);
  assert.throws(() => analyzeCsv(`${header}\n"unclosed`), /Invalid CSV/);
  assert.equal(analyzeCsv([header, row('a', 12).replace('2026-11-17', '2026-02-30')].join('\n')).errors.length, 1);
});
