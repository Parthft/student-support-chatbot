# Sage — Student Support Chatbot (MVP)

A simple, working student-support chatbot: a React chat UI backed by a FastAPI
server that calls the Anthropic API for real LLM responses. No login or
database — just chat, quick replies, and a crisis-safe escalation path to
real helplines.

## Structure

```
student-support-chatbot/
├── backend/          FastAPI server, proxies chat requests to Anthropic
│   ├── server.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/          React (Vite) chat UI
    ├── src/
    ├── package.json
    └── .env.example
```

## 1. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and add your real Gemini API key (get a free one, no
credit card needed, at https://aistudio.google.com/apikey):

```
GEMINI_API_KEY=AIza...
CORS_ORIGINS=http://localhost:5173
```

This uses `gemini-flash-latest` by default, which is on Google's free tier.
You can override the model via a `GEMINI_MODEL` env var (e.g.
`gemini-3.1-flash-lite` for higher rate limits at slightly lower quality).

Run it:

```bash
python server.py
```

The API will be live at `http://localhost:8000`. Check `http://localhost:8000/api/health`
to confirm it's configured correctly.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## 3. How it works

- The frontend sends the full chat history to `POST /api/chat`.
- The backend attaches a system prompt (persona "Sage") and calls Google's
  Gemini API, then returns the reply.
- The system prompt instructs the model to hand off to real crisis helplines
  if a student shows signs of being in danger — the bot never tries to
  handle a crisis itself. There's also an always-visible "Emergency help"
  button in the UI with helpline numbers, independent of the AI.
- Quick-reply chips just send a preset message, same as typing it.

This is intentionally an MVP: no accounts, no ticket system, no database.
Chat history lives only in the browser tab and is lost on refresh.

## 4. Pushing to GitHub

```bash
cd student-support-chatbot
git init
git add .
git commit -m "Initial commit: student support chatbot MVP"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

**Important:** `.env` files are already excluded via `.gitignore` — never
commit your real API key. Only `.env.example` files (with placeholder
values) get pushed.

## Note on free tier limits

Gemini's free tier (Flash / Flash-Lite models) has daily and per-minute
request caps that Google adjusts periodically — check current numbers at
https://ai.google.dev/gemini-api/docs/rate-limits before relying on it for
anything beyond prototyping. If you outgrow it, attach billing in Google
AI Studio; no code changes needed.

## 5. Deploying later (optional)

- Backend: any host that runs Python (Render, Railway, Fly.io, a VPS). Set
  `ANTHROPIC_API_KEY` and `CORS_ORIGINS` as environment variables there.
- Frontend: any static host (Vercel, Netlify, GitHub Pages via Actions). Set
  `VITE_API_URL` to your deployed backend's URL at build time.

## Next steps if you want to grow this later

- Add a database (e.g. MongoDB or Postgres) and a `/api/tickets` endpoint for
  when the bot can't help, so a human can follow up.
- Add student login so chat history persists per user.
- Add an admin view for common questions and ticket triage.
