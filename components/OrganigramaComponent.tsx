'use client'

import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface TeamMember {
  id: string
  name: string
  avatar: string
  department: string
  role: string
  email: string
}

const departmentLabels: Record<string, string> = {
  marketing: 'Marketing',
  openers: 'Openers',
  closers: 'Closers',
  admin: 'Administración',
  finanzas: 'Finanzas',
  general: 'General',
}

const departmentColors: Record<string, string> = {
  marketing: '#8b5cf6',
  openers: '#3b82f6',
  closers: '#22c55e',
  admin: '#f59e0b',
  finanzas: '#ef4444',
  general: '#64748b',
}

const roleLabels: Record<string, string> = {
  director: 'Director',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  lider: 'Líder',
  operativo: 'Operativo',
}

const roleOrder: Record<string, number> = {
  director: 1,
  gerente: 2,
  supervisor: 3,
  lider: 4,
  operativo: 5,
}

const Icons = {
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  GitBranch: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
}

export default function OrganigramaComponent() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'departments' | 'list'>('hierarchy')
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Sin nombre',
        avatar: doc.data().avatar || 'U',
        department: doc.data().department || 'general',
        role: doc.data().role || 'operativo',
        email: doc.data().email || '',
      })) as TeamMember[]
      // Ordenar por rol
      members.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99))
      setTeamMembers(members)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Agrupar por departamento
  const byDepartment = teamMembers.reduce((acc, m) => {
    if (!acc[m.department]) acc[m.department] = []
    acc[m.department].push(m)
    return acc
  }, {} as Record<string, TeamMember[]>)

  // Agrupar por nivel jerárquico
  const directors = teamMembers.filter(m => m.role === 'director' || m.role === 'gerente')
  const supervisors = teamMembers.filter(m => m.role === 'supervisor' || m.role === 'lider')
  const operatives = teamMembers.filter(m => m.role === 'operativo')

  // Stats
  const stats = {
    total: teamMembers.length,
    departments: Object.keys(byDepartment).length,
    leaders: directors.length + supervisors.length,
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
        Cargando organigrama...
      </div>
    )
  }

  return (
    <div>
      {/* Header Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Miembros', value: stats.total, color: '#6366f1' },
          { label: 'Departamentos', value: stats.departments, color: '#22c55e' },
          { label: 'Líderes', value: stats.leaders, color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '20px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{stat.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Estructura Organizacional</h3>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
          <button onClick={() => setViewMode('hierarchy')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'hierarchy' ? 'rgba(99,102,241,0.3)' : 'transparent', color: viewMode === 'hierarchy' ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Icons.GitBranch /> Jerarquía
          </button>
          <button onClick={() => setViewMode('departments')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'departments' ? 'rgba(99,102,241,0.3)' : 'transparent', color: viewMode === 'departments' ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Icons.Grid /> Departamentos
          </button>
          <button onClick={() => setViewMode('list')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'list' ? 'rgba(99,102,241,0.3)' : 'transparent', color: viewMode === 'list' ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Icons.List /> Lista
          </button>
        </div>
      </div>

      {/* Hierarchy View */}
      {viewMode === 'hierarchy' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          {/* Nivel 1: Directores/Gerentes */}
          {directors.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Dirección</p>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {directors.map(member => (
                  <div key={member.id} style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center', minWidth: '160px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>{member.avatar}</div>
                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{member.name}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{roleLabels[member.role]}</p>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', background: `${departmentColors[member.department]}25`, color: departmentColors[member.department] }}>{departmentLabels[member.department]}</span>
                  </div>
                ))}
              </div>
              {/* Línea conectora */}
              {(supervisors.length > 0 || operatives.length > 0) && (
                <div style={{ width: '2px', height: '32px', background: 'linear-gradient(to bottom, rgba(99,102,241,0.5), rgba(99,102,241,0.1))', margin: '0 auto' }} />
              )}
            </div>
          )}

          {/* Nivel 2: Supervisores/Líderes */}
          {supervisors.length > 0 && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Supervisores y Líderes</p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {supervisors.map(member => (
                  <div key={member.id} style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', minWidth: '140px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${departmentColors[member.department]}, ${departmentColors[member.department]}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, margin: '0 auto 10px' }}>{member.avatar}</div>
                    <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{member.name}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{roleLabels[member.role]}</p>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '9px', background: `${departmentColors[member.department]}20`, color: departmentColors[member.department] }}>{departmentLabels[member.department]}</span>
                  </div>
                ))}
              </div>
              {/* Línea conectora */}
              {operatives.length > 0 && (
                <div style={{ width: '2px', height: '32px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', margin: '0 auto' }} />
              )}
            </div>
          )}

          {/* Nivel 3: Operativos */}
          {operatives.length > 0 && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Equipo Operativo</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
                {operatives.map(member => (
                  <div key={member.id} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${departmentColors[member.department]}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, margin: '0 auto 8px', color: departmentColors[member.department] }}>{member.avatar}</div>
                    <p style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{member.name}</p>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '20px', fontSize: '9px', background: `${departmentColors[member.department]}15`, color: departmentColors[member.department] }}>{departmentLabels[member.department]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Departments View */}
      {viewMode === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {Object.entries(byDepartment).map(([dept, members]) => (
            <div 
              key={dept} 
              style={{ 
                borderRadius: '16px', 
                background: selectedDepartment === dept ? `${departmentColors[dept]}10` : 'rgba(255,255,255,0.02)', 
                border: `1px solid ${selectedDepartment === dept ? departmentColors[dept] + '50' : 'rgba(255,255,255,0.06)'}`,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setSelectedDepartment(selectedDepartment === dept ? null : dept)}
            >
              {/* Department Header */}
              <div style={{ padding: '16px 20px', background: `${departmentColors[dept]}15`, borderBottom: `1px solid ${departmentColors[dept]}30`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: departmentColors[dept] }} />
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: departmentColors[dept], flex: 1 }}>{departmentLabels[dept]}</h4>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{members.length}</span>
              </div>
              {/* Members */}
              <div style={{ padding: '12px' }}>
                {members.map((member, idx) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${departmentColors[dept]}, ${departmentColors[dept]}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>{member.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{member.name}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{roleLabels[member.role]}</p>
                    </div>
                    {(member.role === 'director' || member.role === 'gerente' || member.role === 'supervisor' || member.role === 'lider') && (
                      <span style={{ fontSize: '14px' }}>{member.role === 'director' || member.role === 'gerente' ? '👑' : '⭐'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            <div>Nombre</div>
            <div>Rol</div>
            <div>Departamento</div>
            <div>Email</div>
          </div>
          {/* Table Body */}
          {teamMembers.map((member, idx) => (
            <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${departmentColors[member.department]}, ${departmentColors[member.department]}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>{member.avatar}</div>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{member.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{roleLabels[member.role]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: `${departmentColors[member.department]}20`, color: departmentColors[member.department] }}>{departmentLabels[member.department]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{member.email}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: '32px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Colores por Departamento</p>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {Object.entries(departmentLabels).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: departmentColors[key] }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}