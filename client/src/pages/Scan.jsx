import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api, { errMsg } from '../api';

export default function Scan() {
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const lock = useRef(false);

  const submit = async (value) => {
    if (lock.current || !value) return;
    lock.current = true; setErr(''); setResult(null);
    try { setResult((await api.post('/checks/scan', { code: value })).data); }
    catch (x) { setErr(errMsg(x)); }
    setTimeout(() => { lock.current = false; }, 2500); // avoid re-scanning the same frame
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 240 }, false);
    scanner.render((text) => submit(text), () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, []);

  return (
    <>
      <h1>Check visitors in and out</h1>
      <div className="grid2">
        <section className="panel">
          <div id="reader" />
          <form className="inline" onSubmit={(e) => { e.preventDefault(); submit(code.trim()); setCode(''); }}>
            <input placeholder="Or type the pass code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="primary">Check</button>
          </form>
        </section>
        <section className="panel">
          <h3>Result</h3>
          {!result && !err && <p className="muted">Point the camera at a visitor's QR code. The first scan checks them in, the next one checks them out.</p>}
          {err && <div className="scan-result bad"><b>Not allowed</b><p>{err}</p></div>}
          {result && (
            <div className={'scan-result ' + (result.type === 'in' ? 'in' : 'out')}>
              <b>{result.type === 'in' ? 'Checked in' : 'Checked out'}</b>
              <h2>{result.visitor.name}</h2>
              <p>{result.visitor.company || 'No company'} · visiting {result.host}</p>
              <p className="muted">{result.purpose} · {new Date(result.at).toLocaleTimeString()}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
