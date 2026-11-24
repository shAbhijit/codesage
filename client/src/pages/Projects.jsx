import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ScoreBadge } from './Project.jsx';

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const load = () => api('/projects').then(setProjects).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    const name = new FormData(e.target).get('name');
    try {
      await api('/projects', { method: 'POST', body: { name } });
      e.target.reset();
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}" and all its reviews?`)) return;
    await api(`/projects/${p._id}`, { method: 'DELETE' });
    load();
  }

  return (
    <>
      <h1>Projects</h1>
      <form onSubmit={create} className="row">
        <input name="name" placeholder="New project name" required maxLength={100} aria-label="Project name" />
        <button>Create</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {projects?.length === 0 && <p className="muted">No projects yet. Create one to start reviewing code.</p>}
      <ul className="list">
        {projects?.map((p) => (
          <li key={p._id} className="card row">
            <Link to={`/projects/${p._id}`} className="grow"><strong>{p.name}</strong></Link>
            <span className="muted">{p.reviews} review{p.reviews === 1 ? '' : 's'}</span>
            {p.lastScore != null && <ScoreBadge score={p.lastScore} />}
            <button className="link danger" onClick={() => remove(p)}>Delete</button>
          </li>
        ))}
      </ul>
    </>
  );
}
