import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

const LANGS = ['javascript', 'typescript', 'python', 'java', 'go', 'php', 'ruby', 'csharp'];
const EXT = { js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', py: 'python', java: 'java', go: 'go', php: 'php', rb: 'ruby', cs: 'csharp' };

export const ScoreBadge = ({ score }) => (
  <span className={`score ${score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad'}`} title="Security score (100 = no findings)">{score}</span>
);

export const countBy = (findings) => findings.reduce((c, f) => ({ ...c, [f.severity]: (c[f.severity] || 0) + 1 }), {});

export default function Project() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('');
  const [language, setLanguage] = useState('javascript');

  useEffect(() => { api(`/projects/${id}/reviews`).then(setData).catch((e) => setError(e.message)); }, [id]);

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    setLanguage(EXT[file.name.split('.').pop()] || language);
    setCode(await file.text());
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const review = await api(`/projects/${id}/reviews`, { method: 'POST', body: { code, filename, language } });
      nav(`/reviews/${review._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!data) return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>;
  // oldest → newest for the trend
  const trend = [...data.reviews].reverse();

  return (
    <>
      <p><Link to="/">← Projects</Link></p>
      <h1>{data.project.name}</h1>

      <form onSubmit={submit} className="card stack">
        <h2>New review</h2>
        <div className="row">
          <input placeholder="Filename (e.g. orders.routes.js)" value={filename} onChange={(e) => setFilename(e.target.value)} aria-label="Filename" className="grow" />
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
            {LANGS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <label className="button secondary">Upload file<input type="file" hidden onChange={upload} accept=".js,.mjs,.cjs,.ts,.py,.java,.go,.php,.rb,.cs,.txt" /></label>
        </div>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste API route handler / controller code here" rows={14} required spellCheck={false} aria-label="Code" />
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy || !code.trim()}>{busy ? 'Reviewing… this can take a minute' : 'Run security review'}</button>
      </form>

      <h2>Review history</h2>
      {trend.length > 1 && (
        <div className="trend" aria-label="Score trend, oldest to newest">
          {trend.map((r) => <div key={r._id} style={{ height: `${Math.max(r.score, 3)}%` }} className={`bar ${r.score >= 80 ? 'good' : r.score >= 50 ? 'warn' : 'bad'}`} title={`${r.filename || 'untitled'}: ${r.score}`} />)}
        </div>
      )}
      {data.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      <ul className="list">
        {data.reviews.map((r) => {
          const c = countBy(r.findings);
          return (
            <li key={r._id} className="card row">
              <ScoreBadge score={r.score} />
              <Link to={`/reviews/${r._id}`} className="grow"><strong>{r.filename || 'untitled'}</strong></Link>
              {['critical', 'high', 'medium', 'low'].map((s) => c[s] ? <span key={s} className={`sev ${s}`}>{c[s]} {s}</span> : null)}
              <span className="muted">{new Date(r.createdAt).toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
