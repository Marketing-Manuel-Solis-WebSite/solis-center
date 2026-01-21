'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../AuthProvider'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { FormTemplate, FormField } from '../../types'

const Icons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  ExternalLink: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
}

export default function FormsView() {
  const { user } = useAuth()
  const [forms, setForms] = useState<FormTemplate[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  const [newForm, setNewForm] = useState<Partial<FormTemplate>>({
    title: '',
    description: '',
    notifyEmail: user?.email || '',
    targetAudience: 'public',
    fields: []
  })

  const canCreate = user?.role === 'director' || user?.role === 'gerente'

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'forms'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snapshot) => {
      setForms(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FormTemplate)))
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: `Pregunta de ${type}`,
      required: false,
      options: type === 'select' ? ['Opción 1', 'Opción 2'] : undefined
    }
    setNewForm(prev => ({ ...prev, fields: [...(prev.fields || []), newField] }))
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    setNewForm(prev => ({
      ...prev,
      fields: prev.fields?.map(f => f.id === id ? { ...f, ...updates } : f)
    }))
  }

  const removeField = (id: string) => {
    setNewForm(prev => ({ ...prev, fields: prev.fields?.filter(f => f.id !== id) }))
  }

  const handleCreateForm = async () => {
    if (!newForm.title || !newForm.notifyEmail || (newForm.fields?.length || 0) === 0) {
      alert('Completa el título, email y agrega campos.')
      return
    }

    try {
      await addDoc(collection(db, 'forms'), {
        ...newForm,
        isActive: true,
        createdBy: { id: user?.id, name: user?.name, avatar: user?.avatar },
        createdAt: serverTimestamp()
      })
      setIsCreating(false)
      setNewForm({ title: '', description: '', notifyEmail: user?.email || '', targetAudience: 'public', fields: [] })
    } catch (e) {
      console.error(e)
      alert('Error al crear formulario')
    }
  }

  const copyLink = (formId: string) => {
    const url = `${window.location.origin}/forms/${formId}`
    navigator.clipboard.writeText(url)
    alert('Link copiado: ' + url)
  }

  const deleteForm = async (id: string) => {
    if (confirm('¿Eliminar este formulario permanentemente?')) {
      await deleteDoc(doc(db, 'forms', id))
    }
  }

  const toggleStatus = async (form: FormTemplate) => {
    await updateDoc(doc(db, 'forms', form.id), { isActive: !form.isActive })
  }

  if (isCreating) {
    return (
      <div style={{ background: '#1a1a24', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>Diseñador de Formulario</h2>
          <button onClick={() => setIsCreating(false)} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Título</label>
            <input type="text" value={newForm.title} onChange={e => setNewForm({ ...newForm, title: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: 'white', outline: 'none' }} placeholder="Ej. Encuesta de Clima" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Notificar a (Email)</label>
            <input type="email" value={newForm.notifyEmail} onChange={e => setNewForm({ ...newForm, notifyEmail: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: 'white', outline: 'none' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Descripción</label>
            <textarea value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: 'white', outline: 'none', minHeight: '80px' }} placeholder="Instrucciones..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Audiencia</label>
            <select value={newForm.targetAudience} onChange={e => setNewForm({ ...newForm, targetAudience: e.target.value as any })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: 'white', outline: 'none' }}>
              <option value="public" style={{ background: '#1a1a24' }}>Público (Externo e Interno)</option>
              <option value="internal" style={{ background: '#1a1a24' }}>Solo Interno</option>
              <option value="marketing" style={{ background: '#1a1a24' }}>Solo Marketing</option>
              <option value="openers" style={{ background: '#1a1a24' }}>Solo Openers</option>
              <option value="closers" style={{ background: '#1a1a24' }}>Solo Closers</option>
            </select>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'white', marginBottom: '16px' }}>Campos</h3>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {['text', 'textarea', 'number', 'date', 'select', 'email'].map((type) => (
              <button key={type} onClick={() => addField(type as any)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>+ {type}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newForm.fields?.map((field, index) => (
              <div key={field.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>{index + 1}.</span>
                <div style={{ flex: 1, display: 'grid', gap: '12px' }}>
                  <input type="text" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} placeholder="Pregunta" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 0', color: 'white', outline: 'none', fontSize: '14px' }} />
                  {field.type === 'select' && (
                    <input type="text" value={field.options?.join(', ')} onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })} placeholder="Opciones: Opción 1, Opción 2" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 0', color: 'rgba(255,255,255,0.7)', outline: 'none', fontSize: '12px' }} />
                  )}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} style={{ accentColor: '#6366f1' }} />
                      Obligatorio
                    </label>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{field.type}</span>
                  </div>
                </div>
                <button onClick={() => removeField(field.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}><Icons.Trash /></button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleCreateForm} style={{ width: '100%', padding: '14px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '16px' }}>Publicar Formulario</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>Gestión de Formularios</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Crea encuestas y formularios para compartir.</p>
        </div>
        {canCreate && (
          <button onClick={() => setIsCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            <Icons.Plus /> Crear Formulario
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {forms.map(form => (
          <div key={form.id} style={{ background: '#1a1a24', borderRadius: '16px', border: `1px solid ${form.isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
            {form.isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{form.title}</h3>
              {canCreate && (
                <button onClick={() => deleteForm(form.id)} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <Icons.Trash />
                </button>
              )}
            </div>
            
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', flex: 1 }}>{form.description || 'Sin descripción'}</p>
            
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
              <span>{form.targetAudience === 'public' ? '🌍 Público' : '🔒 Interno'}</span>
              <span>•</span>
              <span>📝 {form.fields.length} campos</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => copyLink(form.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                <Icons.Copy /> Copiar Link
              </button>
              <a href={`/forms/${form.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: '12px', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>
                <Icons.ExternalLink /> Ver Form
              </a>
            </div>

            {canCreate && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: form.isActive ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                  {form.isActive ? '● Activo' : '○ Inactivo'}
                </span>
                <button onClick={() => toggleStatus(form)} style={{ fontSize: '12px', color: 'white', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  {form.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}