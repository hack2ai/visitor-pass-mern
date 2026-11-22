import { useCallback, useEffect, useState } from 'react';
import api, { download, errMsg } from '../api';

export default function Reports() {
  const [f, setF] = useState({ q: '', type: '', from: '', to: '' });
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const clean = () => Object.fromEntries(Object.entries(f).filter(([, v]) => v));
  const load = useCallback(() => api.get('/reports/logs', { params: clean() }).then((r) => setRows(r.data)), [f]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <>
      <h1>Visitor log</h1>
      <section className="panel">
        <div className="filters">
          <input placeholder="Search name, email or company" value={f.q} onChange={set('q')} />
          <select value={f.type} onChange={set('type')}><option value="">Check-ins and check-outs</option><option value="in">Check-ins</option><option value="out">Check-outs</option></select>
          <label className="inl">From<input type="date" value={f.from} onChange={set('from')} /></label>
          <label className="inl">To<input type="date" value={f.to} onChange={set('to')} /></label>
          <button className="primary" onClick={() => download('/reports/export', 'visitor-logs.csv', clean()).catch((e) => setErr(errMsg(e)))}>Export CSV</button>
        </div>
        {err && <p className="error">{err}</p>}
        {rows.length === 0 ? <p className="muted">No log entries match these filters.</p> :
          <div className="scroll"><table>
            <thead><tr><th>Time</th><th>Event</th><th>Visitor</th><th>Company</th><th>Host</th><th>Purpose</th><th>Where</th></tr></thead>
            <tbody>{rows.map((l) => (
              <tr key={l._id}>
                <td>{new Date(l.at).toLocaleString()}</td>
                <td><span className={'tag ' + (l.type === 'in' ? 'approved' : 'completed')}>{l.type === 'in' ? 'checked in' : 'checked out'}</span></td>
                <td><b>{l.visitor?.name}</b><br /><small className="muted">{l.visitor?.email}</small></td>
                <td>{l.visitor?.company}</td><td>{l.appointment?.host?.name}</td><td>{l.appointment?.purpose}</td><td>{l.appointment?.location}</td>
              </tr>))}</tbody></table></div>}
      </section>
    </>
  );
}
