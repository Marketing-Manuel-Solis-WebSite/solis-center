'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '../../../lib/firebase'
import { FormTemplate, FormSubmission } from '../../../types'
import { sendFormResponseNotification } from '../../../lib/email'

export default function PublicFormPage({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<FormTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const formDoc = await getDoc(doc(db, 'forms', params.id))
        if (formDoc.exists()) {
          setForm({ id: formDoc.id, ...formDoc.data() } as FormTemplate)
        }
      } catch (e) {
        console.error('Error loading form:', e)
      } finally {
        setLoading(false)
      }
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    loadData()
    return () => unsubAuth()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    setSubmitting(true)
    try {
      // Guardar respuesta
      const submission: Omit<FormSubmission, 'id'> = {
        formId: form.id,
        formTitle: form.title,
        data: answers,
        submittedBy: currentUser ? { id: currentUser.uid, name: currentUser.displayName || 'Usuario Registrado' } : 'anonymous',
        submittedAt: serverTimestamp()
      }

      await addDoc(collection(db, 'form_submissions'), submission)

      // Enviar email
      await sendFormResponseNotification({
        to_email: form.notifyEmail,
        form_title: form.title,
        submission_data: answers,
        respondent_name: currentUser ? currentUser.displayName || currentUser.email : 'Anónimo'
      })

      setSubmitted(true)
    } catch (e) {
      console.error('Error submitting:', e)
      alert('Error al enviar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (label: string, value: any) => {
    setAnswers(prev => ({ ...prev, [label]: value }))
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Cargando formulario...</div>

  if (!form || !form.isActive) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px' }}>No disponible</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>Este formulario no existe o ha sido desactivado.</p>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '500px', background: '#12121a', borderRadius: '24px', border: '1px solid rgba(99,102,241,0.3)', padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>✓</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>¡Enviado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '30px' }}>Tus respuestas para "{form.title}" han sido registradas.</p>
        <button onClick={() => window.location.reload()} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer' }}>Enviar otra respuesta</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', justifyContent: 'center', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚡</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>{form.title}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: '1.6' }}>{form.description}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#12121a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {form.fields.map((field) => (
              <div key={field.id}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea 
                    required={field.required}
                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                    style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', color: 'white', fontSize: '15px', outline: 'none', resize: 'vertical' }}
                    placeholder="Escribe tu respuesta aquí..."
                  />
                ) : field.type === 'select' ? (
                  <select
                    required={field.required}
                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                    style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', color: 'white', fontSize: '15px', outline: 'none' }}
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input 
                    type={field.type}
                    required={field.required}
                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', color: 'white', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder={field.placeholder || "Tu respuesta"}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px' }}>
            <button 
              type="submit" 
              disabled={submitting}
              style={{ width: '100%', background: submitting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', border: 'none', padding: '16px', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer', transition: 'all 0.2s', transform: submitting ? 'scale(0.98)' : 'scale(1)' }}
            >
              {submitting ? 'Enviando...' : 'Enviar Respuesta'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '16px' }}>
              {currentUser ? `Respondiendo como ${currentUser.email}` : 'Respondiendo de forma anónima'} • Solis Center
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}