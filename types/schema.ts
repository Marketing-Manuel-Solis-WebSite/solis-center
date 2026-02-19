/**
 * ============================================================================
 * SOLIS OS — ESQUEMA DE DATOS MAESTRO
 * ============================================================================
 * Arquitectura jerárquica inspirada en ClickUp/Linear:
 *   Workspace → Space → Folder (opcional) → List → Task
 *
 * Principios:
 *   1. Tipado estricto — cero `any`, cero ambigüedad.
 *   2. Campos personalizados dinámicos — flexibilidad tipo Notion.
 *   3. Vistas polimórficas — una misma lista se renderiza como Kanban, Tabla, etc.
 *   4. Preparado para IA — cada entidad expone un contexto serializable.
 * ============================================================================
 */

import { Timestamp, FieldValue } from 'firebase/firestore'

// ======================== UTILIDADES DE TIPADO ========================

/** Timestamp de Firestore o serverTimestamp() durante escritura */
export type FirestoreTimestamp = Timestamp | FieldValue

/** Referencia ligera a un usuario (para embeber en documentos) */
export interface UserRef {
  id: string
  name: string
  avatar: string
  email?: string
}

/** Identificador de ruta jerárquica completa */
export interface HierarchyPath {
  workspaceId: string
  spaceId: string
  folderId?: string
  listId: string
}

// ======================== ROLES Y PERMISOS ========================

export type UserRole = 'owner' | 'director' | 'gerente' | 'supervisor' | 'lider' | 'operativo' | 'invitado'

export type Department =
  | 'marketing'
  | 'openers'
  | 'closers'
  | 'admin'
  | 'finanzas'
  | 'legal'
  | 'general'

/** Permisos granulares — cada flag es independiente */
export interface UserPermissions {
  canCreateTasks: boolean
  canDeleteTasks: boolean
  canAssignTasks: boolean
  canManageUsers: boolean
  canViewAllDepartments: boolean
  canManageAutomations: boolean
  canManageWorkspace: boolean
  canManageBilling: boolean
  canAccessReports: boolean
  canManageForms: boolean
  canManageSocialInbox: boolean
}

/** Mapeo predeterminado de permisos por rol */
export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    canCreateTasks: true, canDeleteTasks: true, canAssignTasks: true,
    canManageUsers: true, canViewAllDepartments: true, canManageAutomations: true,
    canManageWorkspace: true, canManageBilling: true, canAccessReports: true,
    canManageForms: true, canManageSocialInbox: true,
  },
  director: {
    canCreateTasks: true, canDeleteTasks: true, canAssignTasks: true,
    canManageUsers: true, canViewAllDepartments: true, canManageAutomations: true,
    canManageWorkspace: true, canManageBilling: false, canAccessReports: true,
    canManageForms: true, canManageSocialInbox: true,
  },
  gerente: {
    canCreateTasks: true, canDeleteTasks: true, canAssignTasks: true,
    canManageUsers: true, canViewAllDepartments: true, canManageAutomations: true,
    canManageWorkspace: false, canManageBilling: false, canAccessReports: true,
    canManageForms: true, canManageSocialInbox: true,
  },
  supervisor: {
    canCreateTasks: true, canDeleteTasks: true, canAssignTasks: true,
    canManageUsers: false, canViewAllDepartments: true, canManageAutomations: false,
    canManageWorkspace: false, canManageBilling: false, canAccessReports: true,
    canManageForms: false, canManageSocialInbox: false,
  },
  lider: {
    canCreateTasks: true, canDeleteTasks: false, canAssignTasks: true,
    canManageUsers: false, canViewAllDepartments: false, canManageAutomations: false,
    canManageWorkspace: false, canManageBilling: false, canAccessReports: false,
    canManageForms: false, canManageSocialInbox: false,
  },
  operativo: {
    canCreateTasks: true, canDeleteTasks: false, canAssignTasks: false,
    canManageUsers: false, canViewAllDepartments: false, canManageAutomations: false,
    canManageWorkspace: false, canManageBilling: false, canAccessReports: false,
    canManageForms: false, canManageSocialInbox: false,
  },
  invitado: {
    canCreateTasks: false, canDeleteTasks: false, canAssignTasks: false,
    canManageUsers: false, canViewAllDepartments: false, canManageAutomations: false,
    canManageWorkspace: false, canManageBilling: false, canAccessReports: false,
    canManageForms: false, canManageSocialInbox: false,
  },
}

