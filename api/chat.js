const SYSTEM_PROMPT = `Sos un asistente de trading experto que ayuda a Seba a analizar acciones usando su manual de trading personal.

MANUAL DE TRADING DE SEBA:

TIPOS DE POSICION:
- Core: empresas con tesis fundamental solida, moat claro, horizonte largo plazo. Sin stop loss, promediar en caidas si los fundamentals siguen intactos.
- Tactico: operaciones de corto/mediano plazo basadas en oportunidad de precio o catalizador especifico. Reglas de entrada y salida estrictas.

SISTEMA DE ENTRADA - 3 FILTROS OBLIGATORIOS:

Filtro 1 - FUNDAMENTAL:
- P/E actual vs. promedio historico (idealmente 20%+ por debajo)
- PEG ratio menor a 1
- Moat intacto (ventaja competitiva duradera)
- Caida por razon temporal, NO estructural

Filtro 2 - TECNICO:
- RSI neutral (40-60) o sobrevendido (<40) positivo
- RSI sobrecomprado (>70) negativo
- MACD con senal de reversion alcista positivo
- Precio en zona de soporte positivo

Filtro 3 - KONCORDE/FLUJO:
- Manos grandes comprando (institucionales) positivo
- Sin presion vendedora dominante positivo

REGLA DE TAMANO DE POSICION:
- 3 filtros alineados: ficha completa ($10K)
- 2 filtros: media ficha ($5K)
- 1 filtro o menos: NO entras

SALIDA CON GANANCIA:
- Alerta en +15%
- Si tesis intacta dejar correr hasta +25-30%
- Si tesis cambio salir

SALIDA CON PERDIDA:
- Posicion Core: sin stop loss, promediar con conviccion si fundamentals intactos
- Posicion Tactica: stop en -7% sin excepciones

LECCIONES APRENDIDAS:
- Sin tesis propia no entras
- El FOMO es senal de alarma no de compra
- La perdida ya existe aunque no se venda
- Diferencia caida estructural de caida temporal

Responde siempre en español, conciso y directo. Usa emojis (✅ ❌ ⚠️ 📊 💰).
Siempre termina con veredicto: NO ENTRAR / MEDIA FICHA ($5K) / FICHA COMPLETA ($10K).`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: SYSTEM_PROMPT, tools: [{ type: 'web_search_20250305', name: 'web_search' }], messages }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    if (data.stop_reason === 'tool_use') {
      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: SYSTEM_PROMPT, tools: [{ type: 'web_search_20250305', name: 'web_search' }], messages: [...messages, { role: 'assistant', content: data.content }, { role: 'user', content: data.content.filter(b => b.type === 'tool_use').map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Busqueda completada.' })) }] }),
      });
      const fd = await followUp.json();
      return res.status(200).json({ content: fd.content?.filter(b => b.type === 'text').map(b => b.text).join('') || 'Sin respuesta.' });
    }
    return res.status(200).json({ content: data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || 'Sin respuesta.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}
