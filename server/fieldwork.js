import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';

export const columns = ['observation_id', 'observed_at', 'place', 'route', 'category', 'duration_minutes', 'collection_note'];

export function analyzeCsv(csv, { minSamples = 3 } = {}) {
  if (!Number.isInteger(minSamples) || minSamples < 1) throw new Error('minSamples must be a positive integer.');
  let records;
  try { records = parse(csv, { bom: true, skip_empty_lines: true, trim: true }); }
  catch (error) { throw new Error(`Invalid CSV: ${error.message}`); }
  if (!records.length || records[0].join(',') !== columns.join(',')) throw new Error(`CSV header must be: ${columns.join(',')}`);
  const errors = [];
  const seen = new Set();
  const valid = [];
  records.slice(1).forEach((row, index) => {
    const record = index + 2;
    const reject = message => errors.push({ record, message });
    if (row.length !== columns.length) return reject(`Expected ${columns.length} columns.`);
    const entry = Object.fromEntries(columns.map((key, i) => [key, row[i]]));
    if (Object.values(entry).some(value => !value || value.length > 1000)) return reject('Every field is required and must be at most 1000 characters.');
    if (seen.has(entry.observation_id)) return reject('Duplicate observation_id.');
    seen.add(entry.observation_id);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(entry.observed_at) || !Number.isFinite(Date.parse(entry.observed_at))) return reject('observed_at must be an ISO timestamp including timezone.');
    const [year, month, day] = entry.observed_at.slice(0, 10).split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return reject('observed_at contains an impossible calendar date.');
    if (!/^\d+(?:\.\d+)?$/.test(entry.duration_minutes) || Number(entry.duration_minutes) <= 0 || Number(entry.duration_minutes) > 1440) return reject('duration_minutes must be greater than 0 and at most 1440.');
    valid.push({ ...entry, duration_minutes: Number(entry.duration_minutes) });
  });
  const grouped = new Map();
  for (const row of valid) {
    const key = JSON.stringify([row.place, row.route, row.category]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const estimates = [...grouped.values()].map(rows => {
    const times = rows.map(row => row.duration_minutes).sort((a, b) => a - b);
    const middle = Math.floor(times.length / 2);
    const median = times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
    return {
      place: rows[0].place, route: rows[0].route, category: rows[0].category,
      samples: times.length, status: times.length >= minSamples ? 'observed estimate' : 'insufficient data',
      estimatedMinutes: times.length >= minSamples ? Math.round(median * 10) / 10 : null,
      observedRangeMinutes: [times[0], times.at(-1)],
      observationIds: rows.map(row => row.observation_id),
    };
  }).sort((a, b) => b.samples - a.samples);
  return {
    totalRows: records.length - 1, validRows: valid.length, errors,
    meetsRowCount: valid.length >= 20, minSamples, estimates,
    limitation: 'These are observed trip durations, not guaranteed delivery times. Small samples and different traffic, queues, weather or time of day can change the result. Row count does not verify genuine fieldwork or assignment compliance.',
  };
}

export function readReport(path, options) { return analyzeCsv(readFileSync(path, 'utf8'), options); }
export function formatReport(report) {
  const lines = [
    'FetchQuest observed errand timing report',
    `Valid observations: ${report.validRows}/${report.totalRows}. Required for assignment: at least 20.`,
    `Minimum samples per place / route / category: ${report.minSamples}.`,
  ];
  for (const error of report.errors) lines.push(`ERROR record ${error.record}: ${error.message}`);
  for (const item of report.estimates) lines.push(`${item.place} | ${item.route} | ${item.category}: ${item.estimatedMinutes === null ? 'insufficient data' : `${item.estimatedMinutes} minutes (median)`}; n=${item.samples}; observed range ${item.observedRangeMinutes.join('–')} minutes; observations ${item.observationIds.join(', ')}`);
  lines.push(report.limitation);
  return lines.join('\n');
}
