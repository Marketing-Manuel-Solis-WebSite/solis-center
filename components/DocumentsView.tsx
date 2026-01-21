'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { Document, Department } from '../types'

// Iconos para la UI
const Icons = {
  File: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
}

// Utilidad para formatear tamaño de archivo
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const departmentLabels: Record<string, string> = {
  marketing: 'Marketing',
  openers: 'Openers',
  closers: 'Closers',
  admin: 'Administración',
  finanzas: 'Finanzas',
  general: 'General',
}

export default function DocumentsView() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'department' | 'mine'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Identificador de la App para path de Firestore
  const appId = typeof window !== 'undefined' && (window as any).__app_id ? (window as any).__app_id : 'solis-center-v1'

  // --- Cargar Documentos ---
  useEffect(() => {
    if (!user) return

    // Usamos el path estricto para datos públicos compartidos
    const docsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'documents')
    
    const unsubscribe = onSnapshot(docsCollection, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Document[]
      
      // Ordenar por fecha (más reciente primero) en memoria
      fetchedDocs.sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0)
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0)
        return dateB - dateA
      })

      setDocuments(fetchedDocs)
      setLoading(false)
    }, (error) => {
      console.error("Error cargando documentos:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, appId])

  // --- Subir Documento ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      // 1. Subir a Firebase Storage
      // Organización: documents/departamento/userId/timestamp_nombreArchivo
      const storagePath = `documents/${user.department}/${user.id}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // 2. Guardar Metadatos en Firestore
      const newDoc: Omit<Document, 'id'> = {
        title: file.name,
        url: downloadURL,
        storagePath: storagePath,
        type: file.type || 'unknown',
        size: file.size,
        department: user.department as Department,
        createdBy: {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        },
        createdAt: serverTimestamp() // Importante para la IA: saber cuándo se subió
      }

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'documents'), newDoc)
      
      // Limpiar input
      if (fileInputRef.current) fileInputRef.current.value = ''
      
    } catch (error) {
      console.error("Error al subir archivo:", error)
      alert("Hubo un error al subir el documento.")
    } finally {
      setUploading(false)
    }
  }

  // --- Eliminar Documento ---
  const handleDelete = async (docData: Document) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.')) return

    try {
      // 1. Eliminar de Storage (si existe path)
      if (docData.storagePath) {
        const fileRef = ref(storage, docData.storagePath)
        await deleteObject(fileRef).catch(err => console.warn("Archivo en storage no encontrado o ya borrado", err))
      }

      // 2. Eliminar de Firestore
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'documents', docData.id))

    } catch (error) {
      console.error("Error eliminando documento:", error)
      alert("Error al eliminar el documento")
    }
  }

  // --- Filtrado ---
  const filteredDocuments = documents.filter(doc => {
    // Filtro de texto
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    // Filtros de modo
    if (filterMode === 'mine') return doc.createdBy.id === user?.id
    if (filterMode === 'department') return doc.department === user?.department
    return true // 'all'
  })

  // --- Render ---
  if (!user) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header y Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)', 
          borderRadius: '16px', 
          border: '1px solid rgba(99,102,241,0.2)', 
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>Repositorio Central</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
              Los documentos subidos aquí son analizados por Nora para detectar patrones operativos.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: uploading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                color: 'white', padding: '10px 20px', borderRadius: '10px', 
                fontSize: '13px', fontWeight: 600, cursor: uploading ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                transition: 'all 0.2s'
              }}
            >
              {uploading ? 'Subiendo...' : <><Icons.Upload /> Subir Documento</>}
            </label>
          </div>
        </div>

        {/* Barra de Herramientas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Filtros */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
            <button 
              onClick={() => setFilterMode('all')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: filterMode === 'all' ? 'rgba(99,102,241,0.3)' : 'transparent', color: filterMode === 'all' ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterMode('department')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: filterMode === 'department' ? 'rgba(99,102,241,0.3)' : 'transparent', color: filterMode === 'department' ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
            >
              Mi Departamento
            </button>
            <button 
              onClick={() => setFilterMode('mine')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: filterMode === 'mine' ? 'rgba(99,102,241,0.3)' : 'transparent', color: filterMode === 'mine' ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
            >
              Mis Archivos
            </button>
          </div>

          {/* Búsqueda */}
          <div style={{ position: 'relative', minWidth: '250px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
              <Icons.Search />
            </div>
            <input 
              type="text" 
              placeholder="Buscar archivo o usuario..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 10px 10px 36px', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,26,0.8)', overflow: 'hidden' }}>
        {/* Header Tabla */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1.5fr 1fr', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
          <div>Nombre del Archivo</div>
          <div>Subido Por</div>
          <div>Tamaño</div>
          <div>Departamento / Fecha</div>
          <div style={{ textAlign: 'right' }}>Acciones</div>
        </div>

        {/* Body Tabla */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Cargando documentos...</div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ marginBottom: '12px', opacity: 0.5 }}><Icons.File /></div>
            <p>No se encontraron documentos.</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1.5fr 1fr', gap: '16px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', transition: 'background 0.2s' }} className="hover:bg-white/5">
              
              {/* Nombre y Tipo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '8px', 
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' 
                }}>
                  <Icons.File />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.title}>{doc.title}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{doc.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                </div>
              </div>

              {/* Usuario */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #64748b, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>
                  {doc.createdBy.avatar || 'U'}
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{doc.createdBy.name}</span>
              </div>

              {/* Tamaño */}
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                {formatBytes(doc.size)}
              </div>

              {/* Dept y Fecha */}
              <div>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', marginBottom: '4px', textTransform: 'capitalize' }}>
                  {departmentLabels[doc.department] || doc.department}
                </span>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  {doc.createdAt?.seconds 
                    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                    : 'Reciente'}
                </p>
              </div>

              {/* Acciones */}
              <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    padding: '8px', borderRadius: '8px', 
                    background: 'rgba(34,197,94,0.1)', color: '#4ade80', 
                    border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Descargar"
                >
                  <Icons.Download />
                </a>
                
                {/* Solo el creador o admins pueden borrar */}
                {(user.role === 'director' || user.role === 'gerente' || user.id === doc.createdBy.id) && (
                  <button 
                    onClick={() => handleDelete(doc)}
                    style={{ 
                      padding: '8px', borderRadius: '8px', 
                      background: 'rgba(239,68,68,0.1)', color: '#f87171', 
                      border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Eliminar"
                  >
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