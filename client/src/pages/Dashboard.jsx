import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

const Stat = ({ n, label }) => <div className="stat"><b>{n}</b><span>{label}</span></div>;

export default function Dashboard() {
  const { user } = useAuth();
  const staff = ['admin', 'security'].includes(user.role);
  const [s, setS] = useState(null);
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    if (staff) api.get('/reports/summary').then((r) => setS(r.data));
    else api.get('/appointments').then((r) => setAppts(r.data));
  }, [staff]);

  if (staff) {
    if (!s) return <p className="muted">Loading…</p>;
    const max = Math.max(1, ...s.perDay.map((d) => d.count));
    return (
      <>
        <h1>Today at the front desk</h1>
        <div className="stats">
          <Stat n={s.inside} label="Inside the building now" />
          <Stat n={s.today} label="Check-ins today" />
          <Stat n={s.pending} label="Visits awaiting approval" />
          <Stat n={s.totalVisitors} label="Visitors on record" />
        </div>
        <div className="grid2">
          <section className="panel">
            <h3>Check-ins, last 7 days</h3>
            {s.perDay.length === 0 ? <p className="muted">No check-ins yet. Scan a pass to start.</p> :
              <div className="bars">{s.perDay.map((d) => (
                <div key={d._id} className="bar"><span style={{ height: `${(d.count / max) * 100}%` }}>{d.count}</span><small>{d._id.slice(5)}</small></div>
              ))}</div>}
          </section>
          <section className="panel">
            <h3>Busiest hosts</h3>
            {s.topHosts.length === 0 ? <p className="muted">No visits yet.</p> :
              <ul className="plain">{s.topHosts.map((h) => <li key={h._id}><span>{h.name}</span><b>{h.count}</b></li>)}</ul>}
            <Link className="btn" to="/scan">Open scanner</Link>
          </section>
        </div>
      </>
    );
  }

  const pending = appts.filter((a) => a.status === 'pending');
  const upcoming = appts.filter((a) => a.status === 'approved' && new Date(a.scheduledAt) >= new Date(new Date().setHours(0, 0, 0, 0)));
  return (
    <>
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      <div className="stats">
        <Stat n={pending.length} label={user.role === 'employee' ? 'Requests waiting for you' : 'Visits awaiting approval'} />
        <Stat n={upcoming.length} label="Upcoming approved visits" />
      </div>
      <section className="panel">
        <h3>Next visits</h3>
        {upcoming.length === 0 ? <p className="muted">Nothing scheduled. <Link to="/appointments">{user.role === 'visitor' ? 'Pre-register a visit' : 'Invite a visitor'}</Link></p> :
          <ul className="plain">{upcoming.slice(0, 5).map((a) => (
            <li key={a._id}><span>{user.role === 'visitor' ? `Meeting ${a.host?.name}` : a.visitor?.name} — {a.purpose}</span><b>{new Date(a.scheduledAt).toLocaleString()}</b></li>
          ))}</ul>}
      </section>
    </>
  );
}
