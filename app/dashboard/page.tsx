'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import ProfileModal from '../../components/ProfileModal'
import AdminUsersPanel from '../../components/AdminUsersPanel'
import OrganigramaComponent from '../../components/OrganigramaComponent'
import DocumentsView from '../../components/DocumentsView'
import ReportsView from '../../components/dashboard/ReportsView'
import FormsView from '../../components/dashboard/FormsView'
import SocialInboxView from '../../components/dashboard/SocialInboxView'
import MessagesView from '../../components/dashboard/MessagesView'
import CreateTaskModal from '../../components/dashboard/CreateTaskModal'
import { KanbanColumn, ListView, CalendarView, SearchAndFilters } from '../../components/dashboard/TaskViews'
import { Task, TaskStatus, ActivityLog, User } from '../../types'

// ==================== ICONOS ====================
const Icons = {
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  LayoutDashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  CheckSquare: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  File: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Briefcase: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  GitBranch: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
  UserCog: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="2"/><path d="M19 8v1"/><path d="M19 13v1"/><path d="m21.6 9.5-.87.5"/><path d="m17.27 12-.87.5"/><path d="m21.6 12.5-.87-.5"/><path d="m17.27 10-.87-.5"/></svg>,
  LogOut: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ChevronLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Form: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  MessageCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  Inbox: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Bell: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
}

// ==================== CONFIGURACIÓN DE COLUMNAS KANBAN ====================
const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'to_do', title: 'Por Hacer', color: '#64748b' },
  { id: 'in_progress', title: 'En Progreso', color: '#3b82f6' },
  { id: 'review', title: 'En Revisión', color: '#f59e0b' },
  { id: 'done', title: 'Completado', color: '#22c55e' },
]

