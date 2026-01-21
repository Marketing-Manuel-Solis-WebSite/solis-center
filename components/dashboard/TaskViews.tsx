'use client'

import React, { useState } from 'react'
import { Task, TaskStatus, TaskPriority, User } from '../../types'

// Constantes y Utilidades
const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'to_do', title: 'Por Hacer', color: '#64748b' },
  { id: 'in_progress', title: 'En Progreso', color: '#3b82f6' },
  { id: 'review', title: 'En Revisión', color: '#f59e0b' },
  { id: 'done', title: 'Completado', color: '#22c55e' },
]

const priorityColors: Record<TaskPriority, string> = { urgent: '#ef4444', high: '#f97316', normal: '#3b82f6', low: '#64748b' }
const priorityLabels: Record<TaskPriority, string> = { urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baja' }
const departmentLabels: Record<string, string> = { marketing: 'Marketing', openers: 'Openers', closers: 'Closers', admin: 'Administración', finanzas: 'Finanzas', general: 'General' }

const Icons = {
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ListTodo: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>,
  ChevronLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
}

// --- TASK CARD ---
export function TaskCard({ task, onClick, onDelete }: { task: Task; onClick: () => void; onDelete: () => void }) {
  const subtasksDone = task.subtasks?.filter(s => s.completed).length || 0
  const subtasksTotal = task.subtasks?.length || 0

  return (
    <div onClick={onClick} style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a24', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '3px', background: priorityColors[task.priority] }} />
      <div style={{ paddingLeft: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ display: 'inline-block', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
            {departmentLabels[task.department] || task.department}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
            <Icons.Trash />
          </button>
        </div>
        <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, marginBottom: '4px' }}>{task.title}</h4>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {task.dueDate && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}><Icons.Calendar />{task.dueDate}</div>}
            {subtasksTotal > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: subtasksDone === subtasksTotal ? '#22c55e' : 'rgba(255,255,255,0.4)' }}><Icons.ListTodo />{subtasksDone}/{subtasksTotal}</div>}
          </div>
          {task.assigneeAvatar ? (
            <div title={task.assigneeName || ''} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: 'white' }}>
              {task.assigneeAvatar}
            </div>
          ) : (
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>?</div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- KANBAN COLUMN ---
export function KanbanColumn({ column, tasks, onTaskClick, onTaskDelete, onDrop }: { column: typeof columns[0]; tasks: Task[]; onTaskClick: (t: Task) => void; onTaskDelete: (id: string) => void; onDrop: (id: string, s: TaskStatus) => void }) {
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
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const id = e.dataTransfer.getData('taskId'); if (id) onDrop(id, column.id) }} 
        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `2px dashed ${isDragOver ? 'rgba(99,102,241,0.5)' : 'transparent'}`, background: isDragOver ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)', minHeight: '300px' }}
      >
        {tasks.map(task => (
          <div key={task.id} draggable onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}>
            <TaskCard task={task} onClick={() => onTaskClick(task)} onDelete={() => onTaskDelete(task.id)} />
          </div>
        ))}
        {tasks.length === 0 && (
          <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

// --- LIST VIEW ---
export function ListView({ tasks, onTaskClick, onTaskDelete, onUpdateStatus }: { tasks: Task[]; onTaskClick: (t: Task) => void; onTaskDelete: (id: string) => void; onUpdateStatus: (id: string, s: TaskStatus) => void }) {
  return (
    <div style={{ background: 'rgba(18,18,26,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
        <div>Tarea</div><div>Estado</div><div>Prioridad</div><div>Asignado</div><div>Fecha</div><div></div>
      </div>
      {tasks.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No hay tareas</div> : tasks.map(task => (
        <div key={task.id} onClick={() => onTaskClick(task)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: '16px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: priorityColors[task.priority], flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description || 'Sin descripción'}</p>
            </div>
          </div>
          <div onClick={e => e.stopPropagation()}>
            <select 
              value={task.status} 
              onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)} 
              style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: `${columns.find(c => c.id === task.status)?.color}20`, color: columns.find(c => c.id === task.status)?.color, fontSize: '11px', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
            >
              {columns.map(col => <option key={col.id} value={col.id} style={{ background: '#1a1a24', color: 'white' }}>{col.title}</option>)}
            </select>
          </div>
          <div><span style={{ padding: '4px 10px', borderRadius: '6px', background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority], fontSize: '11px', fontWeight: 500 }}>{priorityLabels[task.priority]}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {task.assigneeAvatar ? (
              <><div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: 'white', flexShrink: 0 }}>{task.assigneeAvatar}</div><span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assigneeName}</span></>
            ) : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Sin asignar</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{task.dueDate || '-'}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><button onClick={(e) => { e.stopPropagation(); onTaskDelete(task.id) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '6px' }}><Icons.Trash /></button></div>
        </div>
      ))}
    </div>
  )
}

