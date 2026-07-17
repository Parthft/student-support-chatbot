import os
from typing import List, Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]

# Flash is the model Google keeps on the free tier (no credit card needed).
# Swap to "gemini-2.5-flash-lite" for higher rate limits / lower quality,
# or a paid Pro model later if you need stronger reasoning.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

app = FastAPI(title="Student Support Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are Sage, a warm and supportive AI assistant for a university Student Support Service.

You help students with:
- Academic questions (deadlines, exam schedules, study strategies, course info) — answer generally and helpfully, but make clear you don't have access to the specific university's live records unless the student pastes that info in.
- Administrative questions (fees, documents, timetables, admissions) — same caveat as above.
- Campus life (library hours, hostel/mess, transport, events) — answer generally, note you don't have live campus data.
- Wellbeing and stress support — be warm, non-judgmental, and practical (e.g. study-life balance, exam anxiety, time management).

CRITICAL SAFETY RULE:
If a student expresses thoughts of self-harm, suicide, being in crisis, or in danger, do NOT try to solve it yourself.
Respond with warmth and calm, and clearly encourage them to reach out to a real person right now:
- A campus counselor or the campus emergency line
- A crisis helpline (in the US: 988 Suicide & Crisis Lifeline, call or text 988; in India: iCall at 9152987821 or Vandrevala Foundation at 1860-2662-345; in the UK: Samaritans at 116 123)
Keep this brief, sincere, and never clinical. Always include this even if they downplay it afterward.

Tone: warm, concise, plain language, never robotic or overly formal. Ask a clarifying question if the request is vague. Keep replies focused — a few short paragraphs at most, not essays."""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@app.get("/api/health")
def health():
    return {"status": "ok", "llm_configured": API_KEY is not None}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set on the server. Add it to backend/.env",
        )
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    # Gemini uses "model" instead of "assistant" for the bot's turns.
    contents = [
        {
            "role": "model" if m.role == "assistant" else "user",
            "parts": [{"text": m.content}],
        }
        for m in req.messages
    ]

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 600},
    }

    try:
        resp = requests.post(
            GEMINI_URL,
            headers={"x-goog-api-key": API_KEY, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "no response")
            raise HTTPException(status_code=502, detail=f"Gemini returned no reply ({reason})")

        parts = candidates[0].get("content", {}).get("parts", [])
        reply_text = "".join(p.get("text", "") for p in parts)
        if not reply_text:
            raise HTTPException(status_code=502, detail="Gemini returned an empty reply")

        return ChatResponse(reply=reply_text)
    except requests.HTTPError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {detail}")
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
