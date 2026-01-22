'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../AuthProvider'
import { socialService } from '../../lib/social-service'
import { SocialMessage, SocialPlatform } from '../../types'

// ==================== ICONOS ====================
const Icons = {
  WhatsApp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  Facebook: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  Instagram: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  TikTok: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.55-1.12v8.42c0 .28.01.57-.01.85-.04 1.25-.49 2.47-1.25 3.47a7.22 7.22 0 01-4.72 2.75 7.15 7.15 0 01-5.59-1.57 7.2 7.2 0 01-2.58-4.99c-.1-1.37.2-2.75.87-3.95a7.2 7.2 0 013.92-3.23c1.36-.45 2.83-.41 4.17.11.12.05.23.11.35.17v4.18c-.37-.24-.77-.41-1.19-.51-.83-.2-1.7-.09-2.45.32-.76.41-1.32 1.15-1.54 1.99-.23.86-.11 1.77.34 2.55.44.78 1.2 1.36 2.07 1.58.87.22 1.79.1 2.58-.35.79-.45 1.35-1.2 1.57-2.07.07-.27.1-.55.1-.83V4.62c1.76.5 3.32 1.69 4.21 3.29V.02h-4.43z"/></svg>,
  Messenger: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#a855f7"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.245c1.09.303 2.246.464 3.443.464 6.627 0 12-4.975 12-11.108C24 4.974 18.627 0 12 0zm1.191 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  CheckDouble: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L7 17l-5-5"/><path d="M22 6L11 17l-1.5-1.5"/></svg>,
  Archive: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Tag: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  MoreVertical: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
}