// --- CALENDAR VIEW ---
export function CalendarView({ tasks, onTaskClick, currentDate, setCurrentDate }: { tasks: Task[]; onTaskClick: (t: Task) => void; currentDate: Date; setCurrentDate: (date: Date) => void }) {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  
  const getTasksForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.dueDate === dateStr)
  }
  const isToday = (day: number) => { const now = new Date(); return day === now.getDate() && currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear() }

  return (
    <div style={{ background: 'rgba(18,18,26,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px', color: 'white', cursor: 'pointer' }}><Icons.ChevronLeft /></button>
          <h3 style={{ fontSize: '16px', fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px', color: 'white', cursor: 'pointer' }}><Icons.ChevronRight /></button>
        </div>
        <button onClick={() => setCurrentDate(new Date())} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(99,102,241,0.2)', border: 'none', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Hoy</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (<div key={day} style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{day}</div>))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (<div key={`empty-${i}`} style={{ minHeight: '100px', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }} />))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1; const dayTasks = getTasksForDay(day)
          return (
            <div key={day} style={{ minHeight: '100px', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: isToday(day) ? 'rgba(99,102,241,0.1)' : 'transparent' }}>
              <div style={{ fontSize: '13px', marginBottom: '6px', fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? '#818cf8' : 'rgba(255,255,255,0.7)' }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayTasks.slice(0, 3).map(task => (
                  <div key={task.id} onClick={() => onTaskClick(task)} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority], cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', paddingLeft: '4px' }}>+{dayTasks.length - 3} más</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- FILTERS ---
export function SearchAndFilters({ filters, setFilters, teamMembers, viewMode, setViewMode, showDepartmentFilter = true }: any) {
  const [showFilters, setShowFilters] = useState(false)
  const activeFiltersCount = [filters.status !== 'all', filters.priority !== 'all', filters.department !== 'all', filters.assignee !== 'all'].filter(Boolean).length

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}><Icons.Search /></div>
          <input type="text" placeholder="Buscar tareas..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: showFilters ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', cursor: 'pointer' }}>
          <Icons.Filter />Filtros{activeFiltersCount > 0 && <span style={{ background: '#6366f1', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>{activeFiltersCount}</span>}
        </button>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
          {(['kanban', 'list', 'calendar'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: viewMode === mode ? 'rgba(99,102,241,0.3)' : 'transparent', color: viewMode === mode ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              {mode === 'kanban' && <><Icons.Grid /> Kanban</>}
              {mode === 'list' && <><Icons.List /> Lista</>}
              {mode === 'calendar' && <><Icons.Calendar /> Calendario</>}
            </button>
          ))}
        </div>
      </div>
      {showFilters && (
        <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Estado</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
              <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
              {columns.map(col => <option key={col.id} value={col.id} style={{ background: '#1a1a24' }}>{col.title}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Prioridad</label>
            <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
              <option value="all" style={{ background: '#1a1a24' }}>Todas</option>
              {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k} style={{ background: '#1a1a24' }}>{v}</option>)}
            </select>
          </div>
          {showDepartmentFilter && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Departamento</label>
              <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
                {Object.entries(departmentLabels).map(([k, v]) => <option key={k} value={k} style={{ background: '#1a1a24' }}>{v}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Asignado a</label>
            <select value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
              <option value="all" style={{ background: '#1a1a24' }}>Todos</option>
              <option value="unassigned" style={{ background: '#1a1a24' }}>Sin asignar</option>
              {teamMembers.map((m: User) => <option key={m.id} value={m.id} style={{ background: '#1a1a24' }}>{m.name}</option>)}
            </select>
          </div>
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setFilters({ ...filters, status: 'all', priority: 'all', department: 'all', assignee: 'all' })} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}