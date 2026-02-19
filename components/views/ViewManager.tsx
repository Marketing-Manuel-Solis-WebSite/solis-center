/**
 * ============================================================================
 * SOLIS OS — VIEW MANAGER (Renderizador Polimórfico)
 * ============================================================================
 * Componente maestro que renderiza Board, List, Table, o Calendar
 * según la vista seleccionada. Lee todo del store global.
 * ============================================================================
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import type { ITask, ViewType, TaskPriority } from '../../types/schema'

// ======================== CONSTANTES ========================

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#ef4444', high: '#f97316', normal: '#3b82f6', low: '#64748b', none: '#374151',
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748b', in_progress: '#3b82f6', review: '#f59e0b', done: '#22c55e', blocked: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Por Hacer', in_progress: 'En Progreso', review: 'En Revisión', done: 'Completado', blocked: 'Bloqueado',
}

const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const

// ======================== COMPONENTE PRINCIPAL ========================

export default function ViewManager() {
  const viewType = useAppStore(s => s.currentViewType)
  const activeListId = useAppStore(s => s.activeListId)
  const activeFilters = useAppStore(s => s.activeFilters)
  const getFilteredTasks = useAppStore(s => s.getFilteredTasks)
  const getTasksByStatus = useAppStore(s => s.getTasksByStatus)
  const optimisticUpdateTask = useAppStore(s => s.optimisticUpdateTask)
  const optimisticDeleteTask = useAppStore(s => s.optimisticDeleteTask)
  const selectTask = useAppStore(s => s.selectTask)
  const openModal = useAppStore(s => s.openModal)
  const setCurrentView = useAppStore(s => s.setCurrentView)

  const tasks = useMemo(() => {
    if (!activeListId) return []
    return getFilteredTasks(activeListId, activeFilters)
  }, [activeListId, activeFilters, getFilteredTasks])

  const tasksByStatus = useMemo(() => {
    const result: Record<string, ITask[]> = {}
    for (const status of STATUSES) {
      result[status] = tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order)
    }
    return result
  }, [tasks])

  // Estadísticas rápidas
  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasksByStatus.todo?.length || 0,
    inProgress: tasksByStatus.in_progress?.length || 0,
    done: tasksByStatus.done?.length || 0,
    overdue: tasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0] && t.status !== 'done').length,
  }), [tasks, tasksByStatus])

  // Handlers
  const handleDrop = useCallback((taskId: string, newStatus: string) => {
    optimisticUpdateTask(taskId, { status: newStatus })
  }, [optimisticUpdateTask])

  const handleDelete = useCallback((taskId: string) => {
    if (confirm('¿Eliminar esta tarea permanentemente?')) {
      optimisticDeleteTask(taskId)
    }
  }, [optimisticDeleteTask])

  const handleTaskClick = useCallback((task: ITask) => {
    selectTask(task.id)
    openModal('editTask', task.id)
  }, [selectTask, openModal])

  // ==================== RENDER ====================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* TOOLBAR */}
      <ToolbarSection
        viewType={viewType}
        onViewChange={setCurrentView}
        onCreateTask={() => openModal('createTask')}
        stats={stats}
      />

      {/* ESTADÍSTICAS COMPACTAS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
      }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1', icon: '📊' },
          { label: 'Por Hacer', value: stats.todo, color: '#64748b', icon: '📝' },
          { label: 'En Progreso', value: stats.inProgress, color: '#3b82f6', icon: '⚡' },
          { label: 'Completadas', value: stats.done, color: '#22c55e', icon: '✅' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '16px 20px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
            <div style={{ fontSize: '24px', opacity: 0.4 }}>{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(18,18,26,0.8)',
        padding: '24px',
        minHeight: '500px',
      }}>
        {viewType === 'board' && (
          <BoardView
            tasksByStatus={tasksByStatus}
            onDrop={handleDrop}
            onTaskClick={handleTaskClick}
            onDelete={handleDelete}
          />
        )}

        {viewType === 'list' && (
          <ListView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDelete={handleDelete}
            onStatusChange={handleDrop}
          />
        )}

        {viewType === 'table' && (
          <TableView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDelete={handleDelete}
            onStatusChange={handleDrop}
          />
        )}

        {viewType === 'calendar' && (
          <CalendarView
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>
    </div>
  )
}

// ======================== TOOLBAR ========================

function ToolbarSection({ viewType, onViewChange, onCreateTask, stats }: {
  viewType: ViewType
  onViewChange: (type: ViewType) => void
  onCreateTask: () => void
  stats: { total: number; overdue: number }
}) {
  const { filters, setFilters, resetFilters } = useAppStore(s => ({
    filters: s.activeFilters,
    setFilters: s.setActiveFilters,
    resetFilters: s.resetFilters,
  }))

  const views: { type: ViewType; label: string; icon: string }[] = [
    { type: 'board', label: 'Tablero', icon: '▦' },
    { type: 'list', label: 'Lista', icon: '≡' },
    { type: 'table', label: 'Tabla', icon: '⊞' },
    { type: 'calendar', label: 'Calendario', icon: '📅' },
  ]

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Search */}
      <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Buscar tareas..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
            color: 'white', fontSize: '13px', outline: 'none',
          }}
        />
      </div>

      {/* View Switcher */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px' }}>
        {views.map(v => (
          <button
            key={v.type}
            onClick={() => onViewChange(v.type)}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: viewType === v.type ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: viewType === v.type ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontSize: '12px', fontWeight: viewType === v.type ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      {/* New Task */}
      <button
        onClick={onCreateTask}
        style={{
          padding: '10px 20px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', color: 'white', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
        }}
      >
        + Nueva Tarea
      </button>
    </div>
  )
}

// ======================== BOARD VIEW (Kanban) ========================

function BoardView({ tasksByStatus, onDrop, onTaskClick, onDelete }: {
  tasksByStatus: Record<string, ITask[]>
  onDrop: (taskId: string, status: string) => void
  onTaskClick: (task: ITask) => void
  onDelete: (taskId: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
      {STATUSES.map(status => (
        <KanbanColumn
          key={status}
          statusId={status}
          statusLabel={STATUS_LABELS[status]}
          statusColor={STATUS_COLORS[status]}
          tasks={tasksByStatus[status] || []}
          onDrop={(taskId) => onDrop(taskId, status)}
          onTaskClick={onTaskClick}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function KanbanColumn({ statusId, statusLabel, statusColor, tasks, onDrop, onTaskClick, onDelete }: {
  statusId: string; statusLabel: string; statusColor: string
  tasks: ITask[]; onDrop: (taskId: string) => void
  onTaskClick: (task: ITask) => void; onDelete: (taskId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '280px', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor }} />
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{statusLabel}</h3>
        <span style={{
          padding: '2px 8px', borderRadius: '9999px',
          background: 'rgba(255,255,255,0.06)', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setIsDragOver(false)
          const taskId = e.dataTransfer.getData('taskId')
          if (taskId) onDrop(taskId)
        }}
        style={{
          flex: 1, padding: '8px', borderRadius: '12px',
          border: `2px dashed ${isDragOver ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
          background: isDragOver ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.01)',
          minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px',
        }}
      >
        {tasks.map(task => (
          <MiniCard key={task.id} task={task} onClick={() => onTaskClick(task)} onDelete={() => onDelete(task.id)} />
        ))}
        {tasks.length === 0 && (
          <div style={{
            display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center',
            borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.06)',
            fontSize: '12px', color: 'rgba(255,255,255,0.2)',
          }}>
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

function MiniCard({ task, onClick, onDelete }: { task: ITask; onClick: () => void; onDelete: () => void }) {
  const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'done'

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)', background: '#16161f',
        padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '3px', background: PRIORITY_COLORS[task.priority] }} />
      <div style={{ paddingLeft: '6px' }}>
        <h4 style={{
          fontSize: '13px', fontWeight: 500, color: task.status === 'done' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
          lineHeight: 1.4, marginBottom: '8px', textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}>
          {task.title}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {task.dueDate && (
              <span style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'rgba(255,255,255,0.4)', fontWeight: isOverdue ? 600 : 400 }}>
                {task.dueDate}
              </span>
            )}
            {task.subtaskCount > 0 && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                ✓ {task.subtasksDone}/{task.subtaskCount}
              </span>
            )}
          </div>
          {task.assignees.length > 0 && (
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, color: 'white',
            }}>
              {task.assignees[0].avatar}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ======================== LIST VIEW ========================

function ListView({ tasks, onTaskClick, onDelete, onStatusChange }: {
  tasks: ITask[]; onTaskClick: (task: ITask) => void
  onDelete: (taskId: string) => void; onStatusChange: (taskId: string, status: string) => void
}) {
  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 60px',
        gap: '12px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        <div>Tarea</div><div>Estado</div><div>Prioridad</div><div>Asignado</div><div>Fecha</div><div></div>
      </div>

      {/* Rows */}
      {tasks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          No hay tareas con estos filtros
        </div>
      ) : tasks.map(task => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task)}
          style={{
            display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 60px',
            gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
            cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '3px', height: '28px', borderRadius: '2px', background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </p>
            </div>
          </div>

          {/* Status */}
          <div onClick={e => e.stopPropagation()}>
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              style={{
                padding: '5px 8px', borderRadius: '6px', border: 'none',
                background: `${STATUS_COLORS[task.status] || '#64748b'}20`,
                color: STATUS_COLORS[task.status] || '#64748b',
                fontSize: '11px', fontWeight: 500, cursor: 'pointer', outline: 'none',
              }}
            >
              {STATUSES.map(s => (
                <option key={s} value={s} style={{ background: '#14141e', color: 'white' }}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <span style={{
              padding: '3px 8px', borderRadius: '4px',
              background: `${PRIORITY_COLORS[task.priority]}18`,
              color: PRIORITY_COLORS[task.priority], fontSize: '10px', fontWeight: 500,
            }}>
              {task.priority}
            </span>
          </div>

          {/* Assignee */}
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            {task.assignees.length > 0 ? task.assignees[0].name : 'Sin asignar'}
          </div>

          {/* Date */}
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {task.dueDate || '—'}
          </div>

          {/* Delete */}
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '4px' }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ======================== TABLE VIEW ========================

function TableView({ tasks, onTaskClick, onDelete, onStatusChange }: {
  tasks: ITask[]; onTaskClick: (task: ITask) => void
  onDelete: (taskId: string) => void; onStatusChange: (taskId: string, status: string) => void
}) {
  // La vista Table es similar a List pero con más columnas y edición inline
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '900px' }}>
        <ListView tasks={tasks} onTaskClick={onTaskClick} onDelete={onDelete} onStatusChange={onStatusChange} />
      </div>
    </div>
  )
}

// ======================== CALENDAR VIEW ========================

function CalendarView({ tasks, onTaskClick }: { tasks: ITask[]; onTaskClick: (task: ITask) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const getTasksForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.dueDate === dateStr)
  }

  const isToday = (day: number) => {
    const now = new Date()
    return day === now.getDate() && currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()
  }

  return (
    <div>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'white', cursor: 'pointer' }}
          >
            ‹
          </button>
          <h3 style={{ fontSize: '16px', fontWeight: 600, minWidth: '160px', textAlign: 'center' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'white', cursor: 'pointer' }}
          >
            ›
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(99,102,241,0.2)', border: 'none', color: '#a5b4fc', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Hoy
        </button>
      </div>

      {/* Day Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {/* Empty cells */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: '90px', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayTasks = getTasksForDay(day)
          const today = isToday(day)

          return (
            <div
              key={day}
              style={{
                minHeight: '90px', padding: '6px',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: today ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
            >
              <div style={{
                fontSize: '12px', marginBottom: '4px',
                fontWeight: today ? 700 : 400,
                color: today ? '#818cf8' : 'rgba(255,255,255,0.6)',
              }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={{
                      padding: '2px 6px', borderRadius: '3px', fontSize: '10px',
                      background: `${PRIORITY_COLORS[task.priority]}18`,
                      color: PRIORITY_COLORS[task.priority],
                      cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', paddingLeft: '4px' }}>
                    +{dayTasks.length - 3} más
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
