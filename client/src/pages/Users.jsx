import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';

export default function Users() {
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [audit, setAudit] = useState([]);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'employee', department: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const load = () => { api.get('/users').then((r) => setList(r.data)); api.get('/reports/audit').then((r) => setAudit(r.data)); };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.post('/users', f); setF({ ...f, name: '', email: '', password: '', department: '' }); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const toggle = async (u) => { try { await api.patch('/users/' + u._id, { active: !u.active }); load(); } catch (x) { setErr(errMsg(x)); } };

  return (
    <>
      <h1>Staff and accounts</h1>
      <form className="panel form" onSubmit={create}>
        <h3>Add a staff member</h3>
        <div className="two">
          <label>Name<input required value={f.name} onChange={set('name')} /></label>
          <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
          <label>Temporary password<input type="password" minLength={6} required value={f.password} onChange={set('password')} /></label>
          <label>Role<select value={f.role} onChange={set('role')}><option value="employee">Employee (host)</option><option value="security">Security / front desk</option><option value="admin">Admin</option></select></label>
          <label>Department<input value={f.department} onChange={set('department')} /></label>
        </div>
        {err && <p className="error">{err}</p>}
        <button className="primary">Add staff member</button>
      </form>
      <section className="panel">
        <h3>All accounts</h3>
        <div className="scroll"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>{list.map((u) => (
            <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
              <td><span className={'tag ' + (u.active ? 'approved' : 'rejected')}>{u.active ? 'active' : 'disabled'}</span></td>
              <td>{u._id !== me.id && <button className="ghost sm" onClick={() => toggle(u)}>{u.active ? 'Disable' : 'Enable'}</button>}</td></tr>))}</tbody></table></div>
      </section>
      <section className="panel">
        <h3>Audit log</h3>
        {audit.length === 0 ? <p className="muted">No activity recorded yet.</p> :
          <div className="scroll short"><table><thead><tr><th>Time</th><th>Who</th><th>Action</th><th>Item</th></tr></thead>
            <tbody>{audit.map((a) => <tr key={a._id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.user?.name} <small className="muted">{a.user?.role}</small></td><td>{a.action}</td><td>{a.entity}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}
