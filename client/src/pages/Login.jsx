import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api.js';

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.target));
    setBusy(true);
    setError('');
    try {
      auth.set(await api(`/auth/${mode}`, { method: 'POST', body: form }));
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="narrow">
      <h1>CodeSage</h1>
      <p className="muted">GenAI code review for REST API security, based on the OWASP API Security Top 10.</p>
      <form onSubmit={submit} className="card stack">
        <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </main>
  );
}