// ======================== USUARIO COMPLETO ========================

export interface IUser {
  id: string
  email: string
  name: string
  avatar: string
  role: UserRole
  department: Department
  permissions: UserPermissions
  isActive: boolean
  onlineStatus: 'online' | 'away' | 'offline'
  lastSeenAt: FirestoreTimestamp
  createdAt: FirestoreTimestamp
  lastLoginAt: FirestoreTimestamp
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system'
  language: 'es' | 'en'
  notifications: {
    email: boolean
    push: boolean
    sound: boolean
    mentionsOnly: boolean
  }
  defaultView: ViewType
  compactMode: boolean
}

// ======================== JERARQUÍA: WORKSPACE ========================

/**
 * Workspace = La raíz absoluta. Un bufete como "Manuel Solis Law Firm"
 * tiene exactamente UN workspace.
 */
export interface IWorkspace {
  id: string
  name: string
  slug: string               // URL-friendly: "manuel-solis-law"
  logo?: string
  ownerId: string
  members: WorkspaceMember[]
  settings: WorkspaceSettings
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface WorkspaceMember {
  userId: string
  role: UserRole
  joinedAt: FirestoreTimestamp
}

export interface WorkspaceSettings {
  defaultStatusSet: StatusConfig[]
  defaultPriorities: PriorityConfig[]
  customFieldDefinitions: ICustomFieldConfig[]
  timeTrackingEnabled: boolean
  aiEnabled: boolean
  socialInboxEnabled: boolean
}

// ======================== JERARQUÍA: SPACE ========================

/**
 * Space = Departamento o área funcional.
 * Ejemplo: "Marketing", "Closers", "Finanzas".
 * Cada Space tiene sus propios statuses y miembros.
 */
export interface ISpace {
  id: string
  workspaceId: string
  name: string
  icon: string               // Emoji o icono lucide
  color: string              // Hex color
  department: Department
  description: string
  members: string[]          // Array de userIds con acceso
  statusSet: StatusConfig[]  // Statuses personalizados por espacio
  isPrivate: boolean
  order: number
  createdBy: UserRef
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ======================== JERARQUÍA: FOLDER ========================

/**
 * Folder = Agrupador OPCIONAL dentro de un Space.
 * Ejemplo: Dentro de "Marketing" → Folder "Q1 2025", "Campañas Evergreen".
 */
export interface IFolder {
  id: string
  workspaceId: string
  spaceId: string
  name: string
  icon?: string
  color?: string
  isExpanded: boolean        // Estado del UI del sidebar
  order: number
  createdBy: UserRef
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ======================== JERARQUÍA: LIST ========================

/**
 * List = El contenedor real de tareas. Puede estar dentro de un Folder o
 * directamente bajo un Space.
 * Cada List puede definir sus propios custom fields.
 */
export interface IList {
  id: string
  workspaceId: string
  spaceId: string
  folderId?: string          // Undefined = lista directa en Space
  name: string
  icon?: string
  color?: string
  description?: string
  statusOverrides?: StatusConfig[]   // Override de statuses del Space
  customFieldConfigs: ICustomFieldConfig[]  // Campos personalizados de la lista
  defaultView: ViewType
  views: IView[]             // Configuraciones de vistas guardadas
  automations: IAutomation[]
  order: number
  taskCount: number          // Contador denormalizado para rendimiento
  createdBy: UserRef
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ======================== STATUSES PERSONALIZADOS ========================

export interface StatusConfig {
  id: string
  name: string
  color: string
  category: 'not_started' | 'active' | 'done' | 'closed'
  order: number
  isDefault?: boolean
}

/** Set predeterminado de statuses (ClickUp style) */
export const DEFAULT_STATUS_SET: StatusConfig[] = [
  { id: 'todo',        name: 'Por Hacer',    color: '#64748b', category: 'not_started', order: 0, isDefault: true },
  { id: 'in_progress', name: 'En Progreso',  color: '#3b82f6', category: 'active',      order: 1 },
  { id: 'review',      name: 'En Revisión',  color: '#f59e0b', category: 'active',      order: 2 },
  { id: 'done',        name: 'Completado',   color: '#22c55e', category: 'done',        order: 3 },
  { id: 'blocked',     name: 'Bloqueado',    color: '#ef4444', category: 'active',      order: 4 },
]

// ======================== PRIORIDADES ========================

export interface PriorityConfig {
  id: TaskPriority
  name: string
  color: string
  icon: string
  order: number
}

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low' | 'none'

export const DEFAULT_PRIORITIES: PriorityConfig[] = [
  { id: 'urgent', name: 'Urgente',  color: '#ef4444', icon: '🔴', order: 0 },
  { id: 'high',   name: 'Alta',     color: '#f97316', icon: '🟠', order: 1 },
  { id: 'normal', name: 'Normal',   color: '#3b82f6', icon: '🔵', order: 2 },
  { id: 'low',    name: 'Baja',     color: '#64748b', icon: '⚪', order: 3 },
  { id: 'none',   name: 'Sin prioridad', color: '#374151', icon: '—', order: 4 },
]

// ======================== CAMPOS PERSONALIZADOS ========================

/**
 * Definición de un campo personalizado (la "columna").
 * Se configura a nivel de List o Workspace.
 */
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'dropdown'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'phone'
  | 'rating'
  | 'formula'
  | 'relation'        // Relación a otra tarea
  | 'person'          // Referencia a usuario(s)
  | 'files'
  | 'label'           // Tags con colores

export interface ICustomFieldConfig {
  id: string
  name: string
  type: CustomFieldType
  description?: string
  required: boolean
  showInCard: boolean        // Mostrar en tarjeta Kanban
  showInList: boolean        // Mostrar en vista de lista
  width?: number             // Ancho de columna en vista tabla (px)
  order: number

