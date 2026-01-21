import { Timestamp } from 'firebase/firestore'

// ==================== USUARIOS Y ROLES ====================

export type UserRole = 'director' | 'gerente' | 'lider' | 'operativo'
export type Department = 'marketing' | 'openers' | 'closers' | 'admin' | 'finanzas' | 'general'

export interface UserPermissions {
  canCreateTasks: boolean
  canDeleteTasks: boolean
  canAssignTasks: boolean
  canManageUsers: boolean
  canViewAllTasks: boolean
  canManageAutomations: boolean
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  department: Department
  permissions?: UserPermissions
  createdAt: Timestamp
  lastLogin: Timestamp
  isActive: boolean
}

export interface UserRef {
  id: string
  name: string
  avatar?: string
}

// ==================== SISTEMA DE TAREAS (CLICKUP CLONE) ====================

export type TaskStatus = 'to_do' | 'in_progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'currency' | 'dropdown' | 'date' | 'checkbox'
  value: string | number | boolean | null
  options?: string[]
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignees: UserRef[]
  createdBy: UserRef
  dueDate: Timestamp | null
  timeEstimate: number
  timeTracked: number
  dependencies: string[]
  customFields: CustomField[]
  linkedReportId?: string
  parentTaskId?: string
  department: Department
  spaceId: string
  folderId?: string
  listId: string
  order: number
  attachments: Attachment[]
  comments: Comment[]
  activityLog?: ActivityLog[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ActivityLog {
  id: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  userId: string
  userName: string
  timestamp: number
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedBy: UserRef
  uploadedAt: Timestamp
}

export interface Comment {
  id: string
  content: string
  author: UserRef
  createdAt: Timestamp
  updatedAt?: Timestamp
}

// ==================== DOCUMENTOS (NUEVO) ====================

export interface Document {
  id: string
  title: string
  url: string
  storagePath: string // Para poder eliminarlo de Storage
  type: string // MIME type (application/pdf, etc)
  size: number // en bytes
  department: Department
  createdBy: UserRef
  createdAt: any // Timestamp o number
}

// ==================== JERARQUÍA: SPACE > FOLDER > LIST ====================

export interface Space {
  id: string
  name: string
  icon: string
  color: string
  department: Department
  members: string[]
  createdAt: Timestamp
}

export interface Folder {
  id: string
  name: string
  spaceId: string
  order: number
  createdAt: Timestamp
}

export interface TaskList {
  id: string
  name: string
  spaceId: string
  folderId?: string
  statuses: StatusConfig[]
  order: number
  createdAt: Timestamp
}

export interface StatusConfig {
  id: string
  name: string
  color: string
  order: number
}

// ==================== REPORTES DIARIOS ====================

export interface Report {
  id: string
  title: string
  type: 'diario' | 'semanal' | 'mensual' | 'incidente'
  department: Department
  createdBy: UserRef
  createdAt: any
  dateRange: string
  metrics: {
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
  }[]
  aiAnalysis?: string
  status: 'pending' | 'analyzed' | 'archived'
}

export interface BaseReport {
  id: string
  date: Timestamp
  submittedBy: UserRef
  department: Department
  createdAt: Timestamp
  notes?: string
}

export interface MarketingReport extends BaseReport {
  department: 'marketing'
  data: {
    adSpendTotal: number
    currency: 'MXN' | 'USD'
    breakdownChannel: {
      meta: number
      google: number
      tiktok: number
      other: number
    }
    impressions: number
    clicks: number
    rawLeads: number
    cpl: number
  }
}

export interface OpenersReport extends BaseReport {
  department: 'openers'
  data: {
    leadsAssigned: number
    dialsMade: number
    connectRate: number
    appointmentsSet: number
    showRatePrediction: 'alta' | 'media' | 'baja'
    leadsNotContacted: number
  }
}

export interface ClosersReport extends BaseReport {
  department: 'closers'
  data: {
    appointmentsTaken: number
    offersMade: number
    dealsClosed: number
    revenueGenerated: number
    cashCollected: number
    conversionRate: number
  }
}

export type DailyReport = MarketingReport | OpenersReport | ClosersReport

// ==================== ALERTAS Y NOTIFICACIONES ====================

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertSource = 'nora' | 'system' | 'user'

export interface Alert {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  source: AlertSource
  targetDepartment?: Department
  targetUsers?: string[]
  linkedTaskId?: string
  isRead: boolean
  createdAt: Timestamp
}

// ==================== PREDICCIONES (NORA) ====================

export interface Prediction {
  id: string
  type: 'financial' | 'anomaly' | 'recommendation'
  title: string
  content: string
  confidence: number
  basedOnDays: number
  generatedAt: Timestamp
  expiresAt: Timestamp
  metadata: Record<string, unknown>
}