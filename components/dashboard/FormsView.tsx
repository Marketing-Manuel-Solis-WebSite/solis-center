'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../AuthProvider'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { FormTemplate, FormField, FormSubmission } from '../../types'

// ==================== ICONOS ====================
const Icons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  ExternalLink: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  BarChart: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Sparkles: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Send: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  GripVertical: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>,
}

// ==================== TIPOS DE CAMPO ====================
const fieldTypes = [
  { type: 'text', label: 'Texto corto', icon: '📝' },
  { type: 'textarea', label: 'Texto largo', icon: '📄' },
  { type: 'email', label: 'Email', icon: '📧' },
  { type: 'number', label: 'Número', icon: '🔢' },
  { type: 'date', label: 'Fecha', icon: '📅' },
  { type: 'select', label: 'Selección', icon: '📋' },
]

// ==================== PLANTILLAS PREDEFINIDAS ====================
const templates = [
  {
    name: 'Encuesta de Satisfacción',
    icon: '😊',
    fields: [
      { type: 'text', label: '¿Cuál es tu nombre?', required: true },
      { type: 'select', label: '¿Cómo calificarías nuestro servicio?', required: true, options: ['Excelente', 'Bueno', 'Regular', 'Malo'] },
      { type: 'textarea', label: '¿Qué podríamos mejorar?', required: false },
    ]
  },
  {
    name: 'Solicitud de Información',
    icon: '📋',
    fields: [
      { type: 'text', label: 'Nombre completo', required: true },
      { type: 'email', label: 'Correo electrónico', required: true },
      { type: 'number', label: 'Teléfono', required: true },
      { type: 'select', label: 'Tipo de consulta', required: true, options: ['Ventas', 'Soporte', 'Cotización', 'Otro'] },
      { type: 'textarea', label: 'Mensaje', required: true },
    ]
  },
  {
    name: 'Registro de Evento',
    icon: '🎉',
    fields: [
      { type: 'text', label: 'Nombre', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'select', label: 'Asistirás al evento?', required: true, options: ['Sí', 'No', 'Tal vez'] },
      { type: 'number', label: '¿Cuántos acompañantes?', required: false },
    ]
  },
]

