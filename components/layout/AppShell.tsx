/**
 * ============================================================================
 * SOLIS OS — APP SHELL (Layout Principal)
 * ============================================================================
 * Wrapper que orquesta:
 *   - Sidebar (izquierda)
 *   - Header (top)
 *   - Content area (centro)
 *   - Right Panel (derecha, condicional)
 *   - Toast notifications
 * ============================================================================
 */

'use client'

import React, { useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import Sidebar from './Sidebar'
import ViewManager from '../views/ViewManager'
import { useAuth, useHierarchy, useListTasks, useKeyboard } from '../../hooks'

// ======================== APP SHELL ========================

export default function AppShell() {
  const { user, loading: authLoading } = useAuth()
  const activeWorkspaceId = useAppStore(s => s.activeWorkspaceId)
  const activeListId = useAppStore(s => s.activeListId)
  const rightPanel = useAppStore(s => s.rightPanelContent)
  const setRightPanel = useAppStore(s => s.setRightPanel)
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)
  const toasts = useAppStore(s => s.toasts)
  const removeToast = useAppStore(s => s.removeToast)
  const openModal = useAppStore(s => s.openModal)

  // Suscripciones en tiempo real
  useHierarchy(activeWorkspaceId)
  useListTasks(activeListId)

  // Atajos de teclado globales
  useKeyboard({
    'ctrl+k': () => openModal('commandPalette'),
    'ctrl+n': () => openModal('createTask'),
    'ctrl+b': () => useAppStore.getState().toggleSidebar(),
  })

  // Auto-dismiss toasts
  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.id) {
        const timer = setTimeout(() => removeToast(toast.id!), 4000)
        return () => clearTimeout(timer)
      }
    })
  }, [toasts, removeToast])

  // ==================== LOADING STATE ====================
  if (authLoading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#0a0a12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 800, color: 'white',
          animation: 'pulse 2s infinite',
        }}>S</div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Cargando Solis OS...</span>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      </div>
    )
  }

  // ==================== MAIN LAYOUT ====================
  return (
    <div style={{
      display: 'flex', width: '100vw', height: '100vh',
      background: '#0a0a12', color: 'white', fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: 'hidden',
    }}>
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* HEADER */}
        <Header />

        {/* CONTENT AREA */}
        <main style={{
          flex: 1, overflow: 'auto', padding: '24px',
          background: 'linear-gradient(180deg, rgba(14,14,22,1) 0%, rgba(10,10,18,1) 100%)',
        }}>
          {activeListId ? (
            <ViewManager />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      {/* RIGHT PANEL */}
      {rightPanel && (
        <RightPanel type={rightPanel} onClose={() => setRightPanel(null)} />
      )}

      {/* TOASTS */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  )
}

// ======================== HEADER ========================

function Header() {
  const activeListId = useAppStore(s => s.activeListId)
  const lists = useAppStore(s => s.lists)
  const spaces = useAppStore(s => s.spaces)
  const activeSpaceId = useAppStore(s => s.activeSpaceId)

  const activeList = activeListId ? lists[activeListId] : null
  const activeSpace = activeSpaceId ? spaces[activeSpaceId] : null

  return (
    <header style={{
      height: '56px', display: 'flex', alignItems: 'center',
      padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(12,12,20,0.8)', backdropFilter: 'blur(12px)',
      justifyContent: 'space-between',
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {activeSpace && (
          <>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              {activeSpace.name}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>/</span>
          </>
        )}
        {activeList && (
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
            {activeList.name}
          </span>
        )}
        {!activeList && (
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
            Selecciona una lista
          </span>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <HeaderButton
          icon="🔔"
          onClick={() => useAppStore.getState().setRightPanel('notifications')}
          badge={useAppStore.getState().unreadNotificationCount}
        />
        <HeaderButton
          icon="✨"
          onClick={() => useAppStore.getState().setRightPanel('nora')}
        />
      </div>
    </header>
  )
}

function HeaderButton({ icon, onClick, badge = 0 }: { icon: string; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', width: '36px', height: '36px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.04)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: '16px',
      }}
    >
      {icon}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: '-2px', right: '-2px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', fontWeight: 700, color: 'white',
        }}>{badge}</span>
      )}
    </button>
  )
}

