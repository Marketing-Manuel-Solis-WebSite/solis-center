'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { sendTaskNotification } from '../../lib/email'

// ==================== TIPOS ====================
type TaskStatus = 'to_do' | 'in_progress' | 'review' | 'done'
type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
type ViewMode = 'kanban' | 'list'

interface Subtask {
  id: string
  title: string
  completed: boolean
  createdAt: number
}

interface Comment {
  id: string
  text: string
  authorId: string
  authorName: string
  authorAvatar: string
  createdAt: number
}

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  assigneeName: string | null
  assigneeAvatar: string | null
  assigneeEmail?: string | null
  dueDate: string | null
  department: string
  createdBy: string
  createdByName?: string
  createdAt: any
  updatedAt: any
  subtasks: Subtask[]
  comments: Comment[]
}

interface TeamMember {
  id: string
  name: string
  avatar: string
  department: string
  role: string
  email: string
}

interface Filters {
  search: string
  status: TaskStatus | 'all'
  priority: TaskPriority | 'all'
  department: string
  assignee: string
}

// ==================== CONSTANTES ====================
const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'to_do', title: 'Por Hacer', color: '#64748b' },
  { id: 'in_progress', title: 'En Progreso', color: '#3b82f6' },
  { id: 'review', title: 'En Revisión', color: '#f59e0b' },
  { id: 'done', title: 'Completado', color: '#22c55e' },
]

const priorityColors: Record<TaskPriority, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  normal: '#3b82f6',
  low: '#64748b',
}

const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
}

const departmentLabels: Record<string, string> = {
  marketing: 'Marketing',
  openers: 'Openers',
  closers: 'Closers',
  admin: 'Administración',
  finanzas: 'Finanzas',
  general: 'General',
}

// ==================== ICONOS ====================
const Icons = {
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  ChevronLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  LayoutDashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  CheckSquare: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  LogOut: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  MessageCircle: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  ListTodo: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Mail: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
}

// ==================== UTILIDADES ====================
const generateId = () => Math.random().toString(36).substring(2, 15)

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes}m`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days}d`
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const formatDateFull = (dateStr: string | null) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ==================== COMPONENTES ====================

