'use client'

import { useState, useEffect, useRef } from 'react'
import { SocialMessage, SocialPlatform } from '../../types'
import { socialService } from '../../lib/social-service'

// Iconos SVG
const Icons = {
  WhatsApp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  Facebook: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  Instagram: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  TikTok: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.55-1.12v8.42c0 .28.01.57-.01.85-.04 1.25-.49 2.47-1.25 3.47a7.22 7.22 0 01-4.72 2.75 7.15 7.15 0 01-5.59-1.57 7.2 7.2 0 01-2.58-4.99c-.1-1.37.2-2.75.87-3.95a7.2 7.2 0 013.92-3.23c1.36-.45 2.83-.41 4.17.11.12.05.23.11.35.17v4.18c-.37-.24-.77-.41-1.19-.51-.83-.2-1.7-.09-2.45.32-.76.41-1.32 1.15-1.54 1.99-.23.86-.11 1.77.34 2.55.44.78 1.2 1.36 2.07 1.58.87.22 1.79.1 2.58-.35.79-.45 1.35-1.2 1.57-2.07.07-.27.1-.55.1-.83V4.62c1.76.5 3.32 1.69 4.21 3.29V.02h-4.43z"/></svg>,
  Messenger: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#a855f7"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.245c1.09.303 2.246.464 3.443.464 6.627 0 12-4.975 12-11.108C24 4.974 18.627 0 12 0zm1.191 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
}

const platformConfig = {
  whatsapp: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: Icons.WhatsApp, label: 'WhatsApp' },
  facebook: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Icons.Facebook, label: 'Facebook' },
  messenger: { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: Icons.Messenger, label: 'Messenger' },
  instagram: { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', icon: Icons.Instagram, label: 'Instagram' },
  tiktok: { color: '#ffffff', bg: 'rgba(255,255,255,0.1)', icon: Icons.TikTok, label: 'TikTok' },
}

export default function SocialInboxView() {
  const [messages, setMessages] = useState<SocialMessage[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedMessage, setSelectedMessage] = useState<SocialMessage | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Cargar mensajes desde el servicio (Simulación de API)
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      try {
        const data = await socialService.getMessages()
        setMessages(data)
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [])

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedMessage])

  const filteredMessages = messages.filter(msg => selectedPlatform === 'all' || msg.platform === selectedPlatform)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedMessage) return

    setSending(true)
    try {
      await socialService.sendMessage(selectedMessage.platform, selectedMessage.senderHandle || '', replyText)
      
      // Actualizar UI optimistamente
      const updatedMessages = messages.map(msg => 
        msg.id === selectedMessage.id ? { ...msg, status: 'replied' as const } : msg
      )
      setMessages(updatedMessages)
      setReplyText('')
      alert('Mensaje enviado correctamente')
    } catch (error) {
      alert('Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  // Formatear hora
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: '20px' }}>
      
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a24', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>Bandeja Unificada</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Gestión de leads y consultas en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setSelectedPlatform('all')}
            style={{ 
              padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
              background: selectedPlatform === 'all' ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
              color: selectedPlatform === 'all' ? 'white' : 'rgba(255,255,255,0.6)'
            }}
          >
            Todos
          </button>
          {Object.entries(platformConfig).map(([key, config]) => (
            <button 
              key={key}
              onClick={() => setSelectedPlatform(key)}
              style={{ 
                padding: '8px', borderRadius: '10px', border: selectedPlatform === key ? `1px solid ${config.color}` : '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selectedPlatform === key ? config.bg : 'rgba(255,255,255,0.05)',
                color: selectedPlatform === key ? config.color : 'rgba(255,255,255,0.4)',
              }}
              title={config.label}
            >
              <config.icon />
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        
        {/* Lista de Mensajes */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>Cargando mensajes...</div> : filteredMessages.map(msg => {
            const PlatformIcon = platformConfig[msg.platform].icon
            const platformStyle = platformConfig[msg.platform]
            const isSelected = selectedMessage?.id === msg.id
            
            return (
              <div 
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                style={{ 
                  background: isSelected ? 'rgba(99,102,241,0.1)' : '#1a1a24', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  cursor: 'pointer', 
                  border: isSelected ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {msg.status === 'unread' && (
                  <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #64748b, #475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>
                      {msg.senderAvatar}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{msg.senderName}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{msg.platform}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{formatTime(msg.timestamp)}</span>
                    <div style={{ color: platformStyle.color }}><PlatformIcon /></div>
                  </div>
                </div>
                
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {msg.content}
                </p>

                <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
                  {msg.intent === 'consulta_legal' && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '4px' }}>⚖️ Consulta Legal</span>}
                  {msg.leadScore && msg.leadScore > 80 && <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px' }}>🔥 Hot Lead</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Área de Chat */}
        <div style={{ flex: 1, background: '#1a1a24', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedMessage ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    {selectedMessage.senderAvatar}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{selectedMessage.senderName}</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {selectedMessage.senderHandle} • Lead Score: <span style={{ color: (selectedMessage.leadScore || 0) > 80 ? '#4ade80' : 'white' }}>{selectedMessage.leadScore}/100</span>
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    Asignar a Closer
                  </button>
                  <button style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    Marcar Resuelto
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.03) 0%, transparent 50%)' }}>
                
                {/* Fecha */}
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '10px 0' }}>
                  {formatDate(selectedMessage.timestamp)} • {formatTime(selectedMessage.timestamp)}
                </div>

                {/* Mensaje Entrante */}
                <div style={{ alignSelf: 'flex-start', maxWidth: '75%' }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '16px', borderRadius: '16px 16px 16px 2px', color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedMessage.content}
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', display: 'block', marginLeft: '4px' }}>
                    {selectedMessage.senderName}
                  </span>
                </div>

                {/* Respuesta Simulada si ya fue respondido */}
                {selectedMessage.status === 'replied' && (
                  <div style={{ alignSelf: 'flex-end', maxWidth: '75%' }}>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '16px', borderRadius: '16px 16px 2px 16px', color: 'white', fontSize: '14px', lineHeight: 1.5, boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}>
                      Gracias por contactarnos, {selectedMessage.senderName.split(' ')[0]}. Un abogado especialista revisará su caso. ¿Podría proporcionarnos un número de teléfono alternativo?
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', display: 'block', textAlign: 'right', marginRight: '4px' }}>
                      Enviado por Sistema • Hace 2h
                    </span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#12121a' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder={`Escribir respuesta en ${selectedMessage.platform}...`} 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '14px' }}
                  />
                  <button type="submit" disabled={sending} style={{ background: sending ? 'rgba(99,102,241,0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', border: 'none', width: '50px', borderRadius: '12px', color: 'white', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Icons.Send />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    Enter para enviar • Shift + Enter para nueva línea
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>📎 Adjuntar</button>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>⚡ Respuesta Rápida</button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.2, filter: 'grayscale(100%)' }}>💬</div>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>Selecciona una conversación</p>
              <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>Gestiona mensajes de WhatsApp, Facebook, Instagram y más.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}