// ======================== EMPTY STATE ========================

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '16px', opacity: 0.5,
    }}>
      <div style={{ fontSize: '48px' }}>📋</div>
      <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Bienvenido a Solis OS</h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '360px' }}>
        Selecciona una lista del sidebar para comenzar a gestionar tus tareas, o crea un nuevo Space.
      </p>
    </div>
  )
}

// ======================== RIGHT PANEL ========================

function RightPanel({ type, onClose }: { type: string; onClose: () => void }) {
  return (
    <aside style={{
      width: '360px', minWidth: '360px', height: '100vh',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      background: '#0c0c14', display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.15s ease',
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

      {/* Header */}
      <div style={{
        height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>
          {type === 'nora' && '✨ Nora IA'}
          {type === 'notifications' && '🔔 Notificaciones'}
          {type === 'task_detail' && '📝 Detalle de Tarea'}
          {type === 'chat' && '💬 Chat'}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: '18px', padding: '4px',
          }}
        >×</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {type === 'nora' && <NoraPanelContent />}
        {type === 'notifications' && <NotificationsPanelContent />}
        {type === 'task_detail' && <TaskDetailContent />}
      </div>
    </aside>
  )
}

// ======================== PANEL CONTENTS ========================

function NoraPanelContent() {
  const conversation = useAppStore(s => s.noraConversation)
  const insights = useAppStore(s => s.noraInsights)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Insights
          </h4>
          {insights.slice(0, 3).map((insight, i) => (
            <div key={i} style={{
              padding: '12px', borderRadius: '10px', marginBottom: '8px',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                {insight.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Conversation */}
      <div style={{ flex: 1 }}>
        {conversation.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
            <p style={{ fontSize: '13px' }}>Pregúntale algo a Nora</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
              Puede analizar tareas, sugerir prioridades, y automatizar procesos
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
      }}>
        <input
          type="text"
          placeholder="Escribe un mensaje a Nora..."
          style={{
            width: '100%', background: 'none', border: 'none', color: 'white',
            fontSize: '13px', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

function NotificationsPanelContent() {
  const notifications = useAppStore(s => s.notifications)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
          <p style={{ fontSize: '13px' }}>No hay notificaciones</p>
        </div>
      )}
      {notifications.map((notif, i) => (
        <div key={notif.id || i} style={{
          padding: '12px', borderRadius: '10px',
          background: notif.isRead ? 'transparent' : 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{notif.title}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{notif.body}</p>
        </div>
      ))}
    </div>
  )
}

function TaskDetailContent() {
  const selectedTaskId = useAppStore(s => s.selectedTaskId)
  const task = useAppStore(s => selectedTaskId ? s.tasks[selectedTaskId] : null)

  if (!task) return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Selecciona una tarea</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{task.title}</h3>
      {task.description && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          {task.description}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <DetailField label="Estado" value={task.status} />
        <DetailField label="Prioridad" value={task.priority} />
        <DetailField label="Fecha" value={task.dueDate || '—'} />
        <DetailField label="Asignados" value={task.assignees.map(a => a.name).join(', ') || 'Ninguno'} />
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{value}</div>
    </div>
  )
}

// ======================== TOASTS ========================

function ToastContainer({ toasts, onDismiss }: { toasts: any[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  const typeColors: Record<string, string> = {
    success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6',
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999,
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '12px 16px', borderRadius: '10px',
            background: '#1a1a2e', border: `1px solid ${typeColors[toast.type] || '#3b82f6'}30`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '10px',
            minWidth: '280px', animation: 'slideUp 0.2s ease',
          }}
        >
          <style>{`@keyframes slideUp { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
          <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: typeColors[toast.type] || '#3b82f6' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'white' }}>{toast.title}</p>
            {toast.description && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}
          >×</button>
        </div>
      ))}
    </div>
  )
}