// ==================== CONFIGURACIÓN DE PLATAFORMAS ====================
const platformConfig = {
  whatsapp: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: Icons.WhatsApp, label: 'WhatsApp' },
  facebook: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Icons.Facebook, label: 'Facebook' },
  messenger: { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: Icons.Messenger, label: 'Messenger' },
  instagram: { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', icon: Icons.Instagram, label: 'Instagram' },
  tiktok: { color: '#ffffff', bg: 'rgba(255,255,255,0.1)', icon: Icons.TikTok, label: 'TikTok' },
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function SocialInboxView() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<SocialMessage[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedMessage, setSelectedMessage] = useState<SocialMessage | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Suscribirse a mensajes en tiempo real
  useEffect(() => {
    const unsubscribe = socialService.subscribeToMessages((data) => {
      setMessages(data)
    })
    return () => unsubscribe()
  }, [])

  // Auto-scroll en conversaciones
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedMessage, messages])

  // Filtrar mensajes
  const filteredMessages = messages.filter(msg => {
    const matchesPlatform = selectedPlatform === 'all' || msg.platform === selectedPlatform
    const matchesStatus = selectedStatus === 'all' || msg.status === selectedStatus
    const matchesSearch = searchTerm === '' || 
      msg.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesPlatform && matchesStatus && msg.direction === 'incoming' && matchesSearch
  })

  // Obtener conversación completa
  const conversation = selectedMessage 
    ? messages.filter(m => m.threadId === selectedMessage.threadId).sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0
        const timeB = b.timestamp?.seconds || 0
        return timeA - timeB
      })
    : []

  // Contar mensajes no leídos
  const unreadCount = messages.filter(m => m.status === 'unread' && m.direction === 'incoming').length

  // Enviar mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedMessage || !user) return

    setSending(true)
    try {
      await socialService.sendMessage(
        selectedMessage.platform, 
        selectedMessage.threadId || selectedMessage.senderHandle, 
        replyText, 
        user
      )
      setReplyText('')
    } catch (error) {
      alert('Error: No se pudo enviar el mensaje a la plataforma externa.')
    } finally {
      setSending(false)
    }
  }

  // Cambiar estado de mensaje
  const handleChangeStatus = async (newStatus: 'unread' | 'read' | 'replied' | 'resolved' | 'archived') => {
    if (!selectedMessage) return
    await socialService.updateMessageStatus(selectedMessage.id, newStatus)
  }

  // Formatear hora
  const formatTime = (timestamp: any) => {
    if (!timestamp?.seconds) return '...'
    const date = new Date(timestamp.seconds * 1000)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
  }

  // ==================== RENDER ====================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: '20px' }}>
      
      {/* ==================== HEADER & FILTROS ==================== */}
      <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              📬 Bandeja Unificada
              {unreadCount > 0 && (
                <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                  {unreadCount}
                </span>
              )}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              Gestiona todas tus conversaciones en un solo lugar
            </p>
          </div>

          {/* Filtros de Plataforma */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setSelectedPlatform('all')}
              style={{ 
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: selectedPlatform === 'all' ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: selectedPlatform === 'all' ? 'white' : 'rgba(255,255,255,0.6)'
              }}
            >
              Todas
            </button>
            {Object.entries(platformConfig).map(([key, config]) => (
              <button 
                key={key}
                onClick={() => setSelectedPlatform(key)}
                style={{ 
                  padding: '8px 12px', borderRadius: '10px', border: selectedPlatform === key ? `2px solid ${config.color}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, transition: 'all 0.2s',
                  background: selectedPlatform === key ? config.bg : 'rgba(255,255,255,0.05)',
                  color: selectedPlatform === key ? config.color : 'rgba(255,255,255,0.5)',
                }}
                title={config.label}
              >
                <config.icon />
                <span>{config.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Búsqueda y Filtros de Estado */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
              <Icons.Search />
            </div>
            <input 
              type="text" 
              placeholder="Buscar conversaciones..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '10px 12px 10px 40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none' 
              }}
            />
          </div>

          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ 
              padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none', cursor: 'pointer' 
            }}
          >
            <option value="all" style={{ background: '#1a1a24' }}>Todos los estados</option>
            <option value="unread" style={{ background: '#1a1a24' }}>No leídos</option>
            <option value="read" style={{ background: '#1a1a24' }}>Leídos</option>
            <option value="replied" style={{ background: '#1a1a24' }}>Respondidos</option>
            <option value="resolved" style={{ background: '#1a1a24' }}>Resueltos</option>
            <option value="archived" style={{ background: '#1a1a24' }}>Archivados</option>
          </select>
        </div>
      </div>

      {/* ==================== CONTENIDO PRINCIPAL ==================== */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        
        {/* ==================== LISTA DE CONVERSACIONES ==================== */}
        <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '8px' }}>
          {filteredMessages.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>💬</div>
              <p>No hay mensajes con estos filtros</p>
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                {selectedPlatform !== 'all' ? 'Prueba con otra plataforma' : 'Los mensajes aparecerán aquí'}
              </p>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const config = platformConfig[msg.platform]
              const isSelected = selectedMessage?.threadId === msg.threadId
              const isUnread = msg.status === 'unread'
              
              return (
                <div 
                  key={msg.id}
                  onClick={() => { 
                    setSelectedMessage(msg)
                    if (msg.status === 'unread') {
                      socialService.markAsRead(msg.id)
                    }
                  }}
                  style={{ 
                    background: isSelected ? 'rgba(99,102,241,0.15)' : isUnread ? 'rgba(255,255,255,0.05)' : '#1a1a24', 
                    borderRadius: '14px', 
                    padding: '16px', 
                    cursor: 'pointer', 
                    border: isSelected ? '2px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', 
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = isUnread ? 'rgba(255,255,255,0.05)' : '#1a1a24'
                  }}
                >
                  {/* Indicador de no leído */}
                  {isUnread && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }} />
                  )}

                  {/* Header del mensaje */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ 
                      width: '44px', height: '44px', borderRadius: '50%', 
                      background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '16px', fontWeight: 700, color: 'white', flexShrink: 0,
                      boxShadow: `0 4px 12px ${config.bg}`
                    }}>
                      {msg.senderAvatar || msg.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.senderName}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: config.color }}>
                          <config.icon />
                          <span>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview del mensaje */}
                  <p style={{ 
                    fontSize: '13px', 
                    color: isUnread ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.5,
                    fontWeight: isUnread ? 500 : 400
                  }}>
                    {msg.content}
                  </p>

                  {/* Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    {msg.status === 'replied' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                        <Icons.CheckDouble />
                        Respondido
                      </span>
                    )}
                    {msg.status === 'resolved' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                        <Icons.Check />
                        Resuelto
                      </span>
                    )}
                    {msg.status === 'archived' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', background: 'rgba(100,116,139,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                        <Icons.Archive />
                        Archivado
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ==================== VISTA DE CONVERSACIÓN ==================== */}
        <div style={{ flex: 1, background: '#12121a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedMessage ? (
            <>
              {/* Header de Conversación */}
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '18px', fontWeight: 700, color: 'white',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                  }}>
                    {selectedMessage.senderAvatar || selectedMessage.senderName.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                      {selectedMessage.senderName}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {selectedMessage.senderHandle} 
                      <span style={{ color: platformConfig[selectedMessage.platform].color }}>•</span>
                      vía {platformConfig[selectedMessage.platform].label}
                    </p>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleChangeStatus('resolved')}
                    style={{ 
                      background: selectedMessage.status === 'resolved' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(139,92,246,0.3)', 
                      color: '#a78bfa', 
                      padding: '8px 14px', 
                      borderRadius: '10px', 
                      fontSize: '13px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icons.Check />
                    {selectedMessage.status === 'resolved' ? 'Resuelto' : 'Marcar Resuelto'}
                  </button>
                  <button 
                    onClick={() => handleChangeStatus('archived')}
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: 'rgba(255,255,255,0.6)', 
                      padding: '8px 14px', 
                      borderRadius: '10px', 
                      fontSize: '13px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icons.Archive />
                    Archivar
                  </button>
                </div>
              </div>

              {/* Mensajes de la Conversación */}
              <div style={{ 
                flex: 1, 
                padding: '24px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.03) 0%, transparent 70%)'
              }}>
                {conversation.map((msg) => (
                  <div key={msg.id} style={{ 
                    alignSelf: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start', 
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ 
                      background: msg.direction === 'outgoing' 
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                        : 'rgba(255,255,255,0.08)', 
                      padding: '14px 18px', 
                      borderRadius: msg.direction === 'outgoing' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
                      color: msg.direction === 'outgoing' ? 'white' : 'rgba(255,255,255,0.9)', 
                      fontSize: '14px', 
                      lineHeight: 1.5, 
                      border: msg.direction === 'outgoing' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: msg.direction === 'outgoing' ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
                      wordWrap: 'break-word'
                    }}>
                      {msg.content}
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'rgba(255,255,255,0.4)', 
                      alignSelf: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                      paddingLeft: msg.direction === 'outgoing' ? '0' : '8px',
                      paddingRight: msg.direction === 'outgoing' ? '8px' : '0'
                    }}>
                      {formatTime(msg.timestamp)}
                      {msg.direction === 'outgoing' && msg.status === 'replied' && (
                        <span style={{ marginLeft: '6px', color: '#22c55e' }}>✓✓</span>
                      )}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Respuesta */}
              <form onSubmit={handleSendMessage} style={{ 
                padding: '20px', 
                borderTop: '1px solid rgba(255,255,255,0.08)', 
                background: '#12121a' 
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <textarea 
                    placeholder={`Escribir respuesta en ${platformConfig[selectedMessage.platform].label}...`} 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e as any)
                      }
                    }}
                    style={{ 
                      flex: 1, 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      padding: '14px 16px', 
                      borderRadius: '12px', 
                      color: 'white', 
                      outline: 'none', 
                      fontSize: '14px',
                      minHeight: '50px',
                      maxHeight: '120px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={sending || !replyText.trim()} 
                    style={{ 
                      background: sending || !replyText.trim() 
                        ? 'rgba(99,102,241,0.3)' 
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                      border: 'none', 
                      width: '50px', 
                      height: '50px',
                      borderRadius: '12px', 
                      color: 'white', 
                      cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      boxShadow: !replyText.trim() ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <Icons.Send />
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                  Presiona Enter para enviar, Shift+Enter para nueva línea
                </p>
              </form>
            </>
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'rgba(255,255,255,0.3)' 
            }}>
              <div style={{ fontSize: '80px', marginBottom: '24px', opacity: 0.2 }}>💬</div>
              <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Selecciona una conversación</p>
              <p style={{ fontSize: '14px', opacity: 0.7, textAlign: 'center', maxWidth: '300px' }}>
                Gestiona mensajes de WhatsApp, Facebook, Instagram, Messenger y TikTok desde un solo lugar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}