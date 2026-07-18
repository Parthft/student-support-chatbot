import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QUICK_REPLIES = [
  "Exam schedule",
  "Fee payment help",
  "Library timings",
  "Feeling stressed about exams",
];

const HELPLINES = [
  { region: "India", label: "iCall", contact: "9152987821" },
  { region: "India", label: "Vandrevala Foundation", contact: "1860-2662-345" },
  { region: "US", label: "988 Suicide & Crisis Lifeline", contact: "Call or text 988" },
  { region: "UK", label: "Samaritans", contact: "116 123" },
];

const INTRO_MESSAGE = {
  role: "assistant",
  content:
    "Hi, I'm Sage \u2014 here to help with academics, campus life, admin questions, or just to listen if things feel like a lot right now. What's on your mind?",
};

function EmergencyModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="emergency-title">You don't have to handle this alone</h2>
        <p>
          If you're in immediate danger, please contact local emergency services right
          away. Otherwise, these lines are staffed by real people, any time:
        </p>
        <ul className="helpline-list">
          {HELPLINES.map((h) => (
            <li key={h.label}>
              <span className="helpline-region">{h.region}</span>
              <span className="helpline-label">{h.label}</span>
              <span className="helpline-contact">{h.contact}</span>
            </li>
          ))}
        </ul>
        <button className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M20 4C12 10 8 18 8 24c0 7 5.5 12 12 12s12-5 12-12c0-6-4-14-12-20Z"
              fill="var(--primary)"
            />
            <path
              d="M20 12v22M20 18c-3 0-6 2-7 5M20 24c3 0 6 1.5 7 4"
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div>
            <h1>Sage</h1>
            <p className="tagline">Student Support</p>
          </div>
        </div>
        <button className="btn-emergency" onClick={() => setShowEmergency(true)}>
          Emergency help
        </button>
      </header>

      <main className="chat-panel">
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`bubble-row ${m.role}`}>
              {m.role === "assistant" && (
                <div className="avatar">
                  <span className="pulse-dot" aria-hidden="true" />
                </div>
              )}
              <div className={`bubble ${m.role}`}>
                {m.role === "assistant" ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="bubble-row assistant">
              <div className="avatar">
                <span className="pulse-dot" aria-hidden="true" />
              </div>
              <div className="bubble assistant typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
          {error && <div className="error-banner">{error}</div>}
          <div ref={scrollRef} />
        </div>

        <div className="quick-replies">
          {QUICK_REPLIES.map((q) => (
            <button key={q} className="chip" onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about exams, fees, campus life, or anything else..."
            aria-label="Message"
          />
          <button className="btn-primary" type="submit" disabled={isSending}>
            Send
          </button>
        </form>

        <p className="disclaimer">
          Sage is an AI assistant, not a substitute for professional counseling. In a
          crisis, use the Emergency help button above.
        </p>
      </main>

      {showEmergency && <EmergencyModal onClose={() => setShowEmergency(false)} />}
    </div>
  );
}