  // Opciones específicas por tipo
  options?: DropdownOption[]           // Para dropdown / multi_select / label
  currencyCode?: string                // Para currency (MXN, USD)
  formulaExpression?: string           // Para formula
  relationListId?: string              // Para relation
  numberFormat?: 'plain' | 'comma' | 'compact'
  dateFormat?: 'short' | 'long' | 'relative'
  ratingMax?: number                   // Para rating (default 5)
  defaultValue?: CustomFieldValue
}

export interface DropdownOption {
  id: string
  label: string
  color: string
  order: number
}

/** Valor concreto de un campo personalizado en una tarea */
export type CustomFieldValue =
  | string
  | number
  | boolean
  | string[]         // multi_select, files, labels
  | UserRef[]        // person
  | null

export interface TaskCustomFieldEntry {
  fieldId: string      // Referencia al ICustomFieldConfig.id
  value: CustomFieldValue
}

// ======================== TAREA — MODELO CENTRAL ========================

export interface ITask {
  id: string

  // --- Jerarquía ---
  workspaceId: string
  spaceId: string
  folderId?: string
  listId: string
  parentTaskId?: string       // Para subtareas anidadas
  path: HierarchyPath         // Ruta completa pre-calculada

  // --- Contenido ---
  title: string
  description: string         // Markdown soportado
  status: string              // ID del StatusConfig
  priority: TaskPriority

  // --- Asignación ---
  assignees: UserRef[]
  createdBy: UserRef
  watchers: string[]          // UserIds que reciben notificaciones

  // --- Tiempo ---
  dueDate: string | null      // ISO 8601: "2025-03-15"
  startDate: string | null
  timeEstimateMinutes: number
  timeTrackedMinutes: number
  timeEntries: TimeEntry[]

  // --- Relaciones ---
  dependencies: TaskDependency[]
  linkedTaskIds: string[]     // Tareas relacionadas (sin bloqueo)
  linkedReportId?: string

  // --- Campos personalizados ---
  customFields: TaskCustomFieldEntry[]

  // --- Subtareas ---
  subtasks: ISubtask[]
  subtaskCount: number        // Denormalizado
  subtasksDone: number        // Denormalizado

  // --- Adjuntos y Comentarios ---
  attachments: IAttachment[]
  comments: IComment[]
  commentCount: number        // Denormalizado

  // --- Actividad ---
  activityLog: IActivityEntry[]

  // --- Tags / Labels ---
  tags: string[]

