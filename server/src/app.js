import express from 'express';
import cors from 'cors';
import { authRouter, requireAuth } from './auth.js';
import { api } from './routes.js';
import { OWASP } from './owasp.js';
import { provider } from './review.js';

export const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, llm: provider() }));
app.get('/api/owasp', (_req, res) => res.json(OWASP));
app.use('/api/auth', authRouter);
app.use('/api', requireAuth, api);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal error' });
});
