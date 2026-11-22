import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';

const blank = { name: '', email: '', phone: '', company: '', hostId: '', purpose: '', scheduledAt: '', location: 'Main Office' };
const LOCATIONS = ['Main Office', 'Annex Building', 'Warehouse'];

function VisitForm({ role, hosts, onDone }) {
  const [f, setF] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [msg, setMsg] = useState({ err: '', ok: '' });
  const visitor = role === 'visitor';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setMsg({ err: '', ok: '' });
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v && fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      await api.post(visitor ? '/appointments' : '/appointments/invite', fd);
      setMsg({ ok: visitor ? 'Request sent. You will be notified when your host responds.' : 'Visitor invited. Their pass has been emailed.', err: '' });
      setF(blank); setPhoto(null); e.target.reset(); onDone();
    } catch (x) { setMsg({ err: errMsg(x), ok: '' }); }
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h3>{visitor ? 'Pre-register a visit' : role === 'security' ? 'Register a walk-in or invite a visitor' : 'Invite a visitor'}</h3>
      {!visitor && <div className="two">
        <label>Visitor name<input required value={f.name} onChange={set('name')} /></label>
        <label>Visitor email<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>Phone<input value={f.phone} onChange={set('phone')} /></label>
        <label>Company<input value={f.company} onChange={set('company')} /></label>
      </div>}
      <div className="two">
        {role !== 'employee' && <label>Who are they visiting?
          <select required value={f.hostId} onChange={set('hostId')}><option value="">Choose a host</option>{hosts.map((h) => <option key={h._id} value={h._id}>{h.name}{h.department ? ` (${h.department})` : ''}</option>)}</select>
        </label>}
        <label>Purpose<input required value={f.purpose} onChange={set('purpose')} placeholder="Meeting, interview, delivery…" /></label>
        <label>Date and time<input type="datetime-local" required={visitor} value={f.scheduledAt} onChange={set('scheduledAt')} /></label>
        <label>Location<select value={f.location} onChange={set('location')}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></label>
        <label>Photo<input type="file" accept="image/*" capture="user" onChange={(e) => setPhoto(e.target.files[0])} /></label>
      </div>
      {msg.err && <p className="error">{msg.err}</p>}
      {msg.ok && <p className="ok">{msg.ok}</p>}
      <button className="primary">{visitor ? 'Send request' : 'Issue pass'}</button>
    </form>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => api.get('/appointments', { params: { status } }).then((r) => setList(r.data)), [status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/users/hosts').then((r) => setHosts(r.data)); }, []);

  const act = async (id, action, body) => {
    setErr('');
    try { await api.patch(`/appointments/${id}/${action}`, body); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const canDecide = ['employee', 'admin'].includes(user.role);

  return (
    <>
      <h1>Visits</h1>
      <VisitForm role={user.role} hosts={hosts} onDone={load} />
      <section className="panel">
        <div className="row"><h3>All visits</h3>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>{['pending', 'approved', 'rejected', 'cancelled', 'completed'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {err && <p className="error">{err}</p>}
        {list.length === 0 ? <p className="muted">No visits match. Use the form above to add one.</p> :
          <div className="scroll"><table>
            <thead><tr><th>Visitor</th><th>Host</th><th>Purpose</th><th>When</th><th>Where</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={a._id}>
                <td><b>{a.visitor?.name}</b><br /><small className="muted">{a.visitor?.company}</small></td>
                <td>{a.host?.name}</td><td>{a.purpose}</td>
                <td>{new Date(a.scheduledAt).toLocaleString()}</td><td>{a.location}</td>
                <td><span className={'tag ' + a.status}>{a.status}</span></td>
                <td className="actions">
                  {canDecide && a.status === 'pending' && <>
                    <button className="primary sm" onClick={() => act(a._id, 'status', { status: 'approved' })}>Approve</button>
                    <button className="ghost sm" onClick={() => act(a._id, 'status', { status: 'rejected' })}>Decline</button></>}
                  {user.role === 'visitor' && ['pending', 'approved'].includes(a.status) && <button className="ghost sm" onClick={() => act(a._id, 'cancel')}>Cancel</button>}
                  {a.pass && a.status !== 'cancelled' && <Link className="btn sm" to={`/pass/${a.pass}`}>View pass</Link>}
                </td>
              </tr>))}
            </tbody></table></div>}
      </section>
    </>
  );
}
