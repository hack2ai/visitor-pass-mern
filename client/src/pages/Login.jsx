import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', company: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await (mode === 'login' ? login(f) : register(f)); } catch (x) { setErr(errMsg(x)); }
  };

  return (
    <div className="login">
      <div className="login-side">
        <div className="badge-art"><div className="slot" /><b>VISITOR</b><i /><small>Scan at reception</small></div>
        <h1>Walk in once.<br />Be expected every time.</h1>
        <p>Pre-register your visit, get a QR pass, and skip the paper register at the front desk.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Sign in' : 'Create visitor account'}</h2>
        {mode === 'register' && <>
          <label>Full name<input required value={f.name} onChange={set('name')} /></label>
          <div className="two">
            <label>Phone<input value={f.phone} onChange={set('phone')} /></label>
            <label>Company<input value={f.company} onChange={set('company')} /></label>
          </div>
        </>}
        <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required minLength={6} value={f.password} onChange={set('password')} /></label>
        {err && <p className="error">{err}</p>}
        <button className="primary">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="muted small">
          {mode === 'login' ? 'Visiting us? ' : 'Already registered? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? 'Create a visitor account' : 'Sign in'}
          </a>
        </p>
        {mode === 'login' && <p className="muted small demo">Demo: admin@demo.com, security@demo.com, priya@demo.com, visitor@demo.com — password123</p>}
      </form>
    </div>
  );
}
