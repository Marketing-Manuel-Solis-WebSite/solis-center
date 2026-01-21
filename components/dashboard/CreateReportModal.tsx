'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Report, Department } from '../../types'

const Icons = {
  FilePlus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
}

export default function CreateReportModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: any }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'diario' as Report['type'],
    dateRange: new Date().toLocaleDateString('es-MX'),
    department: user.department as Department
  })
  
  const [metrics, setMetrics] = useState<{ id: string; label: string; value: string; trend?: string }[]>([
    { id: '1', label: '', value: '' }
  ])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '', type: 'diario',
        dateRange: new Date().toLocaleDateString('es-MX'),
        department: user.department as Department
      })
      setMetrics([{ id: Math.random().toString(), label: '', value: '' }])
    }
  }, [isOpen, user.department])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const validMetrics = metrics.filter(m => m.label.trim() !== '' && m.value.trim() !== '')

    if (validMetrics.length === 0) {
      alert('Agrega al menos una métrica.')
      setLoading(false)
      return
    }

    try {
      const newReport: Omit<Report, 'id'> = {
        title: formData.title,
        type: formData.type,
        department: formData.department,
        createdBy: { id: user.id, name: user.name, avatar: user.avatar },
        createdAt: Date.now(),
        dateRange: formData.dateRange,
        metrics: validMetrics.map(({ label, value, trend }) => ({ label, value, trendValue: trend })),
        status: 'pending',
        aiAnalysis: ''
      }

      await addDoc(collection(db, 'reports'), newReport)
      onClose()
    } catch (error) {
      console.error("Error creating report:", error)
      alert("Error al guardar.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '700px', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.FilePlus /> Nuevo Reporte Operativo
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Icons.X /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Título</label>
              <input type="text" required placeholder="Ej. Cierre Semanal" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Tipo</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="diario">Diario</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option><option value="incidente">Incidente</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Fecha</label>
              <input type="text" value={formData.dateRange} onChange={e => setFormData({...formData, dateRange: e.target.value})} style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Métricas</h3>
              <button type="button" onClick={() => setMetrics([...metrics, { id: Math.random().toString(), label: '', value: '' }])} style={{ fontSize: '12px', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer' }}>+ Agregar Fila</button>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '1px', background: 'rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {['CONCEPTO', 'VALOR', 'TENDENCIA', ''].map((h, i) => (
                  <div key={i} style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', background: '#12121a' }}>{h}</div>
                ))}
              </div>
              {metrics.map((m) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '1px', background: 'rgba(255,255,255,0.05)' }}>
                  <input type="text" placeholder="Ej. Ventas" value={m.label} onChange={e => setMetrics(metrics.map(x => x.id === m.id ? { ...x, label: e.target.value } : x))} style={{ background: '#1a1a24', border: 'none', padding: '10px', fontSize: '14px', color: 'white', outline: 'none' }} />
                  <input type="text" placeholder="Ej. 100" value={m.value} onChange={e => setMetrics(metrics.map(x => x.id === m.id ? { ...x, value: e.target.value } : x))} style={{ background: '#1a1a24', border: 'none', padding: '10px', fontSize: '14px', color: 'white', outline: 'none' }} />
                  <input type="text" placeholder="+5%" value={m.trend || ''} onChange={e => setMetrics(metrics.map(x => x.id === m.id ? { ...x, trend: e.target.value } : x))} style={{ background: '#1a1a24', border: 'none', padding: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                  <button type="button" onClick={() => metrics.length > 1 && setMetrics(metrics.filter(x => x.id !== m.id))} style={{ background: '#1a1a24', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Trash /></button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              {loading ? 'Guardando...' : <><Icons.Save /> Guardar Reporte</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}