// ==================== ETIQUETAS DE DEPARTAMENTOS ====================
const departmentLabels: Record<string, string> = {
  marketing: 'Marketing',
  openers: 'Openers',
  closers: 'Closers',
  admin: 'Administración',
  finanzas: 'Finanzas',
  general: 'General',
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth()
  
  // Estados de UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // Estados de datos
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de vista de tareas
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filters, setFilters] = useState({ 
    search: '', 
    status: 'all', 
    priority: 'all', 
    department: 'all', 
    assignee: 'all' 
  })

  // ==================== NAVEGACIÓN ====================
  const navigation = [
    { 
      name: 'Dashboard', 
      icon: Icons.LayoutDashboard, 
      desc: 'Vista general',
      badge: null
    },
    { 
      name: 'Mis Tareas', 
      icon: Icons.CheckSquare, 
      desc: 'Tus asignaciones',
      badge: null
    },
    { 
      name: 'Chat Interno', 
      icon: Icons.MessageCircle, 
      desc: 'Mensajería de equipo',
      badge: null,
      highlight: true // ⭐ NUEVO
    },
    { 
      name: 'Redes Sociales', 
      icon: Icons.Inbox, 
      desc: 'Bandeja unificada',
      badge: null
    },
    { 
      name: 'Reportes & IA', 
      icon: Icons.FileText, 
      desc: 'Inteligencia operativa',
      badge: null
    },
    { 
      name: 'Documentos', 
      icon: Icons.File, 
      desc: 'Repositorio central',
      badge: null
    },
    { 
      name: 'Formularios', 
      icon: Icons.Form, 
      desc: 'Encuestas y forms',
      badge: null
    },
    { 
      name: 'Mi Equipo', 
      icon: Icons.Briefcase, 
      desc: 'Tareas del depto',
      badge: null
    },
    { 
      name: 'Equipo', 
      icon: Icons.Users, 
      desc: 'Directorio',
      badge: null
    },
    { 
      name: 'Organigrama', 
      icon: Icons.GitBranch, 
      desc: 'Estructura',
      badge: null
    },
    { 
      name: 'Admin Usuarios', 
      icon: Icons.UserCog, 
      desc: 'Gestión', 
      adminOnly: true,
      badge: null
    },
  ]

  // Filtrar navegación según permisos
  const canManageUsers = user?.role === 'director' || user?.role === 'gerente' || user?.permissions?.canManageUsers
  const filteredNavigation = navigation.filter(item => !item.adminOnly || canManageUsers)

  // ==================== CARGAR TAREAS ====================
  useEffect(() => {
    if (!user) return
    
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => { 
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)))
      setLoading(false) 
    })
    
    return () => unsub()
  }, [user])

  // ==================== CARGAR MIEMBROS DEL EQUIPO ====================
  useEffect(() => {
    if (!user) return
    
    const unsub = onSnapshot(collection(db, 'users'), (snap) => { 
      setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))
    })
    
    return () => unsub()
  }, [user])

  // ==================== CREAR TAREA ====================
  const createTask = async (taskData: Partial<Task>) => {
    if (!user) return
    
    await addDoc(collection(db, 'tasks'), { 
      ...taskData, 
      createdBy: { 
        id: user.id, 
        name: user.name, 
        avatar: user.avatar 
      }, 
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    })
  }

  // ==================== ACTUALIZAR ESTADO DE TAREA ====================
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !user) return

    const log: ActivityLog = { 
      id: Date.now().toString(), 
      action: 'updated', 
      field: 'status', 
      oldValue: task.status, 
      newValue: newStatus, 
      userId: user.id, 
      userName: user.name, 
      timestamp: Date.now() 
    }
    
    await updateDoc(doc(db, 'tasks', taskId), { 
      status: newStatus, 
      activityLog: [...(task.activityLog || []), log],
      updatedAt: serverTimestamp()
    })
  }

  // ==================== ELIMINAR TAREA ====================
  const deleteTask = async (taskId: string) => { 
    if (confirm('¿Eliminar esta tarea permanentemente?')) {
      await deleteDoc(doc(db, 'tasks', taskId))
    }
  }

  // ==================== FILTRAR TAREAS ====================
  const getFilteredTasks = () => {
    let filtered = tasks

    // Filtro por vista
    if (activeNav === 'Mis Tareas') {
      filtered = tasks.filter(t => t.assigneeId === user?.id)
    } else if (activeNav === 'Mi Equipo') {
      filtered = tasks.filter(t => t.department === user?.department)
    }

    // Aplicar filtros
    return filtered.filter(task => {
      // Búsqueda por texto
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Filtro por estado
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false
      }

      // Filtro por prioridad
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false
      }

      // Filtro por departamento
      if (filters.department !== 'all' && task.department !== filters.department) {
        return false
      }

      // Filtro por asignado
      if (filters.assignee !== 'all') {
        if (filters.assignee === 'unassigned' && task.assigneeId) return false
        if (filters.assignee !== 'unassigned' && task.assigneeId !== filters.assignee) return false
      }

      return true
    })
  }

  const filteredTasks = getFilteredTasks()
  
  // ==================== AGRUPAR TAREAS POR ESTADO ====================
  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => t.status === status)

  // ==================== ESTADÍSTICAS ====================
  const stats = { 
    total: filteredTasks.length, 
    todo: filteredTasks.filter(t => t.status === 'to_do').length, 
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length, 
    done: filteredTasks.filter(t => t.status === 'done').length 
  }

  // ==================== LOADING ====================
  if (authLoading || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '20px', 
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px', 
            fontSize: '32px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
            animation: 'pulse 2s infinite'
          }}>
            ⚡
          </div>
          <p style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '16px',
            fontWeight: 500,
            marginBottom: '8px'
          }}>
            Cargando SOLISCENTER
          </p>
          <p style={{ 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '13px' 
          }}>
            Preparando tu espacio de trabajo...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // ==================== RENDER PRINCIPAL ====================
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: '#0a0a0f', 
      overflow: 'hidden', 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      color: 'white' 
    }}>
      
      {/* Efectos de fondo */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: '25%', 
          width: '500px', 
          height: '500px', 
          background: 'rgba(99,102,241,0.08)', 
          borderRadius: '50%', 
          filter: 'blur(120px)' 
        }} />
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          right: '25%', 
          width: '400px', 
          height: '400px', 
          background: 'rgba(139,92,246,0.08)', 
          borderRadius: '50%', 
          filter: 'blur(100px)' 
        }} />
      </div>
      
      {/* ==================== SIDEBAR ==================== */}
      <aside style={{ 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        flexDirection: 'column', 
        width: sidebarCollapsed ? '72px' : '260px', 
        transition: 'width 0.3s ease', 
        borderRight: '1px solid rgba(255,255,255,0.08)', 
        background: 'rgba(15,15,21,0.9)', 
        backdropFilter: 'blur(20px)' 
      }}>
        
        {/* Header del Sidebar */}
        <div style={{ 
          display: 'flex', 
          height: '64px', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 16px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)' 
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
              }}>
                <Icons.Zap />
              </div>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                SOLISCENTER
              </span>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            style={{ 
              borderRadius: '8px', 
              padding: '8px', 
              color: 'rgba(255,255,255,0.4)', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
            }}
          >
            {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        </div>
        
        {/* Navegación */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {filteredNavigation.map(item => {
            const isActive = activeNav === item.name
            
            return (
              <button 
                key={item.name} 
                onClick={() => setActiveNav(item.name)} 
                title={sidebarCollapsed ? `${item.name} - ${item.desc}` : item.desc}
                style={{ 
                  display: 'flex', 
                  width: '100%', 
                  alignItems: 'center', 
                  gap: '12px', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  marginBottom: '4px', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  border: isActive 
                    ? '1px solid rgba(99,102,241,0.4)' 
                    : '1px solid transparent', 
                  background: isActive 
                    ? 'linear-gradient(90deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' 
                    : 'transparent', 
                  color: isActive ? 'white' : 'rgba(255,255,255,0.6)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                  }
                }}
              >
                {/* Highlight para nuevo feature */}
                {item.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
                    animation: 'pulse 2s infinite'
                  }} />
                )}
                
                <item.icon />
                
                {!sidebarCollapsed && (
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                )}
                
                {item.badge && !sidebarCollapsed && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#6366f1',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        
        {/* Footer del Sidebar - Perfil y Logout */}
        <div style={{ 
          borderTop: '1px solid rgba(255,255,255,0.08)', 
          padding: '12px' 
        }}>
          {/* Perfil del usuario */}
          <div 
            onClick={() => setShowProfileModal(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px', 
              marginBottom: '8px', 
              cursor: 'pointer', 
              borderRadius: '12px', 
              transition: 'background 0.2s',
              border: '1px solid transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '14px', 
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
            }}>
              {user.avatar}
            </div>
            
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  marginBottom: '2px'
                }}>
                  {user.name}
                </p>
                <p style={{ 
                  fontSize: '11px', 
                  color: 'rgba(255,255,255,0.5)', 
                  textTransform: 'capitalize' 
                }}>
                  {user.role} • {departmentLabels[user.department]}
                </p>
              </div>
            )}
          </div>
          
          {/* Botón de logout */}
          <button 
            onClick={logout} 
            style={{ 
              display: 'flex', 
              width: '100%', 
              alignItems: 'center', 
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start', 
              gap: '12px', 
              borderRadius: '12px', 
              padding: '12px', 
              fontSize: '14px', 
              fontWeight: 500, 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid rgba(239,68,68,0.2)', 
              color: '#f87171', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
              e.currentTarget.style.color = '#fca5a5'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.color = '#f87171'
            }}
          >
            <Icons.LogOut />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
      
      {/* ==================== ÁREA PRINCIPAL ==================== */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        flex: 1, 
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}>
        
        {/* Header */}
        <header style={{ 
          display: 'flex', 
          height: '64px', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid rgba(255,255,255,0.08)', 
          background: 'rgba(15,15,21,0.8)', 
          backdropFilter: 'blur(20px)', 
          padding: '0 28px' 
        }}>
          <div>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: 700,
              marginBottom: '4px'
            }}>
              {activeNav}
            </h1>
            <p style={{ 
              fontSize: '13px', 
              color: 'rgba(255,255,255,0.5)' 
            }}>
              {navigation.find(n => n.name === activeNav)?.desc}
            </p>
          </div>
          
          {/* Botón Nueva Tarea - Solo en vistas de tareas */}
          {['Dashboard', 'Mis Tareas', 'Mi Equipo'].includes(activeNav) && (
            <button 
              onClick={() => setShowCreateModal(true)} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                borderRadius: '12px', 
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                padding: '12px 24px', 
                fontSize: '14px', 
                fontWeight: 600, 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer', 
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.4)'
              }}
            >
              <Icons.Plus /> 
              Nueva Tarea
            </button>
          )}
        </header>
        
        {/* ==================== CONTENIDO PRINCIPAL ==================== */}
        <main style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '28px' 
        }}>
          
          {/* VISTAS DE TAREAS - Dashboard, Mis Tareas, Mi Equipo */}
          {(activeNav === 'Dashboard' || activeNav === 'Mis Tareas' || activeNav === 'Mi Equipo') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Estadísticas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {[ 
                  { title: 'Total', value: stats.total, color: '#6366f1', icon: '📊' }, 
                  { title: 'Por Hacer', value: stats.todo, color: '#64748b', icon: '📝' }, 
                  { title: 'En Progreso', value: stats.inProgress, color: '#3b82f6', icon: '⚡' }, 
                  { title: 'Completadas', value: stats.done, color: '#22c55e', icon: '✅' } 
                ].map((s, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '20px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.borderColor = `${s.color}40`
                      e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}20`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255,255,255,0.6)', 
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '24px', opacity: 0.6 }}>
                        {s.icon}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '36px', 
                      fontWeight: 700, 
                      color: s.color 
                    }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Área de tareas */}
              <div style={{ 
                borderRadius: '24px', 
                border: '1px solid rgba(255,255,255,0.08)', 
                background: 'rgba(18,18,26,0.9)', 
                padding: '28px', 
                minHeight: '500px' 
              }}>
                {/* Filtros y controles */}
                <SearchAndFilters 
                  filters={filters} 
                  setFilters={setFilters} 
                  teamMembers={teamMembers} 
                  viewMode={viewMode} 
                  setViewMode={setViewMode} 
                  showDepartmentFilter={activeNav === 'Dashboard'} 
                />
                
                {/* Vistas */}
                {viewMode === 'kanban' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    overflowX: 'auto', 
                    paddingBottom: '16px',
                    marginTop: '24px'
                  }}>
                    {columns.map(col => (
                      <KanbanColumn 
                        key={col.id} 
                        column={col} 
                        tasks={getTasksByStatus(col.id)} 
                        onTaskClick={() => {}} 
                        onTaskDelete={deleteTask} 
                        onDrop={updateTaskStatus} 
                      />
                    ))}
                  </div>
                )}
                
                {viewMode === 'list' && (
                  <div style={{ marginTop: '24px' }}>
                    <ListView 
                      tasks={filteredTasks} 
                      onTaskClick={() => {}} 
                      onTaskDelete={deleteTask} 
                      onUpdateStatus={updateTaskStatus} 
                    />
                  </div>
                )}
                
                {viewMode === 'calendar' && (
                  <div style={{ marginTop: '24px' }}>
                    <CalendarView 
                      tasks={filteredTasks} 
                      onTaskClick={() => {}} 
                      currentDate={currentDate} 
                      setCurrentDate={setCurrentDate} 
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* CHAT INTERNO ⭐ NUEVO */}
          {activeNav === 'Chat Interno' && <MessagesView />}
          
          {/* BANDEJA DE REDES SOCIALES */}
          {activeNav === 'Redes Sociales' && <SocialInboxView />}
          
          {/* REPORTES & IA */}
          {activeNav === 'Reportes & IA' && <ReportsView />}
          
          {/* DOCUMENTOS */}
          {activeNav === 'Documentos' && <DocumentsView />}
          
          {/* FORMULARIOS */}
          {activeNav === 'Formularios' && <FormsView />}
          
          {/* ORGANIGRAMA */}
          {activeNav === 'Organigrama' && (
            <div style={{ 
              borderRadius: '24px', 
              border: '1px solid rgba(255,255,255,0.08)', 
              background: 'rgba(18,18,26,0.9)', 
              padding: '28px' 
            }}>
              <OrganigramaComponent />
            </div>
          )}
          
          {/* ADMIN USUARIOS */}
          {activeNav === 'Admin Usuarios' && canManageUsers && (
            <div style={{ 
              borderRadius: '24px', 
              border: '1px solid rgba(255,255,255,0.08)', 
              background: 'rgba(18,18,26,0.9)', 
              padding: '28px' 
            }}>
              <AdminUsersPanel currentUserId={user.id} />
            </div>
          )}
          
          {/* DIRECTORIO DE EQUIPO */}
          {activeNav === 'Equipo' && (
            <div style={{ 
              borderRadius: '24px', 
              border: '1px solid rgba(255,255,255,0.08)', 
              background: 'rgba(18,18,26,0.9)', 
              padding: '28px' 
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Icons.Users />
                Miembros del Equipo ({teamMembers.length})
              </h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '20px' 
              }}>
                {teamMembers.map(m => (
                  <div 
                    key={m.id} 
                    style={{ 
                      padding: '20px', 
                      borderRadius: '16px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.08)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
                      e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <div style={{ 
                      width: '52px', 
                      height: '52px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '18px', 
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                    }}>
                      {m.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: '15px', 
                        fontWeight: 600,
                        marginBottom: '4px'
                      }}>
                        {m.name}
                      </p>
                      <p style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255,255,255,0.5)', 
                        textTransform: 'capitalize' 
                      }}>
                        {m.role} • {departmentLabels[m.department]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODALES ==================== */}
      
      {/* Modal Crear Tarea */}
      <CreateTaskModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onSubmit={createTask} 
        teamMembers={teamMembers} 
        userDepartment={user.department} 
        userName={user.name} 
      />
      
      {/* Modal Perfil */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        user={user as any} 
        onUserUpdate={() => {}} 
      />
    </div>
  )
}