// Barra de búsqueda y filtros
function SearchAndFilters({ filters, setFilters, teamMembers, viewMode, setViewMode }: {
  filters: Filters
  setFilters: (filters: Filters) => void
  teamMembers: TeamMember[]
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  
  const activeFiltersCount = [
    filters.status !== 'all',
    filters.priority !== 'all',
    filters.department !== 'all',
    filters.assignee !== 'all',
  ].filter(Boolean).length

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Búsqueda */}
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Botón filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: showFilters ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
            color: 'white',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Icons.Filter />
          Filtros
          {activeFiltersCount > 0 && (
            <span style={{
              background: '#6366f1',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
            }}>
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Toggle vista */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'kanban' ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: viewMode === 'kanban' ? 'white' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <Icons.Grid /> Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'list' ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <Icons.List /> Lista
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}>
          {/* Estado */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
              {columns.map(col => <option key={col.id} value={col.id} style={{ background: '#1a1a24' }}>{col.title}</option>)}
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Prioridad</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="all" style={{ background: '#1a1a24' }}>Todas</option>
              <option value="urgent" style={{ background: '#1a1a24' }}>Urgente</option>
              <option value="high" style={{ background: '#1a1a24' }}>Alta</option>
              <option value="normal" style={{ background: '#1a1a24' }}>Normal</option>
              <option value="low" style={{ background: '#1a1a24' }}>Baja</option>
            </select>
          </div>

          {/* Departamento */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Departamento</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
              <option value="marketing" style={{ background: '#1a1a24' }}>Marketing</option>
              <option value="openers" style={{ background: '#1a1a24' }}>Openers</option>
              <option value="closers" style={{ background: '#1a1a24' }}>Closers</option>
              <option value="admin" style={{ background: '#1a1a24' }}>Administración</option>
              <option value="finanzas" style={{ background: '#1a1a24' }}>Finanzas</option>
            </select>
          </div>

          {/* Asignado */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Asignado a</label>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
              <option value="unassigned" style={{ background: '#1a1a24' }}>Sin asignar</option>
              {teamMembers.map(m => <option key={m.id} value={m.id} style={{ background: '#1a1a24' }}>{m.name}</option>)}
            </select>
          </div>

          {/* Limpiar filtros */}
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => setFilters({ ...filters, status: 'all', priority: 'all', department: 'all', assignee: 'all' })}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f87171',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Card de tarea
function TaskCard({ task, onClick, onDelete }: { task: Task; onClick: () => void; onDelete: () => void }) {
  const subtasksDone = task.subtasks?.filter(s => s.completed).length || 0
  const subtasksTotal = task.subtasks?.length || 0
  const commentsCount = task.comments?.length || 0

  return (
    <div onClick={onClick} style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a24', padding: '14px', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '3px', background: priorityColors[task.priority] }} />
      <div style={{ paddingLeft: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ display: 'inline-block', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{departmentLabels[task.department] || task.department}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
            <Icons.Trash />
          </button>
        </div>
        <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, marginBottom: '4px' }}>{task.title}</h4>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>
        
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {task.dueDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <Icons.Calendar />{task.dueDate}
              </div>
            )}
            {subtasksTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: subtasksDone === subtasksTotal ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
                <Icons.ListTodo />{subtasksDone}/{subtasksTotal}
              </div>
            )}
            {commentsCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <Icons.MessageCircle />{commentsCount}
              </div>
            )}
          </div>
          {task.assigneeAvatar ? (
            <div title={task.assigneeName || ''} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: 'white' }}>{task.assigneeAvatar}</div>
          ) : (
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>?</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Columna Kanban
function KanbanColumn({ column, tasks, onTaskClick, onTaskDelete, onDrop }: { column: typeof columns[0]; tasks: Task[]; onTaskClick: (task: Task) => void; onTaskDelete: (taskId: string) => void; onDrop: (taskId: string, newStatus: TaskStatus) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '280px', flexShrink: 0 }}>
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: column.color }} />
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{column.title}</h3>
        <span style={{ borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{tasks.length}</span>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const taskId = e.dataTransfer.getData('taskId'); if (taskId) onDrop(taskId, column.id) }}
        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `2px dashed ${isDragOver ? 'rgba(99,102,241,0.5)' : 'transparent'}`, background: isDragOver ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)', minHeight: '300px' }}
      >
        {tasks.map((task) => (
          <div key={task.id} draggable onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}>
            <TaskCard task={task} onClick={() => onTaskClick(task)} onDelete={() => onTaskDelete(task.id)} />
          </div>
        ))}
        {tasks.length === 0 && (
          <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Sin tareas</div>
        )}
      </div>
    </div>
  )
}

