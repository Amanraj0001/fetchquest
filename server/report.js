import { readReport, formatReport } from './fieldwork.js';

try {
  const args = process.argv.slice(2);
  const minIndex = args.indexOf('--min-samples');
  const minSamples = minIndex >= 0 ? Number(args[minIndex + 1]) : 3;
  const file = args[0] && !args[0].startsWith('--') ? args[0] : 'data.csv';
  const report = readReport(file, { minSamples });
  console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : formatReport(report));
  if (report.errors.length || !report.meetsRowCount) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
