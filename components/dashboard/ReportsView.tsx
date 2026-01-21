'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../AuthProvider'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Report } from '../../types'
import CreateReportModal from './CreateReportModal'

const departmentLabels: Record<string, string> = { marketing: 'Marketing', openers: 'Openers', closers: 'Closers', admin: 'Administración', finanzas: 'Finanzas', general: 'General' }

const Icons = {
  BrainCircuit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.97-4.929"/><path d="M17.97 13.071A4 4 0 0 1 16 18"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
}

export default function ReportsView() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Report[])
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* NORA AI INSIGHTS */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', padding: '24px' }}>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', flexShrink: 0 }}>
            <Icons.BrainCircuit />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Insights de Nora <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(34,197,94,0.3)' }}>IA ACTIVA</span>
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
              {reports.length > 0 
                ? "He analizado los últimos reportes. Se observa una consistencia en la entrada de datos. Estoy procesando las métricas para detectar correlaciones entre departamentos."
                : "Aún no hay suficientes datos para generar insights profundos. Comienza creando tu primer reporte operativo."}
            </p>
          </div>
        </div>
      </div>

      {/* LISTA REPORTES */}
      <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(18,18,26,0.8)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 600, color: 'white', fontSize: '16px' }}>Historial Operativo</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'white', cursor: 'pointer' }}><Icons.Filter /> Filtrar</button>
            <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', border: 'none', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}><Icons.Plus /> Nuevo Reporte</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 1.5fr 1fr', padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            <div>Reporte / Análisis IA</div>
            <div>Creado Por</div>
            <div>Depto / Fecha</div>
            <div>Métricas</div>
            <div style={{ textAlign: 'right' }}>Acciones</div>
          </div>

          {loading && <div style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Cargando datos...</div>}
          {!loading && reports.length === 0 && (
            <div style={{ padding: '64px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.5 }}><Icons.FileText /></div>
              <p>No hay reportes registrados.</p>
            </div>
          )}

          {reports.map((report) => (
            <div key={report.id} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 1.5fr 1fr', gap: '16px', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'start', transition: 'background 0.2s' }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{report.title}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: report.status === 'analyzed' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.1)', color: report.status === 'analyzed' ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}>
                    {report.status === 'analyzed' ? 'IA' : 'Pendiente'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', borderLeft: '2px solid rgba(99,102,241,0.3)' }}>
                  {report.aiAnalysis || "Esperando procesamiento de Nora..."}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #64748b, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white' }}>
                  {report.createdBy?.avatar || 'U'}
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'white' }}>{report.createdBy?.name}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Hace instantes</p>
                </div>
              </div>

              <div>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px', textTransform: 'capitalize' }}>
                  {departmentLabels[report.department] || report.department}
                </span>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{report.type} • {report.dateRange}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {report.metrics?.slice(0, 3).map((metric, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{metric.label}:</span>
                    <span style={{ color: 'white', fontWeight: 500 }}>{metric.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'right' }}>
                <button onClick={() => deleteDoc(doc(db, 'reports', report.id))} style={{ padding: '6px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Eliminar"><Icons.Trash /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CreateReportModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} user={user} />
    </div>
  )
}