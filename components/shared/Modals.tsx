/**
 * ============================================================================
 * SOLIS OS — MODALES COMPARTIDOS
 * ============================================================================
 * CreateTaskModal: modal completo para crear tareas con todos los campos.
 * ConfirmModal: diálogo de confirmación reutilizable.
 * CommandPalette: búsqueda global tipo Spotlight/Cmd+K.
 * ============================================================================
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { getNora } from '../../lib/nora-agent'
import type { TaskPriority, Department } from '../../types/schema'

// ======================== OVERLAY BASE ========================

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
      <div style={{ animation: 'scaleIn 0.15s ease' }}>
        {children}
      </div>
    </div>
  )
}

// ======================== CREATE TASK MODAL ========================

export function CreateTaskModal() {
  const closeModal = useAppStore(s => s.closeModal)
  const activeListId = useAppStore(s => s.activeListId)
  const activeSpaceId = useAppStore(s => s.activeSpaceId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [department, setDepartment] = useState<Department>('general')
  const [tags, setTags] = useState('')
  const [isClassifying, setIsClassifying] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Auto-clasificar con Nora cuando el título tiene suficiente texto
  const handleAiClassify = useCallback(async () => {
    if (title.length < 5) return
    setIsClassifying(true)
    try {
      const nora = getNora()
      const suggestions = await nora.classifyTask(title, description)
      setAiSuggestions(suggestions)
    } catch (err) {
      console.error('[CreateTask] AI classification failed:', err)
    } finally {
      setIsClassifying(false)
    }
  }, [title, description])

  const handleApplySuggestions = useCallback(() => {
    if (!aiSuggestions) return
    if (aiSuggestions.suggestedPriority) setPriority(aiSuggestions.suggestedPriority)
    if (aiSuggestions.suggestedDepartment) setDepartment(aiSuggestions.suggestedDepartment)
    if (aiSuggestions.suggestedTags?.length) setTags(aiSuggestions.suggestedTags.join(', '))
  }, [aiSuggestions])

  const handleSubmit = useCallback(() => {
    if (!title.trim() || !activeListId) return

    const store = useAppStore.getState()
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'todo',
      department,
      dueDate: dueDate || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      listId: activeListId,
      spaceId: activeSpaceId || '',
      assignees: [],
      subtasks: [],
      comments: [],
      attachments: [],
      customFields: {},
      labels: [],
      order: Date.now(),
      isArchived: false,
      watchers: [],
      path: {
        workspaceId: store.activeWorkspaceId || '',
        spaceId: activeSpaceId || '',
        folderId: store.activeFolderId || '',
        listId: activeListId,
      },
    }

    // Optimistic create via store
    store.upsertTask({
      ...taskData,
      id: `temp_${Date.now()}`,
      activityLog: [],
      commentCount: 0,
      subtaskCount: 0,
      subtasksDone: 0,
      createdAt: { toMillis: () => Date.now() } as any,
      updatedAt: { toMillis: () => Date.now() } as any,
    })

    store.addToast({ type: 'success', title: 'Tarea creada', description: title.trim() })
    closeModal()
  }, [title, description, priority, dueDate, department, tags, activeListId, activeSpaceId, closeModal])

  // Keyboard: Enter para enviar, Escape para cerrar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeModal()
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  return (
    <ModalOverlay onClose={closeModal}>
      <div
        onKeyDown={handleKeyDown}
        style={{
          width: '560px', maxHeight: '85vh', overflow: 'auto',
          background: '#14141e', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Nueva Tarea</h2>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Title */}
          <div>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              style={{
                width: '100%', padding: '12px 0', border: 'none', background: 'none',
                color: 'white', fontSize: '18px', fontWeight: 500, outline: 'none',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)..."
              rows={3}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
                color: 'white', fontSize: '13px', outline: 'none', resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Priority */}
            <FieldGroup label="Prioridad">
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} style={selectStyle}>
                <option value="urgent" style={optStyle}>🔴 Urgente</option>
                <option value="high" style={optStyle}>🟠 Alta</option>
                <option value="normal" style={optStyle}>🔵 Normal</option>
                <option value="low" style={optStyle}>⚪ Baja</option>
                <option value="none" style={optStyle}>— Sin prioridad</option>
              </select>
            </FieldGroup>

            {/* Due Date */}
            <FieldGroup label="Fecha límite">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...selectStyle, colorScheme: 'dark' }}
              />
            </FieldGroup>

            {/* Department */}
            <FieldGroup label="Departamento">
              <select value={department} onChange={(e) => setDepartment(e.target.value as Department)} style={selectStyle}>
                {['general', 'marketing', 'openers', 'closers', 'admin', 'finanzas', 'legal'].map(d => (
                  <option key={d} value={d} style={optStyle}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </FieldGroup>

            {/* Tags */}
            <FieldGroup label="Tags (separadas por coma)">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="diseño, urgente, v2"
                style={selectStyle}
              />
            </FieldGroup>
          </div>

          {/* AI Classification */}
          {title.length >= 5 && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>✨</span>
                <span style={{ fontSize: '12px', color: '#a5b4fc' }}>
                  {isClassifying ? 'Nora está analizando...' : 'Nora puede clasificar esta tarea'}
                </span>
              </div>
              {!isClassifying && !aiSuggestions && (
                <button onClick={handleAiClassify} style={{
                  padding: '5px 12px', borderRadius: '6px', border: 'none',
                  background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                }}>Clasificar</button>
              )}
              {aiSuggestions && (
                <button onClick={handleApplySuggestions} style={{
                  padding: '5px 12px', borderRadius: '6px', border: 'none',
                  background: '#6366f1', color: 'white',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}>Aplicar sugerencias</button>
              )}
            </div>
          )}

          {/* AI Suggestions Preview */}
          {aiSuggestions && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)', fontSize: '11px', color: 'rgba(255,255,255,0.5)',
            }}>
              Sugerencias: Prioridad <strong style={{ color: '#a5b4fc' }}>{aiSuggestions.suggestedPriority}</strong>
              {' · '}Depto <strong style={{ color: '#a5b4fc' }}>{aiSuggestions.suggestedDepartment}</strong>
              {aiSuggestions.suggestedTags?.length > 0 && (
                <>{' · '}Tags: {aiSuggestions.suggestedTags.join(', ')}</>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Ctrl+Enter para crear
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={closeModal} style={cancelBtnStyle}>Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              style={{
                ...submitBtnStyle,
                opacity: title.trim() ? 1 : 0.5,
                cursor: title.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Crear Tarea
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ======================== COMMAND PALETTE ========================

export function CommandPalette() {
  const closeModal = useAppStore(s => s.closeModal)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const commands = [
    { id: 'new_task', label: 'Nueva Tarea', icon: '➕', shortcut: 'Ctrl+N', action: () => { closeModal(); useAppStore.getState().openModal('createTask') } },
    { id: 'search', label: 'Buscar Tareas', icon: '🔍', shortcut: 'Ctrl+K', action: () => {} },
    { id: 'nora', label: 'Abrir Nora IA', icon: '✨', action: () => { closeModal(); useAppStore.getState().setRightPanel('nora') } },
    { id: 'notifications', label: 'Ver Notificaciones', icon: '🔔', action: () => { closeModal(); useAppStore.getState().setRightPanel('notifications') } },
    { id: 'dark_mode', label: 'Cambiar Tema', icon: '🌙', action: () => {} },
  ]

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  return (
    <ModalOverlay onClose={closeModal}>
      <div style={{
        width: '500px', background: '#14141e', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal()
              if (e.key === 'Enter' && filtered.length > 0) { filtered[0].action(); closeModal() }
            }}
            placeholder="Escribe un comando..."
            style={{
              width: '100%', padding: '8px 0', background: 'none', border: 'none',
              color: 'white', fontSize: '15px', outline: 'none',
            }}
          />
        </div>
        <div style={{ padding: '8px', maxHeight: '300px', overflow: 'auto' }}>
          {filtered.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => { cmd.action(); closeModal() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px', border: 'none',
                background: 'transparent', color: 'rgba(255,255,255,0.7)',
                fontSize: '13px', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{cmd.icon}</span>
              <span style={{ flex: 1 }}>{cmd.label}</span>
              {cmd.shortcut && (
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                  {cmd.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </ModalOverlay>
  )
}

// ======================== CONFIRM MODAL ========================

export function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div style={{
        width: '400px', background: '#14141e', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)', padding: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...submitBtnStyle, background: '#ef4444' }}>Confirmar</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ======================== MODAL ROUTER ========================

export function ModalRouter() {
  const modals = useAppStore(s => s.modals)
  const closeModal = useAppStore(s => s.closeModal)

  return (
    <>
      {modals.createTask && <CreateTaskModal />}
      {modals.commandPalette && <CommandPalette />}
    </>
  )
}

// ======================== HELPER COMPONENTS ========================

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ======================== STYLES ========================

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
  color: 'white', fontSize: '13px', outline: 'none', cursor: 'pointer',
}

const optStyle: React.CSSProperties = { background: '#14141e' }

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
  color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer',
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