  // --- Ordenamiento ---
  order: number               // Dentro de su status/columna
  orderInList: number         // Orden global en la lista

  // --- Metadatos ---
  isArchived: boolean
  archivedAt?: FirestoreTimestamp
  completedAt?: FirestoreTimestamp
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ======================== SUBTAREAS ========================

export interface ISubtask {
  id: string
  title: string
  completed: boolean
  assigneeId?: string
  dueDate?: string | null
  order: number
  completedAt?: number        // Unix timestamp
  createdAt: number           // Unix timestamp
}

// ======================== DEPENDENCIAS ========================

export type DependencyType = 'blocks' | 'blocked_by' | 'waiting_on' | 'linked_to'

export interface TaskDependency {
  taskId: string
  type: DependencyType
  taskTitle?: string          // Denormalizado para UI rápida
}

// ======================== TIME TRACKING ========================

export interface TimeEntry {
  id: string
  userId: string
  userName: string
  startedAt: number           // Unix ms
  endedAt: number             // Unix ms
  durationMinutes: number
  description?: string
  billable: boolean
}

// ======================== ADJUNTOS ========================

export interface IAttachment {
  id: string
  name: string
  url: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  thumbnailUrl?: string
  uploadedBy: UserRef
  uploadedAt: FirestoreTimestamp
}

// ======================== COMENTARIOS ========================

export interface IComment {
  id: string
  content: string             // Soporta Markdown y @menciones
  authorId: string
  authorName: string
  authorAvatar: string
  mentions: string[]          // UserIds mencionados
  reactions: Record<string, string[]>  // emoji → userIds
  isEdited: boolean
  editedAt?: FirestoreTimestamp
  parentCommentId?: string    // Para hilos de respuesta
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ======================== ACTIVIDAD / AUDITORÍA ========================

export type ActivityAction =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'unassigned'
  | 'due_date_changed'
  | 'title_changed'
  | 'description_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'custom_field_changed'
  | 'moved'                  // Movida a otra lista
  | 'archived'
  | 'restored'
  | 'time_tracked'

export interface IActivityEntry {
  id: string
  action: ActivityAction
  userId: string
  userName: string
  timestamp: number           // Unix ms (para ordenamiento rápido)
  field?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, string>
}

// ======================== VISTAS ========================

export type ViewType = 'board' | 'list' | 'table' | 'calendar' | 'gantt' | 'timeline'

export interface IView {
  id: string
  name: string
  type: ViewType
  isDefault: boolean
  isPinned: boolean

  // Configuración de filtros activos
  filters: ViewFilter[]

  // Configuración de agrupamiento
  groupBy?: ViewGroupBy

  // Configuración de ordenamiento
  sortBy: ViewSortConfig[]

  // Columnas visibles (para tabla/lista)
  visibleColumns: string[]    // fieldIds o 'title', 'status', 'priority', etc.
  columnWidths: Record<string, number>

  // Específico de Kanban
  boardGroupField?: string    // 'status' | 'priority' | 'assignee' | customFieldId

  // Específico de Calendar/Gantt
  dateField?: 'dueDate' | 'startDate' | 'createdAt'