// ==================== COMPONENTE PRINCIPAL ====================
export default function FormsView() {
  const { user } = useAuth()
  const [forms, setForms] = useState<FormTemplate[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null)
  const [submissions, setSubmissions] = useState<Record<string, number>>({})

  const [newForm, setNewForm] = useState<Partial<FormTemplate>>({
    title: '', 
    description: '', 
    notifyEmail: user?.email || '', 
    targetAudience: 'public', 
    fields: []
  })

  const canCreate = user?.role === 'director' || user?.role === 'gerente'

  // Cargar formularios
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'forms'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snapshot) => {
      setForms(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FormTemplate)))
    })
    return () => unsub()
  }, [user])

  // Cargar contador de respuestas
  useEffect(() => {
    if (forms.length === 0) return
    
    const loadSubmissions = async () => {
      const counts: Record<string, number> = {}
      
      for (const form of forms) {
        const q = query(collection(db, 'form_submissions'), where('formId', '==', form.id))
        const snapshot = await getDocs(q)
        counts[form.id] = snapshot.size
      }
      
      setSubmissions(counts)
    }
    
    loadSubmissions()
  }, [forms])

  // Agregar campo
  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      label: 'Nueva pregunta', 
      required: false,
      placeholder: type === 'text' ? 'Escribe aquí...' : undefined,
      // ✅ FIX: Solo agregar options si es tipo select, y sin undefined
      ...(type === 'select' && { options: ['Opción 1', 'Opción 2'] })
    }
    setNewForm(prev => ({ ...prev, fields: [...(prev.fields || []), newField] }))
  }

  // Aplicar plantilla
  const applyTemplate = (template: typeof templates[0]) => {
    const fields: FormField[] = template.fields.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      type: f.type as FormField['type'],
      label: f.label,
      required: f.required,
      placeholder: f.type === 'text' ? 'Escribe aquí...' : undefined,
      ...(f.options && { options: f.options })
    }))
    
    setNewForm(prev => ({
      ...prev,
      title: template.name,
      fields
    }))
  }

  // Actualizar campo
  const updateField = (id: string, updates: Partial<FormField>) => {
    setNewForm(prev => ({ 
      ...prev, 
      fields: prev.fields?.map(f => f.id === id ? { ...f, ...updates } : f) 
    }))
  }

  // Eliminar campo
  const removeField = (id: string) => {
    setNewForm(prev => ({ ...prev, fields: prev.fields?.filter(f => f.id !== id) }))
  }

  // Mover campo arriba/abajo
  const moveField = (id: string, direction: 'up' | 'down') => {
    const fields = [...(newForm.fields || [])]
    const index = fields.findIndex(f => f.id === id)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= fields.length) return
    
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]]
    setNewForm(prev => ({ ...prev, fields }))
  }

  // Crear formulario
  const handleCreateForm = async () => {
    if (!newForm.title || !newForm.notifyEmail || (newForm.fields?.length || 0) === 0) {
      alert('❌ Completa el título, email y agrega al menos una pregunta')
      return
    }

    try {
      // ✅ FIX: Limpiar campos undefined antes de guardar
      const cleanFields = (newForm.fields || []).map(field => {
        const cleanField: FormField = {
          id: field.id,
          type: field.type,
          label: field.label,
          required: field.required,
        }
        
        // Solo agregar campos opcionales si tienen valor
        if (field.placeholder) cleanField.placeholder = field.placeholder
        if (field.options && field.options.length > 0) cleanField.options = field.options
        
        return cleanField
      })

      const formData = {
        title: newForm.title,
        description: newForm.description || '',
        notifyEmail: newForm.notifyEmail,
        targetAudience: newForm.targetAudience || 'public',
        fields: cleanFields,
        isActive: true,
        createdBy: { 
          id: user!.id, 
          name: user!.name, 
          avatar: user!.avatar || user!.name.slice(0, 2).toUpperCase() 
        },
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'forms'), formData)
      
      setIsCreating(false)
      setNewForm({ 
        title: '', 
        description: '', 
        notifyEmail: user?.email || '', 
        targetAudience: 'public', 
        fields: [] 
      })
      
      alert('✅ Formulario publicado correctamente')
    } catch (e) { 
      console.error(e)
      alert('❌ Error al crear formulario. Revisa la consola.')
    }
  }

  // Copiar link
  const copyLink = (formId: string) => {
    const url = `${window.location.origin}/forms/${formId}`
    navigator.clipboard.writeText(url)
    alert('✅ Link copiado al portapapeles')
  }

  // Eliminar formulario
  const deleteForm = async (id: string) => { 
    if (confirm('¿Eliminar este formulario permanentemente?')) {
      await deleteDoc(doc(db, 'forms', id))
      alert('✅ Formulario eliminado')
    }
  }

  // Cambiar estado activo/inactivo
  const toggleStatus = async (form: FormTemplate) => { 
    await updateDoc(doc(db, 'forms', form.id), { isActive: !form.isActive })
  }

  // Ver estadísticas
  const viewStats = async (form: FormTemplate) => {
    setSelectedForm(form)
  }

  // ==================== VISTA DE CREACIÓN ====================
  if (isCreating) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', height: 'calc(100vh - 180px)' }}>
        
        {/* Editor */}
        <div style={{ background: '#1a1a24', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icons.Sparkles />
                Diseñador de Formulario
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Crea formularios profesionales en minutos</p>
            </div>
            <button 
              onClick={() => setIsCreating(false)} 
              style={{ 
                color: 'rgba(255,255,255,0.5)', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '10px 20px', 
                borderRadius: '10px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancelar
            </button>
          </div>

          {/* Plantillas rápidas */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🚀 Plantillas Rápidas
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {templates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTemplate(template)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{template.icon}</span>
                  <span>{template.name}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    {template.fields.length} campos
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Información básica */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '16px', 
            padding: '24px', 
            marginBottom: '32px' 
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📋 Información General
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                  Título del formulario *
                </label>
                <input 
                  type="text" 
                  value={newForm.title} 
                  onChange={e => setNewForm({ ...newForm, title: e.target.value })} 
                  placeholder="Ej. Encuesta de Satisfacción 2025"
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                  Descripción
                </label>
                <textarea 
                  value={newForm.description} 
                  onChange={e => setNewForm({ ...newForm, description: e.target.value })} 
                  placeholder="Describe el propósito de este formulario..."
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    color: 'white', 
                    minHeight: '100px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                    Email de notificación *
                  </label>
                  <input 
                    type="email" 
                    value={newForm.notifyEmail} 
                    onChange={e => setNewForm({ ...newForm, notifyEmail: e.target.value })} 
                    placeholder="tu@email.com"
                    style={{ 
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      padding: '14px 16px', 
                      borderRadius: '10px', 
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                    Audiencia
                  </label>
                  <select 
                    value={newForm.targetAudience} 
                    onChange={e => setNewForm({ ...newForm, targetAudience: e.target.value as any })} 
                    style={{ 
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      padding: '14px 16px', 
                      borderRadius: '10px', 
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="public" style={{ background: '#1a1a24' }}>🌍 Público (cualquiera)</option>
                    <option value="internal" style={{ background: '#1a1a24' }}>🔒 Interno (solo empleados)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Campos del formulario */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ❓ Preguntas ({newForm.fields?.length || 0})
              </h3>
            </div>

            {/* Botones de tipo de campo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
              {fieldTypes.map((ft) => (
                <button 
                  key={ft.type} 
                  onClick={() => addField(ft.type as any)} 
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    background: 'rgba(139,92,246,0.1)', 
                    border: '1px solid rgba(139,92,246,0.2)', 
                    color: '#a78bfa', 
                    fontSize: '13px', 
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(139,92,246,0.15)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(139,92,246,0.1)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <span>{ft.icon}</span>
                  <span>{ft.label}</span>
                </button>
              ))}
            </div>

            {/* Lista de campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {newForm.fields && newForm.fields.length === 0 && (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.3)', 
                  border: '2px dashed rgba(255,255,255,0.1)', 
                  borderRadius: '12px' 
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
                  <p style={{ fontSize: '14px' }}>Agrega preguntas usando los botones de arriba</p>
                  <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>o usa una plantilla rápida</p>
                </div>
              )}

              {newForm.fields?.map((field, index) => (
                <div 
                  key={field.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '16px', 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '20px', 
                    borderRadius: '14px', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Grip para drag (visual) */}
                  <div style={{ color: 'rgba(255,255,255,0.2)', cursor: 'grab', marginTop: '12px' }}>
                    <Icons.GripVertical />
                  </div>

                  {/* Número */}
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: 'rgba(99,102,241,0.2)', 
                    color: '#818cf8', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '14px', 
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>

                  {/* Contenido del campo */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <input 
                      type="text" 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })} 
                      placeholder="Escribe tu pregunta aquí..."
                      style={{ 
                        width: '100%',
                        background: 'transparent', 
                        border: 'none', 
                        borderBottom: '2px solid rgba(255,255,255,0.1)', 
                        padding: '10px 0', 
                        color: 'white', 
                        outline: 'none',
                        fontSize: '15px',
                        fontWeight: 500
                      }} 
                    />

                    {field.type === 'select' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Opciones (separadas por coma)
                        </label>
                        <input 
                          type="text" 
                          value={field.options?.join(', ') || ''} 
                          onChange={e => updateField(field.id, { 
                            options: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                          })} 
                          placeholder="Opción 1, Opción 2, Opción 3"
                          style={{ 
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            padding: '10px 12px', 
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.8)', 
                            outline: 'none',
                            fontSize: '13px'
                          }} 
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={field.required} 
                          onChange={e => updateField(field.id, { required: e.target.checked })} 
                          style={{ cursor: 'pointer' }}
                        />
                        <span>Campo obligatorio</span>
                      </label>

                      <div style={{ flex: 1 }} />

                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                        {fieldTypes.find(ft => ft.type === field.type)?.label}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => moveField(field.id, 'up')}
                      disabled={index === 0}
                      style={{ 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', 
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ↑
                    </button>
                    <button 
                      onClick={() => moveField(field.id, 'down')}
                      disabled={index === (newForm.fields?.length || 0) - 1}
                      style={{ 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: index === (newForm.fields?.length || 0) - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', 
                        cursor: index === (newForm.fields?.length || 0) - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ↓
                    </button>
                    <button 
                      onClick={() => removeField(field.id)} 
                      style={{ 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        background: 'rgba(239,68,68,0.1)', 
                        border: '1px solid rgba(239,68,68,0.2)', 
                        color: '#f87171', 
                        cursor: 'pointer'
                      }}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón publicar */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setShowPreview(!showPreview)} 
              style={{ 
                flex: 1,
                padding: '16px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', 
                color: 'white', 
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Icons.Eye />
              {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
            </button>
            
            <button 
              onClick={handleCreateForm} 
              style={{ 
                flex: 2,
                padding: '16px', 
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                border: 'none', 
                borderRadius: '12px', 
                color: 'white', 
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Icons.Send />
              Publicar Formulario
            </button>
          </div>
        </div>

        {/* Vista Previa */}
        {showPreview && (
          <div style={{ 
            background: '#12121a', 
            borderRadius: '20px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            padding: '28px',
            overflowY: 'auto',
            position: 'sticky',
            top: 0,
            height: 'fit-content',
            maxHeight: 'calc(100vh - 180px)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              👁️ Vista Previa
            </h3>

            <div style={{ background: 'white', borderRadius: '16px', padding: '32px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a24', marginBottom: '12px' }}>
                {newForm.title || 'Tu Formulario'}
              </h1>
              <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px' }}>
                {newForm.description || 'Descripción del formulario'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {newForm.fields?.map((field, idx) => (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1a1a24', marginBottom: '8px' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    
                    {field.type === 'textarea' && (
                      <textarea 
                        placeholder={field.placeholder} 
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0', 
                          fontSize: '14px',
                          minHeight: '100px',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }} 
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <select style={{ 
                        width: '100%', 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0', 
                        fontSize: '14px' 
                      }}>
                        <option>Selecciona una opción</option>
                        {field.options?.map((opt, i) => (
                          <option key={i}>{opt}</option>
                        ))}
                      </select>
                    )}
                    
                    {!['textarea', 'select'].includes(field.type) && (
                      <input 
                        type={field.type} 
                        placeholder={field.placeholder}
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0', 
                          fontSize: '14px' 
                        }} 
                      />
                    )}
                  </div>
                ))}

                {newForm.fields && newForm.fields.length > 0 && (
                  <button 
                    disabled
                    style={{ 
                      width: '100%',
                      padding: '14px', 
                      background: '#6366f1', 
                      border: 'none', 
                      borderRadius: '10px', 
                      color: 'white', 
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: 'not-allowed',
                      opacity: 0.6
                    }}
                  >
                    Enviar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== VISTA PRINCIPAL (LISTA) ====================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(99,102,241,0.1) 100%)', 
        borderRadius: '20px', 
        border: '1px solid rgba(139,92,246,0.2)', 
        padding: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.FileText />
            Formularios Inteligentes
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            {forms.length} formulario{forms.length !== 1 ? 's' : ''} creado{forms.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {canCreate && (
          <button 
            onClick={() => setIsCreating(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '14px 24px', 
              borderRadius: '12px', 
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
              border: 'none', 
              color: 'white', 
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(99,102,241,0.3)'
            }}
          >
            <Icons.Plus />
            Crear Formulario
          </button>
        )}
      </div>

      {/* Grid de formularios */}
      {forms.length === 0 ? (
        <div style={{ 
          padding: '80px 40px', 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '20px',
          border: '2px dashed rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '24px', opacity: 0.3 }}>📋</div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
            No hay formularios aún
          </h3>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            {canCreate ? 'Crea tu primer formulario para empezar a recopilar información' : 'Los formularios creados por tu equipo aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {forms.map(form => {
            const responseCount = submissions[form.id] || 0

            return (
              <div 
                key={form.id} 
                style={{ 
                  background: '#1a1a24', 
                  borderRadius: '18px', 
                  border: `2px solid ${form.isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`, 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Badge de estado */}
                <div style={{ 
                  position: 'absolute', 
                  top: '16px', 
                  right: '16px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: form.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                  border: `1px solid ${form.isActive ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}`,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: form.isActive ? '#4ade80' : '#94a3b8',
                  textTransform: 'uppercase'
                }}>
                  {form.isActive ? '✓ Activo' : '○ Inactivo'}
                </div>

                {/* Título y descripción */}
                <div style={{ paddingRight: '80px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
                    {form.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {form.description || 'Sin descripción'}
                  </p>
                </div>

                {/* Estadísticas */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Respuestas</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{responseCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Preguntas</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>{form.fields.length}</div>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button 
                    onClick={() => copyLink(form.id)} 
                    style={{ 
                      flex: 1, 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      background: 'rgba(255,255,255,0.05)', 
                      color: 'white', 
                      fontSize: '13px', 
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icons.Copy />
                    Copiar Link
                  </button>
                  
                  <a 
                    href={`/forms/${form.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px', 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      border: 'none', 
                      background: 'rgba(99,102,241,0.2)', 
                      color: '#818cf8', 
                      fontSize: '13px', 
                      fontWeight: 500,
                      cursor: 'pointer', 
                      textDecoration: 'none' 
                    }}
                  >
                    <Icons.ExternalLink />
                    Abrir
                  </a>

                  {responseCount > 0 && (
                    <button 
                      onClick={() => viewStats(form)} 
                      style={{ 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        border: 'none', 
                        background: 'rgba(139,92,246,0.2)', 
                        color: '#a78bfa', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Ver estadísticas"
                    >
                      <Icons.BarChart />
                    </button>
                  )}
                </div>

                {/* Acciones de admin */}
                {canCreate && (
                  <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.08)', 
                    paddingTop: '14px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <button 
                      onClick={() => toggleStatus(form)} 
                      style={{ 
                        fontSize: '12px', 
                        color: form.isActive ? '#94a3b8' : '#4ade80', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        textDecoration: 'underline',
                        fontWeight: 500
                      }}
                    >
                      {form.isActive ? 'Desactivar' : 'Activar'}
                    </button>

                    <button 
                      onClick={() => deleteForm(form.id)} 
                      style={{ 
                        fontSize: '12px', 
                        color: '#f87171', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Icons.Trash />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de estadísticas (placeholder) */}
      {selectedForm && (
        <div 
          onClick={() => setSelectedForm(null)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(0,0,0,0.8)', 
            backdropFilter: 'blur(4px)' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              width: '90%', 
              maxWidth: '800px', 
              background: '#12121a', 
              borderRadius: '20px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '32px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
                📊 Estadísticas: {selectedForm.title}
              </h2>
              <button 
                onClick={() => setSelectedForm(null)}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <Icons.X />
              </button>
            </div>

            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>📈</div>
              <p>Las estadísticas detalladas estarán disponibles próximamente</p>
              <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
                {submissions[selectedForm.id] || 0} respuestas totales
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}