// Vista de Lista
function ListView({ tasks, onTaskClick, onTaskDelete, onUpdateStatus }: { tasks: Task[]; onTaskClick: (task: Task) => void; onTaskDelete: (taskId: string) => void; onUpdateStatus: (taskId: string, status: TaskStatus) => void }) {
  return (
    <div style={{ background: 'rgba(18,18,26,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
        <div>Tarea</div>
        <div>Estado</div>
        <div>Prioridad</div>
        <div>Asignado</div>
        <div>Fecha</div>
        <div></div>
      </div>

      {/* Rows */}
      {tasks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No hay tareas</div>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task)}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
              gap: '16px',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {/* Tarea */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: priorityColors[task.priority], flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description || 'Sin descripción'}</p>
              </div>
            </div>

            {/* Estado */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                value={task.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { e.stopPropagation(); onUpdateStatus(task.id, e.target.value as TaskStatus) }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: `${columns.find(c => c.id === task.status)?.color}20`,
                  color: columns.find(c => c.id === task.status)?.color,
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {columns.map(col => <option key={col.id} value={col.id} style={{ background: '#1a1a24', color: 'white' }}>{col.title}</option>)}
              </select>
            </div>

            {/* Prioridad */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: `${priorityColors[task.priority]}20`,
                color: priorityColors[task.priority],
                fontSize: '11px',
                fontWeight: 500,
              }}>
                {priorityLabels[task.priority]}
              </span>
            </div>

            {/* Asignado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {task.assigneeAvatar ? (
                <>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: 'white', flexShrink: 0 }}>{task.assigneeAvatar}</div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assigneeName}</span>
                </>
              ) : (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Sin asignar</span>
              )}
            </div>

            {/* Fecha */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {formatDateFull(task.dueDate)}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onTaskDelete(task.id) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '6px' }}
              >
                <Icons.Trash />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Modal crear tarea
function CreateTaskModal({ isOpen, onClose, onSubmit, teamMembers, userDepartment, userName }: { isOpen: boolean; onClose: () => void; onSubmit: (task: Partial<Task>) => void; teamMembers: TeamMember[]; userDepartment: string; userName: string }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal' as TaskPriority, assigneeId: '', dueDate: '', department: userDepartment })
  const [filterDept, setFilterDept] = useState<string>('all')
  const [sendNotification, setSendNotification] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setForm({ title: '', description: '', priority: 'normal', assigneeId: '', dueDate: '', department: userDepartment })
      setFilterDept('all')
      setSendNotification(true)
    }
  }, [isOpen, userDepartment])

  if (!isOpen) return null

  const filteredMembers = filterDept === 'all' ? teamMembers : teamMembers.filter(m => m.department === filterDept)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const assignee = teamMembers.find(m => m.id === form.assigneeId)
    
    const taskData: Partial<Task> = { 
      ...form, 
      status: 'to_do', 
      assigneeId: form.assigneeId || null,
      assigneeName: assignee?.name || null, 
      assigneeAvatar: assignee?.avatar || null,
      assigneeEmail: assignee?.email || null,
      createdByName: userName,
      subtasks: [],
      comments: [],
    }

    // Enviar notificación por email si está habilitado y hay asignado
    if (sendNotification && assignee?.email) {
      try {
        await sendTaskNotification({
          to_email: assignee.email,
          to_name: assignee.name,
          task_title: form.title,
          task_description: form.description || 'Sin descripción',
          task_priority: priorityLabels[form.priority],
          task_due_date: form.dueDate || 'Sin fecha límite',
          assigned_by: userName,
        })
        console.log('Notificación enviada a:', assignee.email)
      } catch (error) {
        console.error('Error enviando notificación:', error)
      }
    }

    onSubmit(taskData)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '500px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>Nueva Tarea</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Icons.X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Nombre de la tarea" style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Prioridad</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                <option value="low" style={{ background: '#1a1a24' }}>Baja</option>
                <option value="normal" style={{ background: '#1a1a24' }}>Normal</option>
                <option value="high" style={{ background: '#1a1a24' }}>Alta</option>
                <option value="urgent" style={{ background: '#1a1a24' }}>Urgente</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Fecha límite</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Departamento</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
              <option value="marketing" style={{ background: '#1a1a24' }}>Marketing</option>
              <option value="openers" style={{ background: '#1a1a24' }}>Openers</option>
              <option value="closers" style={{ background: '#1a1a24' }}>Closers</option>
              <option value="admin" style={{ background: '#1a1a24' }}>Administración</option>
              <option value="finanzas" style={{ background: '#1a1a24' }}>Finanzas</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(99,102,241,0.1)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Asignar a</label>
            <div style={{ marginBottom: '12px' }}>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
                <option value="marketing" style={{ background: '#1a1a24' }}>Marketing</option>
                <option value="openers" style={{ background: '#1a1a24' }}>Openers</option>
                <option value="closers" style={{ background: '#1a1a24' }}>Closers</option>
                <option value="admin" style={{ background: '#1a1a24' }}>Administración</option>
                <option value="finanzas" style={{ background: '#1a1a24' }}>Finanzas</option>
              </select>
            </div>
            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
              <option value="" style={{ background: '#1a1a24' }}>-- Sin asignar --</option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id} style={{ background: '#1a1a24' }}>{m.name} • {departmentLabels[m.department]}</option>
              ))}
            </select>
          </div>

          {/* Notificación por email */}
          {form.assigneeId && (
            <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(34,197,94,0.1)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#22c55e' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Mail />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Enviar notificación por correo</span>
                </div>
              </label>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Crear Tarea</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal de detalle con subtareas y comentarios
function TaskDetailModal({ task, isOpen, onClose, onUpdate, onAddSubtask, onToggleSubtask, onDeleteSubtask, onAddComment, onDeleteComment, teamMembers, currentUser }: { 
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onAddSubtask: (taskId: string, title: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onAddComment: (taskId: string, text: string) => void
  onDeleteComment: (taskId: string, commentId: string) => void
  teamMembers: TeamMember[]
  currentUser: any
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments'>('details')
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal' as TaskPriority, assigneeId: '', dueDate: '', department: '', status: 'to_do' as TaskStatus })
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (task && isOpen) {
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assigneeId: task.assigneeId || '',
        dueDate: task.dueDate || '',
        department: task.department,
        status: task.status,
      })
      setActiveTab('details')
    }
  }, [task, isOpen])

  useEffect(() => {
    if (activeTab === 'comments') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [task?.comments?.length, activeTab])

  if (!isOpen || !task) return null

  const handleSaveDetails = async () => {
    const assignee = teamMembers.find(m => m.id === form.assigneeId)
    const wasReassigned = form.assigneeId && form.assigneeId !== task.assigneeId
    
    onUpdate(task.id, { 
      ...form, 
      assigneeId: form.assigneeId || null,
      assigneeName: assignee?.name || null, 
      assigneeAvatar: assignee?.avatar || null,
      assigneeEmail: assignee?.email || null,
    })

    // Enviar notificación si se reasignó
    if (wasReassigned && assignee?.email) {
      try {
        await sendTaskNotification({
          to_email: assignee.email,
          to_name: assignee.name,
          task_title: form.title,
          task_description: form.description || 'Sin descripción',
          task_priority: priorityLabels[form.priority],
          task_due_date: form.dueDate || 'Sin fecha límite',
          assigned_by: currentUser.name,
        })
      } catch (error) {
        console.error('Error enviando notificación:', error)
      }
    }
  }

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSubtask.trim()) {
      onAddSubtask(task.id, newSubtask.trim())
      setNewSubtask('')
    }
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      onAddComment(task.id, newComment.trim())
      setNewComment('')
    }
  }

  const subtasksDone = task.subtasks?.filter(s => s.completed).length || 0
  const subtasksTotal = task.subtasks?.length || 0
  const progress = subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '600px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority], marginBottom: '8px' }}>
              {priorityLabels[task.priority]}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>{task.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px' }}><Icons.X /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { id: 'details', label: 'Detalles' },
            { id: 'subtasks', label: `Subtareas (${subtasksDone}/${subtasksTotal})` },
            { id: 'comments', label: `Comentarios (${task.comments?.length || 0})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Detalles */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Título</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                    {columns.map(col => <option key={col.id} value={col.id} style={{ background: '#1a1a24' }}>{col.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Prioridad</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="low" style={{ background: '#1a1a24' }}>Baja</option>
                    <option value="normal" style={{ background: '#1a1a24' }}>Normal</option>
                    <option value="high" style={{ background: '#1a1a24' }}>Alta</option>
                    <option value="urgent" style={{ background: '#1a1a24' }}>Urgente</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Fecha límite</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Departamento</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="marketing" style={{ background: '#1a1a24' }}>Marketing</option>
                    <option value="openers" style={{ background: '#1a1a24' }}>Openers</option>
                    <option value="closers" style={{ background: '#1a1a24' }}>Closers</option>
                    <option value="admin" style={{ background: '#1a1a24' }}>Administración</option>
                    <option value="finanzas" style={{ background: '#1a1a24' }}>Finanzas</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Asignado a</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="" style={{ background: '#1a1a24' }}>-- Sin asignar --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id} style={{ background: '#1a1a24' }}>{m.name} • {departmentLabels[m.department]}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleSaveDetails} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '8px' }}>
                Guardar Cambios
              </button>
            </div>
          )}

          {/* Subtareas */}
          {activeTab === 'subtasks' && (
            <div>
              {subtasksTotal > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Progreso</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Agregar subtarea..." style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none' }} />
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Plus /> Agregar
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {task.subtasks?.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px' }}>No hay subtareas aún</p>
                )}
                {task.subtasks?.map((subtask) => (
                  <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => onToggleSubtask(task.id, subtask.id)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${subtask.completed ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, background: subtask.completed ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {subtask.completed && <Icons.Check />}
                    </button>
                    <span style={{ flex: 1, fontSize: '13px', color: subtask.completed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)', textDecoration: subtask.completed ? 'line-through' : 'none' }}>
                      {subtask.title}
                    </span>
                    <button onClick={() => onDeleteSubtask(task.id, subtask.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentarios */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {task.comments?.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px' }}>No hay comentarios aún</p>
                )}
                {task.comments?.map((comment) => (
                  <div key={comment.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
                          {comment.authorAvatar}
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'white' }}>{comment.authorName}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>{formatDate(comment.createdAt)}</span>
                        </div>
                      </div>
                      {comment.authorId === currentUser?.id && (
                        <button onClick={() => onDeleteComment(task.id, comment.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
                          <Icons.Trash />
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginLeft: '38px' }}>{comment.text}</p>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
                  {currentUser?.avatar}
                </div>
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none' }} />
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.Send />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== DASHBOARD PRINCIPAL ====================
export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    priority: 'all',
    department: 'all',
    assignee: 'all',
  })

  const navigation = [
    { name: 'Dashboard', icon: Icons.LayoutDashboard },
    { name: 'Tareas', icon: Icons.CheckSquare },
    { name: 'Equipo', icon: Icons.Users },
  ]

  // Cargar tareas
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        subtasks: doc.data().subtasks || [],
        comments: doc.data().comments || [],
      })) as Task[]
      setTasks(tasksData)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  // Cargar equipo
  useEffect(() => {
    if (!user) return
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Sin nombre',
        avatar: doc.data().avatar || 'U',
        department: doc.data().department || 'general',
        role: doc.data().role || 'operativo',
        email: doc.data().email || '',
      })) as TeamMember[]
      setTeamMembers(members)
    })
    return () => unsubscribe()
  }, [user])

  // Actualizar selectedTask
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id)
      if (updated) setSelectedTask(updated)
    }
  }, [tasks])

  // Filtrar tareas
  const filteredTasks = tasks.filter(task => {
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) && !task.description?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.department !== 'all' && task.department !== filters.department) return false
    if (filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned' && task.assigneeId) return false
      if (filters.assignee !== 'unassigned' && task.assigneeId !== filters.assignee) return false
    }
    return true
  })

  // CRUD Tareas
  const createTask = async (taskData: Partial<Task>) => {
    if (!user) return
    await addDoc(collection(db, 'tasks'), { ...taskData, createdBy: user.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    await updateDoc(doc(db, 'tasks', taskId), { ...updates, updatedAt: serverTimestamp() })
  }

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus })
  }

  const deleteTask = async (taskId: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      await deleteDoc(doc(db, 'tasks', taskId))
    }
  }

  // Subtareas
  const addSubtask = async (taskId: string, title: string) => {
    const newSubtask: Subtask = { id: generateId(), title, completed: false, createdAt: Date.now() }
    await updateDoc(doc(db, 'tasks', taskId), { subtasks: arrayUnion(newSubtask), updatedAt: serverTimestamp() })
  }

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
    await updateDoc(doc(db, 'tasks', taskId), { subtasks: updatedSubtasks, updatedAt: serverTimestamp() })
  }

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const subtaskToRemove = task.subtasks.find(s => s.id === subtaskId)
    if (subtaskToRemove) {
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: arrayRemove(subtaskToRemove), updatedAt: serverTimestamp() })
    }
  }

  // Comentarios
  const addComment = async (taskId: string, text: string) => {
    if (!user) return
    const newComment: Comment = { id: generateId(), text, authorId: user.id, authorName: user.name, authorAvatar: user.avatar, createdAt: Date.now() }
    await updateDoc(doc(db, 'tasks', taskId), { comments: arrayUnion(newComment), updatedAt: serverTimestamp() })
  }

  const deleteComment = async (taskId: string, commentId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const commentToRemove = task.comments.find(c => c.id === commentId)
    if (commentToRemove) {
      await updateDoc(doc(db, 'tasks', taskId), { comments: arrayRemove(commentToRemove), updatedAt: serverTimestamp() })
    }
  }

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => t.status === status)

  const stats = { 
    total: tasks.length, 
    todo: tasks.filter(t => t.status === 'to_do').length, 
    inProgress: tasks.filter(t => t.status === 'in_progress').length, 
    done: tasks.filter(t => t.status === 'done').length 
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>⚡</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'white' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '500px', height: '500px', background: 'rgba(99,102,241,0.08)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '400px', height: '400px', background: 'rgba(139,92,246,0.08)', borderRadius: '50%', filter: 'blur(100px)' }} />
      </div>

      {/* Sidebar */}
      <aside style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', width: sidebarCollapsed ? '72px' : '240px', transition: 'width 0.3s', borderRight: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,15,21,0.8)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', height: '64px', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Zap /></div>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Solis Center</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ borderRadius: '8px', padding: '8px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        </div>
        <nav style={{ flex: 1, padding: '12px' }}>
          {navigation.map((item) => (
            <button key={item.name} onClick={() => setActiveNav(item.name)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px', borderRadius: '12px', padding: '12px', marginBottom: '4px', fontSize: '13px', fontWeight: 500, border: activeNav === item.name ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', background: activeNav === item.name ? 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))' : 'transparent', color: activeNav === item.name ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <item.icon />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </button>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{user.avatar}</div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            )}
          </div>
          <button onClick={logout} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '12px', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 500, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <Icons.LogOut />
            {!sidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ display: 'flex', height: '64px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,15,21,0.6)', backdropFilter: 'blur(20px)', padding: '0 24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>{activeNav}</h1>
          <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', padding: '10px 20px', fontSize: '13px', fontWeight: 500, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
            <Icons.Plus />Nueva Tarea
          </button>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {activeNav === 'Dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[{ title: 'Total Tareas', value: stats.total, color: '#6366f1' }, { title: 'Por Hacer', value: stats.todo, color: '#64748b' }, { title: 'En Progreso', value: stats.inProgress, color: '#3b82f6' }, { title: 'Completadas', value: stats.done, color: '#22c55e' }].map((stat, i) => (
                  <div key={i} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{stat.title}</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,26,0.8)', padding: '24px' }}>
                <SearchAndFilters filters={filters} setFilters={setFilters} teamMembers={teamMembers} viewMode={viewMode} setViewMode={setViewMode} />
                {viewMode === 'kanban' ? (
                  <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {columns.map((col) => (<KanbanColumn key={col.id} column={col} tasks={getTasksByStatus(col.id)} onTaskClick={(task) => { setSelectedTask(task); setShowDetailModal(true) }} onTaskDelete={deleteTask} onDrop={updateTaskStatus} />))}
                  </div>
                ) : (
                  <ListView tasks={filteredTasks} onTaskClick={(task) => { setSelectedTask(task); setShowDetailModal(true) }} onTaskDelete={deleteTask} onUpdateStatus={updateTaskStatus} />
                )}
              </div>
            </div>
          )}

          {activeNav === 'Tareas' && (
            <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,26,0.8)', padding: '24px' }}>
              <SearchAndFilters filters={filters} setFilters={setFilters} teamMembers={teamMembers} viewMode={viewMode} setViewMode={setViewMode} />
              {viewMode === 'kanban' ? (
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {columns.map((col) => (<KanbanColumn key={col.id} column={col} tasks={getTasksByStatus(col.id)} onTaskClick={(task) => { setSelectedTask(task); setShowDetailModal(true) }} onTaskDelete={deleteTask} onDrop={updateTaskStatus} />))}
                </div>
              ) : (
                <ListView tasks={filteredTasks} onTaskClick={(task) => { setSelectedTask(task); setShowDetailModal(true) }} onTaskDelete={deleteTask} onUpdateStatus={updateTaskStatus} />
              )}
            </div>
          )}

          {activeNav === 'Equipo' && (
            <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,26,0.8)', padding: '24px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '20px' }}>Miembros del Equipo ({teamMembers.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {teamMembers.map((m) => (
                  <div key={m.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600 }}>{m.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 500 }}>{m.name}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{m.role}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(99,102,241,0.8)', marginTop: '4px' }}>{departmentLabels[m.department] || m.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modales */}
      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={createTask} teamMembers={teamMembers} userDepartment={user.department} userName={user.name} />
      
      <TaskDetailModal 
        task={selectedTask} 
        isOpen={showDetailModal} 
        onClose={() => { setShowDetailModal(false); setSelectedTask(null) }} 
        onUpdate={updateTask}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
        teamMembers={teamMembers}
        currentUser={user}
      />
    </div>
  )
}