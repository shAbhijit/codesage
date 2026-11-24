import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { auth } from './api.js';
import Login from './pages/Login.jsx';
import Projects from './pages/Projects.jsx';
import Project from './pages/Project.jsx';
import Review from './pages/Review.jsx';
import './styles.css';

function Shell({ children }) {
  const nav = useNavigate();
  const user = auth.get();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <header>
        <Link to="/" className="brand">CodeSage</Link>
        <span className="muted">OWASP API Top 10 reviewer</span>
        <span className="spacer" />
        <span className="muted">{user.email}</span>
        <button className="link" onClick={() => { auth.set(null); nav('/login'); }}>Log out</button>
      </header>
      <main>{children}</main>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Projects /></Shell>} />
      <Route path="/projects/:id" element={<Shell><Project /></Shell>} />
      <Route path="/reviews/:id" element={<Shell><Review /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
);
