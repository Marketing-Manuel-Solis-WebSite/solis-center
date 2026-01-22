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

// ==================== SISTEMA DE TAREAS ====================

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
  dueDate: string | null
  timeEstimate: number
  timeTracked: number
  dependencies: string[]
  customFields: CustomField[]
  linkedReportId?: string
  parentTaskId?: string
  department: Department
  spaceId?: string
  folderId?: string
  listId?: string
  order?: number
  attachments: Attachment[]
  comments: Comment[]
  activityLog?: ActivityLog[]
  createdAt: any
  updatedAt: any
  subtasks?: Subtask[]
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeAvatar?: string | null
  createdByName?: string
}

export interface Subtask { 
  id: string
  title: string
  completed: boolean
  createdAt: number 
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
  content?: string
  text?: string
  author: UserRef
  authorId?: string
  authorName?: string
  authorAvatar?: string
  createdAt: any
  updatedAt?: Timestamp
}

// ==================== WORKSPACE ====================

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

// ==================== DOCUMENTOS ====================

export interface Document {
  id: string
  title: string
  url: string
  storagePath: string
  type: string
  size: number
  department: Department
  createdBy: UserRef
  createdAt: any
  aiStatus: 'pending' | 'processing' | 'indexed' | 'error'
  aiSummary?: string
  aiTags?: string[]
  aiEmbeddingId?: string
}

// ==================== REPORTES ====================

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

// ==================== FORMULARIOS ====================

export interface FormField {
  id: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'email'
  label: string
  required: boolean
  options?: string[]
  placeholder?: string
}

export interface FormTemplate {
  id: string
  title: string
  description: string
  fields: FormField[]
  notifyEmail: string
  targetAudience: 'public' | 'internal' | Department
  isActive: boolean
  createdBy: UserRef
  createdAt: any
}

export interface FormSubmission {
  id: string
  formId: string
  formTitle: string
  data: Record<string, string | number>
  submittedBy?: UserRef | 'anonymous'
  submittedAt: any
}

// ==================== SOCIAL INBOX (MEJORADO) ====================

export type SocialPlatform = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'messenger'

export interface SocialMessage {
  id: string
  platform: SocialPlatform
  externalId: string
  senderName: string
  senderHandle: string
  senderAvatar?: string
  content: string
  timestamp: any // Firestore Timestamp
  status: 'unread' | 'read' | 'replied' | 'resolved' | 'archived' // ← AGREGADOS: 'resolved' y 'archived'
  direction: 'incoming' | 'outgoing'
  threadId?: string
  attachments?: string[]
  leadScore?: number
  intent?: 'consulta_legal' | 'precios' | 'queja' | 'general'
}