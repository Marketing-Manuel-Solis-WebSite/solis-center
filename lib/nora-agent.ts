/**
 * ============================================================================
 * SOLIS OS — NORA (Agente de IA)
 * ============================================================================
 * Motor de inteligencia artificial contextual. Usa Gemini como LLM.
 *
 * Capacidades:
 *   - Análisis de tareas: carga de trabajo, cuellos de botella, burndown
 *   - Sugerencias proactivas: priorización, reasignación, deadline alerts
 *   - Resumen ejecutivo: diario/semanal por departamento
 *   - Automatización inteligente: clasificar, asignar, etiquetar
 *   - Chat natural con contexto del workspace
 * ============================================================================
 */

import { useAppStore } from '../stores/useAppStore'
import type {
  ITask,
  IUser,
  NoraInsight,
  NoraSuggestedAction,
  NoraContext,
  UserRef,
  Department,
} from '../types/schema'

// ======================== CONFIGURACIÓN ========================

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

// ======================== TIPOS INTERNOS ========================

interface GeminiMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> }
  }>
}

// ======================== CLASE NORA AGENT ========================

export class NoraAgent {
  private conversationHistory: GeminiMessage[] = []
  private systemContext: string = ''

  constructor() {
    this.buildSystemContext()
  }

  // ==================== CONTEXTO DEL SISTEMA ====================

  private buildSystemContext(): void {
    this.systemContext = `
Eres Nora, la asistente de IA integrada en Solis OS, una plataforma de gestión de proyectos.

Tu personalidad:
- Profesional pero cálida
- Proactiva: no solo respondes, también anticipas necesidades
- Concisa: respuestas claras y accionables
- Hablas en español

Tu conocimiento:
- Tienes acceso completo al workspace del usuario
- Conoces todas las tareas, sus estados, prioridades, asignaciones y fechas
- Entiendes la estructura jerárquica: Workspace → Space → Folder → List → Task
- Conoces los departamentos: marketing, openers, closers, admin, finanzas, legal

Tus capacidades:
1. ANÁLISIS: Examinar patrones, cuellos de botella, distribución de carga
2. SUGERENCIAS: Recomendar reasignaciones, cambios de prioridad, automatizaciones
3. RESÚMENES: Generar reportes diarios/semanales
4. AUTOMATIZACIÓN: Proponer reglas y workflows
5. PREDICCIÓN: Estimar tiempos, detectar riesgos de deadline

Formato de respuesta:
- Usa markdown ligero cuando sea útil
- Para acciones sugeridas, usa el formato: [ACCIÓN: descripción]
- Para métricas, incluye números específicos
- Si no tienes datos suficientes, dilo honestamente
`.trim()
  }

  // ==================== CONSTRUIR CONTEXTO ACTUAL ====================

