import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { download, errMsg, fileUrl } from '../api';

function PassCard({ pass }) {
  const { visitor: v, appointment: a } = pass;
  const [err, setErr] = useState('');
  return (
    <article className={'pass' + (pass.status === 'revoked' ? ' revoked' : '')}>
      <div className="pass-head"><span className="slot" /><b>VISITOR</b></div>
      <div className="pass-body">
        <div className="who-row">
          {v.photo ? <img src={fileUrl(v.photo)} alt="" /> : <div className="avatar">{v.name[0]}</div>}
          <div><h3>{v.name}</h3><small className="muted">{v.company}</small></div>
        </div>
        <dl>
          <dt>Visiting</dt><dd>{a.host?.name}</dd>
          <dt>When</dt><dd>{new Date(a.scheduledAt).toLocaleString()}</dd>
          <dt>Where</dt><dd>{a.location}</dd>
          <dt>Status</dt><dd><span className={'tag ' + (pass.status === 'revoked' ? 'rejected' : a.status)}>{pass.status === 'revoked' ? 'revoked' : a.status}</span></dd>
        </dl>
        <img className="qr" src={pass.qr} alt="QR code for check-in" />
        <code>{pass.code}</code>
        {err && <p className="error">{err}</p>}
        <button className="primary" onClick={() => download(`/passes/${pass._id}/pdf`, 'visitor-pass.pdf').catch((e) => setErr(errMsg(e)))}>Download PDF badge</button>
      </div>
    </article>
  );
}

export function PassList() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/passes/mine').then((r) => setList(r.data)); }, []);
  if (!list) return <p className="muted">Loading…</p>;
  return (
    <>
      <h1>My passes</h1>
      {list.length === 0 ? <p className="muted">No passes yet. Once a host approves a visit, your pass appears here. <Link to="/appointments">Pre-register a visit</Link></p> :
        <div className="passes">{list.map((p) => <PassCard key={p._id} pass={p} />)}</div>}
    </>
  );
}

export function PassView() {
  const { id } = useParams();
  const [pass, setPass] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/passes/' + id).then((r) => setPass(r.data)).catch((e) => setErr(errMsg(e))); }, [id]);
  if (err) return <p className="error">{err}</p>;
  if (!pass) return <p className="muted">Loading…</p>;
  return <><h1>Visitor pass</h1><div className="passes"><PassCard pass={pass} /></div></>;
}
