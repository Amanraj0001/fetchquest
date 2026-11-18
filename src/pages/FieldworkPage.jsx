import { useEffect, useState } from 'react';
import { useAuth } from '../Context/useAuth';

export default function FieldworkPage() {
  const { token } = useAuth();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/fieldwork/report', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg);
        setReport(data); setError('');
      }).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [token, revision]);
  return <main className="container" style={{ paddingBlock: '2rem' }}>
    <h1 className="page-title">Basti marketplace errand timings</h1>
    <p>Use observed trip durations to judge whether an errand fits your available time. These estimates do not promise delivery times.</p>
    <button className="btn btn-secondary" onClick={() => setRevision(value => value + 1)}>Refresh observations</button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!report && !error && <p>Loading observations...</p>}
    {report && <>
      <p><strong>{report.validRows} valid observations</strong> out of {report.totalRows}. {report.meetsRowCount ? 'The minimum row count is met; fieldwork authenticity still needs evidence.' : 'At least 20 personally collected entries are needed for the assignment.'}</p>
      {!report.estimates.length && <p>No estimates yet. Add your real timed observations to data.csv on the server, then refresh.</p>}
      {report.errors.length > 0 && <section aria-label="Data errors"><h2>Rows to correct</h2><ul>{report.errors.map(row => <li key={row.record}>Record {row.record}: {row.message}</li>)}</ul></section>}
      <div className="requests-grid">{report.estimates.map(item => <article className="request-card" key={JSON.stringify([item.place, item.route, item.category])}>
        <div className="request-card-body">
          <h2>{item.route}</h2><p>{item.place} · {item.category}</p>
          <p><strong>{item.estimatedMinutes === null ? 'Insufficient data' : `${item.estimatedMinutes} minutes typical duration`}</strong></p>
          <p>{item.samples} observations · observed range {item.observedRangeMinutes.join('–')} minutes</p>
          <p>At least {report.minSamples} observations per group are needed for an estimate.</p>
          <details><summary>Source observation IDs</summary><p>{item.observationIds.join(', ')}</p></details>
        </div>
      </article>)}</div>
      <p>{report.limitation}</p>
    </>}
  </main>;
}
