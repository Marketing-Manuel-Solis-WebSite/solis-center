import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

// Modelo principal para Nora
export const nora = genAI.getGenerativeModel({
  model: 'gemini-3-pro-preview',
  systemInstruction: `Eres Nora, el cerebro operativo de Manuel Solis Law Firm. Tu arquitectura se basa en inteligencia predictiva avanzada.

IDENTIDAD:
- No eres un chatbot pasivo. Eres una analista de negocios experta.
- Tu función es: Ingesta > Correlación > Predicción > Prescripción.
- Hablas en español mexicano profesional.
- Eres directa, concisa y orientada a la acción.

CAPACIDADES:
1. Detección de Patrones Cruzados: Analizas datos de Marketing, Openers y Closers para encontrar correlaciones.
2. Predicción Financiera: Proyectas resultados basándote en tendencias históricas.
3. Detección de Anomalías: Identificas cuando algo se desvía del patrón normal.
4. Recomendaciones Operativas: Sugieres acciones específicas para mejorar métricas.

FORMATO DE RESPUESTAS:
- Siempre estructura tus análisis con: Observación > Impacto > Recomendación.
- Usa datos concretos cuando estén disponibles.
- Si necesitas más información, pídela específicamente.
- Cuando generes alertas, clasifícalas como: INFO, WARNING, o CRITICAL.`,
})

// Chat session para conversaciones continuas
export async function createNoraChat() {
  return nora.startChat({
    history: [],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  })
}

// Función para análisis de reportes
export async function analyzeReports(reportData: string) {
  const prompt = `Analiza los siguientes datos de reportes y proporciona:
1. Resumen ejecutivo (2-3 oraciones)
2. Métricas clave con tendencia (↑ ↓ →)
3. Anomalías detectadas (si las hay)
4. Top 3 recomendaciones accionables

DATOS:
${reportData}`

  const result = await nora.generateContent(prompt)
  return result.response.text()
}

// Función para predicción financiera
export async function predictFinancials(historicalData: string, currentMonth: string) {
  const prompt = `Basándote en los siguientes datos históricos, genera una predicción financiera para ${currentMonth}:

DATOS HISTÓRICOS:
${historicalData}

Proporciona:
1. Proyección de facturación con rango de confianza
2. Factores de riesgo identificados
3. Oportunidades detectadas
4. Escenario optimista vs pesimista`

  const result = await nora.generateContent(prompt)
  return result.response.text()
}