  createdBy: UserRef
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface ViewFilter {
  id: string
  field: string               // 'status' | 'priority' | 'assignee' | customFieldId
  operator: FilterOperator
  value: string | string[] | number | boolean | null
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
  | 'before'        // Para fechas
  | 'after'
  | 'between'

export interface ViewGroupBy {
  field: string
  direction: 'asc' | 'desc'
  hideEmptyGroups: boolean
}

export interface ViewSortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// ======================== AUTOMATIZACIONES ========================

export interface IAutomation {
  id: string
  name: string
  description?: string
  isActive: boolean
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  executionCount: number
  lastExecutedAt?: FirestoreTimestamp
  createdBy: UserRef
  createdAt: FirestoreTimestamp
}

export interface AutomationTrigger {
  type: 'status_changed' | 'task_created' | 'due_date_arrived' | 'assignee_changed' | 'custom_field_changed'
  config: Record<string, string>
}

export interface AutomationCondition {
  field: string
  operator: FilterOperator
  value: string | number | boolean
}

export interface AutomationAction {
  type: 'change_status' | 'assign_user' | 'add_comment' | 'send_notification' | 'move_to_list' | 'set_priority' | 'trigger_nora'
  config: Record<string, string>
}

// ======================== NOTIFICACIONES ========================

export interface INotification {
  id: string
  userId: string              // Destinatario
  type: NotificationType
  title: string
  body: string
  taskId?: string
  taskTitle?: string
  actorId: string
  actorName: string
  actorAvatar: string
  isRead: boolean
  readAt?: FirestoreTimestamp
  actionUrl?: string
  createdAt: FirestoreTimestamp
}

export type NotificationType =
  | 'task_assigned'
  | 'task_mentioned'
  | 'task_commented'
  | 'task_completed'
  | 'task_due_soon'
  | 'task_overdue'
  | 'automation_triggered'
  | 'nora_insight'
  | 'social_message'
  | 'form_submitted'

// ======================== REPORTES ========================

export interface IReport {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'custom'
  department: Department
  createdBy: UserRef
  dateRange: { start: string; end: string }
  metrics: ReportMetric[]
  aiAnalysis?: string
  aiInsights?: NoraInsight[]
  status: 'draft' | 'pending_review' | 'analyzed' | 'published' | 'archived'
  visibility: 'private' | 'department' | 'workspace'
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface ReportMetric {
  id: string
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendPercentage?: number
  previousValue?: number | string
  category?: string
}

// ======================== FORMULARIOS ========================

export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multi_select' | 'email' | 'phone' | 'file' | 'rating' | 'nps'

export interface IFormField {
  id: string
  type: FormFieldType
  label: string
  description?: string
  placeholder?: string
  required: boolean
  options?: DropdownOption[]
  validation?: FormFieldValidation
  order: number
  conditionalLogic?: ConditionalRule[]
}

export interface FormFieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  customMessage?: string
}

export interface ConditionalRule {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
  action: 'show' | 'hide' | 'require'
}

export interface IFormTemplate {
  id: string
  workspaceId: string
  title: string
  description: string
  fields: IFormField[]
  notifyEmails: string[]
  targetAudience: 'public' | 'internal' | Department
  isActive: boolean
  customTheme?: {
    primaryColor: string
    logoUrl?: string
    backgroundUrl?: string
  }
  successMessage: string
  redirectUrl?: string
  submissionCount: number
  createdBy: UserRef
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface IFormSubmission {
  id: string
  formId: string
  formTitle: string
  data: Record<string, CustomFieldValue>
  submittedBy: UserRef | 'anonymous'
  ipAddress?: string
  userAgent?: string
  sentiment?: 'positive' | 'neutral' | 'negative'  // Analizado por Nora
  submittedAt: FirestoreTimestamp
}

// ======================== SOCIAL INBOX ========================

export type SocialPlatform = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'messenger'

export interface ISocialMessage {
  id: string
  workspaceId: string
  platform: SocialPlatform
  externalId: string
  threadId: string
  direction: 'incoming' | 'outgoing'

  // Remitente
  senderName: string
  senderHandle: string
  senderAvatar?: string
  senderExternalId: string

  // Contenido
  content: string
  contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location'
  mediaUrl?: string

  // Estado
  status: 'unread' | 'read' | 'replied' | 'resolved' | 'archived' | 'spam'
  assignedTo?: UserRef
  tags: string[]

  // IA
  sentiment?: 'positive' | 'neutral' | 'negative'
  intent?: 'legal_inquiry' | 'pricing' | 'complaint' | 'appointment' | 'general'
  leadScore?: number          // 0-100
  suggestedReply?: string     // Generada por Nora

  // Relaciones
  linkedTaskId?: string       // Tarea creada desde esta conversación
  linkedContactId?: string

  timestamp: FirestoreTimestamp
}

export interface ISocialThread {
  id: string
  workspaceId: string
  platform: SocialPlatform
  contactName: string
  contactHandle: string
  contactAvatar?: string
  lastMessage: string
  lastMessageAt: FirestoreTimestamp
  messageCount: number
  unreadCount: number
  status: 'active' | 'resolved' | 'archived'
  assignedTo?: UserRef
  tags: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  createdAt: FirestoreTimestamp
}

// ======================== MENSAJERÍA INTERNA ========================

export interface IDirectChat {
  id: string
  participants: string[]
  participantsData: UserRef[]
  lastMessage: string
  lastMessageBy: string
  lastMessageAt: FirestoreTimestamp
  unreadCount: Record<string, number>
  isPinned: Record<string, boolean>
  isMuted: Record<string, boolean>
  createdAt: FirestoreTimestamp
}

export interface IGroupChat {
  id: string
  name: string
  description: string
  avatar: string
  members: string[]
  admins: string[]
  department?: Department
  lastMessage?: string
  lastMessageBy?: string
  lastMessageAt?: FirestoreTimestamp
  unreadCount: Record<string, number>
  isPinned: Record<string, boolean>
  createdBy: string
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface IChatMessage {
  id: string
  chatId: string
  chatType: 'direct' | 'group'
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  contentType: 'text' | 'file' | 'image' | 'system' | 'voice'
  fileUrl?: string
  fileName?: string
  fileSizeBytes?: number
  replyToId?: string
  mentions: string[]
  reactions: Record<string, string[]>
  isEdited: boolean
  editedAt?: FirestoreTimestamp
  deletedFor: string[]
  readBy: string[]
  timestamp: FirestoreTimestamp
}

// ======================== DOCUMENTOS ========================

export interface IDocument {
  id: string
  workspaceId: string
  title: string
  url: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  department: Department
  createdBy: UserRef

  // IA
  aiStatus: 'pending' | 'processing' | 'indexed' | 'error'
  aiSummary?: string
  aiTags?: string[]
  aiEmbeddingId?: string

  // Metadatos
  version: number
  isPublic: boolean
  sharedWith: string[]        // UserIds
  downloadCount: number

  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ======================== NORA — CONTEXTO DE IA ========================

export interface NoraInsight {
  id: string
  type: 'info' | 'warning' | 'critical' | 'opportunity'
  title: string
  body: string
  confidence: number          // 0-1
  relatedEntityType: 'task' | 'report' | 'social' | 'workspace'
  relatedEntityId?: string
  suggestedActions: NoraSuggestedAction[]
  isAcknowledged: boolean
  acknowledgedBy?: UserRef
  createdAt: FirestoreTimestamp
}

export interface NoraSuggestedAction {
  label: string
  type: 'create_task' | 'assign_user' | 'change_status' | 'send_message' | 'generate_report' | 'custom'
  payload: Record<string, string | number | boolean>
}

/** Contexto serializable que se envía a Nora para que entienda el estado actual */
export interface NoraContext {
  currentUser: UserRef & { role: UserRole; department: Department }
  currentView: {
    type: ViewType
    spaceId?: string
    listId?: string
    filters: ViewFilter[]
  }
  visibleTasks: Array<{
    id: string
    title: string
    status: string
    priority: TaskPriority
    assignees: string[]
    dueDate: string | null
    isOverdue: boolean
  }>
  recentActivity: Array<{
    action: string
    taskTitle: string
    userName: string
    timestamp: number
  }>
  metrics: {
    totalTasks: number
    completedToday: number
    overdueTasks: number
    unreadMessages: number
  }
}

// ======================== UTILIDADES DE EXPORTACIÓN ========================

/** Labels legibles para todo el sistema */
export const LABELS = {
  departments: {
    marketing: 'Marketing',
    openers: 'Openers',
    closers: 'Closers',
    admin: 'Administración',
    finanzas: 'Finanzas',
    legal: 'Legal',
    general: 'General',
  } satisfies Record<Department, string>,

  roles: {
    owner: 'Propietario',
    director: 'Director',
    gerente: 'Gerente',
    supervisor: 'Supervisor',
    lider: 'Líder de Equipo',
    operativo: 'Operativo',
    invitado: 'Invitado',
  } satisfies Record<UserRole, string>,

  priorities: {
    urgent: 'Urgente',
    high: 'Alta',
    normal: 'Normal',
    low: 'Baja',
    none: 'Sin prioridad',
  } satisfies Record<TaskPriority, string>,

  views: {
    board: 'Tablero',
    list: 'Lista',
    table: 'Tabla',
    calendar: 'Calendario',
    gantt: 'Gantt',
    timeline: 'Línea de Tiempo',
  } satisfies Record<ViewType, string>,
} as const
