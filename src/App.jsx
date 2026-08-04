import { useState, useRef, useEffect } from "react";

const TypingIndicator = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px" }}>
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", animation: "bounce 1s infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>Analizando...</span>
  </div>
);

const FilterBadge = ({ label }) => (
  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", fontWeight: 600 }}>{label}</span>
);

export default function App() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "👋 Hola Seba! Soy tu asistente de trading personal.\n\nEstoy cargado con tu manual completo — los 3 filtros de entrada, reglas de salida, y toda la lógica que armamos juntos.\n\n**¿Qué querés analizar hoy?**\n\nEscribí el ticker directamente (ej: *GOOGL*, *NU*, *YPF*) o preguntame sobre tu cartera." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error del servidor");
      setMessages([...updatedMessages, { role: "assistant", content: data.content }]);
    } catch (error) {
      setMessages([...updatedMessages, { role: "assistant", content: `❌ Error: ${error.message}. Intentá de nuevo.` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const formatMessage = (content) => content.split("\n").map((line, i) => {
    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
    if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} style={{ display: "flex", gap: 8, marginLeft: 8, marginTop: 2 }}><span style={{ color: "#60a5fa" }}>•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2) }} /></div>;
    if (line === "") return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: "2px 0", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: line }} />;
  });

  const quickActions = ["Analizá GOOGL", "Analizá DIS", "Analizá NU", "Analizá YPF", "Analizá META"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#030712", color: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1f2937", background: "rgba(17,24,39,0.9)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>S</div>
          <div><div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Trading Bot</div><div style={{ fontSize: 11, color: "#6b7280" }}>Manual activo • 3 filtros</div></div>
        </div>
        <div style={{ display: "flex", gap: 6 }}><FilterBadge label="Fund." /><FilterBadge label="Téc." /><FilterBadge label="Konc." /></div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 4, marginRight: 8 }}>S</div>}
            <div style={{ maxWidth: "85%", borderRadius: 18, padding: "10px 14px", fontSize: 14, lineHeight: 1.5, background: msg.role === "user" ? "#2563eb" : "#111827", color: "#f1f5f9", borderTopRightRadius: msg.role === "user" ? 4 : 18, borderTopLeftRadius: msg.role === "assistant" ? 4 : 18 }}>
              {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex" }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 4, marginRight: 8 }}>S</div><div style={{ background: "#111827", borderRadius: 18 }}><TypingIndicator /></div></div>}
        <div ref={messagesEndRef} />
      </div>
      {messages.length <= 1 && <div style={{ padding: "0 16px 8px" }}><div style={{ fontSize: 11, color: "#4b5563", marginBottom: 8 }}>Acciones rápidas:</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{quickActions.map((a) => <button key={a} onClick={() => setInput(a)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 999, background: "#111827", color: "#d1d5db", border: "1px solid #1f2937", cursor: "pointer" }}>{a}</button>)}</div></div>}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1f2937", background: "rgba(17,24,39,0.9)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, background: "#111827", borderRadius: 22, border: "1px solid #1f2937" }}>
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Analizá GOOGL... / ¿Entro en NU?" style={{ width: "100%", background: "transparent", color: "#f1f5f9", fontSize: 14, padding: "12px 16px", resize: "none", outline: "none", border: "none", minHeight: 44, maxHeight: 120, fontFamily: "inherit" }} rows={1} />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || loading} style={{ width: 44, height: 44, borderRadius: "50%", background: input.trim() && !loading ? "#2563eb" : "#1f2937", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="#f1f5f9"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } } * { box-sizing: border-box; margin: 0; padding: 0; } textarea::placeholder { color: #4b5563; }`}</style>
    </div>
  );
}

