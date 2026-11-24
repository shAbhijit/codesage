# CodeSage

GenAI code review for REST API security. Paste or upload API route/controller code; an LLM reviews it
against the **OWASP API Security Top 10 (2023)** and returns findings with severity, line references,
explanation and a fix, plus a fully remediated file. Reviews are stored per project so you can track your
security score over time.

Stack: MongoDB · Express 5 · React 19 (Vite) · Node 24 · Claude (`claude-opus-5-5`) or local Ollama.

## Run

```bash
docker compose up -d                   # MongoDB on :27017
cd server && npm i && cp .env.example .env && npm run dev   # API on :5050
cd client && npm i && npm run dev      # UI on http://localhost:5173
```

LLM provider (in `server/.env`):
- **Claude** — set `ANTHROPIC_API_KEY`. Used automatically when the key is present.
- **Ollama (no key)** — run Ollama on `:11434` with `ollama pull llama3.2` (the IntelliDocs compose
  already starts one). Set `LLM_PROVIDER=ollama` or just leave the key empty.

## Test

```bash
cd server && npm test
```

## How it works

| Piece | File |
|---|---|
| OWASP categories | `server/src/owasp.js` |
| Prompt, output schema, LLM call, scoring | `server/src/review.js` |
| JWT auth (register/login, middleware) | `server/src/auth.js` |
| Projects / reviews REST API | `server/src/routes.js` |
| Mongo models | `server/src/models.js` |
| UI pages | `client/src/pages/*.jsx` |

1. Code is sent with numbered lines so the model can cite exact lines.
2. The system prompt makes the model walk every OWASP API category in order.
3. Output is constrained to a JSON schema (Claude structured outputs / Ollama `format`) and re-validated with Zod.
4. Score = 100 − (critical 25, high 15, medium 8, low 3 per finding), floored at 0.

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | `{email, password}` → `{token}` |
| GET/POST | `/api/projects` | list (with review count + last score) / create `{name}` |
| DELETE | `/api/projects/:id` | also deletes its reviews |
| GET | `/api/projects/:id/reviews` | project + review history |
| POST | `/api/projects/:id/reviews` | `{code, filename?, language?}` → runs the review (20/hour/user) |
| GET | `/api/reviews/:id` | full review |
| GET | `/api/owasp`, `/api/health` | public |