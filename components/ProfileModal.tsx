'use client'

import { useState } from 'react'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    name: string
    email: string
    avatar: string
    department: string
    role: string
  }
  onUserUpdate: (updates: any) => void
}

const Icons = {
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  AlertCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
}

const departmentLabels: Record<string, string> = {
  marketing: 'Marketing',
  openers: 'Openers',
  closers: 'Closers',
  admin: 'Administración',
  finanzas: 'Finanzas',
  general: 'General',
}

export default function ProfileModal({ isOpen, onClose, user, onUserUpdate }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    avatar: user.avatar,
    department: user.department,
  })

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  if (!isOpen) return null

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: profileForm.name,
        avatar: profileForm.avatar,
        department: profileForm.department,
      })

      onUserUpdate({
        ...user,
        name: profileForm.name,
        avatar: profileForm.avatar,
        department: profileForm.department,
      })

      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar perfil' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      setLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      setLoading(false)
      return
    }

    try {
      const currentUser = auth.currentUser
      if (!currentUser || !currentUser.email) throw new Error('No hay usuario autenticado')

      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword)
      await reauthenticateWithCredential(currentUser, credential)

      // Cambiar contraseña
      await updatePassword(currentUser, passwordForm.newPassword)

      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      let errorMessage = 'Error al cambiar contraseña'
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña actual incorrecta'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil'
      }
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const generateAvatar = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '500px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>Mi Perfil</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px' }}><Icons.X /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => { setActiveTab('profile'); setMessage(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'profile' ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeTab === 'profile' ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            <Icons.User /> Datos Personales
          </button>
          <button onClick={() => { setActiveTab('password'); setMessage(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'password' ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeTab === 'password' ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            <Icons.Lock /> Contraseña
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Message */}
          {message && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              marginBottom: '20px',
              background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: message.type === 'success' ? '#22c55e' : '#ef4444',
            }}>
              {message.type === 'success' ? <Icons.Check /> : <Icons.AlertCircle />}
              <span style={{ fontSize: '13px' }}>{message.text}</span>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              {/* Avatar Preview */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '24px', 
                  fontWeight: 700, 
                  color: 'white' 
                }}>
                  {profileForm.avatar}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={profileForm.name} 
                  onChange={(e) => {
                    const name = e.target.value
                    setProfileForm({ 
                      ...profileForm, 
                      name,
                      avatar: generateAvatar(name)
                    })
                  }} 
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Email</label>
                <input 
                  type="email" 
                  value={user.email} 
                  disabled
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} 
                />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>El email no se puede modificar</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Departamento</label>
                <select 
                  value={profileForm.department} 
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                >
                  {Object.entries(departmentLabels).map(([key, label]) => (
                    <option key={key} value={key} style={{ background: '#1a1a24' }}>{label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Rol</label>
                <input 
                  type="text" 
                  value={user.role} 
                  disabled
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed', textTransform: 'capitalize' }} 
                />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Solo un administrador puede cambiar tu rol</p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                  color: 'white', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  cursor: loading ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Contraseña Actual</label>
                <input 
                  type="password" 
                  value={passwordForm.currentPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={passwordForm.newPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                  required
                  placeholder="Mínimo 6 caracteres"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={passwordForm.confirmPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                  required
                  placeholder="Repite la nueva contraseña"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                  color: 'white', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  cursor: loading ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}