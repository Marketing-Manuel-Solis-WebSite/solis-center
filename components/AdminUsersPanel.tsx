'use client'

import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface UserData {
  id: string
  name: string
  email: string
  avatar: string
  department: string
  role: string
  permissions: {
    canCreateTasks: boolean
    canDeleteTasks: boolean
    canAssignTasks: boolean
    canManageUsers: boolean
    canViewAllTasks: boolean
    canManageAutomations: boolean
  }
  createdAt?: any
}

interface AdminUsersPanelProps {
  currentUserId: string
}

const Icons = {
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
}

const departmentLabels: Record<string, string> = {
  marketing: 'Marketing',
  openers: 'Openers',
  closers: 'Closers',
  admin: 'Administración',
  finanzas: 'Finanzas',
  general: 'General',
}

const roleLabels: Record<string, string> = {
  director: 'Director',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  lider: 'Líder de Equipo',
  operativo: 'Operativo',
}

const defaultPermissions = {
  canCreateTasks: true,
  canDeleteTasks: false,
  canAssignTasks: false,
  canManageUsers: false,
  canViewAllTasks: false,
  canManageAutomations: false,
}

const rolePermissions: Record<string, typeof defaultPermissions> = {
  director: {
    canCreateTasks: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canManageUsers: true,
    canViewAllTasks: true,
    canManageAutomations: true,
  },
  gerente: {
    canCreateTasks: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canManageUsers: true,
    canViewAllTasks: true,
    canManageAutomations: true,
  },
  supervisor: {
    canCreateTasks: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canManageUsers: false,
    canViewAllTasks: true,
    canManageAutomations: false,
  },
  lider: {
    canCreateTasks: true,
    canDeleteTasks: false,
    canAssignTasks: true,
    canManageUsers: false,
    canViewAllTasks: false,
    canManageAutomations: false,
  },
  operativo: defaultPermissions,
}

export default function AdminUsersPanel({ currentUserId }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        permissions: doc.data().permissions || defaultPermissions,
      })) as UserData[]
      setUsers(usersData)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = filterDepartment === 'all' || user.department === filterDepartment
    return matchesSearch && matchesDept
  })

  const handleUpdateUser = async (userId: string, updates: Partial<UserData>) => {
    try {
      await updateDoc(doc(db, 'users', userId), updates)
      setEditingUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleRoleChange = (newRole: string) => {
    if (!editingUser) return
    const newPermissions = rolePermissions[newRole] || defaultPermissions
    setEditingUser({
      ...editingUser,
      role: newRole,
      permissions: newPermissions,
    })
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
        Cargando usuarios...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icons.Users />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Administrar Usuarios</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{users.length} usuarios registrados</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none' }}
        >
          <option value="all" style={{ background: '#1a1a24' }}>Todos los departamentos</option>
          {Object.entries(departmentLabels).map(([key, label]) => (
            <option key={key} value={key} style={{ background: '#1a1a24' }}>{label}</option>
          ))}
        </select>
      </div>

      {/* Users List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            No se encontraron usuarios
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px', 
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {user.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{user.name}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{user.email}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', textTransform: 'capitalize' }}>
                    {roleLabels[user.role] || user.role}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                    {departmentLabels[user.department] || user.department}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEditingUser(user)}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', cursor: 'pointer' }}
                  title="Editar usuario"
                >
                  <Icons.Edit />
                </button>
                {user.id !== currentUserId && (
                  <button
                    onClick={() => setShowDeleteConfirm(user.id)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer' }}
                    title="Eliminar usuario"
                  >
                    <Icons.Trash />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: '550px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflow: 'auto' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Editar Usuario</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Icons.X /></button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              {/* User Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(99,102,241,0.1)', borderRadius: '12px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                  {editingUser.avatar}
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{editingUser.name}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{editingUser.email}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Departamento</label>
                  <select
                    value={editingUser.department}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {Object.entries(departmentLabels).map(([key, label]) => (
                      <option key={key} value={key} style={{ background: '#1a1a24' }}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Rol</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <option key={key} value={key} style={{ background: '#1a1a24' }}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Icons.Shield />
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Permisos</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'canCreateTasks', label: 'Crear tareas', desc: 'Puede crear nuevas tareas' },
                    { key: 'canDeleteTasks', label: 'Eliminar tareas', desc: 'Puede eliminar tareas existentes' },
                    { key: 'canAssignTasks', label: 'Asignar tareas', desc: 'Puede asignar tareas a otros usuarios' },
                    { key: 'canViewAllTasks', label: 'Ver todas las tareas', desc: 'Ve tareas de todos los departamentos' },
                    { key: 'canManageUsers', label: 'Administrar usuarios', desc: 'Puede editar y eliminar usuarios' },
                    { key: 'canManageAutomations', label: 'Administrar automatizaciones', desc: 'Puede crear y editar automatizaciones' },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{perm.label}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{perm.desc}</p>
                      </div>
                      <div 
                        onClick={() => {
                          setEditingUser({
                            ...editingUser,
                            permissions: {
                              ...editingUser.permissions,
                              [perm.key]: !editingUser.permissions[perm.key as keyof typeof editingUser.permissions]
                            }
                          })
                        }}
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '12px',
                          background: editingUser.permissions[perm.key as keyof typeof editingUser.permissions] 
                            ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                            : 'rgba(255,255,255,0.1)',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: editingUser.permissions[perm.key as keyof typeof editingUser.permissions] ? '22px' : '2px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'white',
                          transition: 'left 0.2s',
                        }} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  onClick={() => setEditingUser(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdateUser(editingUser.id, {
                    department: editingUser.department,
                    role: editingUser.role,
                    permissions: editingUser.permissions,
                  })}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.2)', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#f87171' }}>
              <Icons.Trash />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>¿Eliminar Usuario?</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}