import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import { PassList, PassView } from './pages/Pass';
import Scan from './pages/Scan';
import Reports from './pages/Reports';
import Users from './pages/Users';

const NAV = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'security', 'employee', 'visitor'] },
  { to: '/appointments', label: 'Visits', roles: ['admin', 'security', 'employee', 'visitor'] },
  { to: '/passes', label: 'My passes', roles: ['visitor'] },
  { to: '/scan', label: 'Scan', roles: ['admin', 'security'] },
  { to: '/reports', label: 'Reports', roles: ['admin', 'security'] },
  { to: '/users', label: 'Staff', roles: ['admin'] },
];

function Guard({ roles, children }) {
  const { user } = useAuth();
  return !roles || roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading, logout } = useAuth();
  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <>
      <header className="top">
        <div className="brand"><span className="lanyard" />Visitor Pass</div>
        <nav>{NAV.filter((n) => n.roles.includes(user.role)).map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}</nav>
        <div className="who"><span>{user.name} <em>{user.role}</em></span><button className="ghost" onClick={logout}>Sign out</button></div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/passes" element={<Guard roles={['visitor']}><PassList /></Guard>} />
          <Route path="/pass/:id" element={<PassView />} />
          <Route path="/scan" element={<Guard roles={['admin', 'security']}><Scan /></Guard>} />
          <Route path="/reports" element={<Guard roles={['admin', 'security']}><Reports /></Guard>} />
          <Route path="/users" element={<Guard roles={['admin']}><Users /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
