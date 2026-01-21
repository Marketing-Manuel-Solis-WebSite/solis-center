'use client'

import { useState, useEffect } from 'react'
import { Task, TaskPriority, Department } from '../../types'
import { sendTaskNotification } from '../../lib/email'

const Icons = {
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Mail: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
}

const priorityLabels: Record<TaskPriority, string> = { urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baja' }
const departmentLabels: Record<string, string> = { marketing: 'Marketing', openers: 'Openers', closers: 'Closers', admin: 'Administración', finanzas: 'Finanzas', general: 'General' }

export default function CreateTaskModal({ isOpen, onClose, onSubmit, teamMembers, userDepartment, userName }: { isOpen: boolean; onClose: () => void; onSubmit: (t: Partial<Task>) => void; teamMembers: any[]; userDepartment: string; userName: string }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal' as TaskPriority, assigneeId: '', dueDate: '', department: userDepartment })
  const [sendNotification, setSendNotification] = useState(true)

  useEffect(() => { if (isOpen) { setForm({ title: '', description: '', priority: 'normal', assigneeId: '', dueDate: '', department: userDepartment }); setSendNotification(true) } }, [isOpen, userDepartment])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const assignee = teamMembers.find(m => m.id === form.assigneeId)
    
    // CORRECCIÓN: Casteo explícito a Department y limpieza de campos
    const taskData: Partial<Task> = { 
      title: form.title,
      description: form.description,
      priority: form.priority,
      department: form.department as Department, 
      dueDate: form.dueDate || null,
      status: 'to_do',
      assigneeId: form.assigneeId || null, 
      assigneeName: assignee?.name || null, 
      assigneeAvatar: assignee?.avatar || null,
      assignees: assignee ? [{ id: assignee.id, name: assignee.name, avatar: assignee.avatar }] : [],
      createdByName: userName, 
      createdBy: { id: 'temp', name: userName },
      subtasks: [], comments: [], attachments: [], 
      activityLog: [{ id: Date.now().toString(), action: 'created', userId: '', userName: userName, timestamp: Date.now() }] 
    }

    if (sendNotification && assignee?.email) { 
      try { 
        await sendTaskNotification({ 
          to_email: assignee.email, to_name: assignee.name, 
          task_title: form.title, task_description: form.description || 'Sin descripción', 
          task_priority: priorityLabels[form.priority], task_due_date: form.dueDate || 'Sin fecha límite', 
          assigned_by: userName 
        }) 
      } catch (e) { console.error('Error email:', e) } 
    }
    
    onSubmit(taskData); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '500px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>Nueva Tarea</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Icons.X /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Nombre de la tarea" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles..." rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Prioridad</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }}>
                {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k} style={{ background: '#1a1a24' }}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Fecha límite</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Departamento</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }}>
              {Object.entries(departmentLabels).map(([k, v]) => <option key={k} value={k} style={{ background: '#1a1a24' }}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Asignar a</label>
            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }}>
              <option value="" style={{ background: '#1a1a24' }}>-- Sin asignar --</option>
              {teamMembers.map(m => <option key={m.id} value={m.id} style={{ background: '#1a1a24' }}>{m.name} • {departmentLabels[m.department]}</option>)}
            </select>
          </div>
          
          {form.assigneeId && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#22c55e' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                <Icons.Mail /> Enviar notificación por correo
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>Crear Tarea</button>
          </div>
        </form>
      </div>
    </div>
  )
}