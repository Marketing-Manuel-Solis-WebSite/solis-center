'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { Document, Department } from '../types'

// Iconos
const Icons = {
  File: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Sparkles: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const departmentLabels: Record<string, string> = {
  marketing: 'Marketing', openers: 'Openers', closers: 'Closers', admin: 'Administración', finanzas: 'Finanzas', general: 'General',
}

export default function DocumentsView() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'department' | 'mine'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const appId = typeof window !== 'undefined' && (window as any).__app_id ? (window as any).__app_id : 'solis-center-v1'

  useEffect(() => {
    if (!user) return
    const docsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'documents')
    
    const unsubscribe = onSnapshot(docsCollection, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Document[]
      
      fetchedDocs.sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0)
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0)
        return dateB - dateA
      })

      setDocuments(fetchedDocs)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user, appId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      const safeName = user.name.replace(/[^a-zA-Z0-9]/g, '_')
      const storagePath = `documents/${user.department}/${safeName}-${user.id}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      const newDoc: Omit<Document, 'id'> = {
        title: file.name,
        url: downloadURL,
        storagePath: storagePath,
        type: file.type || 'unknown',
        size: file.size,
        department: user.department as Department,
        createdBy: { id: user.id, name: user.name, avatar: user.avatar },
        createdAt: serverTimestamp(),
        aiStatus: 'pending', 
        aiSummary: '',
        aiTags: []
      }

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'documents'), newDoc)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
    } catch (error) {
      console.error("Error upload:", error)
      alert("Error al subir el documento.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docData: Document) => {
    if (!confirm('¿Eliminar documento de forma permanente?')) return
    try {
      if (docData.storagePath) {
        const fileRef = ref(storage, docData.storagePath)
        await deleteObject(fileRef).catch(e => console.warn("Storage file missing", e))
      }
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'documents', docData.id))
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (filterMode === 'mine') return doc.createdBy.id === user?.id
    if (filterMode === 'department') return doc.department === user?.department
    return true
  })

  if (!user) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)', 
          borderRadius: '16px', 
          border: '1px solid rgba(99,102,241,0.2)', 
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.File /> Repositorio Inteligente
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
              Documentos organizados por departamento. Nora (IA) analizará automáticamente el contenido nuevo.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload"/>
            <label htmlFor="file-upload" style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: uploading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
              color: 'white', padding: '10px 20px', borderRadius: '10px', 
              fontSize: '13px', fontWeight: 600, cursor: uploading ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              border: 'none'
            }}>
              {uploading ? 'Subiendo...' : <><Icons.Upload /> Subir Archivo</>}
            </label>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
            {['all', 'department', 'mine'].map((mode) => (
              <button 
                key={mode}
                onClick={() => setFilterMode(mode as any)}
                style={{ 
                  padding: '8px 14px', borderRadius: '8px', border: 'none', 
                  background: filterMode === mode ? 'rgba(99,102,241,0.3)' : 'transparent', 
                  color: filterMode === mode ? 'white' : 'rgba(255,255,255,0.5)', 
                  cursor: 'pointer', fontSize: '12px', fontWeight: 500 
                }}
              >
                {mode === 'all' ? 'Todos' : mode === 'department' ? 'Mi Depto' : 'Mis Archivos'}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}><Icons.Search /></div>
            <input 
              type="text" 
              placeholder="Buscar archivo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '10px 10px 10px 36px', borderRadius: '10px', 
                color: 'white', fontSize: '13px', outline: 'none' 
              }}
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(18,18,26,0.8)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1.5fr 1fr', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
          <div>Nombre</div>
          <div>Creador</div>
          <div>IA Status</div>
          <div>Detalles</div>
          <div style={{ textAlign: 'right' }}>Acciones</div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Cargando repositorio...</div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.5 }}><Icons.File /></div>
            <p>No hay documentos aquí aún.</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1.5fr 1fr', gap: '16px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                  <Icons.File />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.title}>{doc.title}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{doc.type.split('/')[1] || 'FILE'} • {formatBytes(doc.size)}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #64748b, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>
                  {doc.createdBy.avatar || 'U'}
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.createdBy.name}</span>
              </div>

              <div>
                {doc.aiStatus === 'indexed' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontSize: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <Icons.Sparkles /> Indexado
                  </span>
                ) : doc.aiStatus === 'processing' ? (
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>Procesando...</span>
                ) : (
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>Pendiente</span>
                )}
              </div>

              <div>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px', textTransform: 'capitalize' }}>
                  {departmentLabels[doc.department] || doc.department}
                </span>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                  {doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'none', cursor: 'pointer' }} title="Descargar">
                  <Icons.Download />
                </a>
                {(user.role === 'director' || user.role === 'gerente' || user.id === doc.createdBy.id) && (
                  <button onClick={() => handleDelete(doc)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', cursor: 'pointer' }} title="Eliminar">
                    <Icons.Trash />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}