  private getCurrentContext(): NoraContext {
    const store = useAppStore.getState()
    const tasks = Object.values(store.tasks)
    const now = new Date().toISOString().split('T')[0]

    const overdueTasks = tasks.filter(t =>
      t.dueDate && t.dueDate < now && t.status !== 'done' && !t.isArchived
    )

    const tasksByStatus: Record<string, number> = {}
    const tasksByPriority: Record<string, number> = {}
    const tasksByAssignee: Record<string, number> = {}

    tasks.forEach(t => {
      if (t.isArchived) return
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1
      t.assignees.forEach(a => {
        tasksByAssignee[a.name] = (tasksByAssignee[a.name] || 0) + 1
      })
    })

    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => !t.isArchived && t.status !== 'done').length,
      overdueTasks: overdueTasks.length,
      overdueDetails: overdueTasks.slice(0, 10).map(t => ({
        title: t.title,
        dueDate: t.dueDate!,
        priority: t.priority,
        assignees: t.assignees.map(a => a.name),
      })),
      tasksByStatus,
      tasksByPriority,
      tasksByAssignee,
      recentActivity: tasks
        .filter(t => t.activityLog.length > 0)
        .sort((a, b) => (b.activityLog[b.activityLog.length - 1]?.timestamp || 0) - (a.activityLog[a.activityLog.length - 1]?.timestamp || 0))
        .slice(0, 5)
        .map(t => t.title),
    }
  }

  // ==================== LLAMAR A GEMINI ====================

  private async callGemini(userMessage: string, includeContext: boolean = true): Promise<string> {
    let contextBlock = ''

    if (includeContext) {
      const ctx = this.getCurrentContext()
      contextBlock = `
--- CONTEXTO ACTUAL DEL WORKSPACE ---
Total de tareas: ${ctx.totalTasks}
Tareas activas: ${ctx.activeTasks}
Tareas vencidas: ${ctx.overdueTasks}
Por estado: ${JSON.stringify(ctx.tasksByStatus)}
Por prioridad: ${JSON.stringify(ctx.tasksByPriority)}
Por asignado: ${JSON.stringify(ctx.tasksByAssignee)}
${ctx.overdueDetails.length > 0 ? `\nTareas vencidas:\n${ctx.overdueDetails.map(t => `  - "${t.title}" (vence: ${t.dueDate}, prioridad: ${t.priority}, asignado: ${t.assignees.join(', ') || 'nadie'})`).join('\n')}` : ''}
--- FIN CONTEXTO ---
`
    }

    // Agregar mensaje del usuario al historial
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: contextBlock + userMessage }],
    })

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: this.systemContext }] },
          contents: this.conversationHistory,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data: GeminiResponse = await response.json()
      const assistantMessage = data.candidates[0]?.content?.parts[0]?.text || 'No pude generar una respuesta.'

      // Agregar respuesta al historial
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: assistantMessage }],
      })

      // Mantener historial manejable (últimos 20 mensajes)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20)
      }

      return assistantMessage
    } catch (error) {
      console.error('[Nora] Error llamando a Gemini:', error)
      return 'Lo siento, tuve un problema al procesar tu solicitud. ¿Podrías intentar de nuevo?'
    }
  }

  // ==================== API PÚBLICA ====================

  /** Chat libre con contexto del workspace */
  async chat(message: string): Promise<string> {
    const store = useAppStore.getState()

    // Agregar mensaje del usuario al store
    store.addNoraMessage({ role: 'user', content: message, timestamp: Date.now() })

    const response = await this.callGemini(message)

    // Agregar respuesta al store
    store.addNoraMessage({ role: 'assistant', content: response, timestamp: Date.now() })

    return response
  }

  /** Generar resumen diario */
  async getDailySummary(department?: Department): Promise<string> {
    const deptFilter = department ? ` para el departamento de ${department}` : ''
    const prompt = `Genera un resumen ejecutivo del día${deptFilter}. Incluye:
1. Tareas completadas hoy
2. Tareas vencidas o en riesgo
3. Distribución de carga por persona
4. 2-3 recomendaciones accionables
Sé conciso y usa datos específicos.`

    return this.callGemini(prompt)
  }

  /** Analizar carga de trabajo y sugerir reasignaciones */
  async analyzeWorkload(): Promise<string> {
    const prompt = `Analiza la distribución de carga de trabajo del equipo.
Identifica:
1. ¿Quién tiene sobrecarga? ¿Quién tiene capacidad?
2. ¿Hay cuellos de botella en algún estado?
3. Sugiere reasignaciones específicas con formato [ACCIÓN: reasignar "tarea" de X a Y]
4. Estima si los deadlines actuales son realistas`

    return this.callGemini(prompt)
  }

  /** Sugerir priorización inteligente */
  async suggestPriorities(): Promise<string> {
    const prompt = `Revisa las prioridades actuales de las tareas y sugiere cambios.
Criterios:
- Urgencia por deadline
- Dependencias entre tareas
- Impacto en el equipo
- Bloqueos actuales
Formato: [ACCIÓN: cambiar prioridad de "tarea" a urgente/alta/normal/baja] con justificación breve.`

    return this.callGemini(prompt)
  }

  /** Detectar tareas en riesgo de incumplimiento */
  async detectRisks(): Promise<NoraInsight[]> {
    const ctx = this.getCurrentContext()
    const insights: NoraInsight[] = []

    // Tareas vencidas
    if (ctx.overdueTasks > 0) {
      insights.push({
        id: `risk_overdue_${Date.now()}`,
        type: 'warning',
        title: `${ctx.overdueTasks} tareas vencidas`,
        message: `Hay ${ctx.overdueTasks} tareas que ya pasaron su fecha límite. Revisa y reasigna si es necesario.`,
        priority: 'high',
        suggestedActions: [
          { type: 'navigate', label: 'Ver tareas vencidas', payload: { filter: 'overdue' } },
        ],
        createdAt: Date.now(),
        isRead: false,
      })
    }

    // Distribución desigual
    const assigneeCounts = Object.entries(ctx.tasksByAssignee)
    if (assigneeCounts.length >= 2) {
      const max = Math.max(...assigneeCounts.map(([, c]) => c))
      const min = Math.min(...assigneeCounts.map(([, c]) => c))
      if (max > min * 3) {
        const overloaded = assigneeCounts.find(([, c]) => c === max)
        insights.push({
          id: `risk_workload_${Date.now()}`,
          type: 'suggestion',
          title: 'Carga desbalanceada',
          message: `${overloaded?.[0]} tiene ${overloaded?.[1]} tareas, muy por encima del promedio del equipo. Considera redistribuir.`,
          priority: 'normal',
          suggestedActions: [
            { type: 'action', label: 'Analizar distribución', payload: { action: 'analyzeWorkload' } },
          ],
          createdAt: Date.now(),
          isRead: false,
        })
      }
    }

    // Tareas bloqueadas
    const blockedCount = ctx.tasksByStatus['blocked'] || 0
    if (blockedCount > 0) {
      insights.push({
        id: `risk_blocked_${Date.now()}`,
        type: 'alert',
        title: `${blockedCount} tareas bloqueadas`,
        message: `Hay tareas bloqueadas que podrían estar retrasando el progreso del equipo.`,
        priority: 'high',
        suggestedActions: [
          { type: 'navigate', label: 'Ver bloqueadas', payload: { filter: 'blocked' } },
        ],
        createdAt: Date.now(),
        isRead: false,
      })
    }

    // Guardar insights en el store
    const store = useAppStore.getState()
    insights.forEach(insight => store.addNoraInsight(insight))

    return insights
  }

  /** Auto-clasificar una tarea nueva */
  async classifyTask(title: string, description?: string): Promise<{
    suggestedPriority: string
    suggestedTags: string[]
    suggestedDepartment: Department
    suggestedAssignees: string[]
  }> {
    const prompt = `Clasifica esta tarea nueva:
Título: "${title}"
${description ? `Descripción: "${description}"` : ''}

Responde SOLO con JSON válido (sin markdown ni bloques de código):
{
  "suggestedPriority": "urgent|high|normal|low",
  "suggestedTags": ["tag1", "tag2"],
  "suggestedDepartment": "marketing|openers|closers|admin|finanzas|legal|general",
  "suggestedAssignees": ["nombre1"]
}
Basa tu clasificación en el contexto del workspace y las tareas existentes.`

    const response = await this.callGemini(prompt, true)

    try {
      // Limpiar posibles backticks de markdown
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      return JSON.parse(cleaned)
    } catch {
      return {
        suggestedPriority: 'normal',
        suggestedTags: [],
        suggestedDepartment: 'general',
        suggestedAssignees: [],
      }
    }
  }

  /** Limpiar historial de conversación */
  clearHistory(): void {
    this.conversationHistory = []
    useAppStore.getState().clearNoraConversation()
  }
}

// ======================== SINGLETON ========================

let noraInstance: NoraAgent | null = null

export function getNora(): NoraAgent {
  if (!noraInstance) {
    noraInstance = new NoraAgent()
  }
  return noraInstance
}

export default NoraAgent
