import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Code from '../Code.jsx';
import { ScoreBadge, countBy } from './Project.jsx';

const SEVS = ['critical', 'high', 'medium', 'low'];
const PRISM = { csharp: 'clike', java: 'clike', php: 'clike', ruby: 'python' };

export default function Review() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [owasp, setOwasp] = useState({});
  const [error, setError] = useState('');
  const [sev, setSev] = useState(new Set(SEVS));
  const [marked, setMarked] = useState([]);
  const [tab, setTab] = useState('findings');

  useEffect(() => {
    api(`/reviews/${id}`).then(setReview).catch((e) => setError(e.message));
    api('/owasp').then(setOwasp);
  }, [id]);

  if (!review) return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>;

  const lang = PRISM[review.language] || review.language || 'javascript';
  const shown = review.findings.filter((f) => sev.has(f.severity));
  const groups = Object.keys(owasp).map((k) => [k, shown.filter((f) => f.owaspId === k)]).filter(([, fs]) => fs.length);
  const counts = countBy(review.findings);
  const toggle = (s) => setSev((cur) => { const n = new Set(cur); n.has(s) ? n.delete(s) : n.add(s); return n; });

  return (
    <>
      <p><Link to={`/projects/${review.project}`}>← Project</Link></p>
      <div className="row">
        <h1 className="grow">{review.filename || 'untitled'}</h1>
        <ScoreBadge score={review.score} />
      </div>
      <p>{review.summary}</p>
      <p className="muted">Reviewed {new Date(review.createdAt).toLocaleString()} · {review.llm}</p>

      <div className="row" role="tablist">
        <button role="tab" aria-selected={tab === 'findings'} className={tab === 'findings' ? '' : 'secondary'} onClick={() => setTab('findings')}>Findings ({review.findings.length})</button>
        <button role="tab" aria-selected={tab === 'compare'} className={tab === 'compare' ? '' : 'secondary'} onClick={() => setTab('compare')}>Original vs suggested</button>
      </div>

      {tab === 'compare' ? (
        <div className="split">
          <div><h3>Original</h3><Code code={review.code} language={lang} marked={review.findings.flatMap((f) => f.lines)} /></div>
          <div><h3>Suggested</h3><Code code={review.remediatedCode || review.code} language={lang} /></div>
        </div>
      ) : (
        <div className="split">
          <div>
            <div className="row">
              {SEVS.map((s) => (
                <label key={s} className={`sev ${s} ${sev.has(s) ? '' : 'off'}`}>
                  <input type="checkbox" checked={sev.has(s)} onChange={() => toggle(s)} /> {counts[s] || 0} {s}
                </label>
              ))}
            </div>
            {review.findings.length === 0 && <p className="good">No OWASP API Top 10 issues found.</p>}
            {groups.map(([k, fs]) => (
              <section key={k}>
                <h3>{k}: {owasp[k]}</h3>
                {fs.map((f, i) => (
                  <article key={i} className="card finding" onMouseEnter={() => setMarked(f.lines)} onFocus={() => setMarked(f.lines)} tabIndex={0}>
                    <div className="row">
                      <span className={`sev ${f.severity}`}>{f.severity}</span>
                      <strong className="grow">{f.title}</strong>
                      {f.lines.length > 0 && <span className="muted">line {f.lines.join(', ')}</span>}
                    </div>
                    <p>{f.explanation}</p>
                    {f.fix && <Code code={f.fix} language={lang} />}
                  </article>
                ))}
              </section>
            ))}
          </div>
          <div className="sticky"><h3>Submitted code</h3><Code code={review.code} language={lang} marked={marked} /></div>
        </div>
      )}
    </>
  );
}
