import { useState, useRef, useEffect } from "react";

const RESPUESTAS_STORAGE_KEY = "trading_bot_cuestionario_v1";
const PESOS_STORAGE_KEY = "trading_bot_pesos_v1";

const RESPUESTAS_INICIALES = {
  objetivo: "",
  objetivoOtro: "",
  horizonte: "",
  toleranciaRiesgo: "",
  filosofia: "",
  inversorReferencia: "",
  pesoFundamental: "42",
  pesoTecnico: "30",
  pesoKoncorde: "25",
  tipoPosicionDefault: "",
  stopLoss: "",
  takeProfit: "",
  motivosReconsiderar: [],
  capitalMaxPorActivo: "",
  posicionesSimultaneas: "",
  origenIdeas: "",
  fomoArrepentimiento: "",
};

function cargarRespuestasGuardadas() {
  try {
    const raw = localStorage.getItem(RESPUESTAS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cargarPesosGuardados() {
  try {
    const raw = localStorage.getItem(PESOS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Convierte las respuestas del Cuestionario (solo pesos entre los 3
// filtros grandes) al objeto "pesos" completo que espera el backend.
// Las subvariables dentro de cada filtro quedan parejas por defecto,
// porque el Cuestionario oficial no las pregunta - esa es una decision
// tecnica separada, no del tester.
function derivarPesos(respuestas) {
  const f = Number(respuestas.pesoFundamental) || 0;
  const t = Number(respuestas.pesoTecnico) || 0;
  const k = Number(respuestas.pesoKoncorde) || 0;
  const total = f + t + k;

  // Normaliza para que siempre sumen 100, sin importar si el tester
  // dejo los sugeridos o puso numeros que no cierran exacto.
  const norm = total > 0 ? 100 / total : 0;

  return {
    filtros: {
      fundamental: Number((f * norm).toFixed(1)),
      tecnico: Number((t * norm).toFixed(1)),
      koncorde: Number((k * norm).toFixed(1)),
    },
    subvariables: {
      fundamental: { pe: 25, peg: 25, moat: 25, razonCaida: 25 },
      tecnico: { rsi: 33.3, macd: 33.3, soporte: 33.4 },
      koncorde: { manosGrandes: 50, sinPresionVendedora: 50 },
    },
  };
}

function guardarTodo(respuestas) {
  const pesos = derivarPesos(respuestas);
  try {
    localStorage.setItem(RESPUESTAS_STORAGE_KEY, JSON.stringify(respuestas));
    localStorage.setItem(PESOS_STORAGE_KEY, JSON.stringify(pesos));
  } catch {
    // si el navegador bloquea localStorage, seguimos igual con el estado en memoria
  }
  return pesos;
}

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

const Etiqueta = ({ children }) => (
  <div style={{ fontSize: 13, color: "#d1d5db", marginBottom: 8, fontWeight: 600 }}>{children}</div>
);

const Ayuda = ({ children }) => (
  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 }}>{children}</div>
);

function OpcionUnica({ opciones, valor, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {opciones.map((op) => (
        <label
          key={op}
          onClick={() => onChange(op)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${valor === op ? "#2563eb" : "#1f2937"}`,
            background: valor === op ? "rgba(37,99,235,0.12)" : "#111827",
            cursor: "pointer",
            fontSize: 13,
            color: "#f1f5f9",
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: `2px solid ${valor === op ? "#2563eb" : "#4b5563"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {valor === op && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />}
          </span>
          {op}
        </label>
      ))}
    </div>
  );
}

function OpcionMultiple({ opciones, valores, onChange }) {
  const toggle = (op) => {
    if (valores.includes(op)) onChange(valores.filter((v) => v !== op));
    else onChange([...valores, op]);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {opciones.map((op) => {
        const activo = valores.includes(op);
        return (
          <label
            key={op}
            onClick={() => toggle(op)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${activo ? "#2563eb" : "#1f2937"}`,
              background: activo ? "rgba(37,99,235,0.12)" : "#111827",
              cursor: "pointer",
              fontSize: 13,
              color: "#f1f5f9",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: `2px solid ${activo ? "#2563eb" : "#4b5563"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: activo ? "#2563eb" : "transparent",
              }}
            >
              {activo && "✓"}
            </span>
            {op}
          </label>
        );
      })}
    </div>
  );
}

function CampoTexto({ valor, onChange, placeholder, tipo = "text" }) {
  return (
    <input
      type={tipo}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "#111827",
        color: "#f1f5f9",
        border: "1px solid #1f2937",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
        marginBottom: 16,
        outline: "none",
      }}
    />
  );
}function PasoObjetivoHorizonte({ r, set }) {
  return (
    <>
      <Etiqueta>¿Para qué estás invirtiendo?</Etiqueta>
      <OpcionUnica
        opciones={["Generar un ingreso extra", "Hacer crecer el patrimonio a largo plazo", "Preparar el retiro / jubilación", "Especular / operar activamente", "Otro"]}
        valor={r.objetivo}
        onChange={(v) => set({ objetivo: v })}
      />
      {r.objetivo === "Otro" && <CampoTexto valor={r.objetivoOtro} onChange={(v) => set({ objetivoOtro: v })} placeholder="Contanos cuál" />}

      <Etiqueta>¿Cuál es tu horizonte de inversión principal?</Etiqueta>
      <OpcionUnica
        opciones={["Corto plazo (días / semanas)", "Mediano plazo (meses)", "Largo plazo (años)", "Mixto (según el activo)"]}
        valor={r.horizonte}
        onChange={(v) => set({ horizonte: v })}
      />
    </>
  );
}

function PasoRiesgo({ r, set }) {
  return (
    <>
      <Etiqueta>¿Cómo describirías tu tolerancia al riesgo?</Etiqueta>
      <OpcionUnica
        opciones={["Baja — prefiero preservar capital", "Media — acepto volatilidad moderada", "Alta — busco crecimiento agresivo"]}
        valor={r.toleranciaRiesgo}
        onChange={(v) => set({ toleranciaRiesgo: v })}
      />
    </>
  );
}

function PasoFilosofia({ r, set }) {
  return (
    <>
      <Etiqueta>¿Qué enfoque te representa mejor?</Etiqueta>
      <OpcionUnica
        opciones={["Value / empresas sólidas y baratas", "Growth / crecimiento agresivo", "Dividendos / renta pasiva", "Técnico / momentum", "Mixto"]}
        valor={r.filosofia}
        onChange={(v) => set({ filosofia: v })}
      />
      <Etiqueta>Inversor de referencia (si tenés uno)</Etiqueta>
      <CampoTexto valor={r.inversorReferencia} onChange={(v) => set({ inversorReferencia: v })} placeholder="ej: Buffett, Lynch..." />
    </>
  );
}

function PasoPesos({ r, set }) {
  const f = Number(r.pesoFundamental) || 0;
  const t = Number(r.pesoTecnico) || 0;
  const k = Number(r.pesoKoncorde) || 0;
  const total = f + t + k;
  const totalOk = Math.abs(total - 100) < 0.5;

  return (
    <>
      <Ayuda>Ajustá el peso que le das a cada filtro. La suma debe dar 100%. Si no estás seguro, dejá el sugerido.</Ayuda>
      {[
        { key: "pesoFundamental", label: "Fundamental", explicacion: "Valor real de la empresa", sugerido: "35–50%" },
        { key: "pesoTecnico", label: "Técnico", explicacion: "Comportamiento histórico del mercado", sugerido: "25–35%" },
        { key: "pesoKoncorde", label: "Koncorde", explicacion: "Tendencia y volumen", sugerido: "20–30%" },
      ].map((f2) => (
        <div key={f2.key} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{f2.label}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{f2.explicacion}</div>
            </div>
            <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", marginTop: 2 }}>sugerido: {f2.sugerido}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number"
              min={0}
              max={100}
              value={r[f2.key]}
              onChange={(e) => set({ [f2.key]: e.target.value })}
              style={{ width: 70, background: "#111827", color: "#f1f5f9", border: "1px solid #1f2937", borderRadius: 8, padding: "8px 10px", fontSize: 13, textAlign: "right" }}
            />
            <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, fontWeight: 700, color: totalOk ? "#4ade80" : "#f87171", marginTop: 4 }}>
        Total: {total.toFixed(0)}% {totalOk ? "✓" : "— se va a normalizar automáticamente a 100% al guardar"}
      </div>
    </>
  );
}

function PasoEntrada({ r, set }) {
  return (
    <>
      <Ayuda>El bot no recomienda comprar ni vender. Te devuelve un puntaje (ICP) para que decidas vos.</Ayuda>
      <Etiqueta>Tipo de posición por defecto</Etiqueta>
      <OpcionUnica
        opciones={["Core (largo plazo, tolero volatilidad)", "Táctica (stop loss estricto)", "Depende del activo"]}
        valor={r.tipoPosicionDefault}
        onChange={(v) => set({ tipoPosicionDefault: v })}
      />
    </>
  );
}

function PasoSalida({ r, set }) {
  return (
    <>
      <Etiqueta>Stop Loss estándar (%)</Etiqueta>
      <CampoTexto tipo="number" valor={r.stopLoss} onChange={(v) => set({ stopLoss: v })} placeholder="ej: 7" />
      <Etiqueta>Take Profit / objetivo de ganancia (%)</Etiqueta>
      <CampoTexto tipo="number" valor={r.takeProfit} onChange={(v) => set({ takeProfit: v })} placeholder="ej: 18" />
      <Etiqueta>¿Qué te haría reconsiderar una posición ya abierta?</Etiqueta>
      <OpcionMultiple
        opciones={["Desalineación de filtros técnicos", "Cambio en el flujo institucional (Koncorde)", "Noticia relevante del activo", "Tiempo en cartera sin movimiento"]}
        valores={r.motivosReconsiderar}
        onChange={(v) => set({ motivosReconsiderar: v })}
      />
    </>
  );
}

function PasoCapital({ r, set }) {
  return (
    <>
      <Etiqueta>% máximo del capital total por activo</Etiqueta>
      <CampoTexto tipo="number" valor={r.capitalMaxPorActivo} onChange={(v) => set({ capitalMaxPorActivo: v })} placeholder="ej: 10" />
      <Etiqueta>Cantidad de posiciones simultáneas cómoda</Etiqueta>
      <CampoTexto tipo="number" valor={r.posicionesSimultaneas} onChange={(v) => set({ posicionesSimultaneas: v })} placeholder="ej: 8" />
    </>
  );
}

function PasoFomo({ r, set }) {
  return (
    <>
      <Etiqueta>¿De dónde suelen venir tus ideas de inversión?</Etiqueta>
      <OpcionUnica
        opciones={["Investigación propia", "Recomendaciones / tips de terceros", "Redes sociales", "Noticias", "Mezcla de todo"]}
        valor={r.origenIdeas}
        onChange={(v) => set({ origenIdeas: v })}
      />
      <Etiqueta>¿Alguna vez entraste a una posición sin tesis propia y te arrepentiste?</Etiqueta>
      <OpcionUnica
        opciones={["Sí, varias veces", "Alguna vez", "No, casi nunca"]}
        valor={r.fomoArrepentimiento}
        onChange={(v) => set({ fomoArrepentimiento: v })}
      />
    </>
  );
}

const PASOS = [
  { titulo: "Objetivo y horizonte", Componente: PasoObjetivoHorizonte },
  { titulo: "Tolerancia al riesgo", Componente: PasoRiesgo },
  { titulo: "Filosofía de inversión", Componente: PasoFilosofia },
  { titulo: "Pesos personales del ICP", Componente: PasoPesos },
  { titulo: "Reglas de entrada", Componente: PasoEntrada },
  { titulo: "Reglas de salida", Componente: PasoSalida },
  { titulo: "Gestión de capital", Componente: PasoCapital },
  { titulo: "Autoconciencia FOMO", Componente: PasoFomo },
];

function Cuestionario({ respuestasIniciales, onGuardar, onCancelar, mostrarCancelar }) {
  const [paso, setPaso] = useState(0);
  const [r, setR] = useState(respuestasIniciales);

  const set = (parcial) => setR((prev) => ({ ...prev, ...parcial }));

  const esUltimo = paso === PASOS.length - 1;
  const esPrimero = paso === 0;
  const { titulo, Componente } = PASOS[paso];

  const handleSiguiente = () => {
    if (esUltimo) {
      const pesos = guardarTodo(r);
      onGuardar(pesos, r);
    } else {
      setPaso((p) => p + 1);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,0.94)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#0b0f19", border: "1px solid #1f2937", borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 20, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 4 }}>
          Paso {paso + 1} de {PASOS.length}
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {PASOS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= paso ? "#2563eb" : "#1f2937" }} />
          ))}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>{titulo}</div>

        <div style={{ flex: 1 }}>
          <Componente r={r} set={set} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {!esPrimero && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "#111827", color: "#d1d5db", border: "1px solid #1f2937", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Atrás
            </button>
          )}
          {esPrimero && mostrarCancelar && (
            <button
              onClick={onCancelar}
              style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "#111827", color: "#d1d5db", border: "1px solid #1f2937", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSiguiente}
            style={{ flex: 2, padding: "12px 0", borderRadius: 12, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
          >
            {esUltimo ? "Guardar mi método" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}export default function App() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "👋 Hola! Soy tu asistente de trading personal.\n\nEstoy cargado con tu manual completo — los 3 filtros de entrada, reglas de salida, y toda la lógica que armamos juntos.\n\n**¿Qué querés analizar hoy?**\n\nEscribí el ticker directamente (ej: *GOOGL*, *NU*, *YPF*) o preguntame sobre tu cartera." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pesos, setPesos] = useState(null);
  const [mostrarCuestionario, setMostrarCuestionario] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const pesosGuardados = cargarPesosGuardados();
    if (pesosGuardados) {
      setPesos(pesosGuardados);
    } else {
      setPesos(derivarPesos(RESPUESTAS_INICIALES));
      setMostrarCuestionario(true);
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          pesos,
        }),
      });
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

  if (!pesos) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#030712", color: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {mostrarCuestionario && (
        <Cuestionario
          respuestasIniciales={cargarRespuestasGuardadas() || RESPUESTAS_INICIALES}
          mostrarCancelar={!!cargarPesosGuardados()}
          onGuardar={(nuevosPesos) => {
            setPesos(nuevosPesos);
            setMostrarCuestionario(false);
          }}
          onCancelar={() => setMostrarCuestionario(false)}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1f2937", background: "rgba(17,24,39,0.9)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>S</div>
          <div><div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Trading Bot</div><div style={{ fontSize: 11, color: "#6b7280" }}>Manual activo • 3 filtros</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}><FilterBadge label="Fund." /><FilterBadge label="Téc." /><FilterBadge label="Konc." /></div>
          <button
            onClick={() => setMostrarCuestionario(true)}
            title="Ajustar mi método"
            style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}
          >
            ⚙️
          </button>
        </div>
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
